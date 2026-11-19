import { afterEach, describe, expect, it, vi } from "vitest";
import { extractCandidates, segmentFor, toDocument, validateCandidate } from "./extract";

const PAGE = `<html><head><title>Kigali Women's Clinic | Our doctors</title><script>var x="Dr Fake Person gynaecologist"</script></head>
<body>
  <h2>Dr. Aline Uwase</h2><p>Consultant Obstetrician &amp; Gynaecologist with 12 years of experience.</p>
  <a href="mailto:aline@kwc.rw">Email</a> <a href="tel:+250788123456">Call</a>
  <img src="/img/uwase.jpg" alt="Dr Aline Uwase">
  <h2>Dr. Eric Habimana</h2><p>General surgeon. eric@kwc.rw</p>
  <footer>Kigali Women's Clinic, Kacyiru</footer>
</body></html>`;

const doc = toDocument("https://kwc.rw/doctors", PAGE);
const raw = { fullName: "Dr. Aline Uwase" };

describe("toDocument", () => {
  it("collects visible text, contacts and absolute image URLs, dropping scripts", () => {
    expect(doc.title).toBe("Kigali Women's Clinic | Our doctors");
    expect(doc.text).not.toContain("Fake Person");
    expect(doc.text).toContain("aline@kwc.rw"); // mailto target written next to its link
    expect(doc.emails).toEqual(expect.arrayContaining(["aline@kwc.rw", "eric@kwc.rw"]));
    expect(doc.phones).toContain("+250788123456");
    expect(doc.images).toEqual([{ src: "https://kwc.rw/img/uwase.jpg", alt: "Dr Aline Uwase" }]);
  });
});

describe("segmentFor", () => {
  it("stops at the next doctor's name", () => {
    const seg = segmentFor(doc.text, "Dr. Aline Uwase");
    expect(seg).toContain("Gynaecologist");
    expect(seg).not.toContain("Habimana");
    expect(segmentFor(doc.text, "Dr. Nobody")).toBe("");
  });
});

describe("validateCandidate", () => {
  it("keeps only details that appear in the doctor's own segment", () => {
    const c = validateCandidate(
      {
        ...raw,
        email: "ALINE@kwc.rw",
        phone: "+250 788 123 456",
        yearsExperience: 12,
        photoUrl: "https://kwc.rw/img/uwase.jpg",
        facilityName: "Kigali Women's Clinic",
      },
      doc,
      "ai",
    );
    expect(c).toMatchObject({
      fullName: "Dr. Aline Uwase",
      specialty: "Obstetrician & Gynaecologist",
      email: "aline@kwc.rw",
      phone: "+250 788 123 456",
      yearsExperience: 12,
      photoSourceUrl: "https://kwc.rw/img/uwase.jpg",
      facilityName: "Kigali Women's Clinic",
      extractor: "ai",
    });
    expect(c!.confidence).toBeLessThanOrEqual(1);
  });

  it("drops hallucinated values instead of trusting the model", () => {
    const c = validateCandidate(
      {
        ...raw,
        email: "eric@kwc.rw", // on the page, but in someone else's card
        phone: "+250 722 000 000",
        yearsExperience: 30,
        photoUrl: "https://evil.example/x.jpg",
        practiceLocation: "Atlantis",
      },
      doc,
      "ai",
    )!;
    expect([c.email, c.phone, c.yearsExperience, c.photoSourceUrl, c.practiceLocation]).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("rejects names not on the page and non-gynaecology doctors", () => {
    expect(validateCandidate({ fullName: "Dr. Invented Name" }, doc, "ai")).toBeNull();
    expect(validateCandidate({ fullName: "Dr. Eric Habimana" }, doc, "ai")).toBeNull();
  });
});

describe("extractCandidates", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("falls back to heuristics without an AI key and still validates", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const log = vi.fn();
    const out = await extractCandidates(doc, log);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ fullName: "Dr. Aline Uwase", extractor: "heuristic", email: "aline@kwc.rw" });
    expect(out[0].photoSourceUrl).toBe("https://kwc.rw/img/uwase.jpg");
  });
});
