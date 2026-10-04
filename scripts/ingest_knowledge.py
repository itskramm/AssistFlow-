"""Compatibility entry point for the backend knowledge ingestion script."""

from pathlib import Path
import runpy


runpy.run_path(
    str(Path(__file__).resolve().parents[1] / "backend" / "scripts" / "ingest_knowledge.py"),
    run_name="__main__",
)
