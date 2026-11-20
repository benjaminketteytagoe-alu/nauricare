/**
 * Grant, rotate or revoke staff (ADMIN / PROVIDER) access without anyone ever
 * choosing, typing, printing or storing a plaintext password.
 *
 *   npm run staff -- invite  --email a@b.org --name "Dr A" --role PROVIDER
 *   npm run staff -- rotate  --email a@b.org     # kill the current password now
 *   npm run staff -- revoke  --email a@b.org     # demote to PATIENT + kill password
 *   npm run staff -- rotate-all [--dry-run]      # kill EVERY staff password, email each a link
 *
 * How it works
 * - The account's password hash is replaced with the hash of 32 random bytes
 *   that are discarded immediately, so any previous (or leaked) password stops
 *   working at once.
 * - For invite/rotate, a single-use password-reset link (SHA-256 stored, raw
 *   token only in the link) is printed ONCE. Hand it over through a secure
 *   channel; the person sets their own password and still has to pass the
 *   emailed sign-in code.
 * - rotate-all is the incident response for leaked staff credentials. It
 *   emails each person their own link (via Resend) instead of printing it,
 *   so it can run unattended as a one-off ECS task
 *   (.github/workflows/staff-rotate.yml) and logs only ids and counts.
 * - Every action is written to AuditLog.
 *
 * This replaces ad-hoc scripts that hashed hard-coded passwords. Never put a
 * password, or a hash of one, in the repository.
 */
import { createHash, randomBytes } from "node:crypto";
import { userInfo } from "node:os";
import { parseArgs } from "node:util";
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "../src/lib/email";

const LINK_TTL_MINUTES = 60;
const STAFF_ROLES = ["ADMIN", "PROVIDER"] as const;

const prisma = new PrismaClient();

function usage(message?: string): never {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    [
      "Usage:",
      "  npm run staff -- invite --email <email> --name <name> --role <ADMIN|PROVIDER>",
      "  npm run staff -- rotate --email <email>",
      "  npm run staff -- revoke --email <email>",
      "  npm run staff -- rotate-all [--dry-run]",
    ].join("\n"),
  );
  process.exit(1);
}

/** Emails are stored lowercased at sign-up, but match case-insensitively to be safe. */
function findByEmail(email: string) {
  return prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
}

async function unusableHash() {
  // Nobody knows this password: the random bytes are never kept.
  return bcrypt.hash(randomBytes(32).toString("base64url"), 12);
}

async function issueResetLink(userId: string) {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) usage("NEXTAUTH_URL must be set so the reset link points at the right site");

  const rawToken = randomBytes(32).toString("hex");
  await prisma.$transaction([
    prisma.resetToken.deleteMany({ where: { userId } }),
    prisma.resetToken.create({
      data: {
        userId,
        tokenHash: createHash("sha256").update(rawToken).digest("hex"),
        expiresAt: new Date(Date.now() + LINK_TTL_MINUTES * 60_000),
      },
    }),
  ]);
  return `${baseUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;
}

// In CI the OS user is the container's, so the workflow passes the GitHub actor.
const OPERATOR = process.env.STAFF_OPERATOR || userInfo().username;

async function audit(action: "invite" | "rotate" | "rotate-all" | "revoke", targetUserId: string, role: Role) {
  try {
    await prisma.auditLog.create({
      data: {
        // No CLI operator identity exists in the app, so the target is the actor
        // and the operating-system user is recorded in the details.
        action: "STAFF_ACCESS_CHANGE",
        actorId: targetUserId,
        targetId: targetUserId,
        details: { via: "scripts/staff-access.ts", operation: action, role, operator: OPERATOR },
      },
    });
  } catch (err) {
    // Never block the security operation on audit logging; surface it instead.
    console.warn("Audit log write failed:", err instanceof Error ? err.message : err);
  }
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });

  const command = positionals[0];
  if (command === "rotate-all") return rotateAll(values["dry-run"] ?? false);
  const email = values.email?.trim().toLowerCase();
  if (!command || !["invite", "rotate", "revoke"].includes(command)) usage();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) usage("a valid --email is required");

  if (command === "invite") {
    const role = values.role?.toUpperCase();
    if (!role || !(STAFF_ROLES as readonly string[]).includes(role)) usage("--role must be ADMIN or PROVIDER");
    const existing = await findByEmail(email);
    if (!existing && !values.name?.trim()) usage("--name is required for a new account");

    const passwordHash = await unusableHash();
    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { role: role as Role, passwordHash } })
      : await prisma.user.create({
          data: { email, name: values.name!.trim(), role: role as Role, passwordHash },
        });

    const link = await issueResetLink(user.id);
    await audit("invite", user.id, user.role);
    console.info(`${existing ? "Updated" : "Created"} ${user.email} as ${user.role}. Any previous password is void.`);
    console.info(`\nSingle-use set-password link (expires in ${LINK_TTL_MINUTES} min, shown once):\n${link}\n`);
    console.info("Send it through a secure channel. Do not paste it into tickets, chats or commits.");
    return;
  }

  const user = await findByEmail(email);
  if (!user) usage(`no user found with email ${email}`);

  if (command === "rotate") {
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await unusableHash() } });
    const link = await issueResetLink(user.id);
    await audit("rotate", user.id, user.role);
    console.info(`Password for ${user.email} revoked.`);
    console.info(`\nSingle-use set-password link (expires in ${LINK_TTL_MINUTES} min, shown once):\n${link}\n`);
    return;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role: "PATIENT", passwordHash: await unusableHash() } }),
    prisma.resetToken.deleteMany({ where: { userId: user.id } }),
  ]);
  await audit("revoke", user.id, "PATIENT");
  console.info(`${user.email} demoted from ${user.role} to PATIENT and their password revoked.`);
}

/**
 * Void every ADMIN and PROVIDER password and email each person a single-use
 * set-password link. Logs ids and counts only: in CI this output lands in
 * CloudWatch, so it must never contain emails or links.
 */
async function rotateAll(dryRun: boolean) {
  if (!process.env.NEXTAUTH_URL) usage("NEXTAUTH_URL must be set so the links point at the right site");
  // Without a real key every link would be lost and staff locked out. Check first.
  if (!dryRun && !process.env.RESEND_API_KEY) usage("RESEND_API_KEY must be set: rotate-all emails the links");

  const staff = await prisma.user.findMany({
    where: { role: { in: [...STAFF_ROLES] } },
    select: { id: true, email: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  // The workflow echoes this first line to the (public) Actions log: count only.
  console.info(`${staff.length} staff account(s).`);
  if (staff.length) console.info(`Accounts: ${staff.map((u) => `${u.id} (${u.role})`).join(", ")}`);
  if (dryRun) {
    console.info("Dry run: nothing changed.");
    return;
  }

  const failed: string[] = [];
  for (const user of staff) {
    // The password dies first, so even if the email fails the leaked one no
    // longer works; the person can still use "Forgot password".
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await unusableHash() } });
    const link = await issueResetLink(user.id);
    await audit("rotate-all", user.id, user.role);
    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl: link });
      console.info(`Rotated ${user.id}: link emailed.`);
    } catch {
      failed.push(user.id);
      console.error(`Rotated ${user.id}: password void, but the email failed. They can use "Forgot password".`);
    }
  }

  console.info(
    `Done: ${staff.length - failed.length}/${staff.length} emailed. Links expire in ${LINK_TTL_MINUTES} min.`,
  );
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
