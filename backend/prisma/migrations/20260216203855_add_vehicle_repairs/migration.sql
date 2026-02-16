-- CreateEnum
CREATE TYPE "VehicleRepairStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "VehicleStatus" ADD VALUE 'IN_REPAIR';

-- CreateTable
CREATE TABLE "VehicleRepair" (
    "id" TEXT NOT NULL,
    "repairNumber" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "fromStationId" TEXT NOT NULL,
    "closedAtStationId" TEXT,
    "status" "VehicleRepairStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "openedById" INTEGER NOT NULL,
    "closedById" INTEGER,
    "notes" TEXT,
    "internalNotes" TEXT,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION,
    "kmWhenOpened" INTEGER NOT NULL,
    "kmWhenClosed" INTEGER,
    "lockedBy" INTEGER,
    "lockedAt" TIMESTAMP(3),
    "lockedExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleRepair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleRepair_repairNumber_key" ON "VehicleRepair"("repairNumber");

-- CreateIndex
CREATE INDEX "VehicleRepair_vehicleId_idx" ON "VehicleRepair"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleRepair_status_idx" ON "VehicleRepair"("status");

-- CreateIndex
CREATE INDEX "VehicleRepair_openedAt_idx" ON "VehicleRepair"("openedAt");

-- CreateIndex
CREATE INDEX "VehicleRepair_fromStationId_idx" ON "VehicleRepair"("fromStationId");

-- CreateIndex
CREATE INDEX "VehicleRepair_closedAtStationId_idx" ON "VehicleRepair"("closedAtStationId");

-- CreateIndex
CREATE INDEX "VehicleRepair_lockedExpires_idx" ON "VehicleRepair"("lockedExpires");

-- AddForeignKey
ALTER TABLE "VehicleRepair" ADD CONSTRAINT "VehicleRepair_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRepair" ADD CONSTRAINT "VehicleRepair_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRepair" ADD CONSTRAINT "VehicleRepair_closedAtStationId_fkey" FOREIGN KEY ("closedAtStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRepair" ADD CONSTRAINT "VehicleRepair_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRepair" ADD CONSTRAINT "VehicleRepair_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
