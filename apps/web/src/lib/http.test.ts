import { describe, expect, it } from "vitest";
import { readErrorMessage } from "./http";

describe("readErrorMessage", () => {
  it("reads the JSON error envelope", async () => {
    expect(await readErrorMessage(Response.json({ error: "Slot taken." }, { status: 409 }), "x")).toBe("Slot taken.");
  });
  it("falls back for empty, unexpected or very long bodies", async () => {
    expect(await readErrorMessage(new Response("", { status: 500 }), "Try again.")).toBe("Try again.");
    expect(await readErrorMessage(Response.json({ message: "?" }), "Try again.")).toBe("Try again.");
    expect(await readErrorMessage(new Response("<html>".repeat(100)), "Try again.")).toBe("Try again.");
  });
  it("shows short plain-text bodies", async () => {
    expect(await readErrorMessage(new Response("Forbidden"), "x")).toBe("Forbidden");
  });
});
