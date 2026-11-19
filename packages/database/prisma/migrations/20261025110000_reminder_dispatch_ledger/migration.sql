/*
  Warnings:

  - You are about to drop the column `lastDailyReminderOn` on the `ReminderPreference` table. All the data in the column will be lost.
  - You are about to drop the column `lastPeriodReminderFor` on the `ReminderPreference` table. All the data in the column will be lost.
  - You are about to drop the column `lastWeeklyInsightOn` on the `ReminderPreference` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ReminderDispatchStatus" AS ENUM ('CLAIMED', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "ReminderPreference" DROP COLUMN "lastDailyReminderOn",
DROP COLUMN "lastPeriodReminderFor",
DROP COLUMN "lastWeeklyInsightOn";

-- CreateTable
CREATE TABLE "ReminderDispatch" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ReminderDispatchStatus" NOT NULL DEFAULT 'CLAIMED',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderDispatch_dedupeKey_key" ON "ReminderDispatch"("dedupeKey");

-- CreateIndex
CREATE INDEX "ReminderDispatch_status_claimedAt_idx" ON "ReminderDispatch"("status", "claimedAt");

-- CreateIndex
CREATE INDEX "ReminderDispatch_userId_idx" ON "ReminderDispatch"("userId");

-- AddForeignKey
ALTER TABLE "ReminderDispatch" ADD CONSTRAINT "ReminderDispatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
