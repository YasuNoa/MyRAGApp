/*
  Warnings:

  - You are about to drop the column `externalId` on the `Document` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[googleDriveId]` on the table `Document` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[lineMessageId]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "externalId",
ADD COLUMN     "googleDriveId" TEXT,
ADD COLUMN     "lineMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Document_googleDriveId_key" ON "Document"("googleDriveId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_lineMessageId_key" ON "Document"("lineMessageId");
