# Features

## AI & RAG
-   **Chat Interface**: Thread-based conversation with context retention.
-   **Document Ingestion**:
    -   Supports PDF, DOCX, PPTX, XLSX, CSV.
    -   Google Drive Picker integration.
    -   OCR for image-heavy PDFs (via Gemini).
-   **Search**:
    -   Semantic Search (Vector Embeddings).
    -   Keyword/Filename Search (Postgres).
    -   Web Search fallback (DuckDuckGo).
    -   Tag-based filtering.
-   **Voice AI**:
    -   Transcribes audio files (mp3, wav, m4a).
    -   Generates concise summaries.
    -   Speaker diarization (implied by Gemini capabilities, though code implementation depends on prompt).

## User System
-   **Authentication**:
    -   Sign in with Google.
    -   Sign in with LINE.
    -   Guest/Trial Mode (limited usage without login).
-   **Dashboard**:
    -   Usage statistics (Chat count, Voice minutes).
    -   Plan management.
    -   Knowledge base management (List, Delete, Update Tags).

## Monetization
-   **Subscription Plans**: Free, Standard, Premium.
-   **Ticket System**: Pay-as-you-go top-ups for voice processing time.
-   **Referral Program**: Invite friends to get free Standard plan access.
-   **Coupons**: Stripe promotion code support.

## Platform
-   **PWA**: Installable as a home screen app.
-   **LINE Bot**: Chat capability directly from LINE (utilizing the same RAG backend).
