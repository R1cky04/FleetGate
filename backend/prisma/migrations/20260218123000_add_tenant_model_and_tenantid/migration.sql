-- CreateEnum
CREATE TYPE "TenantDbMode" AS ENUM ('SHARED', 'DEDICATED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dbMode" "TenantDbMode" NOT NULL DEFAULT 'SHARED',
    "dbName" TEXT,
    "dbHost" TEXT,
    "dbPort" TEXT,
    "dbUser" TEXT,
    "dbPassword" TEXT,
    "dbUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_code_key" ON "Tenant"("code");
CREATE INDEX "Tenant_isActive_idx" ON "Tenant"("isActive");
CREATE INDEX "Tenant_dbMode_idx" ON "Tenant"("dbMode");

-- Add tenantId columns
ALTER TABLE "User" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "UserPermission" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Station" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Department" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "VehicleGroup" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Reservation" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Contract" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Maintenance" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "VehicleRepair" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "VehicleTransfer" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "AdditionalDriver" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "DamageType" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "Notification" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "ActivityLog" ADD COLUMN "tenantId" INTEGER;
ALTER TABLE "RecordLock" ADD COLUMN "tenantId" INTEGER;

-- CreateIndexes
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "UserPermission_tenantId_idx" ON "UserPermission"("tenantId");
CREATE INDEX "Station_tenantId_idx" ON "Station"("tenantId");
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");
CREATE INDEX "VehicleGroup_tenantId_idx" ON "VehicleGroup"("tenantId");
CREATE INDEX "Vehicle_tenantId_idx" ON "Vehicle"("tenantId");
CREATE INDEX "Reservation_tenantId_idx" ON "Reservation"("tenantId");
CREATE INDEX "Contract_tenantId_idx" ON "Contract"("tenantId");
CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");
CREATE INDEX "Maintenance_tenantId_idx" ON "Maintenance"("tenantId");
CREATE INDEX "VehicleRepair_tenantId_idx" ON "VehicleRepair"("tenantId");
CREATE INDEX "VehicleTransfer_tenantId_idx" ON "VehicleTransfer"("tenantId");
CREATE INDEX "AdditionalDriver_tenantId_idx" ON "AdditionalDriver"("tenantId");
CREATE INDEX "DamageType_tenantId_idx" ON "DamageType"("tenantId");
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX "ActivityLog_tenantId_idx" ON "ActivityLog"("tenantId");
CREATE INDEX "RecordLock_tenantId_idx" ON "RecordLock"("tenantId");

-- AddForeignKeys
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Station" ADD CONSTRAINT "Station_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleGroup" ADD CONSTRAINT "VehicleGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleRepair" ADD CONSTRAINT "VehicleRepair_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleTransfer" ADD CONSTRAINT "VehicleTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdditionalDriver" ADD CONSTRAINT "AdditionalDriver_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DamageType" ADD CONSTRAINT "DamageType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecordLock" ADD CONSTRAINT "RecordLock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
