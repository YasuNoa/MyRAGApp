# Technical Specification

## Tech Stack

### Frontend
-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Auth**: NextAuth.js v5 (Beta)
-   **Hosting**: likely Google Cloud Run (Dockerized)

### Backend
-   **Framework**: FastAPI (Python)
-   **Runtime**: Python 3.10+
-   **Key Libraries**:
    -   `google-generativeai`: Gemini API client
    -   `pinecone-client`: Vector DB client
    -   `prisma`: DB client (Python version)
    -   `langchain`: Text splitting and orchestration
    -   `ffmpeg`: Audio processing (installed in Docker/System)

### Database & Storage
-   **Primary DB**: PostgreSQL (User data, Chat history, Document metadata/content)
-   **Vector DB**: Pinecone (Embeddings)
-   **Object Storage**: Implicit (Local tmp or passed through to processing, but file content stored in Postgres `Document.content` for RAG).

## AI Models
-   **LLM**: Google Gemini 2.0 Flash (`gemini-2.0-flash`)
-   **Embeddings**: Google Text Embedding 004 (`models/text-embedding-004`)

## External Services
-   **Stripe**: Payments (Checkout, Webhooks)
-   **Google Cloud**: Deployed environment (inferred)
-   **LINE Platform**: Messaging API

## Development Environment
-   **Docker**: `docker-compose.yml` orchestrates Frontend, Backend, and Postgres (or connects to external DB).
-   **Prisma**: ORM for schema management.

## Limitations & Constraints
-   **Voice Processing**:
    -   Free: 20 min cap.
    -   Standard: 90 min cap.
    -   Premium: 180 min cap.
-   **Chunking**: Text split into ~1500 chars with 150 overlap for connection to Vector DB.
