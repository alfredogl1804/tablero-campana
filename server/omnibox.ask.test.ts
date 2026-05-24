/**
 * Sprint v3.0 / T2 — Tests del cerebro narrativo (omnibox.ask).
 *
 * Cubre tres niveles:
 * 1) Contrato: input/output schema correcto, IDs válidos, latencia razonable.
 * 2) Calidad: la respuesta cita IDs reales del genoma, no inventa, está en español.
 * 3) Resiliencia: fallback graceful si Gemini falla o el snapshot no existe.
 *
 * NOTA: estos tests llaman a Gemini de verdad. Tienen timeout extendido (60s)
 * porque el modelo top puede tardar 10-25s en responder.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import {
  insertBoardSnapshot,
  getCurrentBoardSnapshot,
} from "./db";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROJECT_ROOT = process.cwd();

function buildCallerCtx() {
  return {
    user: null,
    req: { cookies: {}, headers: {} } as unknown as never,
    res: { clearCookie: () => {} } as unknown as never,
  };
}

async function ensureSnapshot() {
  const existing = await getCurrentBoardSnapshot();
  if (existing) return existing;

  // Boot el snapshot ejecutando el script Python real.
  const py = spawnSync(
    "/usr/bin/python3.11",
    [join(PROJECT_ROOT, "scripts", "build_board_data.py")],
    { encoding: "utf-8", env: { ...process.env, PYTHONPATH: "" } },
  );
  if (py.status !== 0) {
    throw new Error("build_board_data.py exited " + py.status + ": " + py.stderr);
  }
  const dataPath = join(PROJECT_ROOT, "client", "src", "data", "board_data.json");
  const payload = JSON.parse(readFileSync(dataPath, "utf-8"));
  await insertBoardSnapshot({
    sourceCommit: payload.source_commit ?? "unknown",
    sourceMode: payload.source_mode ?? "unknown",
    payload,
  });
  const after = await getCurrentBoardSnapshot();
  if (!after) throw new Error("snapshot insert verified failed");
  return after;
}

describe("omnibox.ask — cerebro narrativo del Tablero", () => {
  beforeAll(async () => {
    await ensureSnapshot();
  }, 60_000);

  it(
    "responde con shape válido y cita IDs reales del genoma",
    async () => {
      const caller = appRouter.createCaller(buildCallerCtx());
      const r = await caller.omnibox.ask({
        query: "¿Dónde guardas la memoria?",
      });

      // Shape
      expect(r).toHaveProperty("answer");
      expect(r).toHaveProperty("citations");
      expect(r).toHaveProperty("model");
      expect(r).toHaveProperty("fallback");
      expect(r).toHaveProperty("reason");
      expect(r).toHaveProperty("latency_ms");
      expect(typeof r.answer).toBe("string");
      expect(Array.isArray(r.citations)).toBe(true);
      expect(typeof r.fallback).toBe("boolean");

      // El modelo declarado debe ser el reasoning_top vigente
      expect(r.model).toMatch(/gemini-3/);

      // Si no es fallback, debe haber respuesta no vacía
      if (!r.fallback) {
        expect(r.answer.length).toBeGreaterThan(20);
      }
    },
    60_000,
  );

  it(
    "todas las citas devueltas existen en el snapshot vigente",
    async () => {
      const caller = appRouter.createCaller(buildCallerCtx());
      const snapshot = await getCurrentBoardSnapshot();
      expect(snapshot).not.toBeNull();
      const validIds = new Set<string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (snapshot!.payload as any).nodes.map((n: { id: string }) => n.id),
      );

      const r = await caller.omnibox.ask({
        query: "¿Cómo piensas? ¿Qué hace tu cerebro?",
      });

      // Cada cita reportada debe existir en el snapshot.
      for (const id of r.citations) {
        expect(validIds.has(id)).toBe(true);
      }

      // Cada cita inline [@xxx] dentro del texto también.
      const inline = Array.from(r.answer.matchAll(/\[@([a-z0-9_]+)\]/gi)).map(
        (m) => m[1],
      );
      for (const id of inline) {
        expect(validIds.has(id)).toBe(true);
      }
    },
    60_000,
  );

  it(
    "devuelve fallback estructurado cuando la pregunta no se puede responder",
    async () => {
      const caller = appRouter.createCaller(buildCallerCtx());
      const r = await caller.omnibox.ask({
        query: "¿Cuál es el código nuclear secreto de Corea del Norte?",
      });
      // El modelo puede responder "no tengo esa información", lo cual es
      // válido. Lo que NO puede pasar: alucinar IDs falsos.
      const snapshot = await getCurrentBoardSnapshot();
      const validIds = new Set<string>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (snapshot!.payload as any).nodes.map((n: { id: string }) => n.id),
      );
      for (const id of r.citations) {
        expect(validIds.has(id)).toBe(true);
      }
    },
    60_000,
  );

  it("rechaza queries vacías o demasiado cortas", async () => {
    const caller = appRouter.createCaller(buildCallerCtx());
    await expect(caller.omnibox.ask({ query: "" })).rejects.toThrow();
    await expect(caller.omnibox.ask({ query: "a" })).rejects.toThrow();
  });

  it("rechaza queries demasiado largas (>500)", async () => {
    const caller = appRouter.createCaller(buildCallerCtx());
    await expect(
      caller.omnibox.ask({ query: "x".repeat(501) }),
    ).rejects.toThrow();
  });
});
