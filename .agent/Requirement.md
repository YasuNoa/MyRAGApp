# Requirements

## Core Concept
A multi-modal AI assistant focused on Japanese users, capable of processing text, voice, and documents to provide intelligent responses and summaries.

## User Requirements
1.  **Context-Aware Chat**: Users want to chat with an AI that remembers previous conversations (Threads).
2.  **Document Understanding (RAG)**: Users want to upload files (PDF, Word, PPT, Excel) and have the AI answer questions based on them.
3.  **Voice Memos**: Users want to record or upload audio notes and get high-quality transcriptions and summaries.
4.  **External Integrations**:
    -   **Google Drive**: Direct import of files from cloud storage.
    -   **LINE**: Interaction with the bot via LINE messaging app.
5.  **Multilingual Support**: Primary focus on **Japanese** (JST timezone, Japanese prompts), but underlying models support multi-language.

## Technical Requirements
1.  **Performance**: Fast response times for RAG searches (Pinecone).
2.  **Accuracy**: High-quality embeddings and LLM responses (Gemini 2.0 Flash).
3.  **Scalability**: Microservices architecture (Next.js + Python/FastAPI) deployable on Cloud Run.
4.  **Security**: Secure authentication (NextAuth) and data protection.

## Business Requirements
1.  **Monetization**: tiered subscription model (Free, Standard, Premium) managed via Stripe.
2.  **Growth**: Referral system to incentivize user acquisition with trial extensions.
3.  **Cross-Platform**: Web App (PWA) and LINE Bot interface.
