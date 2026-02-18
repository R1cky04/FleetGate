-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_stationId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "stationId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
