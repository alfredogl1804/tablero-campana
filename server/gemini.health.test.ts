import { describe, expect, it } from "vitest";
import { getGeminiClient } from "./_core/geminiClient";
import { GEMINI_MODELS } from "./_core/geminiModels";

describe("Gemini API key validation", () => {
  it("GEMINI_API_KEY is set in env", () => {
    expect(process.env.GEMINI_API_KEY).toBeDefined();
    expect(process.env.GEMINI_API_KEY?.length ?? 0).toBeGreaterThan(20);
  });

  it("Live healthcheck against gemini-3.5-flash succeeds", async () => {
    const client = getGeminiClient();
    const r = await client.models.generateContent({
      model: GEMINI_MODELS.HEALTHCHECK,
      contents: "Say 'pong' and nothing else.",
    });
    const text = (r.text ?? "").toLowerCase();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("pong");
  }, 30000);
});
