import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { Prisma, ProviderCandidate, ProviderCandidateStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ServiceError as SourcingError } from "@/lib/api";
import { logAdministrativeAction } from "@/lib/audit";
import { sendProviderInvitationEmail } from "@/lib/email";
import { formatDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { hashToken, randomToken } from "@/server/security/sealing";
import { isPublicAddress } from "@/server/net/safeFetch";
import { fetchRemoteImage, rehostImage } from "@/server/storage/images";
import { crawlSite, type CrawledPage } from "./crawler";
import { geocodePractice } from "@/server/geo/geocode";
import { extractCandidates, toDocument, type ExtractedCandidate } from "./extract";

// Provider sourcing: admin-managed sources -> background crawl -> candidates
// -> admin review -> invitation (or attested publish) -> provider account.

const INVITE_TTL_MS = 14 * 24 * 60 * 60_000;
const STALE_RUN_MS = 30 * 60_000;
const MAX_CONCURRENT_RUNS = 2;


// ── Sources ──────────────────────────────────────────────────────────────────

export function assertCrawlableUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SourcingError("Enter a full URL, starting with https://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new SourcingError("Only http(s) URLs can be crawled.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || (/^[\d.:a-f]+$/i.test(host) && !isPublicAddress(host))) {
    throw new SourcingError("That address is not a public website.");
  }
  url.hash = "";
  return url.toString();
}

export async function createSource(adminId: string, input: { name: string; url: string; notes?: string }) {
  const url = assertCrawlableUrl(input.url);
  const existing = await prisma.providerSource.findUnique({ where: { url } });
  if (existing) throw new SourcingError("That page is already a source.", 409);
  const source = await prisma.providerSource.create({ data: { name: input.name, url, notes: input.notes || null, createdById: adminId } });
  await logAdministrativeAction({ action: "PROVIDER_SOURCE_CHANGE", actorId: adminId, targetId: source.id, details: { op: "create", url } });
  return source;
}

export async function setSourceActive(adminId: string, id: string, isActive: boolean) {
  const source = await prisma.providerSource.update({ where: { id }, data: { isActive } });
  await logAdministrativeAction({ action: "PROVIDER_SOURCE_CHANGE", actorId: adminId, targetId: id, details: { op: isActive ? "enable" : "disable" } });
  return source;
}

async function failStaleRuns() {
  await prisma.providerScrapeRun.updateMany({
    where: { status: { in: ["QUEUED", "RUNNING"] }, createdAt: { lt: new Date(Date.now() - STALE_RUN_MS) } },
    data: { status: "FAILED", error: "Run did not finish (the server may have restarted).", finishedAt: new Date() },
  });
}

export async function listSources() {
  await failStaleRuns();
  return prisma.providerSource.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      runs: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { candidates: true } },
    },
  });
}

// ── Runs ─────────────────────────────────────────────────────────────────────

export async function startScrapeRun(adminId: string, sourceId: string) {
  await failStaleRuns();
  const source = await prisma.providerSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new SourcingError("Source not found.", 404);
  if (!source.isActive) throw new SourcingError("This source is disabled.");
  const active = await prisma.providerScrapeRun.findMany({ where: { status: { in: ["QUEUED", "RUNNING"] } }, select: { sourceId: true } });
  if (active.some((r) => r.sourceId === sourceId)) throw new SourcingError("A crawl is already running for this source.", 409);
  if (active.length >= MAX_CONCURRENT_RUNS) throw new SourcingError("Too many crawls are running. Try again in a few minutes.", 429);

  const run = await prisma.providerScrapeRun.create({ data: { sourceId, triggeredById: adminId } });
  await logAdministrativeAction({ action: "PROVIDER_SCRAPE_RUN", actorId: adminId, targetId: run.id, details: { sourceId, url: source.url } });
  // Runs in the background of this server process; progress is persisted so
  // the admin UI can poll it, and a restart is detected as a stale run.
  void executeRun(run.id, source.url, source.name, sourceId);
  return run;
}

export function getRun(id: string) {
  return prisma.providerScrapeRun.findUnique({ where: { id } });
}

function dedupeKeyFor(c: ExtractedCandidate, host: string): string {
  if (c.email) return `email:${c.email.toLowerCase()}`;
  const name = c.fullName.toLowerCase().replace(/^(dr\.?|doctor|prof\.?)\s+/, "").replace(/[^a-z]+/g, " ").trim();
  return `name:${name}|${(c.facilityName ?? host).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()}`;
}

