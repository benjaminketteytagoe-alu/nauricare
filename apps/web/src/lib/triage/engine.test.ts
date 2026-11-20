import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent };
    }
  },
}));

const { runTriage, toLegacyRiskLevel, toTriageOutcome, medGemmaIsConfigured } = await import("./engine");

const modelReply = (body: object, wrap = (s: string) => s) => wrap(JSON.stringify(body));
const LOW = {
  severity: "LOW",
  summary: "This can be associated with a normal cycle.",
  recommendedSpecialty: "general practitioner",
  redFlags: [],
  selfCare: ["Rest", "Hydrate"],
  seekCareWithin: "At your next routine visit",
};
const medGemmaResponse = (content: string, ok = true) =>
  ({ ok, status: ok ? 200 : 503, json: async () => ({ choices: [{ message: { content } }] }) }) as Response;

describe("runTriage", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("MEDGEMMA_ENDPOINT_URL", "");
    vi.stubEnv("MEDGEMMA_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    generateContent.mockReset();
  });

  it("answers from rules only when no model is configured", async () => {
    const r = await runTriage({ symptoms: ["bloating"], cycleDay: 3, notes: "" });
    expect(r).toMatchObject({ engine: "rules", severity: "LOW", recommendedSpecialty: "General Practitioner" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("honours rulesOnly even when models are configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const r = await runTriage({ symptoms: [], cycleDay: 0, notes: "chest pain" }, { rulesOnly: true });
    expect(r).toMatchObject({ engine: "rules", severity: "URGENT", seekCareWithin: "Today" });
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("uses MedGemma first and normalises the specialty", async () => {
    vi.stubEnv("MEDGEMMA_ENDPOINT_URL", "https://medgemma.test/v1/chat/completions");
    vi.stubEnv("MEDGEMMA_API_KEY", "token");
    vi.stubEnv("GEMINI_API_KEY", "k");
    expect(medGemmaIsConfigured()).toBe(true);
    fetchMock.mockResolvedValue(medGemmaResponse(modelReply(LOW, (s) => "```json\n" + s + "\n```")));

    const r = await runTriage({ symptoms: ["cramps"], cycleDay: 2, notes: "" });
    expect(r).toMatchObject({ engine: "medgemma", severity: "LOW", recommendedSpecialty: "General Practitioner" });
    expect(r.selfCare).toEqual(["Rest", "Hydrate"]);
    expect(generateContent).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer token");
  });

  it("falls back to Gemini when MedGemma fails", async () => {
    vi.stubEnv("MEDGEMMA_ENDPOINT_URL", "https://medgemma.test/v1/chat/completions");
    vi.stubEnv("MEDGEMMA_API_KEY", "token");
    vi.stubEnv("GEMINI_API_KEY", "k");
    fetchMock.mockResolvedValue(medGemmaResponse("", false));
    generateContent.mockResolvedValue({ response: { text: () => modelReply(LOW) } });
    expect((await runTriage({ symptoms: [], cycleDay: 0, notes: "" })).engine).toBe("gemini");
  });

  it("falls back to rules when the model output is not valid", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    generateContent.mockResolvedValue({ response: { text: () => "I think you are fine." } });
    expect((await runTriage({ symptoms: [], cycleDay: 0, notes: "" })).engine).toBe("rules");
    generateContent.mockResolvedValue({ response: { text: () => modelReply({ ...LOW, severity: "MILD" }) } });
    expect((await runTriage({ symptoms: [], cycleDay: 0, notes: "" })).engine).toBe("rules");
  });

  it("lets red flags raise, never lower, the model's severity", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    generateContent.mockResolvedValue({ response: { text: () => modelReply(LOW) } });
    const r = await runTriage({ symptoms: ["heavy bleeding"], cycleDay: 2, notes: "I fainted twice" });
    expect(r.severity).toBe("URGENT");
    expect(r.engine).toBe("gemini");
    expect(r.summary).toMatch(/raised the urgency/);
    expect(r.selfCare).toEqual([]);
    expect(r.seekCareWithin).toBe("Today");
    expect(r.recommendedSpecialty).toBe("General Practitioner");
    expect(r.redFlags.length).toBeGreaterThan(0);
  });

  it("maps an unknown specialty to a safe default", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    generateContent.mockResolvedValue({
      response: { text: () => modelReply({ ...LOW, severity: "URGENT", recommendedSpecialty: "Astrology" }) },
    });
    expect((await runTriage({ symptoms: [], cycleDay: 0, notes: "" })).recommendedSpecialty).toBe("Emergency Medicine");
  });
});

describe("severity mappings", () => {
  it("maps to legacy risk levels and patient outcomes", () => {
    expect(["LOW", "MODERATE", "URGENT"].map((s) => toLegacyRiskLevel(s as never))).toEqual(["Low", "Medium", "High"]);
    expect(["LOW", "MODERATE", "URGENT"].map((s) => toTriageOutcome(s as never))).toEqual([
      "SELF_CARE",
      "ROUTINE_CONSULT",
      "SPECIALIST_REQUIRED",
    ]);
  });
});
