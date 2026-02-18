-- CreateTable
CREATE TABLE IF NOT EXISTS "ClientProfile" (
  "userId" INTEGER NOT NULL,
  "nif" TEXT,
  "licenseNumber" TEXT,
  "licenseExpiry" TIMESTAMP(3),
  "licenseIssueDate" TIMESTAMP(3),
  "licenseCountry" TEXT,
  "idCardNumber" TEXT,
  "idCardExpiry" TIMESTAMP(3),
  "customerType" TEXT,
  "companyName" TEXT,
  "companyTaxId" TEXT,
  "brokerName" TEXT,
  "brokerReference" TEXT,
  "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
  "blacklistReason" TEXT,
  "blacklistedAt" TIMESTAMP(3),
  "blacklistedBy" INTEGER,
  "clientRating" DOUBLE PRECISION,
  "totalRentals" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StaffProfile" (
  "userId" INTEGER NOT NULL,
  "employeeNumber" TEXT NOT NULL,
  "hireDate" TIMESTAMP(3),
  "departmentId" TEXT,
  "stationId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ClientProfile_nif_key" ON "ClientProfile"("nif");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientProfile_licenseNumber_key" ON "ClientProfile"("licenseNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientProfile_idCardNumber_key" ON "ClientProfile"("idCardNumber");
CREATE INDEX IF NOT EXISTS "ClientProfile_nif_idx" ON "ClientProfile"("nif");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StaffProfile_employeeNumber_key" ON "StaffProfile"("employeeNumber");
CREATE INDEX IF NOT EXISTS "StaffProfile_stationId_idx" ON "StaffProfile"("stationId");
CREATE INDEX IF NOT EXISTS "StaffProfile_departmentId_idx" ON "StaffProfile"("departmentId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ClientProfile_userId_fkey'
  ) THEN
    ALTER TABLE "ClientProfile"
      ADD CONSTRAINT "ClientProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StaffProfile_userId_fkey'
  ) THEN
    ALTER TABLE "StaffProfile"
      ADD CONSTRAINT "StaffProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StaffProfile_stationId_fkey'
  ) THEN
    ALTER TABLE "StaffProfile"
      ADD CONSTRAINT "StaffProfile_stationId_fkey"
      FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StaffProfile_departmentId_fkey'
  ) THEN
    ALTER TABLE "StaffProfile"
      ADD CONSTRAINT "StaffProfile_departmentId_fkey"
      FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill ClientProfile from existing User data
INSERT INTO "ClientProfile" (
  "userId",
  "nif",
  "licenseNumber",
  "licenseExpiry",
  "licenseIssueDate",
  "licenseCountry",
  "idCardNumber",
  "idCardExpiry",
  "customerType",
  "companyName",
  "companyTaxId",
  "brokerName",
  "brokerReference",
  "isBlacklisted",
  "blacklistReason",
  "blacklistedAt",
  "blacklistedBy",
  "clientRating",
  "totalRentals",
  "createdAt",
  "updatedAt"
)
SELECT
  u."id",
  u."nif",
  u."licenseNumber",
  u."licenseExpiry",
  u."licenseIssueDate",
  u."licenseCountry",
  u."idCardNumber",
  u."idCardExpiry",
  u."customerType",
  u."companyName",
  u."companyTaxId",
  u."brokerName",
  u."brokerReference",
  u."isBlacklisted",
  u."blacklistReason",
  u."blacklistedAt",
  u."blacklistedBy",
  u."clientRating",
  u."totalRentals",
  u."createdAt",
  u."updatedAt"
FROM "User" u
ON CONFLICT ("userId") DO UPDATE SET
  "nif" = EXCLUDED."nif",
  "licenseNumber" = EXCLUDED."licenseNumber",
  "licenseExpiry" = EXCLUDED."licenseExpiry",
  "licenseIssueDate" = EXCLUDED."licenseIssueDate",
  "licenseCountry" = EXCLUDED."licenseCountry",
  "idCardNumber" = EXCLUDED."idCardNumber",
  "idCardExpiry" = EXCLUDED."idCardExpiry",
  "customerType" = EXCLUDED."customerType",
  "companyName" = EXCLUDED."companyName",
  "companyTaxId" = EXCLUDED."companyTaxId",
  "brokerName" = EXCLUDED."brokerName",
  "brokerReference" = EXCLUDED."brokerReference",
  "isBlacklisted" = EXCLUDED."isBlacklisted",
  "blacklistReason" = EXCLUDED."blacklistReason",
  "blacklistedAt" = EXCLUDED."blacklistedAt",
  "blacklistedBy" = EXCLUDED."blacklistedBy",
  "clientRating" = EXCLUDED."clientRating",
  "totalRentals" = EXCLUDED."totalRentals",
  "updatedAt" = EXCLUDED."updatedAt";

-- Backfill StaffProfile from existing User data
INSERT INTO "StaffProfile" (
  "userId",
  "employeeNumber",
  "hireDate",
  "departmentId",
  "stationId",
  "createdAt",
  "updatedAt"
)
SELECT
  u."id",
  COALESCE(NULLIF(TRIM(u."employeeNumber"), ''), 'EMP' || u."id"::TEXT) AS "employeeNumber",
  u."hireDate",
  u."departmentId",
  u."stationId",
  u."createdAt",
  u."updatedAt"
FROM "User" u
WHERE u."role" <> 'CLIENT'
  AND u."stationId" IS NOT NULL
ON CONFLICT ("userId") DO UPDATE SET
  "hireDate" = EXCLUDED."hireDate",
  "departmentId" = EXCLUDED."departmentId",
  "stationId" = EXCLUDED."stationId",
  "updatedAt" = EXCLUDED."updatedAt";
