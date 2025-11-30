-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "category" TEXT,
ADD COLUMN     "content" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'knowledge';
