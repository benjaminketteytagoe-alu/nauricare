import { afterEach, describe, expect, it, vi } from "vitest";

const safeGet = vi.fn();
vi.mock("@/server/net/safeFetch", () => ({ safeGet }));
const { loadRobots } = await import("./robots");

const respond = (status: number, body = "") => safeGet.mockResolvedValue({ status, body: Buffer.from(body) });
const allowed = async (path: string) =>
  (await loadRobots("https://site.rw")).isAllowed(new URL(path, "https://site.rw"));

describe("robots.txt policy", () => {
  afterEach(() => safeGet.mockReset());

  it("prefers the group for our agent over *", async () => {
    respond(200, "User-agent: *\nDisallow: /\n\nUser-agent: NauriCareBot\nDisallow: /private\n");
    expect(await allowed("/doctors")).toBe(true);
    expect(await allowed("/private/x")).toBe(false);
  });

  it("applies the longest match, with Allow winning ties, wildcards and $ anchors", async () => {
    respond(200, "User-agent: *\nDisallow: /team\nAllow: /team/doctors\nDisallow: /*.pdf$\n# comment\n");
    expect(await allowed("/team/admin")).toBe(false);
    expect(await allowed("/team/doctors/aline")).toBe(true);
    expect(await allowed("/files/cv.pdf")).toBe(false);
    expect(await allowed("/files/cv.pdf?download=1")).toBe(true);
  });

  it("treats 401/403 as disallow-all and missing or unreachable files as allow-all", async () => {
    respond(403);
    expect(await allowed("/")).toBe(false);
    respond(404);
    expect(await allowed("/anything")).toBe(true);
    safeGet.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await allowed("/anything")).toBe(true);
  });
});
