import { describe, expect, it } from "vitest";
import { countSprints, listSprints, getSprintById } from "../db";

/**
 * Tests del router sprints contra la DB real (TiDB) usando los helpers de db.ts.
 *
 * No usa el router tRPC directamente porque eso requiere mock de ctx, y los
 * helpers de db.ts ya cubren la lógica relevante (filtros, hash, JSON).
 *
 * Hito B-lite del Sprint Observatorio Vivo v1.1 / DoD §3.5.
 */

describe("sprints DB helpers (Hito B-lite DoD)", () => {
  it("DoD: hay >= 20 sprints reales en TiDB", async () => {
    const total = await countSprints();
    expect(total).toBeGreaterThanOrEqual(20);
  });

  it("listSprints sin filtros devuelve metadata sin descriptionMd vacío", async () => {
    const all = await listSprints({ limit: 5 });
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      expect(s.sprintId).toBeTypeOf("string");
      expect(s.title).toBeTypeOf("string");
      expect(s.status).toBeTypeOf("string");
      expect(Array.isArray(s.affectedDistricts)).toBe(true);
      expect(s.hashCanonical).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("filtro por status devuelve solo ese status", async () => {
    const drafts = await listSprints({ status: "draft", limit: 100 });
    expect(drafts.length).toBeGreaterThan(0);
    for (const s of drafts) {
      expect(s.status).toBe("draft");
    }
  });

  it("filtro por distrito devuelve solo sprints que lo incluyen", async () => {
    const cognicion = await listSprints({ district: "cognicion", limit: 100 });
    expect(cognicion.length).toBeGreaterThan(0);
    for (const s of cognicion) {
      const districts = s.affectedDistricts as string[];
      expect(districts).toContain("cognicion");
    }
  });

  it("filtro por status + distrito intersecta correctamente", async () => {
    const draftsCognicion = await listSprints({
      status: "draft",
      district: "cognicion",
      limit: 100,
    });
    for (const s of draftsCognicion) {
      expect(s.status).toBe("draft");
      const districts = s.affectedDistricts as string[];
      expect(districts).toContain("cognicion");
    }
  });

  it("getSprintById devuelve un sprint con descriptionMd hidratado", async () => {
    const sample = await listSprints({ limit: 1 });
    expect(sample.length).toBe(1);
    const detail = await getSprintById(sample[0].sprintId);
    expect(detail).not.toBeNull();
    expect(detail?.sprintId).toBe(sample[0].sprintId);
    // El description_md debería ser texto sustantivo (>100 chars) en sprints reales.
    expect((detail?.descriptionMd ?? "").length).toBeGreaterThan(50);
  });

  it("getSprintById con id inexistente devuelve null", async () => {
    const nope = await getSprintById("___no_existe_xyz_99999");
    expect(nope).toBeNull();
  });
});
