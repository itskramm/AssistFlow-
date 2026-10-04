# Project Context: AI-Assisted Workplace Support System

You are an AI coding assistant helping to build a thesis project: "Design and Development of an AI-Assisted Workplace Support System for Improving Workflow Efficiency and System Usability."

## Project Overview
This system is an AI-powered workplace support assistant designed for call center agents. It integrates the Google Gemini API with a company-specific knowledge base using Retrieval-Augmented Generation (RAG). The goal is to provide agents with context-aware troubleshooting guidance, recommended next steps, and alternative workflow tools during process disruptions and system downtime—without them leaving their primary workspace.

## Core Objectives
1. **Frontend:** Develop an intuitive side-panel (Chrome Extension Manifest V3) for real-time assistance.
2. **Knowledge Base:** Centralize SOPs, error logs, and offline protocols.
3. **Retrieval (RAG):** Implement vector retrieval for semantic search based on user queries.
4. **Generation:** Integrate Google Gemini API to synthesize retrieved knowledge into actionable responses.
5. **Evaluation:** Measure precision, accuracy, and latency under simulated downtime conditions.

## Tech Stack Requirements
*   **Frontend:** React, Tailwind CSS, Chrome Extension API (Manifest V3 - Side Panel).
*   **Backend:** Python, FastAPI.
*   **AI/LLM:** Google Gemini API (Gemini 2.5 Flash).
*   **RAG/Vector DB:** ChromaDB (local/open-source).
*   **Orchestration:** LangChain or LlamaIndex.
*   **Downtime Cache:** SQLite or Redis (Local fallback).

## Development Rules
*   **Code Style:** Keep code modular, clean, and well-commented.
*   **Asynchronous:** Use `async/await` heavily in the FastAPI backend to ensure non-blocking requests.
*   **Error Handling:** Ensure robust error handling, especially for Gemini API rate limits and network disconnections (triggering the offline cache).
*   **UI/UX:** The Chrome extension UI must be clean, uncluttered, and highly responsive (Tailwind CSS).