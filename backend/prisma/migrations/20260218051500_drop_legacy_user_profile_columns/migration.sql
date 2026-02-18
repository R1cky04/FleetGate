-- Drop legacy profile columns now represented by ClientProfile and StaffProfile
ALTER TABLE "User" DROP COLUMN IF EXISTS "nif";
ALTER TABLE "User" DROP COLUMN IF EXISTS "licenseNumber";
ALTER TABLE "User" DROP COLUMN IF EXISTS "licenseExpiry";
ALTER TABLE "User" DROP COLUMN IF EXISTS "licenseIssueDate";
ALTER TABLE "User" DROP COLUMN IF EXISTS "licenseCountry";
ALTER TABLE "User" DROP COLUMN IF EXISTS "idCardNumber";
ALTER TABLE "User" DROP COLUMN IF EXISTS "idCardExpiry";
ALTER TABLE "User" DROP COLUMN IF EXISTS "employeeNumber";
ALTER TABLE "User" DROP COLUMN IF EXISTS "hireDate";
ALTER TABLE "User" DROP COLUMN IF EXISTS "departmentId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "isBlacklisted";
ALTER TABLE "User" DROP COLUMN IF EXISTS "blacklistReason";
ALTER TABLE "User" DROP COLUMN IF EXISTS "blacklistedAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "blacklistedBy";
ALTER TABLE "User" DROP COLUMN IF EXISTS "clientRating";
ALTER TABLE "User" DROP COLUMN IF EXISTS "totalRentals";
ALTER TABLE "User" DROP COLUMN IF EXISTS "customerType";
ALTER TABLE "User" DROP COLUMN IF EXISTS "companyName";
ALTER TABLE "User" DROP COLUMN IF EXISTS "companyTaxId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "brokerName";
ALTER TABLE "User" DROP COLUMN IF EXISTS "brokerReference";

-- Cleanup potential leftover index names
DROP INDEX IF EXISTS "User_nif_idx";
