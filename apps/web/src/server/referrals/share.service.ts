import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/api";
import { SITE_URL } from "@/lib/site";
import { hashToken, openJson, randomToken, sealJson } from "@/server/security/sealing";
import { recordActivity } from "@/server/activity/activity.service";
import { notify } from "@/server/notifications/notify";

// Hospital referral sharing. The link carries only a random token (its hash
// is stored); the patient snapshot is AES-256-GCM encrypted at rest and is
// released only when the hospital enters the referral code the patient gives
// them. Shares expire, can be revoked, lock after repeated wrong codes, and
// every attempt is logged and shown to the patient.

const PURPOSE = "referral-share";
const MAX_ACTIVE_SHARES = 3;
const MAX_FAILED_ATTEMPTS = 10;

export interface ReferralSharePayload {
  version: 1;
  generatedAt: string;
  expiresAt: string;
  patient: {
    fullName: string;
    dateOfBirth: string | null;
    email: string;
    phone: string | null;
    country: string | null;
    emergencyContact: string | null;
  };
  referral: {
    code: string;
    status: string;
    createdAt: string;
    specialtyRequired: string;
    clinicalReason: string;
    triageSeverity: string;
  };
  hospital: { name: string; address: string; district: string };
  insurance: unknown;
}

async function ownedReferral(patientId: string, referralId: string) {
  const referral = await prisma.referral.findFirst({
    where: { id: referralId, patientId },
    include: { hospital: true, patient: { include: { patientProfile: true } } },
  });
  if (!referral) throw new ServiceError("Referral not found.", 404);
  return referral;
}

export async function createShare(patientId: string, referralId: string, days: number) {
  const referral = await ownedReferral(patientId, referralId);
  if (referral.status === "EXPIRED" || referral.status === "COMPLETED") {
    throw new ServiceError("This referral is closed and can no longer be shared.");
  }
  const active = await prisma.referralShare.count({ where: { referralId, revokedAt: null, expiresAt: { gt: new Date() } } });
  if (active >= MAX_ACTIVE_SHARES) throw new ServiceError(`You already have ${MAX_ACTIVE_SHARES} active links for this referral. Revoke one first.`, 409);

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60_000);
  const p = referral.patient;
  const payload: ReferralSharePayload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    patient: {
      fullName: p.name,
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : null,
      email: p.email,
      phone: p.phoneNumber,
      country: p.patientProfile?.country ?? p.country,
      emergencyContact: p.patientProfile?.emergencyContact ?? null,
    },
    referral: {
      code: referral.referralCode,
      status: referral.status,
      createdAt: referral.createdAt.toISOString(),
      specialtyRequired: referral.specialtyRequired,
      clinicalReason: referral.clinicalReason,
      triageSeverity: referral.triageSeverity,
    },
    hospital: { name: referral.hospital.name, address: referral.hospital.address, district: referral.hospital.district },
    insurance: referral.insuranceSnapshot ?? null,
  };

  const token = randomToken();
  const share = await prisma.referralShare.create({
    data: { referralId, tokenHash: hashToken(token), encryptedPayload: sealJson(PURPOSE, payload), expiresAt },
    select: { id: true, expiresAt: true },
  });
  await recordActivity({
    userId: patientId,
    type: "REFERRAL_SHARED",
    title: `Shared referral ${referral.referralCode} with ${referral.hospital.name}`,
    details: { expiresAt: expiresAt.toISOString(), days },
    ref: { type: "Referral", id: referralId },
  });
  // The raw token exists only in this response; it can't be recovered later.
  return { id: share.id, url: `${SITE_URL}/r/${token}`, expiresAt: share.expiresAt };
}

export async function listShares(patientId: string, referralId: string) {
  await ownedReferral(patientId, referralId);
  const shares = await prisma.referralShare.findMany({
    where: { referralId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      accessCount: true,
      lastAccessedAt: true,
      failedAttempts: true,
      accesses: { orderBy: { createdAt: "desc" }, take: 10, select: { success: true, createdAt: true } },
    },
  });
  const now = Date.now();
  return shares.map((s) => ({ ...s, state: s.revokedAt ? "revoked" : s.expiresAt.getTime() < now ? "expired" : "active" }));
}

export async function revokeShare(patientId: string, shareId: string) {
  const share = await prisma.referralShare.findFirst({
    where: { id: shareId, referral: { patientId } },
    include: { referral: { select: { id: true, referralCode: true } } },
  });
  if (!share) throw new ServiceError("Link not found.", 404);
  if (share.revokedAt) return;
  await prisma.referralShare.update({ where: { id: shareId }, data: { revokedAt: new Date() } });
  await recordActivity({
    userId: patientId,
    type: "REFERRAL_SHARE_REVOKED",
    title: `Revoked a hospital link for referral ${share.referral.referralCode}`,
    ref: { type: "Referral", id: share.referral.id },
  });
}

function codesMatch(given: string, expected: string): boolean {
  const a = Buffer.from(given.trim().toUpperCase());
  const b = Buffer.from(expected.toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function unlockShare(token: string, code: string, meta: { ip: string | null; userAgent: string | null }) {
  const share = token.length >= 32 && token.length <= 64
    ? await prisma.referralShare.findUnique({ where: { tokenHash: hashToken(token) }, include: { referral: { select: { id: true, referralCode: true, patientId: true, hospital: { select: { name: true } } } } } })
    : null;
  if (!share) throw new ServiceError("This referral link is not valid.", 404);
  if (share.revokedAt) throw new ServiceError("The patient has revoked this referral link.", 410);
  if (share.expiresAt < new Date()) throw new ServiceError("This referral link has expired. Ask the patient for a new one.", 410);

  const log = { shareId: share.id, ipAddress: meta.ip, userAgent: meta.userAgent?.slice(0, 300) ?? null };
  if (!codesMatch(code, share.referral.referralCode)) {
    const failed = share.failedAttempts + 1;
    await prisma.$transaction([
      prisma.referralShareAccess.create({ data: { ...log, success: false } }),
      prisma.referralShare.update({
        where: { id: share.id },
        data: { failedAttempts: failed, ...(failed >= MAX_FAILED_ATTEMPTS ? { revokedAt: new Date() } : {}) },
      }),
    ]);
    if (failed >= MAX_FAILED_ATTEMPTS) throw new ServiceError("Too many incorrect codes. This link has been locked; ask the patient for a new one.", 423);
    throw new ServiceError("That referral code is not correct.", 401);
  }

  const payload = openJson<ReferralSharePayload>(PURPOSE, share.encryptedPayload);
  if (!payload) throw new ServiceError("This referral could not be decrypted. Ask the patient for a new link.", 500);
  await prisma.$transaction([
    prisma.referralShareAccess.create({ data: { ...log, success: true } }),
    prisma.referralShare.update({ where: { id: share.id }, data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() } }),
  ]);
  await notify({
    recipientId: share.referral.patientId,
    type: "REFERRAL_UPDATE",
    title: `${share.referral.hospital.name} opened your referral`,
    body: `Referral ${share.referral.referralCode} was viewed with your code.`,
    link: "/dashboard/referrals",
  });
  await recordActivity({
    userId: share.referral.patientId,
    type: "REFERRAL_SHARE_OPENED",
    title: `${share.referral.hospital.name} opened your referral ${share.referral.referralCode}`,
    ref: { type: "Referral", id: share.referral.id },
  });
  return payload;
}
