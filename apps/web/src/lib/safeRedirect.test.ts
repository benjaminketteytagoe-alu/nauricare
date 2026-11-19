import { describe, expect, it } from "vitest";
import { carryAuthParams, resolveAuthRedirect, safeRedirect } from "./safeRedirect";

describe("safeRedirect", () => {
  it.each(["/dashboard", "/dashboard/cycle?tab=log", "/provider/roster/abc", "/admin"])("allows %s", (path) => {
    expect(safeRedirect(path)).toBe(path);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/dashboardx",
    "/login",
    "javascript:alert(1)",
    "/dashboard\u0000",
    "",
    null,
    undefined,
  ])("rejects %j", (value) => {
    expect(safeRedirect(value, "/fallback")).toBe("/fallback");
  });
});

describe("resolveAuthRedirect", () => {
  const origin = "https://nauricare.org";

  it("appends a well-formed action", () => {
    expect(resolveAuthRedirect("?redirect=/dashboard/providers&action=book", origin)).toBe(
      "/dashboard/providers?action=book",
    );
  });

  it("drops a malformed action", () => {
    expect(resolveAuthRedirect("?redirect=/dashboard&action=<script>", origin)).toBe("/dashboard");
  });

  it("accepts a same-origin absolute callbackUrl", () => {
    expect(resolveAuthRedirect(`?callbackUrl=${encodeURIComponent(origin + "/provider")}`, origin)).toBe("/provider");
  });

  it("rejects a foreign callbackUrl", () => {
    expect(resolveAuthRedirect("?callbackUrl=https%3A%2F%2Fevil.example%2Fdashboard", origin)).toBeNull();
  });
});

describe("carryAuthParams", () => {
  it("keeps only the auth parameters", () => {
    expect(carryAuthParams("?redirect=/dashboard&utm_source=x&action=book")).toBe("?redirect=%2Fdashboard&action=book");
    expect(carryAuthParams("?foo=bar")).toBe("");
  });
});
