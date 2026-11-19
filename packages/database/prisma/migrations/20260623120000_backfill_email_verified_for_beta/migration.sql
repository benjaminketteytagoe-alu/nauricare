-- Closed beta: the email verification flow isn't wired up to the frontend yet,
-- and a new authorize() check now blocks unverified accounts at login.
-- Without this backfill, every account created before this migration
-- (isEmailVerified defaulted to false) would be locked out on next login.
UPDATE "User" SET "isEmailVerified" = true WHERE "isEmailVerified" = false;
