-- CreateEnum
CREATE TYPE "FlowLevel" AS ENUM ('NONE', 'SPOTTING', 'LIGHT', 'MEDIUM', 'HEAVY');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ACCOUNT_DELETED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "googlePhotoUrl" TEXT;

-- CreateTable
CREATE TABLE "CycleDayLog" (
    "id" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "flow" "FlowLevel",
    "symptoms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleDayLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CycleDayLog_patientProfileId_date_key" ON "CycleDayLog"("patientProfileId", "date");

-- AddForeignKey
ALTER TABLE "CycleDayLog" ADD CONSTRAINT "CycleDayLog_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