/**
 * Extracts candidates from crawled pages and upserts them (dedupe, never
 * touching reviewed candidates). Separate from the crawl so it can be tested
 * with fixture pages.
 */
export async function ingestPages(
  ctx: { runId: string; sourceId: string; sourceName: string; host: string },
  pages: CrawledPage[],
  log: (line: string) => void,
  onPage: () => Promise<unknown> = async () => {},
): Promise<number> {
  let candidatesFound = 0;
  for (const page of pages) {
    const doc = toDocument(page.url, page.html);
    const found = await extractCandidates(doc, log);
    for (const c of found) {
      const dedupeKey = dedupeKeyFor(c, ctx.host);
      const existing = await prisma.providerCandidate.findUnique({ where: { dedupeKey } });
      if (existing && existing.status !== "PENDING_REVIEW") continue; // never overwrite a reviewed candidate
      const alreadyUser = c.email ? await prisma.user.findUnique({ where: { email: c.email }, select: { id: true } }) : null;
      const data = {
        sourceId: ctx.sourceId,
        runId: ctx.runId,
        fullName: c.fullName,
        specialty: c.specialty,
        email: c.email,
        phone: c.phone,
        yearsExperience: c.yearsExperience,
        facilityName: c.facilityName ?? ctx.sourceName,
        practiceLocation: c.practiceLocation,
        photoSourceUrl: c.photoSourceUrl,
        profileUrl: c.profileUrl,
        evidence: c.evidence.slice(0, 4000),
        confidence: c.confidence,
        extractor: c.extractor,
        ...(alreadyUser ? { status: "DUPLICATE" as const, reviewNote: "Already has a NauriCare account." } : {}),
      };
      if (existing) await prisma.providerCandidate.update({ where: { id: existing.id }, data });
      else await prisma.providerCandidate.create({ data: { ...data, dedupeKey } });
      candidatesFound++;
    }
    log(`${new URL(page.url).pathname}: ${found.length} candidate(s)`);
    await onPage();
  }
  return candidatesFound;
}

async function executeRun(runId: string, url: string, sourceName: string, sourceId: string) {
  const lines: string[] = [];
  let pagesFetched = 0;
  let candidatesFound = 0;
  const flush = (extra: Prisma.ProviderScrapeRunUpdateInput = {}) =>
    prisma.providerScrapeRun.update({ where: { id: runId }, data: { log: lines.slice(-200).join("\n"), pagesFetched, candidatesFound, ...extra } }).catch(() => {});
  const log = (l: string) => {
    lines.push(`${new Date().toISOString().slice(11, 19)} ${l}`);
  };

  try {
    await prisma.providerScrapeRun.update({ where: { id: runId }, data: { status: "RUNNING", startedAt: new Date() } });
    log(`crawling ${url}`);
    const pages = await crawlSite(url, { log });
    pagesFetched = pages.length;
    await flush();
    candidatesFound = await ingestPages({ runId, sourceId, sourceName, host: new URL(url).hostname }, pages, log, () => flush());
    log(`done: ${pagesFetched} page(s), ${candidatesFound} candidate(s)`);
    await flush({ status: "SUCCEEDED", finishedAt: new Date() });
    await prisma.providerSource.update({ where: { id: sourceId }, data: { lastRunAt: new Date() } });
  } catch (e) {
    log(`failed: ${e instanceof Error ? e.message : String(e)}`);
    await flush({ status: "FAILED", finishedAt: new Date(), error: e instanceof Error ? e.message.slice(0, 500) : "Crawl failed" });
  }
}

// ── Candidates & review ──────────────────────────────────────────────────────

/** A candidate as returned to the admin UI: the invite-token hash never leaves the server. */
export function toAdminCandidate<T extends { inviteTokenHash?: string | null; photoSourceUrl?: string | null }>(c: T) {
  const copy: Omit<T, "inviteTokenHash"> & { inviteTokenHash?: unknown; hasPhoto: boolean } = { ...c, hasPhoto: !!c.photoSourceUrl };
  delete copy.inviteTokenHash;
  return copy;
}

export function listCandidates(status: ProviderCandidateStatus | undefined, cursor?: string, take = 25) {
  return prisma.providerCandidate.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { source: { select: { name: true, url: true } } },
  });
}

export interface CandidatePatch {
  fullName?: string;
  specialty?: string;
  email?: string | null;
  phone?: string | null;
  yearsExperience?: number | null;
  facilityName?: string | null;
  practiceLocation?: string | null;
}

