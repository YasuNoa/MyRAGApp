# API Documentation

## Backend API (Python/FastAPI)
Base URL: `http://localhost:8000` (Internal)

### Chat
- **POST** `/ask`
    - **Body**:
        ```json
        {
          "query": "string",
          "userId": "string",
          "threadId": "string (optional)",
          "tags": ["string"]
        }
        ```
    - **Logic**:
        1. Checks User Subscription & quotas.
        2. Generates Embedding (Gemini).
        3. searches Pinecone & Local DB.
        4. Performs Web Search (DuckDuckGo via SearchService) if needed.
        5. Generates Answer (Gemini 2.0 Flash).
    - **Returns**: `{ "answer": "...", "sources": [], "threadId": "..." }`

### Voice
- **POST** `/process-voice-memo` (or `/voice/process-voice-memo`)
    - **Content-Type**: `multipart/form-data`
    - **Body**:
        - `file`: Audio file
        - `metadata`: JSON string `{"userId": "...", "fileId": "...", "tags": []}`
        - `save`: boolean
    - **Logic**:
        1. Checks Plan Limits (Free: 20min, Std: 90min, Prem: 180min). Truncates if needed.
        2. Splits audio into 10-minute chunks.
        3. Transcribes using Gemini 2.0 Flash.
        4. Generates Summary.
        5. Embeds chunks -> Pinecone.
        6. Saves Text/Summary -> `Document` (Postgres).
        7. Triggers Referral Reward if applicable.

### Health
- **GET** `/health`: Returns `{"status": "ok"}`
- **GET** `/`: Returns `{"message": "Python Backend is running!"}`

## Frontend API (Next.js App Router)

### Stripe
- **POST** `/api/stripe/checkout`
    - **Body**: `{"plan": "STANDARD" | "PREMIUM" | "TICKET", "interval": "month" | "year" | "one_time"}`
    - **Returns**: `{"url": "stripe_checkout_url"}`
- **POST** `/api/stripe/webhook`
    - Handles `checkout.session.completed`:
        - Activates Subscription.
        - Adds Ticket Balance (if TICKET).
        - Links Referral (if `referralSource` cookie present).
    - Handles `customer.subscription.updated`, `deleted`, `invoice.payment_succeeded`.

### Knowledge / Upload (Inferred)
- **POST** `/api/knowledge/list`: List user documents.
- **POST** `/api/knowledge/delete`: Delete document (and calling specific backend cleanup if needed).
- **POST** `/api/upload`: Handled likely by direct upload to Backend or via Next.js proxying to backend `process-and-save-content` logic (which is modular in `main.py`).

### Auth
- **GET/POST** `/api/auth/[...nextauth]`: NextAuth.js endpoints for Login/Logout/Session.
