-- CreateEnum
CREATE TYPE "LockStatus" AS ENUM ('LOCKED', 'UNLOCKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "lockExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedBy" INTEGER;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "lockExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedBy" INTEGER;

-- CreateTable
CREATE TABLE "RecordLock" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "lockedBy" INTEGER NOT NULL,
    "stationId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordLock_entityType_entityId_idx" ON "RecordLock"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "RecordLock_lockedBy_idx" ON "RecordLock"("lockedBy");

-- CreateIndex
CREATE INDEX "RecordLock_stationId_idx" ON "RecordLock"("stationId");

-- CreateIndex
CREATE INDEX "RecordLock_expiresAt_idx" ON "RecordLock"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecordLock_entityType_entityId_stationId_key" ON "RecordLock"("entityType", "entityId", "stationId");

-- AddForeignKey
ALTER TABLE "RecordLock" ADD CONSTRAINT "RecordLock_lockedBy_fkey" FOREIGN KEY ("lockedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordLock" ADD CONSTRAINT "RecordLock_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
