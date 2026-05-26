/**
 * ecosystem router — Hito C del Sprint Observatorio Vivo v1.1.
 *
 * Expone el catálogo de proyectos conectados al kernel del Monstruo
 * y la salud histórica de cada uno.
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { connectedProjects, projectHealthPings } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { pingAllProjects } from "../lib/projectPinger";

export const ecosystemRouter = router({
  /**
   * Lista todos los proyectos del ecosistema (excluyendo efímeros del E2E).
   * Devuelve también el último ping conocido por proyecto.
   */
  list: publicProcedure
    .input(
      z
        .object({
          includeEphemeral: z.boolean().default(false),
          category: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const projects = await db.select().from(connectedProjects);
      const filtered = projects.filter((p) => {
        if (!input?.includeEphemeral && p.category === "ephemeral_e2e")
          return false;
        if (input?.category && p.category !== input.category) return false;
        return true;
      });

      // Get most recent ping per project
      const pingsByProject: Record<string, typeof projectHealthPings.$inferSelect> = {};
      for (const proj of filtered) {
        const recentPing = await db
          .select()
          .from(projectHealthPings)
          .where(eq(projectHealthPings.projectId, proj.projectId))
          .orderBy(desc(projectHealthPings.pingedAt))
          .limit(1);
        if (recentPing[0]) {
          pingsByProject[proj.projectId] = recentPing[0];
        }
      }

      return filtered.map((p) => ({
        ...p,
        lastPing: pingsByProject[p.projectId] ?? null,
      }));
    }),

  /**
   * Estadísticas agregadas del ecosistema.
   */
  stats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const projects = await db.select().from(connectedProjects);
    const visible = projects.filter((p) => p.category !== "ephemeral_e2e");

    const byCategory = visible.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});
    const byStatus = visible.reduce<Record<string, number>>((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {});
    const byDeployTarget = visible.reduce<Record<string, number>>((acc, p) => {
      const t = p.deployTarget ?? "none";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
    const byDistrict = visible.reduce<Record<string, number>>((acc, p) => {
      const d = p.district ?? "—";
      acc[d] = (acc[d] ?? 0) + 1;
      return acc;
    }, {});

    return {
      total: visible.length,
      byCategory,
      byStatus,
      byDeployTarget,
      byDistrict,
    };
  }),

  /**
   * Detalle de un proyecto + últimos 30 pings.
   */
  getById: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [project] = await db
        .select()
        .from(connectedProjects)
        .where(eq(connectedProjects.projectId, input.projectId));

      if (!project) return null;

      const pings = await db
        .select()
        .from(projectHealthPings)
        .where(eq(projectHealthPings.projectId, input.projectId))
        .orderBy(desc(projectHealthPings.pingedAt))
        .limit(30);

      return { project, pings };
    }),

  /**
   * Refresca todos los proyectos (pinga GitHub + deploy URLs).
   * Operación de minutos, devuelve resumen.
   */
  refreshAll: publicProcedure.mutation(async () => {
    const results = await pingAllProjects();
    return {
      pinged: results.length,
      changed: results.filter((r) => r.changed).length,
      results,
    };
  }),
});
