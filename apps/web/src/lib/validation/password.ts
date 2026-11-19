import { z } from "zod";

// Single source of truth for password strength, shared by the registration
// API route and the signup forms' client-side validation so they can never drift.
export const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(PASSWORD_REGEX, "Password must contain at least one number and one special character");
