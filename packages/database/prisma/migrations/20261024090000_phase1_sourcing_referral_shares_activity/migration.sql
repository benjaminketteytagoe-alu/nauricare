-- CreateEnum
CREATE TYPE "ProviderScrapeStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProviderCandidateStatus" AS ENUM ('PENDING_REVIEW', 'INVITED', 'PUBLISHED', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "ProviderConsentSource" AS ENUM ('INVITE_CLAIMED', 'ADMIN_ATTESTED');

-- CreateEnum
CREATE TYPE "PatientActivityType" AS ENUM ('AI_TRIAGE', 'APPOINTMENT_BOOKED', 'REFERRAL_CREATED', 'REFERRAL_SHARED', 'REFERRAL_SHARE_REVOKED', 'REFERRAL_SHARE_OPENED', 'INSURANCE_UPDATED', 'CONSENT_GRANTED', 'CONSENT_WITHDRAWN', 'CYCLE_LOGGED', 'PRESCRIPTION_ROUTED', 'FEEDBACK_SUBMITTED', 'SIGNED_IN', 'PROFILE_UPDATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PROVIDER_SOURCE_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'PROVIDER_SCRAPE_RUN';
ALTER TYPE "AuditAction" ADD VALUE 'PROVIDER_CANDIDATE_REVIEW';
ALTER TYPE "AuditAction" ADD VALUE 'PROVIDER_CANDIDATE_PUBLISH';

-- AlterTable
ALTER TABLE "PractitionerProfile" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "yearsExperience" INTEGER;

-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ProviderSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderScrapeRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "ProviderScrapeStatus" NOT NULL DEFAULT 'QUEUED',
    "triggeredById" TEXT NOT NULL,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "candidatesFound" INTEGER NOT NULL DEFAULT 0,
    "log" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderScrapeRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCandidate" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "runId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "yearsExperience" INTEGER,
    "facilityName" TEXT,
    "practiceLocation" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photoSourceUrl" TEXT,
    "profileUrl" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extractor" TEXT NOT NULL,
    "status" "ProviderCandidateStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "inviteTokenHash" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3),
    "consentSource" "ProviderConsentSource",
    "consentRecordedAt" TIMESTAMP(3),
    "consentNote" TEXT,
    "publishedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralShare" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "payloadVersion" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralShareAccess" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralShareAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PatientActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "details" JSONB,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderSource_url_key" ON "ProviderSource"("url");

-- CreateIndex
CREATE INDEX "ProviderScrapeRun_sourceId_createdAt_idx" ON "ProviderScrapeRun"("sourceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCandidate_dedupeKey_key" ON "ProviderCandidate"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCandidate_inviteTokenHash_key" ON "ProviderCandidate"("inviteTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCandidate_publishedUserId_key" ON "ProviderCandidate"("publishedUserId");

-- CreateIndex
CREATE INDEX "ProviderCandidate_status_createdAt_idx" ON "ProviderCandidate"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralShare_tokenHash_key" ON "ReferralShare"("tokenHash");

-- CreateIndex
CREATE INDEX "ReferralShare_referralId_idx" ON "ReferralShare"("referralId");

-- CreateIndex
CREATE INDEX "ReferralShareAccess_shareId_createdAt_idx" ON "ReferralShareAccess"("shareId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientActivity_userId_createdAt_idx" ON "PatientActivity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientActivity_userId_type_createdAt_idx" ON "PatientActivity"("userId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "ProviderScrapeRun" ADD CONSTRAINT "ProviderScrapeRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProviderSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCandidate" ADD CONSTRAINT "ProviderCandidate_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ProviderSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCandidate" ADD CONSTRAINT "ProviderCandidate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ProviderScrapeRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralShare" ADD CONSTRAINT "ReferralShare_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralShareAccess" ADD CONSTRAINT "ReferralShareAccess_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "ReferralShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientActivity" ADD CONSTRAINT "PatientActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

