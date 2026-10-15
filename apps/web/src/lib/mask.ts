// PII masking for response payloads — used when transaction/payment data is
// echoed back to clients (e.g. an admin's MoMo verification queue) so full
// emails, phone numbers, and reference codes never sit unmasked in a
// response body, browser devtools, or log aggregator.

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "*".repeat(digits.length);
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

/** Keeps the last 4 characters of a reference/transaction code, masks the rest. */
export function maskReference(ref: string): string {
  if (ref.length <= 4) return "*".repeat(ref.length);
  return `${"*".repeat(ref.length - 4)}${ref.slice(-4)}`;
}
