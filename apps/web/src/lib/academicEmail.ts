// Determines whether an email address qualifies for the student trial.
// Exact-domain allowlist (partner schools) plus generic academic TLD/SLD
// patterns. Matching is done on the full domain suffix so "evilalustudent.com"
// does NOT match "alustudent.com" (no bare substring checks).

const ALLOWED_EXACT_DOMAINS = ["alustudent.com"];

// Generic academic suffix patterns: .edu, .edu.<cc>, .ac.<cc>
const ACADEMIC_SUFFIX_PATTERN = /(^|\.)(edu|ac)(\.[a-z]{2,3})?$/i;

export function getEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

export function isAcademicEmail(email: string): boolean {
  const domain = getEmailDomain(email);
  if (!domain) return false;

  if (ALLOWED_EXACT_DOMAINS.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`))) {
    return true;
  }

  // Anchored on a label boundary (leading ".") and the end of the domain, so
  // "education-corp.com" is correctly rejected — "edu"/"ac" only count when
  // they form a whole label, e.g. "university.ac.rw" or "college.edu".
  return ACADEMIC_SUFFIX_PATTERN.test(`.${domain}`);
}
