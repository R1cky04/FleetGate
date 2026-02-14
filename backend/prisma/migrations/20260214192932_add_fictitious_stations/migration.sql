-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "isFictitious" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "purpose" TEXT;
