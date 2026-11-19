import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger, requestIdFrom, scrubText } from "./logger";

function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, cb) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      cb();
    },
  });
  return { log: createLogger(stream, "info"), lines };
}

describe("scrubText", () => {
  it("removes e-mail addresses", () => {
    expect(scrubText("No user for jane.doe+x@example.org found")).toBe("No user for [email] found");
  });
});

describe("requestIdFrom", () => {
  it("prefers x-request-id, then cf-ray", () => {
    expect(requestIdFrom(new Headers({ "x-request-id": "a", "cf-ray": "b" }))).toBe("a");
    expect(requestIdFrom(new Headers({ "cf-ray": "b" }))).toBe("b");
    expect(requestIdFrom(new Headers())).toBeUndefined();
  });
});

describe("logger", () => {
  it("redacts credentials, identifiers and health content at any of the first three levels", () => {
    const { log, lines } = capture();
    log.info(
      {
        event: "test",
        email: "a@b.org",
        password: "hunter2",
        user: { name: "Jane", id: "u1", profile: { dateOfBirth: "1990-01-01" } },
        cycle: { notes: "free text", lengthDays: 29 },
        headers: { authorization: "Bearer x", cookie: "s=1" },
      },
      "hello",
    );
    const [line] = lines;
    expect(line.email).toBe("[redacted]");
    expect(line.password).toBe("[redacted]");
    expect(line.user).toMatchObject({ name: "[redacted]", id: "u1", profile: { dateOfBirth: "[redacted]" } });
    expect(line.cycle).toEqual({ notes: "[redacted]", lengthDays: 29 });
    expect(line.headers).toEqual({ authorization: "[redacted]", cookie: "[redacted]" });
    expect(line).toMatchObject({ msg: "hello", event: "test", severity: "info", level: 30, service: "nauricare-web" });
  });

  it("keeps the error type, message and code but scrubs e-mails from them", () => {
    const { log, lines } = capture();
    const err = Object.assign(new Error("Unique constraint failed for x@y.org"), { code: "P2002" });
    log.error({ err }, "failed");
    expect(lines[0].err).toMatchObject({
      type: "Error",
      message: "Unique constraint failed for [email]",
      errorCode: "P2002",
    });
  });
});
