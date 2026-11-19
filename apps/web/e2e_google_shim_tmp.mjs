import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const email = "qa-google-preadapter-1782397626494@test.local";
const fakeGoogleAccount = { provider: "google", providerAccountId: "fake-google-sub-12345", type: "oauth" };

// Step 1: confirm no Account row exists yet (simulating a pre-adapter Google user)
const before = await prisma.account.findUnique({
  where: { provider_providerAccountId: { provider: fakeGoogleAccount.provider, providerAccountId: fakeGoogleAccount.providerAccountId } },
});
console.log("Account exists before shim runs?", !!before, "(expect false)");

// Step 2: run the EXACT logic from the signIn callback's Google branch
const existingUser = await prisma.user.findUnique({ where: { email } });
const userId = existingUser.id;
await prisma.account.upsert({
  where: { provider_providerAccountId: { provider: fakeGoogleAccount.provider, providerAccountId: fakeGoogleAccount.providerAccountId } },
  update: {},
  create: { userId, type: fakeGoogleAccount.type, provider: fakeGoogleAccount.provider, providerAccountId: fakeGoogleAccount.providerAccountId },
});

// Step 3: confirm getUserByAccount-equivalent lookup now resolves to the EXISTING user (not a duplicate)
const linkedAccount = await prisma.account.findUnique({
  where: { provider_providerAccountId: { provider: fakeGoogleAccount.provider, providerAccountId: fakeGoogleAccount.providerAccountId } },
  include: { user: true },
});
console.log("Account now links to userId:", linkedAccount.userId, "matches existing user?", linkedAccount.userId === userId);
console.log("Linked user email:", linkedAccount.user.email);

// Step 4: confirm no duplicate User row was created (still exactly 1 user with this email)
const userCount = await prisma.user.count({ where: { email } });
console.log("Total users with this email:", userCount, "(expect 1 — no duplicate created)");

await prisma.$disconnect();
