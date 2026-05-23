import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { GEMINI_MODELS, resolveImageModel, resolveReasoningModel } from "./_core/geminiModels";

describe("Gemini router contract", () => {
  it("router exposes expected procedures", () => {
    const def = appRouter._def;
    expect(def).toBeDefined();
    // Build the caller with a fake unauthenticated context to confirm shape
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as never,
      res: { clearCookie: () => undefined } as never,
    });
    expect(typeof caller.gemini.health).toBe("function");
    expect(typeof caller.gemini.listModels).toBe("function");
    expect(typeof caller.gemini.generateImage).toBe("function");
    expect(typeof caller.gemini.reason).toBe("function");
  });

  it("listModels returns canonical model identifiers", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as never,
      res: { clearCookie: () => undefined } as never,
    });
    const result = await caller.gemini.listModels();
    expect(result.catalog.IMAGE_TOP).toBe("gemini-3-pro-image-preview");
    expect(result.catalog.IMAGE_FAST).toBe("gemini-3.1-flash-image-preview");
    expect(result.catalog.REASONING_TOP).toBe("gemini-3.1-pro-preview");
    expect(result.catalog.REASONING_FAST).toBe("gemini-3.5-flash");
  });

  it("resolveImageModel maps tiers correctly", () => {
    expect(resolveImageModel("top")).toBe(GEMINI_MODELS.IMAGE_TOP);
    expect(resolveImageModel("fast")).toBe(GEMINI_MODELS.IMAGE_FAST);
  });

  it("resolveReasoningModel maps tiers correctly", () => {
    expect(resolveReasoningModel("top")).toBe(GEMINI_MODELS.REASONING_TOP);
    expect(resolveReasoningModel("fast")).toBe(GEMINI_MODELS.REASONING_FAST);
  });

  it("generateImage requires authentication (rejects without user)", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as never,
      res: { clearCookie: () => undefined } as never,
    });
    await expect(
      caller.gemini.generateImage({ prompt: "hello", tier: "fast" })
    ).rejects.toThrow();
  });
});