export async function updateCandidate(adminId: string, id: string, patch: CandidatePatch) {
  const c = await prisma.providerCandidate.findUnique({ where: { id } });
  if (!c) throw new SourcingError("Candidate not found.", 404);
  if (c.status !== "PENDING_REVIEW") throw new SourcingError("Only candidates awaiting review can be edited.");
  const updated = await prisma.providerCandidate.update({ where: { id }, data: { ...patch, email: patch.email === undefined ? undefined : patch.email?.toLowerCase() || null } });
  await logAdministrativeAction({ action: "PROVIDER_CANDIDATE_REVIEW", actorId: adminId, targetId: id, details: { op: "edit", fields: Object.keys(patch) } });
  return updated;
}

const stripTitle = (name: string) => name.replace(/^(dr\.?|doctor|prof\.?)\s+/i, "").trim();

async function uniqueHandle(name: string): Promise<string> {
  const base = ("dr-" + stripTitle(name).toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-+|-+$/g, "").slice(0, 24) || "dr";
  for (let i = 0; i < 20; i++) {
    const handle = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await prisma.user.findUnique({ where: { handle }, select: { id: true } }))) return handle;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

/** Creates the PROVIDER user + verified practitioner profile for a candidate. */
async function createProviderAccount(c: ProviderCandidate, passwordHash: string, emailVerified: boolean) {
  if (!c.email) throw new SourcingError("An email address is required to create the provider account.");
  if (await prisma.user.findUnique({ where: { email: c.email }, select: { id: true } })) {
    throw new SourcingError("Someone already uses this email on NauriCare.", 409);
  }
  const avatarUrl = c.photoSourceUrl ? await rehostImage(c.photoSourceUrl, "providers").catch(() => null) : null;
  const coords = c.latitude != null && c.longitude != null ? { lat: c.latitude, lng: c.longitude } : await geocodePractice(c.practiceLocation, c.facilityName);
  const handle = await uniqueHandle(c.fullName);
  return prisma.user.create({
    data: {
      name: stripTitle(c.fullName),
      email: c.email,
      passwordHash,
      role: "PROVIDER",
      isVerified: true,
      isEmailVerified: emailVerified,
      handle,
      avatarUrl,
      privacyConsent: true,
      practitionerProfile: {
        create: {
          clinicName: c.facilityName ?? "Independent practice",
          specialty: c.specialty,
          location: c.practiceLocation,
          yearsExperience: c.yearsExperience,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          isVerified: true,
        },
      },
    },
    select: { id: true, email: true },
  });
}

async function issueInvite(c: ProviderCandidate, alreadyListed: boolean) {
  const token = randomToken();
  const inviteExpiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await prisma.providerCandidate.update({ where: { id: c.id }, data: { inviteTokenHash: hashToken(token), inviteExpiresAt, invitedAt: new Date() } });
  try {
    await sendProviderInvitationEmail({
      to: c.email!,
      name: c.fullName,
      facility: c.facilityName,
      claimUrl: `${SITE_URL}/claim/${token}`,
      alreadyListed,
      expiresOn: formatDate(inviteExpiresAt, "long"),
    });
    return { emailSent: true as const };
  } catch (e) {
    console.error("[PROVIDER_INVITE_EMAIL]", e instanceof Error ? e.message : e);
    return { emailSent: false as const };
  }
}

export type ReviewAction = "invite" | "publish" | "reject" | "duplicate";

