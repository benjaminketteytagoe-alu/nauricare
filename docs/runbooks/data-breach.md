# Personal data breach procedure

> This is an operational checklist, not legal advice. Confirm obligations with counsel. Under Rwanda's **Law N° 058/2021 on the protection of personal data and privacy**, health data is _sensitive personal data_. The supervisory authority is the **National Cyber Security Authority (NCSA)**, through its Data Protection and Privacy Office.

A breach is any accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to personal data. It includes data showing to the wrong user, health data in logs or alerts, a leaked database credential, or a lost laptop holding an export.

## Within the first hours

1. **Start an incident** at SEV1 ([incident-response.md](incident-response.md)). Record the **time of awareness**, because the clock starts then.
2. **Contain the breach.** Revoke access, rotate credentials ([credential-rotation.md](credential-rotation.md)), take the affected feature offline, and preserve evidence. Don't delete logs you need for the investigation; restrict access to them instead.
3. **Assess the scope.**
   - What data: identity, contact, cycle, symptoms, labs, notes, messages?
   - Whose data, and how many people?
   - Since when?
   - Was it actually accessed?
   - Sources: `AuditLog` (`RECORD_ACCESS`, admin actions), the access logs, CloudWatch, Cloudflare logs.

## Within 48 hours of awareness

4. **Notify the regulator (NCSA)** of any breach likely to harm data subjects. Health data almost always qualifies. If facts are still missing, notify anyway and send updates later. Include:
   - the nature of the breach, the categories of data, and the approximate numbers of people and records
   - the likely consequences
   - the measures taken or proposed
   - a contact point
5. **Notify affected people** without undue delay when the breach is likely to harm them. Use plain language: what happened, what data, what we did, what they can do, and who to contact (`SUPPORT_EMAIL` in `src/lib/site.ts`).
6. **Notify partners and processors** as contracts require, for example clinics on referrals, Neon, AWS and Resend.

## Afterwards

7. Record the breach in the private breach register, **even if it was not notifiable**. Note the facts, effects, remedial action and reasoning.
8. Hold a blameless review. Fix the root cause, add a regression test or detection, and update this procedure.

## Prevention already in place

- Gitleaks with custom rules runs in pre-commit and CI.
- No plaintext staff passwords exist (`npm run staff`).
- Structured logs redact PHI, and alerts carry no patient data.
- Encryption is applied in transit (HSTS) and at rest (Neon/RDS, SSM, S3, state bucket). Sensitive fields are sealed in the app.
- Least-privilege IAM through OIDC. PR plans cannot read secrets, user media or logs.
- Every sign-in needs a second factor: the emailed sign-in code.
