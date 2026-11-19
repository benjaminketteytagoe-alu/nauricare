import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({})) }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

const { getSessionUser, getUserIdWithRole, requireApiUser, requireRole } = await import("./auth-guards");

const session = (user: object | null, extra: object = {}) => ({ user, expires: "", ...extra });

describe("auth guards", () => {
  beforeEach(() => {
    getServerSession.mockReset();
    redirect.mockClear();
  });

  it("treats a session waiting for its sign-in code as signed out", async () => {
    getServerSession.mockResolvedValue(session({ id: "", role: "PATIENT" }, { loginCodePending: true }));
    expect(await getSessionUser()).toBeNull();
    const auth = await requireApiUser();
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
    await expect(requireRole("PATIENT")).rejects.toThrow("REDIRECT /verify-code");
  });

  it("requireApiUser: 401 when signed out, 403 for the wrong role", async () => {
    getServerSession.mockResolvedValue(null);
    const out = await requireApiUser("PATIENT");
    expect(!out.ok && out.response.status).toBe(401);

    getServerSession.mockResolvedValue(session({ id: "u1", role: "PROVIDER" }));
    const wrong = await requireApiUser("PATIENT", "ADMIN");
    expect(!wrong.ok && wrong.response.status).toBe(403);

    const right = await requireApiUser("PATIENT", "PROVIDER");
    expect(right.ok && right.user).toMatchObject({ id: "u1", role: "PROVIDER" });
    expect((await requireApiUser()).ok).toBe(true);
  });

  it("getUserIdWithRole only returns the id for the matching role", async () => {
    getServerSession.mockResolvedValue(session({ id: "u2", role: "ADMIN" }));
    expect(await getUserIdWithRole("ADMIN")).toBe("u2");
    expect(await getUserIdWithRole("PATIENT")).toBeNull();
  });

  it("requireRole sends other roles to their own portal and guests to login", async () => {
    getServerSession.mockResolvedValue(session({ id: "u3", role: "PROVIDER" }));
    await expect(requireRole("ADMIN")).rejects.toThrow("REDIRECT /provider");
    getServerSession.mockResolvedValue(null);
    await expect(requireRole("ADMIN")).rejects.toThrow("REDIRECT /login");
    getServerSession.mockResolvedValue(session({ id: "u4", role: "ADMIN" }));
    await expect(requireRole("ADMIN")).resolves.toMatchObject({ user: { id: "u4" } });
  });
});
