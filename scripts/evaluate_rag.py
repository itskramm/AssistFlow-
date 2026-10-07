"""
evaluate_rag.py
---------------
Formal evaluation of SmartOpsSupportHub's RAG pipeline across three dimensions:

  1. RETRIEVAL PRECISION  — does ChromaDB return the expected source document?
  2. GENERATION ACCURACY  — does the LLM answer match a reference answer semantically?
  3. LATENCY (online + simulated downtime) — p50 / p95 / p99 response times

Usage (from repo root):
  cd backend
  source .venv/bin/activate
  cd ..
  python scripts/evaluate_rag.py                        # full evaluation
  python scripts/evaluate_rag.py --mode retrieval       # retrieval only
  python scripts/evaluate_rag.py --mode latency         # latency only
  python scripts/evaluate_rag.py --mode generation      # generation only
  python scripts/evaluate_rag.py --mode downtime        # simulated downtime only
  python scripts/evaluate_rag.py --output results.json  # save JSON report
"""

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path
from statistics import mean, median, quantiles
from unittest.mock import patch

# ---------------------------------------------------------------------------
# Path setup — allow importing from backend/app
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

os.environ.setdefault("CHROMA_DB_PATH",      str(ROOT / "data" / "chroma"))
os.environ.setdefault("CHROMA_PERSIST_DIR",  str(ROOT / "data" / "chroma"))
os.environ.setdefault("KNOWLEDGE_DIR",       str(ROOT / "data" / "knowledge"))
os.environ.setdefault("OFFLINE_DB_PATH",     str(ROOT / "data" / "offline_cache" / "offline.db"))

from app.services.chat_service import ChatService  # noqa: E402

# ---------------------------------------------------------------------------
# Ground truth dataset
# Each entry:
#   query          — the agent's natural-language question
#   expected_src   — filename (or substring) that should appear in retrieved sources
#   reference_ans  — key phrases that MUST appear in a correct answer
#   category       — used for per-category breakdown in the report
# ---------------------------------------------------------------------------
GROUND_TRUTH = [
    # ── CRM / Login ─────────────────────────────────────────────────────────
    {
        "query": "How do I reset my CRM password?",
        "expected_src": "sop_crm_login_access",
        "reference_ans": ["password", "reset", "login"],
        "category": "CRM",
    },
    {
        "query": "My Salesforce account is locked after too many failed attempts",
        "expected_src": "sop_crm_login_access",
        "reference_ans": ["locked", "unlock", "admin"],
        "category": "CRM",
    },
    {
        "query": "SSO is not working, I get a SAML error",
        "expected_src": "sop_crm_login_access",
        "reference_ans": ["sso", "saml", "identity"],
        "category": "CRM",
    },
    {
        "query": "I don't have access to the ticket queue in Zendesk",
        "expected_src": "sop_crm_login_access",
        "reference_ans": ["permission", "access", "admin"],
        "category": "CRM",
    },
    # ── Telephony ────────────────────────────────────────────────────────────
    {
        "query": "Customer cannot hear me, my microphone seems to be muted",
        "expected_src": "sop_call_quality_telephony",
        "reference_ans": ["microphone", "mute", "headset"],
        "category": "Telephony",
    },
    {
        "query": "One-way audio — I can hear the customer but they cannot hear me",
        "expected_src": "sop_call_quality_telephony",
        "reference_ans": ["audio", "microphone", "headset"],
        "category": "Telephony",
    },
    {
        "query": "Call keeps dropping after 30 seconds",
        "expected_src": "sop_call_quality_telephony",
        "reference_ans": ["call", "drop", "connection"],
        "category": "Telephony",
    },
    # ── Ticket escalation ────────────────────────────────────────────────────
    {
        "query": "How do I escalate a ticket to Tier 2 support?",
        "expected_src": "sop_ticket_escalation_routing",
        "reference_ans": ["escalat", "tier", "ticket"],
        "category": "Escalation",
    },
    {
        "query": "What is the SLA for priority 1 tickets?",
        "expected_src": "sop_ticket_escalation_routing",
        "reference_ans": ["sla", "priority", "ticket"],
        "category": "Escalation",
    },
    # ── Identity verification ────────────────────────────────────────────────
    {
        "query": "What steps do I follow to verify a customer's identity?",
        "expected_src": "sop_customer_identity_verification",
        "reference_ans": ["verif", "identity", "customer"],
        "category": "Verification",
    },
    {
        "query": "Customer cannot answer security questions, how do I verify them?",
        "expected_src": "sop_customer_identity_verification",
        "reference_ans": ["verif", "security", "question"],
        "category": "Verification",
    },
    # ── System downtime ──────────────────────────────────────────────────────
    {
        "query": "The CRM is completely down, what should I do?",
        "expected_src": "sop_system_downtime_offline",
        "reference_ans": ["down", "offline", "procedure"],
        "category": "Downtime",
    },
    {
        "query": "How do I handle customer calls when systems are offline?",
        "expected_src": "sop_system_downtime_offline",
        "reference_ans": ["offline", "manual", "procedure"],
        "category": "Downtime",
    },
    # ── Network / auth ───────────────────────────────────────────────────────
    {
        "query": "VPN disconnects every few minutes",
        "expected_src": "error_log_network_auth",
        "reference_ans": ["vpn", "reconnect", "network"],
        "category": "Network",
    },
    {
        "query": "Getting authentication timeout errors in the network",
        "expected_src": "error_log_network_auth",
        "reference_ans": ["auth", "timeout", "network"],
        "category": "Network",
    },
]

