# Database Schema

Based on `prisma/schema.prisma`.

## Core Models

### User
Users of the application.
- `id`: PK (CUID)
- `email`: Unique
- `name`, `image`: Profile info
- `marketingConsent`: Boolean
- Relations: `accounts`, `sessions`, `messages`, `threads`, `documents`, `feedbacks`, `subscription`, `sentReferrals`, `receivedReferral`

### Document
Knowledge base items (RAG sources).
- `id`: PK
- `userId`: Owner
- `title`: Filename or title
- `content`: Full text content (for context retrieval)
- `summary`: Short summary of the content
- `type`: "knowledge" (File), "note" (Voice Memo/Note)
- `tags`: Array of strings
- `source`: "manual", "google-drive", "voicememo"
- `mimeType`: e.g. "application/pdf"
- `googleDriveId`, `lineMessageId`: External IDs
- `fileCreatedAt`: Timestamp of file creation

### Message
Chat messages.
- `id`: PK
- `content`: Text content
- `role`: "user" or "assistant"
- `userId`: Owner
- `threadId`: Belongs to a Thread
- `createdAt`: Timestamp

### Thread
Chat sessions/histories.
- `id`: PK
- `userId`: Owner
- `title`: Thread title (auto-generated)
- `updatedAt`: For sorting

### Account
NextAuth.js OAuth accounts (Google, LINE).
- Standard NextAuth fields (`access_token`, `refresh_token`, etc.)

## Monetization & Limits

### UserSubscription
Manages user plans and usage limits.
- `userId`: Unique
- `plan`: Enum (`FREE`, `STANDARD`, `STANDARD_TRIAL`, `PREMIUM`)
- `stripeCustomerId`, `stripeSubscriptionId`: Stripe mapping
- `currentPeriodEnd`: Expiration date
- **Quotas**:
    - `dailyChatCount`: Counter for daily messages.
    - `lastChatResetAt`: Timestamp for chat reset.
    - `dailyVoiceCount`: Counter for daily voice uploads (Free plan).
    - `lastVoiceDate`: Timestamp for voice reset.
    - `monthlyVoiceMinutes`: Counter for monthly usage (Paid plans).
    - `lastVoiceResetDate`: Timestamp for monthly reset.
    - `purchasedVoiceBalance`: Balance from "Ticket" purchases (minutes).

### Referral
Referral system tracking.
- `referrerId`: Who invited
- `refereeId`: Who was invited (User)
- `status`: `PENDING`, `COMPLETED` (Reward granted)

### Plan (Enum)
- `FREE`: Default
- `STANDARD`: Paid Tier 1
- `STANDARD_TRIAL`: Trial version of Standard (via Referral)
- `PREMIUM`: Paid Tier 2

## Guest System

### GuestSession
Temporary storage for non-logged-in users (Trial).
- `ipAddress`: For rate limiting
- `expiresAt`: TTL
- `chatCount`, `voiceCount`: Strict limits for guests
- `messages`, `voiceMemo`: JSON storage to migrate upon login
