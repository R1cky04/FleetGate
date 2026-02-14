/*
  Warnings:

  - You are about to drop the column `internalNotes` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `internalNotes` on the `Reservation` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Reservation` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VehicleTransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CONTRACT_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'VEHICLE_TRANSFER';

-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "internalNotes",
DROP COLUMN "notes",
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" INTEGER,
ADD COLUMN     "clientNotes" TEXT,
ADD COLUMN     "damageOnReturn" TEXT,
ADD COLUMN     "stationNotes" TEXT;

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "internalNotes",
DROP COLUMN "notes",
ADD COLUMN     "clientNotes" TEXT,
ADD COLUMN     "stationNotes" TEXT;

-- CreateTable
CREATE TABLE "VehicleTransfer" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "fromStationId" TEXT NOT NULL,
    "toStationId" TEXT NOT NULL,
    "driverId" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "departureDate" TIMESTAMP(3),
    "arrivalDate" TIMESTAMP(3),
    "status" "VehicleTransferStatus" NOT NULL DEFAULT 'PENDING',
    "kmAtDeparture" INTEGER,
    "kmAtArrival" INTEGER,
    "reason" TEXT NOT NULL,
    "clientNotes" TEXT,
    "stationNotes" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,

    CONSTRAINT "VehicleTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleTransfer_transferNumber_key" ON "VehicleTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "VehicleTransfer_transferNumber_idx" ON "VehicleTransfer"("transferNumber");

-- CreateIndex
CREATE INDEX "VehicleTransfer_vehicleId_idx" ON "VehicleTransfer"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleTransfer_status_idx" ON "VehicleTransfer"("status");

-- CreateIndex
CREATE INDEX "VehicleTransfer_scheduledDate_idx" ON "VehicleTransfer"("scheduledDate");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_cancelledBy_fkey" FOREIGN KEY ("cancelledBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTransfer" ADD CONSTRAINT "VehicleTransfer_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTransfer" ADD CONSTRAINT "VehicleTransfer_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTransfer" ADD CONSTRAINT "VehicleTransfer_toStationId_fkey" FOREIGN KEY ("toStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTransfer" ADD CONSTRAINT "VehicleTransfer_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTransfer" ADD CONSTRAINT "VehicleTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
