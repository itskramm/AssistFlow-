# AI-Assisted Workplace Support System

A thesis project focused on improving workflow efficiency and system usability for call center agents through an AI-powered workplace assistant.

## Overview

This system is designed to support agents during operational disruptions by providing real-time, context-aware troubleshooting guidance without forcing them to leave their main workspace. The project integrates a browser-based side panel, a Python FastAPI backend, a retrieval-augmented generation (RAG) workflow, and a local fallback system for downtime events.

The assistant is intended to help agents:

- retrieve relevant internal procedures and SOPs
- understand system issues quickly
- receive recommended next steps
- access offline recovery guidance during outages
- reduce resolution time during service interruptions

## Project Objectives

1. Build a Chrome extension side panel for live agent assistance.
2. Centralize knowledge in a searchable company knowledge base.
3. Implement semantic retrieval using vector search.
4. Generate actionable responses through the Google Gemini API.
5. Monitor evaluation metrics such as quality, speed, and retrieval precision.
6. Support downtime fallback with local cache and offline workflows.

## Core Architecture

### 1. Frontend Module
- React + Tailwind CSS
- Chrome Extension Manifest V3
- Side panel interface for agent interactions
- Real-time chat UI with quick response workflows

### 2. Backend Module
- Python + FastAPI
- REST endpoints to process requests and orchestrate retrieval
- Asynchronous request handling
- CORS and service integration for browser extension communication

### 3. Knowledge and Retrieval Module
- ChromaDB for vector storage
- Document ingestion for SOPs, markdown notes, and internal guides
- Embedding-based semantic search to match user queries to relevant context

### 4. Generative AI Module
- Google Gemini API
- Prompt-based orchestration using retrieved context
- Consolidated answer generation with step-by-step guidance

### 5. Offline Fallback Module
- SQLite or Redis-based local cache
- Predefined offline procedures and verified answers
- Fallback behavior during internet or API disruption

### 6. Evaluation Module
- Python-based testing and metric logging
- Latency monitoring
- Retrieval accuracy and response quality analysis

## Recommended Tech Stack

- Frontend: React, Tailwind CSS, Chrome Extension API
- Backend: Python, FastAPI, Uvicorn
- AI/LLM: Google Gemini 2.5 Flash
- Vector Database: ChromaDB
- Orchestration: LangChain or LlamaIndex
- Offline Cache: SQLite
- Evaluation: Python, pandas, Ragas

## Repository Structure

```text
AssistFlow/
├── README.md
├── .gitignore
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── api/
│       │   └── __init__.py
│       ├── core/
│       │   └── __init__.py
│       ├── models/
│       │   └── __init__.py
│       └── services/
│           └── __init__.py
├── data/
│   ├── knowledge/
│   └── offline_cache/
├── extension/
│   └── sidepanel/
│       ├── package.json
│       ├── vite.config.js
│       ├── tailwind.config.js
│       ├── index.html
│       └── src/
│           ├── App.jsx
│           ├── index.css
│           ├── main.jsx
│           └── components/
├── scripts/
│   ├── ingest_knowledge.py
│   └── evaluate_rag.py
└── tests/
    └── __init__.py
```

## Development Workflow

1. Build the knowledge ingestion and vector retrieval pipeline.
2. Validate the Gemini-based generation flow with example SOP documents.
3. Wrap the working logic in a FastAPI backend service.
4. Build the Chrome extension side panel UI.
5. Connect the frontend to the backend API.
6. Add offline fallback support through SQLite caching.
7. Run evaluation scripts to measure retrieval quality and latency.

## Local Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend Extension

```bash
cd extension/sidepanel
npm install
npm run dev
```

### Run the backend server

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Environment Configuration

Create a local environment file for backend configuration:

```env
GEMINI_API_KEY=your_google_gemini_api_key
CHROMA_DB_PATH=./data/chroma
OFFLINE_DB_PATH=./data/offline_cache/offline.db
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8000
```

## Project Notes

This repository is intended to be developed as a working thesis prototype. It should be expanded with real organizational knowledge, realistic SOP documents, live API metrics, and stronger production-level safeguards as the project matures.

## Expected Future Enhancements

- role-based agent and supervisor contexts
- multi-document ingestion from PDFs and legacy knowledge bases
- richer offline fallback insights for monitored systems
- evaluation dashboards for latency and answer quality
- stronger authentication and security controls
- deployment packaging for local or internal hosting

## Contribution Guidance

- Keep functions modular and readable.
- Use asynchronous processing where appropriate in FastAPI routes.
- Handle API outages gracefully with local fallback responses.
- Keep the Chrome extension interface simple, fast, and focused on support tasks.
- Document key processes and assumptions clearly in the source code and README.
