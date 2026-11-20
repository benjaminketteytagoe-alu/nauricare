## What & why

<!-- One or two sentences. Link the issue: Closes #123 -->

## How it was tested

- [ ] `npm run lint && npm run typecheck && npm test`
- [ ] Manually checked in the browser (light + dark, mobile + desktop) — screenshots below for UI changes

## Safety checklist

- [ ] No secrets, tokens or real patient data in code, fixtures, logs or screenshots
- [ ] New user text is sanitised (`sanitizePlainText`) and validated with Zod
- [ ] Health-data access goes through the auth guards and is audit-logged
- [ ] Patient-facing AI/clinical copy is framed as education, never diagnosis
- [ ] Schema changes ship with a migration (`prisma migrate dev`)
