-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'BROKER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "brokerName" TEXT,
ADD COLUMN     "brokerReference" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyTaxId" TEXT,
ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL';
