import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// ADR 0001: design-system primitives use semantic tokens only (bg-brand,
// text-ink, border-hairline …), never raw palette utilities or hex colours,
// so a token change re-themes every component and dark mode stays possible.
const dir = path.dirname(new URL(import.meta.url).pathname);
const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));

const PALETTE =
  /\b(?:bg|text|border|ring|outline|fill|stroke|from|to|via|shadow|divide|placeholder|decoration|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|nc-[a-z-]+)(?:-\d{2,3})?\b/g;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

describe("components/ui uses semantic tokens only", () => {
  it.each(files)("%s", (file) => {
    const src = readFileSync(path.join(dir, file), "utf8").replace(/^\s*(\/\/|\*).*$/gm, "");
    expect([...(src.match(PALETTE) ?? []), ...(src.match(HEX) ?? [])]).toEqual([]);
  });
});
