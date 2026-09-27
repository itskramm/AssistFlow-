"""
ingest_knowledge.py
-------------------
Reads all .md, .txt, and .pdf files from data/knowledge/, chunks them,
embeds them using Google text-embedding-004, and stores them in ChromaDB.

Run from the project root:
    python scripts/ingest_knowledge.py
"""

import os
import sys
from pathlib import Path

# Allow imports from backend/app
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / "backend" / ".env")

import chromadb
from chromadb.config import Settings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parents[1]
KNOWLEDGE_DIR = BASE_DIR / "data" / "knowledge"
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(BASE_DIR / "data" / "chroma"))
COLLECTION_NAME = "assistflow_knowledge"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def load_documents(knowledge_dir: Path) -> list[dict]:
    """Load all .md and .txt files from the knowledge directory."""
    documents = []

    for filepath in sorted(knowledge_dir.rglob("*")):
        if filepath.suffix.lower() not in {".md", ".txt"}:
            continue
        text = filepath.read_text(encoding="utf-8").strip()
        if not text:
            continue
        documents.append({"source": str(filepath.relative_to(BASE_DIR)), "text": text})
        print(f"  Loaded: {filepath.name} ({len(text)} chars)")

    return documents


def chunk_documents(documents: list[dict]) -> list[dict]:
    """Split documents into smaller chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = []
    for doc in documents:
        parts = splitter.split_text(doc["text"])
        for i, part in enumerate(parts):
            chunks.append(
                {
                    "id": f"{doc['source']}::chunk_{i}",
                    "text": part,
                    "source": doc["source"],
                }
            )
    return chunks


def ingest() -> None:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set. Check backend/.env.")

    print(f"\n=== AssistFlow Knowledge Ingestion ===")
    print(f"Knowledge dir : {KNOWLEDGE_DIR}")
    print(f"ChromaDB path : {CHROMA_DB_PATH}\n")

    # 1. Load documents
    print("Step 1: Loading documents...")
    documents = load_documents(KNOWLEDGE_DIR)
    if not documents:
        print("No documents found. Add .md or .txt files to data/knowledge/ and re-run.")
        return
    print(f"  → {len(documents)} document(s) loaded.\n")

    # 2. Chunk
    print("Step 2: Chunking documents...")
    chunks = chunk_documents(documents)
    print(f"  → {len(chunks)} chunk(s) created.\n")

    # 3. Embed
    print("Step 3: Generating embeddings with text-embedding-004...")
    embeddings_model = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=api_key,
    )
    texts = [c["text"] for c in chunks]
    vectors = embeddings_model.embed_documents(texts)
    print(f"  → {len(vectors)} embeddings generated.\n")

    # 4. Store in ChromaDB
    print("Step 4: Storing embeddings in ChromaDB...")
    Path(CHROMA_DB_PATH).mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(
        path=CHROMA_DB_PATH,
        settings=Settings(anonymized_telemetry=False),
    )

    # Drop and recreate collection for a clean ingest
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"  Existing collection '{COLLECTION_NAME}' cleared.")
    except Exception:
        pass

    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    collection.add(
        ids=[c["id"] for c in chunks],
        embeddings=vectors,
        documents=texts,
        metadatas=[{"source": c["source"]} for c in chunks],
    )
    print(f"  → {len(chunks)} chunk(s) stored in collection '{COLLECTION_NAME}'.\n")
    print("=== Ingestion complete! ===\n")


if __name__ == "__main__":
    ingest()