# Queries used for latency benchmarking (a representative mix)
LATENCY_QUERIES = [
    "How do I reset my CRM password?",
    "Call quality is poor, customer keeps breaking up",
    "How do I escalate a ticket?",
    "System is down, what do I do?",
    "Customer failed identity verification",
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _contains_phrases(text: str, phrases: list[str]) -> int:
    """Return how many reference phrases appear (case-insensitive) in text."""
    text_lower = text.lower()
    return sum(1 for phrase in phrases if phrase.lower() in text_lower)


def _pct(numerator: int, denominator: int) -> float:
    return round(100 * numerator / denominator, 1) if denominator else 0.0


def _latency_stats(values: list[float]) -> dict:
    if not values:
        return {}
    sorted_vals = sorted(values)
    p = quantiles(sorted_vals, n=100) if len(sorted_vals) >= 2 else [sorted_vals[0]] * 99
    return {
        "min_ms":    round(min(sorted_vals), 1),
        "p50_ms":    round(median(sorted_vals), 1),
        "p95_ms":    round(p[94], 1),
        "p99_ms":    round(p[98], 1),
        "max_ms":    round(max(sorted_vals), 1),
        "mean_ms":   round(mean(sorted_vals), 1),
        "samples":   len(sorted_vals),
    }


# ---------------------------------------------------------------------------
# 1. Retrieval Precision Evaluation
# ---------------------------------------------------------------------------

def evaluate_retrieval(service: ChatService) -> dict:
    """
    For each ground truth query, call _retrieve() directly and check
    whether the expected source document appears in the returned sources.

    Metrics:
      - Hit@K  : expected source in top-K results
      - MRR    : mean reciprocal rank of first correct source
      - Per-category breakdown
    """
    print("\n" + "=" * 60)
    print("1. RETRIEVAL PRECISION EVALUATION")
    print("=" * 60)

    hits = 0
    reciprocal_ranks = []
    category_hits: dict[str, list[bool]] = {}
    details = []

    for item in GROUND_TRUTH:
        query       = item["query"]
        expected    = item["expected_src"]
        category    = item["category"]

        chunks, sources = service._retrieve(query)

        # Check if expected source is in returned sources
        hit = any(expected in src for src in sources)
        hits += int(hit)

        # Reciprocal rank
        rr = 0.0
        for rank, src in enumerate(sources, start=1):
            if expected in src:
                rr = 1.0 / rank
                break
        reciprocal_ranks.append(rr)

        # Per category
        category_hits.setdefault(category, []).append(hit)

        status = "✅ HIT" if hit else "❌ MISS"
        print(f"  {status} | {query[:55]:<55} | sources: {sources}")
        details.append({
            "query":        query,
            "expected_src": expected,
            "retrieved":    sources,
            "hit":          hit,
            "rr":           round(rr, 3),
            "category":     category,
        })

    total   = len(GROUND_TRUTH)
    precision = _pct(hits, total)
    mrr       = round(mean(reciprocal_ranks), 3) if reciprocal_ranks else 0.0

    print(f"\n  Precision@K : {hits}/{total} = {precision}%")
    print(f"  MRR         : {mrr}")
    print("\n  Per-category breakdown:")
    category_results = {}
    for cat, cat_hits in sorted(category_hits.items()):
        cat_pct = _pct(sum(cat_hits), len(cat_hits))
        print(f"    {cat:<15} {sum(cat_hits)}/{len(cat_hits)} = {cat_pct}%")
        category_results[cat] = {"hits": sum(cat_hits), "total": len(cat_hits), "pct": cat_pct}

    return {
        "metric":            "retrieval_precision",
        "hits":              hits,
        "total":             total,
        "precision_pct":     precision,
        "mrr":               mrr,
        "per_category":      category_results,
        "details":           details,
    }


# ---------------------------------------------------------------------------
# 2. Generation Accuracy Evaluation
# ---------------------------------------------------------------------------

async def evaluate_generation(service: ChatService) -> dict:
    """
    Run the full pipeline (online mode) for each ground truth query.
    Score each response by checking how many reference key phrases appear.

    Metrics:
      - Phrase coverage: % of reference phrases present in the answer
      - Full match rate: % of queries where ALL reference phrases are present
      - Average phrase coverage
    """
    print("\n" + "=" * 60)
    print("2. GENERATION ACCURACY EVALUATION")
    print("=" * 60)

    full_matches = 0
    phrase_coverages = []
    details = []

    for item in GROUND_TRUTH:
        query     = item["query"]
        ref_ans   = item["reference_ans"]
        category  = item["category"]

        result = await service.process_message(query)
        reply  = result.get("reply", "")
        source = result.get("source", "unknown")

        matched = _contains_phrases(reply, ref_ans)
        coverage = _pct(matched, len(ref_ans))
        phrase_coverages.append(coverage)
        full_match = matched == len(ref_ans)
        if full_match:
            full_matches += 1

        status = "✅" if full_match else ("⚠️ " if coverage >= 50 else "❌")
        print(f"  {status} [{source:<14}] {query[:50]:<50} coverage={coverage}%")
        details.append({
            "query":         query,
            "source":        source,
            "coverage_pct":  coverage,
            "full_match":    full_match,
            "category":      category,
            "reply_snippet": reply[:120],
        })

    total          = len(GROUND_TRUTH)
    avg_coverage   = round(mean(phrase_coverages), 1) if phrase_coverages else 0.0
    full_match_pct = _pct(full_matches, total)

    print(f"\n  Full match rate  : {full_matches}/{total} = {full_match_pct}%")
    print(f"  Avg phrase coverage: {avg_coverage}%")

    return {
        "metric":            "generation_accuracy",
        "full_matches":      full_matches,
        "total":             total,
        "full_match_pct":    full_match_pct,
        "avg_coverage_pct":  avg_coverage,
        "details":           details,
    }


# ---------------------------------------------------------------------------
# 3a. Latency — Online Mode
# ---------------------------------------------------------------------------

async def evaluate_latency_online(service: ChatService, runs: int = 3) -> dict:
    """
    Fire each benchmark query `runs` times through the full online pipeline
    and collect end-to-end latency in milliseconds.
    """
    print("\n" + "=" * 60)
    print("3a. LATENCY EVALUATION — ONLINE MODE")
    print("=" * 60)

    all_latencies = []
    per_query: dict[str, list[float]] = {}

    for query in LATENCY_QUERIES:
        per_query[query] = []
        for _ in range(runs):
            t0     = time.perf_counter()
            result = await service.process_message(query)
            ms     = round((time.perf_counter() - t0) * 1000, 1)

            # Use service-reported latency if available (more accurate)
            ms = result.get("latency_ms", ms)
            all_latencies.append(ms)
            per_query[query].append(ms)

        avg = round(mean(per_query[query]), 1)
        print(f"  {query[:55]:<55} avg={avg}ms")

    stats = _latency_stats(all_latencies)
    print(f"\n  Aggregate stats across {len(all_latencies)} requests:")
    for k, v in stats.items():
        print(f"    {k:<12}: {v}")

    return {"metric": "latency_online", **stats, "per_query": {
        q: _latency_stats(v) for q, v in per_query.items()
    }}


# ---------------------------------------------------------------------------
# 3b. Latency — Simulated Downtime (Offline Mode)
# ---------------------------------------------------------------------------

async def evaluate_latency_downtime(service: ChatService, runs: int = 5) -> dict:
    """
    Simulate complete internet/backend downtime by patching _check_internet()
    to always return False. This forces every request through the SQLite
    offline fallback path and measures its latency.

    This directly tests the thesis requirement:
    'processing latency under simulated downtime conditions'
    """
    print("\n" + "=" * 60)
    print("3b. LATENCY EVALUATION — SIMULATED DOWNTIME (OFFLINE)")
    print("=" * 60)
    print("  (Patching _check_internet → always returns False)\n")

    all_latencies = []
    offline_hits  = 0
    per_query: dict[str, list[float]] = {}

    # Patch the internet check inside chat_service to simulate full downtime
    with patch("app.services.chat_service._check_internet", return_value=False):
        for query in LATENCY_QUERIES:
            per_query[query] = []
            for _ in range(runs):
                t0     = time.perf_counter()
                result = await service.process_message(query)
                ms     = round((time.perf_counter() - t0) * 1000, 1)

                ms = result.get("latency_ms", ms)
                src = result.get("source", "")
                all_latencies.append(ms)
                per_query[query].append(ms)

                if src in ("offline-cache", "fallback"):
                    offline_hits += 1

            avg = round(mean(per_query[query]), 1)
            print(f"  {query[:55]:<55} avg={avg}ms")

    stats = _latency_stats(all_latencies)
    total_requests  = len(LATENCY_QUERIES) * runs
    offline_rate    = _pct(offline_hits, total_requests)

    print(f"\n  Offline fallback rate : {offline_hits}/{total_requests} = {offline_rate}%")
    print(f"  Aggregate stats across {len(all_latencies)} requests:")
    for k, v in stats.items():
        print(f"    {k:<12}: {v}")

    if stats.get("p95_ms", 9999) < 500:
        print("\n  ✅ p95 latency under simulated downtime is within 500ms threshold")
    else:
        print("\n  ⚠️  p95 latency exceeds 500ms — offline cache may need optimisation")

    return {
        "metric":            "latency_downtime",
        "offline_rate_pct":  offline_rate,
        **stats,
        "per_query": {q: _latency_stats(v) for q, v in per_query.items()},
    }


# ---------------------------------------------------------------------------
# Report writer
# ---------------------------------------------------------------------------

def write_report(results: list[dict], output_path: str | None) -> None:
    report = {
        "system":    "SmartOpsSupportHub",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "results":   results,
    }

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for r in results:
        metric = r.get("metric", "unknown")
        if metric == "retrieval_precision":
            print(f"  Retrieval Precision : {r['precision_pct']}%   MRR={r['mrr']}")
        elif metric == "generation_accuracy":
            print(f"  Generation Accuracy : full_match={r['full_match_pct']}%  "
                  f"avg_coverage={r['avg_coverage_pct']}%")
        elif metric == "latency_online":
            print(f"  Latency (online)    : p50={r.get('p50_ms')}ms  "
                  f"p95={r.get('p95_ms')}ms  p99={r.get('p99_ms')}ms")
        elif metric == "latency_downtime":
            print(f"  Latency (downtime)  : p50={r.get('p50_ms')}ms  "
                  f"p95={r.get('p95_ms')}ms  offline_rate={r.get('offline_rate_pct')}%")

    if output_path:
        Path(output_path).write_text(json.dumps(report, indent=2))
        print(f"\n  Full report saved to: {output_path}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main_async(mode: str, output: str | None, latency_runs: int) -> None:
    print("Initialising ChatService…")
    try:
        service = ChatService()
    except Exception as exc:
        print(f"❌ Could not initialise ChatService: {exc}")
        print("   Make sure GEMINI_API_KEY is set and ChromaDB is populated.")
        sys.exit(1)

    results = []

    if mode in ("retrieval", "all"):
        results.append(evaluate_retrieval(service))

    if mode in ("generation", "all"):
        results.append(await evaluate_generation(service))

    if mode in ("latency", "all"):
        results.append(await evaluate_latency_online(service, runs=latency_runs))

    if mode in ("downtime", "all"):
        results.append(await evaluate_latency_downtime(service, runs=latency_runs))

    write_report(results, output)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SmartOpsSupportHub RAG evaluation suite"
    )
    parser.add_argument(
        "--mode",
        choices=["all", "retrieval", "generation", "latency", "downtime"],
        default="all",
        help="Which evaluation to run (default: all)",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Path to save JSON report (optional)",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=3,
        help="Number of latency measurement runs per query (default: 3)",
    )
    args = parser.parse_args()

    asyncio.run(main_async(args.mode, args.output, args.runs))


if __name__ == "__main__":
    main()
