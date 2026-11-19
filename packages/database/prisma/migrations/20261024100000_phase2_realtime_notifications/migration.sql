-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserNotificationType" ADD VALUE 'MESSAGE';
ALTER TYPE "UserNotificationType" ADD VALUE 'APPOINTMENT_BOOKED';
ALTER TYPE "UserNotificationType" ADD VALUE 'APPOINTMENT_UPDATED';
ALTER TYPE "UserNotificationType" ADD VALUE 'APPOINTMENT_REMINDER';
ALTER TYPE "UserNotificationType" ADD VALUE 'COMMUNITY_LIKE';
ALTER TYPE "UserNotificationType" ADD VALUE 'COMMUNITY_COMMENT';
ALTER TYPE "UserNotificationType" ADD VALUE 'REFERRAL_UPDATE';
ALTER TYPE "UserNotificationType" ADD VALUE 'PERIOD_REMINDER';
ALTER TYPE "UserNotificationType" ADD VALUE 'SYSTEM';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserNotification" ADD COLUMN     "body" TEXT,
ADD COLUMN     "link" TEXT,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "actorId" DROP NOT NULL;

