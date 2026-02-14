-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('RESERVATION_CONFIRMED', 'RESERVATION_CANCELLED', 'CONTRACT_CREATED', 'CONTRACT_COMPLETED', 'PAYMENT_RECEIVED', 'MAINTENANCE_DUE', 'VEHICLE_UPGRADE', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "originalVehicleGroupId" TEXT,
ADD COLUMN     "upgradeApprovedAt" TIMESTAMP(3),
ADD COLUMN     "upgradeApprovedBy" INTEGER,
ADD COLUMN     "upgradeCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "upgradeReason" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blacklistReason" TEXT,
ADD COLUMN     "blacklistedAt" TIMESTAMP(3),
ADD COLUMN     "blacklistedBy" INTEGER,
ADD COLUMN     "clientRating" DOUBLE PRECISION,
ADD COLUMN     "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalRentals" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AdditionalDriver" (
    "id" TEXT NOT NULL,
    "contractId" INTEGER NOT NULL,
    "driverId" INTEGER,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "cpf" TEXT,
    "nif" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3) NOT NULL,
    "licenseIssueDate" TIMESTAMP(3),
    "licenseCountry" TEXT NOT NULL DEFAULT 'Portugal',
    "idCardNumber" TEXT NOT NULL,
    "idCardExpiry" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Portugal',
    "dailyCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "minCost" DOUBLE PRECISION,
    "maxCost" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DamageType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "actionUrl" TEXT,
    "actionLabel" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdditionalDriver_contractId_idx" ON "AdditionalDriver"("contractId");

-- CreateIndex
CREATE INDEX "AdditionalDriver_driverId_idx" ON "AdditionalDriver"("driverId");

-- CreateIndex
CREATE INDEX "AdditionalDriver_licenseNumber_idx" ON "AdditionalDriver"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DamageType_code_key" ON "DamageType"("code");

-- CreateIndex
CREATE INDEX "DamageType_code_idx" ON "DamageType"("code");

-- CreateIndex
CREATE INDEX "DamageType_category_idx" ON "DamageType"("category");

-- CreateIndex
CREATE INDEX "DamageType_severity_idx" ON "DamageType"("severity");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "AdditionalDriver" ADD CONSTRAINT "AdditionalDriver_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalDriver" ADD CONSTRAINT "AdditionalDriver_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
