/*
  Warnings:

  - You are about to drop the `OfferCode` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OfferCode" DROP CONSTRAINT "OfferCode_referralId_fkey";

-- DropTable
DROP TABLE "OfferCode";
