-- Phase 1: Major platform expansion
-- Adds provider profile fields, availability slots, MISSED appointment status,
-- prescription pharmacy suggestion, and appointment-gated DirectMessage model.

-- 1. Provider profile fields on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "licenseNumber"       TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hospitalAffiliation" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "secondaryEmail"      TEXT;

-- 2. Add MISSED to AppointmentStatus enum
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'MISSED';

-- 3. Convert Appointment.status from TEXT to AppointmentStatus enum
--    Coerce legacy 'PENDING' (and any unknown) values to 'SCHEDULED' first.
UPDATE "Appointment"
SET "status" = 'SCHEDULED'
WHERE "status" NOT IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED');

ALTER TABLE "Appointment"
  ALTER COLUMN "status" TYPE "AppointmentStatus"
    USING "status"::"AppointmentStatus";

ALTER TABLE "Appointment"
  ALTER COLUMN "status" SET DEFAULT 'SCHEDULED'::"AppointmentStatus";

-- 4. ProviderAvailability model
CREATE TABLE IF NOT EXISTS "ProviderAvailability" (
  "id"          TEXT NOT NULL,
  "providerId"  TEXT NOT NULL,
  "date"        DATE NOT NULL,
  "startTime"   TEXT NOT NULL,
  "endTime"     TEXT NOT NULL,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProviderAvailability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProviderAvailability_providerId_date_startTime_endTime_key"
  ON "ProviderAvailability"("providerId", "date", "startTime", "endTime");

CREATE INDEX IF NOT EXISTS "ProviderAvailability_providerId_idx" ON "ProviderAvailability"("providerId");
CREATE INDEX IF NOT EXISTS "ProviderAvailability_date_idx"       ON "ProviderAvailability"("date");

ALTER TABLE "ProviderAvailability"
  ADD CONSTRAINT "ProviderAvailability_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE CASCADE;

-- 5. Prescription: suggestedPharmacyId + named relation for existing pharmacyId
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "suggestedPharmacyId" TEXT;
CREATE INDEX IF NOT EXISTS "Prescription_suggestedPharmacyId_idx" ON "Prescription"("suggestedPharmacyId");

ALTER TABLE "Prescription"
  ADD CONSTRAINT "Prescription_suggestedPharmacyId_fkey"
  FOREIGN KEY ("suggestedPharmacyId") REFERENCES "Pharmacy"("id") ON DELETE SET NULL;

-- 6. DirectMessage model
CREATE TABLE IF NOT EXISTS "DirectMessage" (
  "id"         TEXT NOT NULL,
  "senderId"   TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "content"    TEXT NOT NULL,
  "isRead"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DirectMessage_senderId_idx"            ON "DirectMessage"("senderId");
CREATE INDEX IF NOT EXISTS "DirectMessage_receiverId_idx"          ON "DirectMessage"("receiverId");
CREATE INDEX IF NOT EXISTS "DirectMessage_senderId_receiverId_idx" ON "DirectMessage"("senderId", "receiverId");

ALTER TABLE "DirectMessage"
  ADD CONSTRAINT "DirectMessage_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "DirectMessage"
  ADD CONSTRAINT "DirectMessage_receiverId_fkey"
  FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE;
