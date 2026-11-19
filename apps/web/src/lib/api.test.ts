import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiError, apiSuccess, handle, parseJson, ServiceError, validateBody } from "./api";

const jsonRequest = (body: string) => new Request("http://test/api", { method: "POST", body });
const Schema = z.object({ name: z.string().min(2, "Name is too short.") });

describe("api helpers", () => {
  it("builds success and error envelopes", async () => {
    const ok = apiSuccess({ a: 1 }, 201, { "Cache-Control": "no-store" });
    expect(ok.status).toBe(201);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    expect(await ok.json()).toEqual({ a: 1 });
    expect(await apiError("Nope", 409, "CONFLICT").json()).toEqual({ error: "Nope", code: "CONFLICT" });
    expect(await apiError("Nope").json()).toEqual({ error: "Nope" });
  });

  it("parseJson treats malformed JSON as a 400", async () => {
    const r = await parseJson(jsonRequest("{not json"), Schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(400);
      expect(await r.response.json()).toEqual({ error: "Request body must be valid JSON." });
    }
  });

  it("parseJson returns the first validation issue, or a custom message", async () => {
    const r = await parseJson(jsonRequest('{"name":"a"}'), Schema);
    expect(!r.ok && (await r.response.json())).toEqual({ error: "Name is too short." });
    const custom = validateBody({ name: 1 }, Schema, "Fill in the form.");
    expect(!custom.ok && (await custom.response.json())).toEqual({ error: "Fill in the form." });
    expect(validateBody({ name: "Ada" }, Schema)).toEqual({ ok: true, data: { name: "Ada" } });
  });

  it("handle maps service errors and hides unexpected ones", async () => {
    const service = await handle(async () => {
      throw new ServiceError("Slot taken.", 409, "SLOT_TAKEN");
    });
    expect(service.status).toBe(409);
    expect(await service.json()).toEqual({ error: "Slot taken.", code: "SLOT_TAKEN" });

    const zod = await handle(async () => {
      Schema.parse({});
      return apiSuccess(null);
    });
    expect(zod.status).toBe(400);

    const crash = await handle(async () => {
      throw new Error('relation "User" does not exist');
    });
    expect(crash.status).toBe(500);
    expect(await crash.json()).toEqual({ error: "Something went wrong. Please try again." });
  });
});
