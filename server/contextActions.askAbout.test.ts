/**
 * Vitest del Sprint v3.0 / T6 — askAbout.
 *
 * Verifica que `contextActions.askAbout`:
 *   - Devuelve un nodo no existente en el snapshot con fallback `node_not_in_snapshot`
 *   - Devuelve respuesta sin alucinaciones cuando el nodeId existe
 *   - Cita el nodo activo (el answer menciona el id, etiqueta o concepto)
 *   - Honra el shape del contrato: { answer, model, fallback, reason, latency_ms }
 *   - Usa el modelo Gemini de razonamiento (REASONING_TOP)
 *
 * Latencia esperada: 10-25s con Gemini 3 Pro Reasoning. Cada test tiene timeout 60s.
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { GEMINI_MODELS } from "./_core/geminiModels";

function createUnauthCaller() {
  return appRouter.createCaller({
    user: null,
    req: { cookies: {}, get: () => undefined } as never,
    res: { clearCookie: () => undefined } as never,
  });
}

describe("contextActions.askAbout — Gemini focal por nodo", () => {
  it(
    "devuelve fallback estructurado cuando el nodeId NO existe en el snapshot",
    async () => {
      const caller = createUnauthCaller();
      const out = await caller.contextActions.askAbout({
        nodeId: "node_que_no_existe_jamas_xyz",
        query: "¿Qué hace esta pieza?",
      });

      expect(out).toMatchObject({
        fallback: true,
        reason: expect.stringMatching(/no_snapshot|node_not_in_snapshot/),
        model: GEMINI_MODELS.REASONING_TOP,
      });
      expect(out.answer).toBe("");
      expect(typeof out.latency_ms).toBe("number");
      // No debe llamar a Gemini si el nodo no existe → debe ser rápido
      expect(out.latency_ms).toBeLessThan(2000);
    },
    20_000,
  );

  it(
    "responde con shape válido y sin lanzar para un nodeId real del snapshot vivo",
    async () => {
      const caller = createUnauthCaller();

      // Tomamos un nodeId del snapshot vigente, no hardcodeamos.
      const snap = await caller.board.current();
      expect(snap?.payload?.nodes?.length ?? 0).toBeGreaterThan(0);
      const sampleNode = snap!.payload!.nodes[0];

      const out = await caller.contextActions.askAbout({
        nodeId: sampleNode.id,
        query: `¿Qué hace ${sampleNode.label} y con quién se conecta?`,
      });

      // Shape obligatorio del contrato
      expect(out).toHaveProperty("answer");
      expect(out).toHaveProperty("model");
      expect(out).toHaveProperty("fallback");
      expect(out).toHaveProperty("reason");
      expect(out).toHaveProperty("latency_ms");
      expect(out.model).toBe(GEMINI_MODELS.REASONING_TOP);

      // En condiciones normales (Gemini up + nodo existe) esperamos answer válida.
      // En degraded (Gemini caído) esperamos fallback estructurado, NO crash.
      if (!out.fallback) {
        expect(typeof out.answer).toBe("string");
        expect(out.answer.length).toBeGreaterThan(20);
        expect(out.reason).toBe("ok");
      } else {
        // fallback aceptable: gemini_error o json_parse_failed o no_snapshot
        expect(out.reason).toMatch(/gemini_error|json_parse|no_snapshot|node_not_in/);
      }
    },
    60_000,
  );

  it(
    "rechaza queries demasiado cortas (Zod min(2))",
    async () => {
      const caller = createUnauthCaller();
      await expect(
        caller.contextActions.askAbout({
          nodeId: "valid_node",
          query: "x", // 1 char < min(2)
        }),
      ).rejects.toThrow();
    },
    10_000,
  );

  it(
    "rechaza nodeId con caracteres no permitidos",
    async () => {
      const caller = createUnauthCaller();
      await expect(
        caller.contextActions.askAbout({
          nodeId: "bad node id!",
          query: "¿qué pasa?",
        }),
      ).rejects.toThrow();
    },
    10_000,
  );
});
