/**
 * Vitest del Sprint v3.0 / T5 — Memoria histórica.
 *
 * Verifica que el TimelineSlider del board pueda reconstruir el pasado:
 *   - board.history devuelve metadata ordenable (capturedAt) sin payload pesado
 *   - board.byId permite traer un snapshot específico del pasado con su payload completo
 *   - Si pides un id inexistente, devuelve null (no throw)
 *   - El snapshot histórico tiene el mismo shape que board.current
 *   - history y current son consistentes: el último snapshot de history es el current
 *   - history respeta el límite (default 30, máx 100)
 *
 * Estos tests trabajan con datos REALES de la DB. Asumen que ya hay al menos
 * un snapshot persistido (lo cual está garantizado por board.snapshot.test.ts
 * que corre antes en el pipeline).
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

function createUnauthCaller() {
  return appRouter.createCaller({
    user: null,
    req: { cookies: {}, get: () => undefined } as never,
    res: { clearCookie: () => undefined } as never,
  });
}

describe("board.history + board.byId — Memoria histórica T5", () => {
  it("history devuelve un array de metadata válido", async () => {
    const caller = createUnauthCaller();
    const rows = await caller.board.history({ limit: 30 });

    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);

    // Cada row tiene la metadata esperada para el TimelineSlider
    for (const r of rows) {
      expect(r).toHaveProperty("id");
      expect(r).toHaveProperty("capturedAt");
      expect(r).toHaveProperty("totalNodes");
      expect(r).toHaveProperty("systemHealth");
      expect(r).toHaveProperty("sourceMode");
      expect(typeof r.id).toBe("number");
      expect(typeof r.totalNodes).toBe("number");
      expect(typeof r.systemHealth).toBe("number");
      // systemHealth viene normalizado a 0..1 (no en milésimas)
      expect(r.systemHealth).toBeGreaterThanOrEqual(0);
      expect(r.systemHealth).toBeLessThanOrEqual(1);
    }
  });

  it("history NO incluye payload pesado (lazy loading para timeline)", async () => {
    const caller = createUnauthCaller();
    const rows = await caller.board.history({ limit: 5 });

    // El listado NO debe arrastrar el payload completo (sería caro)
    for (const r of rows) {
      expect(r).not.toHaveProperty("payload");
    }
  });

  it("history respeta el límite", async () => {
    const caller = createUnauthCaller();
    const rows = await caller.board.history({ limit: 2 });
    expect(rows.length).toBeLessThanOrEqual(2);
  });

  it("byId reconstruye un snapshot con su payload completo", async () => {
    const caller = createUnauthCaller();
    const rows = await caller.board.history({ limit: 1 });
    expect(rows.length).toBeGreaterThan(0);

    const target = await caller.board.byId({ id: rows[0].id });
    expect(target).not.toBeNull();
    expect(target!.id).toBe(rows[0].id);
    expect(target!.payload).toBeDefined();
    expect(Array.isArray(target!.payload?.nodes)).toBe(true);
    expect(target!.payload!.nodes.length).toBeGreaterThan(0);
    expect(target!.totalNodes).toBe(rows[0].totalNodes);
  });

  it("byId devuelve null para id inexistente sin lanzar excepción", async () => {
    const caller = createUnauthCaller();
    const result = await caller.board.byId({ id: 999_999_999 });
    expect(result).toBeNull();
  });

  it("history y current son consistentes: el más reciente de history es current", async () => {
    const caller = createUnauthCaller();
    const rows = await caller.board.history({ limit: 30 });
    const current = await caller.board.current();
    expect(current).not.toBeNull();

    // El de mayor capturedAt en history debe coincidir con current
    const sortedDesc = [...rows].sort(
      (a, b) =>
        new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
    );
    expect(sortedDesc[0].id).toBe(current!.id);
    expect(sortedDesc[0].totalNodes).toBe(current!.totalNodes);
  });

  it("snapshot reconstruido por byId tiene el mismo shape que board.current", async () => {
    const caller = createUnauthCaller();
    const current = await caller.board.current();
    expect(current).not.toBeNull();

    const reconstructed = await caller.board.byId({ id: current!.id });
    expect(reconstructed).not.toBeNull();

    // Comparamos shape sin importar timestamps de fetch
    expect(reconstructed!.id).toBe(current!.id);
    expect(reconstructed!.totalNodes).toBe(current!.totalNodes);
    expect(reconstructed!.systemHealth).toBe(current!.systemHealth);
    expect(reconstructed!.sourceMode).toBe(current!.sourceMode);
    expect(reconstructed!.payload?.nodes.length).toBe(
      current!.payload?.nodes.length,
    );
  });

  it("rechaza limit > 100 (Zod max 100)", async () => {
    const caller = createUnauthCaller();
    await expect(caller.board.history({ limit: 9999 })).rejects.toThrow();
  });

  it("rechaza id no positivo en byId (Zod positive)", async () => {
    const caller = createUnauthCaller();
    await expect(caller.board.byId({ id: 0 })).rejects.toThrow();
    await expect(caller.board.byId({ id: -5 })).rejects.toThrow();
  });
});
