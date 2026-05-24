/**
 * Vitest del Sprint v3.0 / T6 — Acciones desde ContextCard.
 *
 * Cubre:
 *   - reportIncident inserta y persiste con kind/severity/snapshotId correctos
 *   - listIncidents devuelve más reciente primero + openCount correcto
 *   - resolveIncident marca resolvedAt y baja el openCount
 *   - setOverride / getActiveOverride respetan vigencia (expiresAt)
 *   - clearOverride desactiva el override
 *   - validación Zod de inputs maliciosos (nodeId con caracteres raros)
 *
 * NO testea askAbout aquí (vive con omnibox.ask y comparte la latencia ~12-18s).
 * En su lugar, askAbout tiene su propio archivo `contextActions.askAbout.test.ts`
 * que se ejecuta con timeout extendido y se omite si GEMINI_API_KEY falta.
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { randomBytes } from "node:crypto";

function createCallerForUnauth() {
  // Mismo patrón que omnibox.ask.test.ts y board.snapshot.test.ts
  return appRouter.createCaller({
    user: null,
    req: { cookies: {}, get: () => undefined } as never,
    res: { clearCookie: () => undefined } as never,
  });
}

function unique(prefix: string) {
  // nodeId válido: solo letras/números/underscore.
  return `${prefix}_${randomBytes(4).toString("hex")}`;
}

describe("contextActions.reportIncident + listIncidents + resolveIncident", () => {
  it(
    "ciclo completo: reporta dos incidentes y resuelve uno",
    async () => {
      const caller = createCallerForUnauth();
      const nodeId = unique("test_node");

      const a = await caller.contextActions.reportIncident({
        nodeId,
        kind: "BUG",
        severity: "high",
        message: "El render del Building parpadea cuando se conmuta capa",
      });
      expect(a.id).toBeGreaterThan(0);
      expect(a.kind).toBe("BUG");
      expect(a.severity).toBe("high");
      expect(a.nodeId).toBe(nodeId);
      expect(a.resolvedAt).toBeFalsy();

      const b = await caller.contextActions.reportIncident({
        nodeId,
        kind: "IDEA",
        severity: "low",
        message: "Sería útil mostrar incidentes en el badge del building",
      });
      expect(b.id).toBeGreaterThan(a.id);

      const list1 = await caller.contextActions.listIncidents({
        nodeId,
        limit: 20,
      });
      expect(list1.incidents.length).toBe(2);
      expect(list1.openCount).toBe(2);
      // más reciente primero
      expect(list1.incidents[0].id).toBe(b.id);
      expect(list1.incidents[1].id).toBe(a.id);

      const resolved = await caller.contextActions.resolveIncident({ id: a.id });
      expect(resolved.resolvedAt).toBeTruthy();

      const list2 = await caller.contextActions.listIncidents({
        nodeId,
        limit: 20,
      });
      expect(list2.openCount).toBe(1);
      const stillOpen = list2.incidents.find((i) => i.id === b.id);
      expect(stillOpen?.resolvedAt).toBeFalsy();
    },
    20_000,
  );

  it("rechaza nodeId con caracteres no permitidos (Zod regex)", async () => {
    const caller = createCallerForUnauth();
    await expect(
      caller.contextActions.reportIncident({
        // espacios y guiones rompen la regex /^[a-z0-9_]+$/i
        nodeId: "bad-node-id with spaces",
        kind: "BUG",
        severity: "med",
        message: "deberia rechazar",
      }),
    ).rejects.toThrow();
  });

  it("rechaza message muy corto (Zod min(2))", async () => {
    const caller = createCallerForUnauth();
    await expect(
      caller.contextActions.reportIncident({
        nodeId: "valid_node",
        kind: "OBSERVACION",
        severity: "low",
        message: "x", // longitud 1 < min(2)
      }),
    ).rejects.toThrow();
  });
});

describe("contextActions.setOverride + getActiveOverride + clearOverride", () => {
  it(
    "ciclo completo: declara override permanente y luego lo limpia",
    async () => {
      const caller = createCallerForUnauth();
      const nodeId = unique("test_override_node");

      // Antes de cualquier override, getActiveOverride retorna null
      const before = await caller.contextActions.getActiveOverride({ nodeId });
      expect(before).toBeNull();

      const created = await caller.contextActions.setOverride({
        nodeId,
        statusOverride: "DEGRADED",
        note: "Don Alfredo dice que ya no funciona desde el reboot",
      });
      expect(created.id).toBeGreaterThan(0);
      expect(created.statusOverride).toBe("DEGRADED");
      expect(created.expiresAt).toBeNull();
      expect(created.clearedAt).toBeNull();

      const active = await caller.contextActions.getActiveOverride({ nodeId });
      expect(active).not.toBeNull();
      expect(active?.id).toBe(created.id);

      // Pisar con un nuevo override: el más reciente gana
      const second = await caller.contextActions.setOverride({
        nodeId,
        statusOverride: "ACTIVE",
        note: "Reanimado tras fix del cron",
      });
      const activeNow = await caller.contextActions.getActiveOverride({ nodeId });
      expect(activeNow?.id).toBe(second.id);
      expect(activeNow?.statusOverride).toBe("ACTIVE");

      // Limpiar el override vigente
      const cleared = await caller.contextActions.clearOverride({ id: second.id });
      expect(cleared.clearedAt).toBeTruthy();

      // Ahora el activo debe ser el ANTERIOR (created), porque el más reciente
      // está cleared. Ojo: created es DEGRADED.
      const afterClear = await caller.contextActions.getActiveOverride({ nodeId });
      expect(afterClear?.id).toBe(created.id);
      expect(afterClear?.statusOverride).toBe("DEGRADED");
    },
    20_000,
  );

  it(
    "respeta expiresAt: un override expirado NO se devuelve como activo",
    async () => {
      const caller = createCallerForUnauth();
      const nodeId = unique("test_expired_node");

      // Override que expiró hace 1 hora
      const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const expired = await caller.contextActions.setOverride({
        nodeId,
        statusOverride: "FUTURE",
        note: "Esto debió expirar",
        expiresAt: past,
      });
      expect(expired.id).toBeGreaterThan(0);

      const active = await caller.contextActions.getActiveOverride({ nodeId });
      expect(active).toBeNull();
    },
    15_000,
  );

  it("rechaza statusOverride inválido (Zod enum)", async () => {
    const caller = createCallerForUnauth();
    await expect(
      caller.contextActions.setOverride({
        nodeId: "valid_node",
        // @ts-expect-error: probando rechazo de enum
        statusOverride: "BROKEN_STATUS",
        note: "x",
      }),
    ).rejects.toThrow();
  });
});

describe("contextActions.resolveIncident edge cases", () => {
  it("resolver un id inexistente lanza NOT_FOUND", async () => {
    const caller = createCallerForUnauth();
    await expect(
      caller.contextActions.resolveIncident({ id: 999_999_999 }),
    ).rejects.toThrow();
  });
});