export async function reviewCandidate(adminId: string, id: string, action: ReviewAction, note?: string) {
  const c = await prisma.providerCandidate.findUnique({ where: { id } });
  if (!c) throw new SourcingError("Candidate not found.", 404);
  if (c.status !== "PENDING_REVIEW") throw new SourcingError("This candidate has already been reviewed.");
  const reviewed = { reviewedById: adminId, reviewedAt: new Date(), reviewNote: note || null };

  if (action === "reject" || action === "duplicate") {
    const updated = await prisma.providerCandidate.update({ where: { id }, data: { ...reviewed, status: action === "reject" ? "REJECTED" : "DUPLICATE" } });
    await logAdministrativeAction({ action: "PROVIDER_CANDIDATE_REVIEW", actorId: adminId, targetId: id, details: { op: action, note } });
    return { candidate: updated, emailSent: null };
  }

  if (!c.email) throw new SourcingError("Add the doctor's email before approving: the invitation is how they consent.");

  if (action === "invite") {
    await prisma.providerCandidate.update({ where: { id }, data: { ...reviewed, status: "INVITED" } });
    const { emailSent } = await issueInvite(c, false);
    await logAdministrativeAction({ action: "PROVIDER_CANDIDATE_REVIEW", actorId: adminId, targetId: id, details: { op: "invite", emailSent } });
    return { candidate: await prisma.providerCandidate.findUnique({ where: { id } }), emailSent };
  }

  // publish: the admin attests the doctor consented offline. The account goes
  // live now with an unusable password; the invitation lets them set one.
  if (!note || note.trim().length < 10) throw new SourcingError("Describe how consent was obtained (who, when, how) before publishing.");
  const unusable = await bcrypt.hash(randomToken(), 10);
  const user = await createProviderAccount(c, unusable, false);
  await prisma.providerCandidate.update({
    where: { id },
    data: { ...reviewed, status: "PUBLISHED", publishedUserId: user.id, consentSource: "ADMIN_ATTESTED", consentRecordedAt: new Date(), consentNote: note.trim() },
  });
  const { emailSent } = await issueInvite(c, true);
  await logAdministrativeAction({ action: "PROVIDER_CANDIDATE_PUBLISH", actorId: adminId, targetId: user.id, details: { candidateId: id, consent: "ADMIN_ATTESTED", emailSent } });
  return { candidate: await prisma.providerCandidate.findUnique({ where: { id } }), emailSent };
}

/** Admin-only preview of a candidate's photo, proxied so the browser never hits the third-party site. */
export async function candidatePhoto(id: string) {
  const c = await prisma.providerCandidate.findUnique({ where: { id }, select: { photoSourceUrl: true } });
  if (!c?.photoSourceUrl) return null;
  return fetchRemoteImage(c.photoSourceUrl);
}

// ── Invitation claim (public, token-gated) ───────────────────────────────────

async function candidateForToken(token: string) {
  if (!token || token.length < 32 || token.length > 64) return null;
  const c = await prisma.providerCandidate.findUnique({ where: { inviteTokenHash: hashToken(token) } });
  if (!c || !c.inviteExpiresAt || c.inviteExpiresAt < new Date()) return null;
  if (c.status !== "INVITED" && c.status !== "PUBLISHED") return null;
  return c;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export async function getInvitation(token: string) {
  const c = await candidateForToken(token);
  if (!c) return null;
  return {
    fullName: c.fullName,
    specialty: c.specialty,
    facilityName: c.facilityName,
    practiceLocation: c.practiceLocation,
    yearsExperience: c.yearsExperience,
    email: maskEmail(c.email!),
    alreadyListed: c.status === "PUBLISHED",
    sourceUrl: c.profileUrl,
  };
}

export async function claimInvitation(token: string, input: { password: string; licenseNumber: string }) {
  const c = await candidateForToken(token);
  if (!c) throw new SourcingError("This invitation link is invalid or has expired. Ask NauriCare to send a new one.", 410);
  if (await prisma.providerProfile.findUnique({ where: { licenseNumber: input.licenseNumber }, select: { id: true } })) {
    throw new SourcingError("That licence number is already registered on NauriCare.", 409);
  }
  const passwordHash = await bcrypt.hash(input.password, 12);

  let userId: string;
  if (c.status === "INVITED") {
    const user = await createProviderAccount(c, passwordHash, true);
    userId = user.id;
  } else {
    userId = c.publishedUserId!;
    await prisma.user.update({ where: { id: userId }, data: { passwordHash, isEmailVerified: true } });
  }
  await prisma.$transaction([
    prisma.providerProfile.upsert({
      where: { userId },
      update: { licenseNumber: input.licenseNumber },
      create: { userId, specialty: c.specialty, licenseNumber: input.licenseNumber, verificationStatus: "APPROVED", verifiedAt: new Date(), verifiedById: c.reviewedById },
    }),
    prisma.providerCandidate.update({
      where: { id: c.id },
      data: {
        status: "PUBLISHED",
        publishedUserId: userId,
        inviteTokenHash: null,
        inviteExpiresAt: null,
        consentSource: c.consentSource ?? "INVITE_CLAIMED",
        consentRecordedAt: c.consentRecordedAt ?? new Date(),
        consentNote: c.consentNote ? `${c.consentNote}\nConfirmed by the provider when claiming the account.` : "Accepted by the provider via invitation.",
      },
    }),
  ]);
  await logAdministrativeAction({ action: "PROVIDER_REGISTER", actorId: userId, targetId: userId, details: { via: "sourcing-invitation", candidateId: c.id } });
  return { email: c.email! };
}
