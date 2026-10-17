-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_planId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_corporateSubscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "CorporateSubscription" DROP CONSTRAINT "CorporateSubscription_organizationId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isCorporateEmployee",
DROP COLUMN "organizationId",
DROP COLUMN "studentTrialEmailDomain",
DROP COLUMN "studentTrialGrantedAt";

-- DropTable
DROP TABLE "Plan";

-- DropTable
DROP TABLE "Subscription";

-- DropTable
DROP TABLE "PaymentTransaction";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "CorporateSubscription";

-- DropEnum
DROP TYPE "SubscriptionTier";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "CorporateTier";

-- DropEnum
DROP TYPE "CorporateBillingCycle";

-- DropEnum
DROP TYPE "PaymentTransactionStatus";

