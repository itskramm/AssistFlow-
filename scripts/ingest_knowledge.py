"""Placeholder script for knowledge ingestion into ChromaDB."""

from pathlib import Path


def main() -> None:
    knowledge_dir = Path(__file__).resolve().parents[1] / "data" / "knowledge"
    knowledge_dir.mkdir(parents=True, exist_ok=True)

    sample = knowledge_dir / "sample_sop.md"
    sample.write_text(
        "# Sample SOP\n\n"
        "1. Confirm the user context and issue type.\n"
        "2. Check the troubleshooting checklist in the internal knowledge base.\n"
        "3. If the issue persists, escalate to the next support tier with the relevant logs.\n",
        encoding="utf-8",
    )

    print(f"Knowledge sample created at: {sample}")


if __name__ == "__main__":
    main()
