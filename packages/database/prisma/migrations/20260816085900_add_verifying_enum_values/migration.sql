-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'INVOICE_WIRE';

-- AlterEnum
-- Split into its own migration/transaction, separate from the migration that
-- creates CorporateSubscription (which uses 'VERIFYING' as a column default)
-- — Postgres does not allow a newly added enum value to be referenced within
-- the same transaction that added it.
ALTER TYPE "SubscriptionStatus" ADD VALUE 'VERIFYING';
