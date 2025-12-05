-- CreateTable
CREATE TABLE "GuestSession" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "chatCount" INTEGER NOT NULL DEFAULT 0,
    "voiceCount" INTEGER NOT NULL DEFAULT 0,
    "messages" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "voiceMemo" TEXT,

    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);
