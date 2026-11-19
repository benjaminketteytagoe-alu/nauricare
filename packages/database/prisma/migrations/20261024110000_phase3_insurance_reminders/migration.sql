-- AlterEnum
ALTER TYPE "InsuranceProvider" ADD VALUE 'EDENCARE';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PatientInsurance" ADD COLUMN     "otherProviderName" TEXT;

-- CreateTable
CREATE TABLE "ReminderPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodReminders" BOOLEAN NOT NULL DEFAULT true,
    "periodLeadDays" INTEGER NOT NULL DEFAULT 2,
    "dailyLogReminders" BOOLEAN NOT NULL DEFAULT false,
    "weeklyInsights" BOOLEAN NOT NULL DEFAULT false,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderHour" INTEGER NOT NULL DEFAULT 19,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Kigali',
    "lastPeriodReminderFor" DATE,
    "lastDailyReminderOn" DATE,
    "lastWeeklyInsightOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderPreference_userId_key" ON "ReminderPreference"("userId");

-- AddForeignKey
ALTER TABLE "ReminderPreference" ADD CONSTRAINT "ReminderPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
