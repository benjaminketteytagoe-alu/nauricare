-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TRIAGE_CONSENT_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE 'TRIAGE_CONSENT_WITHDRAWN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "consentTimestamp" TIMESTAMP(3),
ADD COLUMN     "consentVersion" TEXT DEFAULT '2026.1',
ADD COLUMN     "hasConsentedToPrivacy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasConsentedToTriage" BOOLEAN NOT NULL DEFAULT false;

