import sqlite3

from app.services import chat_service as chat_service_module
from app.services.chat_service import ChatService


def test_scope_signal_rejects_unrelated_question():
    assert not chat_service_module._has_scope_signal("What is the capital of France?")
    assert chat_service_module._has_scope_signal("The customer cannot hear me on the call")


def test_response_mode_allows_general_and_company_questions_without_hard_scope_block():
    assert chat_service_module._response_mode(
        "What is the capital of France?",
        [],
        [],
    ) == "general"
    assert chat_service_module._response_mode(
        "What is our company's password policy?",
        [],
        [],
    ) == "general"
    assert chat_service_module._response_mode(
        "How do I reset my CRM password?",
        ["CRM password reset procedure"],
        [],
    ) == "grounded"


def test_knowledge_gate_rejects_new_topic_from_supported_conversation():
    context = ["CRM password reset procedure"]
    conversation = [{"role": "user", "content": "I cannot log into the CRM"}]

    assert chat_service_module._has_knowledge_support(
        "What is the capital of France?",
        context,
        conversation,
    ) is False
    assert chat_service_module._has_knowledge_support(
        "What should I do next?",
        context,
        conversation,
    ) is True


def test_retrieve_discards_distant_chunks():
    class FakeCollection:
        def count(self):
            return 2

        def query(self, **kwargs):
            return {
                "documents": [["matching procedure", "unrelated procedure"]],
                "metadatas": [[{"source": "supported.md"}, {"source": "other.md"}]],
                "distances": [[0.21, 0.46]],
            }

    class FakeChroma:
        def get_collection(self, name):
            assert name == chat_service_module.COLLECTION_NAME
            return FakeCollection()

    class FakeEmbeddings:
        def embed_query(self, query):
            return [0.0, 1.0]

    service = object.__new__(ChatService)
    service._chroma = FakeChroma()
    service._embeddings = FakeEmbeddings()

    chunks, sources = service._retrieve("CRM password reset")

    assert chunks == ["matching procedure"]
    assert sources == ["supported.md"]


def test_offline_fallback_does_not_match_generic_words(tmp_path, monkeypatch):
    db_path = tmp_path / "offline.db"
    with sqlite3.connect(db_path) as connection:
        connection.execute(
            "CREATE TABLE offline_protocols (question TEXT, answer TEXT)"
        )
        connection.execute(
            "INSERT INTO offline_protocols VALUES (?, ?)",
            (
                "agent cannot log in crm login failure password reset",
                "Reset the CRM password.",
            ),
        )

    monkeypatch.setattr(chat_service_module, "OFFLINE_DB_PATH", str(db_path))
    service = object.__new__(ChatService)

    assert service._offline_fallback("What is the capital of France?") is None
    assert service._offline_fallback("How do I reset my CRM password?") == (
        "Reset the CRM password."
    )
