-- Complete tenant coverage and vehicle risk/status flags

ALTER TABLE "ClientProfile"
ADD COLUMN "tenantId" INTEGER;

ALTER TABLE "StaffProfile"
ADD COLUMN "tenantId" INTEGER;

ALTER TABLE "SystemConfig"
ADD COLUMN "tenantId" INTEGER;

ALTER TABLE "Vehicle"
ADD COLUMN "isStolen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isSold" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- Backfill tenantId using related entities
UPDATE "ClientProfile" cp
SET "tenantId" = u."tenantId"
FROM "User" u
WHERE cp."userId" = u."id"
  AND cp."tenantId" IS NULL;

UPDATE "StaffProfile" sp
SET "tenantId" = COALESCE(
  u."tenantId",
  (
    SELECT s."tenantId"
    FROM "Station" s
    WHERE s."id" = sp."stationId"
  )
)
FROM "User" u
WHERE sp."userId" = u."id"
  AND sp."tenantId" IS NULL;

-- If there is exactly one tenant, link existing system config rows to it
WITH single_tenant AS (
  SELECT "id"
  FROM "Tenant"
  WHERE "isActive" = true
  ORDER BY "id"
  LIMIT 2
)
UPDATE "SystemConfig" sc
SET "tenantId" = (SELECT "id" FROM single_tenant LIMIT 1)
WHERE sc."tenantId" IS NULL
  AND (SELECT COUNT(*) FROM single_tenant) = 1;

CREATE INDEX "ClientProfile_tenantId_idx" ON "ClientProfile"("tenantId");
CREATE INDEX "StaffProfile_tenantId_idx" ON "StaffProfile"("tenantId");
CREATE INDEX "SystemConfig_tenantId_idx" ON "SystemConfig"("tenantId");

CREATE INDEX "Vehicle_isStolen_idx" ON "Vehicle"("isStolen");
CREATE INDEX "Vehicle_isSold_idx" ON "Vehicle"("isSold");
CREATE INDEX "Vehicle_isBlocked_idx" ON "Vehicle"("isBlocked");

ALTER TABLE "ClientProfile"
ADD CONSTRAINT "ClientProfile_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StaffProfile"
ADD CONSTRAINT "StaffProfile_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SystemConfig"
ADD CONSTRAINT "SystemConfig_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
