-- Add userCode column (nullable first)
ALTER TABLE "User" ADD COLUMN "userCode" TEXT;

-- Backfill existing users with deterministic uppercase codes
UPDATE "User"
SET "userCode" = CONCAT('USR', LPAD("id"::text, 6, '0'))
WHERE "userCode" IS NULL;

-- Enforce NOT NULL + unique constraint
ALTER TABLE "User" ALTER COLUMN "userCode" SET NOT NULL;
CREATE UNIQUE INDEX "User_userCode_key" ON "User"("userCode");
