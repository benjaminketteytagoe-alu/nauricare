# Credential rotation and leak response

## Rules

- **No password, password hash, token or key belongs in the repository.** That covers scripts, seeds, tests, docs and commit messages.
- **Staff accounts never have a password chosen for them.** Use `npm run staff` (`apps/web/scripts/staff-access.ts`). The person sets their own password through a single-use link and still has to pass the emailed sign-in code.
- **Deleting a file does not remove a leak.** It stays in git history, in every clone and fork, and possibly in caches and CI logs. Only rotation fixes a leak.

## Prevention layers

| Layer            | What                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-commit       | `.husky/pre-commit` runs `gitleaks git --staged` when gitleaks is installed. Install it: `brew install gitleaks` or a release binary.                   |
| CI               | The Secret Scan job (`security.yml`) runs gitleaks on every PR and push, and weekly over the full history.                                              |
| Rules            | `.gitleaks.toml` extends the defaults with plaintext-password, user/password-pair, bcrypt-hash and Postgres-URL rules (the defaults miss all of these). |
| Tooling          | `npm run staff` replaces ad-hoc hash generators.                                                                                                        |
| GitHub           | Turn on Settings → Code security → Secret scanning and push protection.                                                                                 |
| Defence in depth | Every sign-in also needs the 6-digit emailed code, so a leaked password alone does not open an account.                                                 |

## Staff access

```bash
# Uses the DATABASE_URL and NEXTAUTH_URL of the environment you target
npm run staff -- invite --email dr.a@example.org --name "Dr A" --role PROVIDER
npm run staff -- rotate --email admin@example.org   # current password stops working immediately
npm run staff -- revoke --email former@example.org  # demote to PATIENT and void the password
```

`invite` and `rotate` print a set-password link **once**. It expires in 60 minutes. Send it through a secure channel, never a ticket or group chat. Each action is written to `AuditLog` (`ADMIN_SETTINGS_UPDATE`, `details.via = scripts/staff-access.ts`).

## When a secret leaks

1. **Rotate first**, before cleaning up.
   - User passwords: `npm run staff -- rotate --email …`.
   - API keys: issue a new key at the provider, update SSM (`/nauricare/<env>/…`), redeploy, then revoke the old key.
   - `NEXTAUTH_SECRET`: rotating it signs everyone out. Do it if a session-forging risk exists.
   - `DATA_ENCRYPTION_KEY`: needs a re-encryption migration. Don't rotate it blind.
2. **Check for misuse.**
   - Review `AuditLog` and `LoginChallenge` for the affected accounts since the leak date.
   - Review CloudWatch logs for unusual sign-ins.
3. **Record it.** Add the gitleaks fingerprint to `.gitleaksignore` with the date and a pointer to this incident, but only **after** rotating.
4. **History rewrite (optional).** Use `git filter-repo` and force-push, which needs every collaborator to re-clone. Rotation is still required either way. Ask GitHub Support to purge cached views if the repo is public.
5. **Notify.** If personal health data could have been exposed, follow the breach procedure (Rwanda Law N° 058/2021: notify the regulator within 48 hours).

## Incident log

| Date       | What                                                                                         | Status                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 2026-11-19 | Admin and Provider plaintext passwords in `generate-hashes.js` (commit `c7d4763`, on `main`) | File deleted (PR 1). **Rotation pending:** run `npm run staff -- rotate` for both accounts. |
