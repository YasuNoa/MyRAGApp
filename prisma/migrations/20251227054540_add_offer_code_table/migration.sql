/*
  Warnings:

  - The values [STANDARD_TRIAL] on the enum `Plan` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Plan_new" AS ENUM ('FREE', 'STANDARD', 'PREMIUM');
ALTER TABLE "public"."UserSubscription" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "UserSubscription" ALTER COLUMN "plan" TYPE "Plan_new" USING ("plan"::text::"Plan_new");
ALTER TYPE "Plan" RENAME TO "Plan_old";
ALTER TYPE "Plan_new" RENAME TO "Plan";
DROP TYPE "public"."Plan_old";
ALTER TABLE "UserSubscription" ALTER COLUMN "plan" SET DEFAULT 'FREE';
COMMIT;

-- CreateTable
CREATE TABLE "OfferCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "referralId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfferCode_code_key" ON "OfferCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "OfferCode_referralId_key" ON "OfferCode"("referralId");

-- AddForeignKey
ALTER TABLE "OfferCode" ADD CONSTRAINT "OfferCode_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE SET NULL ON UPDATE CASCADE;
