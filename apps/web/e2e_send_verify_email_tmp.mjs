import { sendVerificationEmail } from "./src/lib/email.ts";

try {
  await sendVerificationEmail({
    to: "b.kettey-ta@alustudent.com",
    name: "Benjamin",
    verifyUrl: "http://localhost:3000/verify-email?token=test-verification-token",
  });
  console.log("SUCCESS: Resend accepted the verification email.");
} catch (err) {
  console.error("FAILURE:", err);
  process.exit(1);
}
