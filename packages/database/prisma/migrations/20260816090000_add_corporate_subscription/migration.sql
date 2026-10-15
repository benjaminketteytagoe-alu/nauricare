-- CreateEnum
CREATE TYPE "CorporateTier" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "CorporateBillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "isCorporateEmployee" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PaymentTransaction" ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "planId" DROP NOT NULL,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "corporateSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "corporateEmailDomain" TEXT NOT NULL,
    "contactPersonName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "allocatedSeats" INTEGER NOT NULL DEFAULT 10,
    "usedSeats" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tier" "CorporateTier" NOT NULL,
    "billingCycle" "CorporateBillingCycle" NOT NULL,
    "pricePerSeatMonth" DOUBLE PRECISION NOT NULL,
    "totalContractValue" DOUBLE PRECISION NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'VERIFYING',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_corporateEmailDomain_key" ON "Organization"("corporateEmailDomain");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateSubscription_organizationId_key" ON "CorporateSubscription"("organizationId");

-- CreateIndex
CREATE INDEX "CorporateSubscription_status_idx" ON "CorporateSubscription"("status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_organizationId_idx" ON "PaymentTransaction"("organizationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_corporateSubscriptionId_fkey" FOREIGN KEY ("corporateSubscriptionId") REFERENCES "CorporateSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateSubscription" ADD CONSTRAINT "CorporateSubscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
