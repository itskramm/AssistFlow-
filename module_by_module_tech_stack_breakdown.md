# AI-Assisted Workplace Support System - Development Guide

This repository contains the source code for the AI-Assisted Workplace Support System. The project is divided into distinct modules to ensure a clean, maintainable, and scalable architecture.

## Module 1: Frontend (Browser Extension)

**Tech Stack:** React, Tailwind CSS, Chrome Extension Manifest V3.
**Purpose:** Provides the "side-panel" interface for call center agents to interact with the AI without leaving their current web applications.

* **`manifest.json`**: Configures the extension, permissions (`sidePanel`, `storage`, `activeTab`), and background scripts.

* **Side Panel UI**: Built with React and styled with Tailwind CSS for a clean chat-like interface.

* **State Management**: React hooks to manage chat history, loading states, and offline status.

* **API Client**: Communicates with the FastAPI backend to send queries and receive streaming or static responses.

## Module 2: Backend API Gateway

**Tech Stack:** Python, FastAPI, Uvicorn.
**Purpose:** Acts as the central orchestrator routing frontend requests to the vector database and the Gemini API.

* **Endpoints**: RESTful API endpoints (e.g., `/api/chat`, `/api/health`, `/api/feedback`).

* **Asynchronous Processing**: Ensures multiple agents can query the system concurrently without lag.

* **CORS Configuration**: Allows secure communication between the Chrome extension and the local/cloud API server.

## Module 3: Knowledge Base & Vector Retrieval (RAG)

**Tech Stack:** ChromaDB (or Qdrant), LangChain / LlamaIndex, Google Text Embeddings.
**Purpose:** Stores and retrieves company-specific Standard Operating Procedures (SOPs) and troubleshooting guides.

* **Document Ingestion**: Scripts to parse PDFs, text files, and markdown SOPs, chunk them, and convert them into vector embeddings using Google's `text-embedding-004`.

* **Vector Store**: ChromaDB stores these embeddings locally for fast semantic retrieval.

* **Retriever**: Searches the database for the top-K most relevant chunks based on the agent's natural language query.

## Module 4: Generative AI & Orchestration

**Tech Stack:** Google Gemini API (Gemini 2.5 Flash), LangChain.
**Purpose:** Synthesizes the retrieved SOPs and the user's query into a coherent, actionable response.

* **Prompt Engineering**: System prompts designed to restrict the AI to *only* use retrieved context and format output as step-by-step instructions.

* **LLM Chain**: Combines the retrieved documents and user query, sending the payload to the Gemini API.

## Module 5: Downtime & Offline Caching

**Tech Stack:** SQLite or Redis.
**Purpose:** Fulfills the objective of providing alternative workflows during system downtime.

* **Query Caching**: Stores frequently asked questions and their verified answers.

* **Offline Fallback**: If the FastAPI server detects a loss of internet connection (cannot reach Gemini API), it queries the local SQLite database for pre-saved "offline protocols" to guide the agent.

## Module 6: Evaluation & Metrics

**Tech Stack:** Python, Ragas Framework, Pandas.
**Purpose:** Evaluates the technical performance of the RAG system to satisfy the thesis evaluation objectives.

* **Logging**: Captures processing latency (time taken from query to response).

* **Quality Metrics**: Uses the Ragas framework to score response retrieval precision, context recall, and generation accuracy.

## Recommended Development Flow

1. **Setup Module 3 & 4 (The Core AI):** Start by writing a python script to ingest dummy SOPs into ChromaDB and successfully generate a RAG response using the Gemini API in your terminal.

2. **Setup Module 2 (Backend):** Wrap your working RAG script into a FastAPI application with a `/chat` endpoint.

3. **Setup Module 1 (Frontend):** Build the Chrome Extension in React, set up the side panel, and connect it to your local FastAPI backend.

4. **Setup Module 5 (Caching):** Add the offline SQLite fallback logic to your FastAPI backend.

5. **Setup Module 6 (Evaluation):** Write testing scripts to simulate queries and log the performance metrics.