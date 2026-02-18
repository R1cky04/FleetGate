/*
  Warnings:

  - The primary key for the `Station` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `code` on the `Station` table. All the data in the column will be lost.
  - The `id` column on the `Station` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `stationId` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `closedAtStationId` column on the `VehicleRepair` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `pickupStationId` on the `Contract` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `returnStationId` on the `Contract` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `stationId` on the `RecordLock` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `pickupStationId` on the `Reservation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `returnStationId` on the `Reservation` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `stationId` on the `Vehicle` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fromStationId` on the `VehicleRepair` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `fromStationId` on the `VehicleTransfer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `toStationId` on the `VehicleTransfer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_pickupStationId_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_returnStationId_fkey";

-- DropForeignKey
ALTER TABLE "RecordLock" DROP CONSTRAINT "RecordLock_stationId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_pickupStationId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_returnStationId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_stationId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_stationId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleRepair" DROP CONSTRAINT "VehicleRepair_closedAtStationId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleRepair" DROP CONSTRAINT "VehicleRepair_fromStationId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleTransfer" DROP CONSTRAINT "VehicleTransfer_fromStationId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleTransfer" DROP CONSTRAINT "VehicleTransfer_toStationId_fkey";

-- DropIndex
DROP INDEX "Station_code_idx";

-- DropIndex
DROP INDEX "Station_code_key";

-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "pickupStationId",
ADD COLUMN     "pickupStationId" INTEGER NOT NULL,
DROP COLUMN "returnStationId",
ADD COLUMN     "returnStationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RecordLock" DROP COLUMN "stationId",
ADD COLUMN     "stationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Reservation" DROP COLUMN "pickupStationId",
ADD COLUMN     "pickupStationId" INTEGER NOT NULL,
DROP COLUMN "returnStationId",
ADD COLUMN     "returnStationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Station" DROP CONSTRAINT "Station_pkey",
DROP COLUMN "code",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Station_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP COLUMN "stationId",
ADD COLUMN     "stationId" INTEGER;

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "stationId",
ADD COLUMN     "stationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "VehicleRepair" DROP COLUMN "fromStationId",
ADD COLUMN     "fromStationId" INTEGER NOT NULL,
DROP COLUMN "closedAtStationId",
ADD COLUMN     "closedAtStationId" INTEGER;

-- AlterTable
ALTER TABLE "VehicleTransfer" DROP COLUMN "fromStationId",
ADD COLUMN     "fromStationId" INTEGER NOT NULL,
DROP COLUMN "toStationId",
ADD COLUMN     "toStationId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "RecordLock_stationId_idx" ON "RecordLock"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordLock_entityType_entityId_stationId_key" ON "RecordLock"("entityType", "entityId", "stationId");

-- CreateIndex
CREATE INDEX "User_stationId_idx" ON "User"("stationId");

-- CreateIndex
CREATE INDEX "Vehicle_stationId_idx" ON "Vehicle"("stationId");

-- CreateIndex
CREATE INDEX "VehicleRepair_fromStationId_idx" ON "VehicleRepair"("fromStationId");

-- CreateIndex
CREATE INDEX "VehicleRepair_closedAtStationId_idx" ON "VehicleRepair"("closedAtStationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_pickupStationId_fkey" FOREIGN KEY ("pickupStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_returnStationId_fkey" FOREIGN KEY ("returnStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_pickupStationId_fkey" FOREIGN KEY ("pickupStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_returnStationId_fkey" FOREIGN KEY ("returnStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRepair" ADD CONSTRAINT "VehicleRepair_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleRepair" ADD CONSTRAINT "VehicleRepair_closedAtStationId_fkey" FOREIGN KEY ("closedAtStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTransfer" ADD CONSTRAINT "VehicleTransfer_fromStationId_fkey" FOREIGN KEY ("fromStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTransfer" ADD CONSTRAINT "VehicleTransfer_toStationId_fkey" FOREIGN KEY ("toStationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordLock" ADD CONSTRAINT "RecordLock_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
