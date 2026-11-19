-- Add country field to User (nullable; enforced required at application layer for new signups)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "country" TEXT;
