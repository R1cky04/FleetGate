/*
  Warnings:

  - The `customerType` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "closeClientSignature" TEXT,
ADD COLUMN     "closeStaffSignature" TEXT,
ADD COLUMN     "paymentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "preCloseAt" TIMESTAMP(3),
ADD COLUMN     "preCloseClientSignature" TEXT,
ADD COLUMN     "preCloseNotes" TEXT,
ADD COLUMN     "preCloseStaffSignature" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsSignature" TEXT,
ADD COLUMN     "termsText" TEXT,
ADD COLUMN     "termsVersion" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "customerType",
ADD COLUMN     "customerType" TEXT;

-- DropEnum
DROP TYPE "CustomerType";
