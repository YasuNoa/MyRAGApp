/*
  Warnings:

  - You are about to drop the column `category` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing category data to tags
UPDATE "Document"
SET "tags" = ARRAY["category"]
WHERE "category" IS NOT NULL AND "category" != '';

-- DropTable
ALTER TABLE "Document" DROP COLUMN "category";
