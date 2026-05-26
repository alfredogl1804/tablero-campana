import { describe, expect, it } from "vitest";
import { getDb } from "../db";
import { connectedProjects, projectHealthPings } from "../../drizzle/schema";
import { eq, ne } from "drizzle-orm";

/**
 * Tests del Hito C — ecosistema conectado.
 * Validan el catálogo en TiDB y la integridad de las pings de salud.
 */
describe("ecosystem catalog (Hito C DoD)", () => {
  it("DoD: hay >= 10 proyectos visibles (no efímeros) en TiDB", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const all = await db
      .select()
      .from(connectedProjects)
      .where(ne(connectedProjects.category, "ephemeral_e2e"));
    expect(all.length).toBeGreaterThanOrEqual(10);
  });

  it("el ecosistema incluye al kernel y al tablero", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const all = await db.select().from(connectedProjects);
    const ids = all.map((p) => p.projectId);
    expect(ids).toContain("el-monstruo");
    expect(ids).toContain("tablero-campana");
  });

  it("cada proyecto tiene identidad mínima", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const all = await db.select().from(connectedProjects);
    for (const p of all) {
      expect(p.projectId).toBeTruthy();
      expect(p.displayName).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.status).toBeTruthy();
      // posición estelar pre-calculada
      expect(typeof p.starX).toBe("number");
      expect(typeof p.starY).toBe("number");
    }
  });

  it("kernel core tiene al menos 3 proyectos", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const cores = await db
      .select()
      .from(connectedProjects)
      .where(eq(connectedProjects.category, "kernel_core"));
    expect(cores.length).toBeGreaterThanOrEqual(3);
  });

  it("hay pings registrados (al menos uno tras refreshAll)", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const pings = await db.select().from(projectHealthPings).limit(1);
    expect(pings.length).toBeGreaterThanOrEqual(1);
  });
});
