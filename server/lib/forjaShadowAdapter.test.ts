import { describe, it, expect, beforeAll } from "vitest";
import {
  recordShadowIntent,
  listShadowCalls,
  getShadowCallById,
  statsShadowCalls,
  hashBody,
  ForjaShadowError,
} from "./forjaShadowAdapter";

describe("Forja Shadow Adapter — Hito 8 v1.1", () => {
  beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL required for forja shadow tests");
    }
  });

  it("hashBody is deterministic regardless of key order", () => {
    const a = hashBody({ z: 1, a: 2, b: { x: 3, y: 4 } });
    const b = hashBody({ b: { y: 4, x: 3 }, a: 2, z: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects endpoint that does not start with /", async () => {
    await expect(
      recordShadowIntent({
        endpoint: "v1/events/emit",
        body: { test: true },
      }),
    ).rejects.toThrow(ForjaShadowError);
  });

  it("rejects endpoint not in whitelist (ADR 0002)", async () => {
    await expect(
      recordShadowIntent({
        endpoint: "/random/route",
        body: {},
      }),
    ).rejects.toThrow(/not in the kernel canonical whitelist/);
  });

  it("records a valid shadow intent against /v1/events/emit", async () => {
    const result = await recordShadowIntent({
      endpoint: "/v1/events/emit",
      body: {
        event_type: "validation",
        source: "tablero-campana-test",
        source_type: "system",
        title: "Hito 8 shadow test",
        content: "Verifying shadow adapter never calls kernel",
        value_signal: "low",
      },
      actorRole: "tablero-test",
      reasonNote: "vitest hito 8",
    });
    expect(result.status).toBe("recorded");
    expect(result.mode).toBe("shadow");
    expect(result.endpoint).toBe("/v1/events/emit");
    expect(result.callId).toBeTruthy();
    expect(result.bodyHash).toMatch(/^[a-f0-9]{64}$/);

    // Round trip lookup
    const retrieved = await getShadowCallById(result.callId);
    expect(retrieved).toBeTruthy();
    expect(retrieved?.endpoint).toBe("/v1/events/emit");
    expect(retrieved?.bodyHash).toBe(result.bodyHash);
    expect(retrieved?.intent).toBe("shadow");
  });

  it("listShadowCalls returns the latest first", async () => {
    const calls = await listShadowCalls(5);
    expect(Array.isArray(calls)).toBe(true);
    if (calls.length > 1) {
      expect(calls[0].wouldCallAt.getTime()).toBeGreaterThanOrEqual(
        calls[1].wouldCallAt.getTime(),
      );
    }
  });

  it("statsShadowCalls returns counters by endpoint", async () => {
    const stats = await statsShadowCalls();
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.byEndpoint["/v1/events/emit"]).toBeGreaterThanOrEqual(1);
    expect(stats.lastCallAt).toBeInstanceOf(Date);
  });
});
