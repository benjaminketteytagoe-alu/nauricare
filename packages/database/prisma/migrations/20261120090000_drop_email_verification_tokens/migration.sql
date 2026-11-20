-- Sign-up no longer sends a verification link: the emailed sign-in code
-- verifies the address. The table only ever held hashed, short-lived tokens.
DROP TABLE "EmailVerificationToken";
