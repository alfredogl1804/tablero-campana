/**
 * sprintsRouter — Hito B-lite del Sprint Observatorio Vivo v1.1.
 *
 * Procedures tRPC públicas para que el HUD del Tablero consuma los sprints
 * canonizados que viven en TiDB tras el ingestor de GitHub.
 *
 * Doctrina v1.1 §3.5: el Tablero es READ-ONLY estricto sobre el corpus
 * sprints hasta nuevo DSC. Por eso aquí NO hay mutaciones — solo queries.
 * Solo `triggerIngest` permite refrescar desde GitHub, y eso es protected
 * por owner para evitar abuso de la GitHub API.
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  countSprints,
  getSprintById,
  listSprints,
} from "../db";
import { ENV } from "../_core/env";
import { ingestSprintsFromGitHub } from "../lib/sprintIngestor";
import { SPRINT_STATUSES } from "../lib/sprintParser";

const StatusEnum = z.enum(SPRINT_STATUSES);

export const sprintsRouter = router({
  /**
   * Lista sprints con filtros opcionales.
   * Devuelve solo metadata ligera (sin descripción markdown completa) para
   * la grid del HUD.
   */
  list: publicProcedure
    .input(
      z
        .object({
          status: StatusEnum.optional(),
          district: z.string().optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const rows = await listSprints({
        status: input?.status,
        district: input?.district,
        limit: input?.limit ?? 200,
      });
      // Strip descriptionMd from list response — too heavy for the grid.
      // Nota: la PK es sprintId (string), no hay autoincrement id numérico.
      return rows.map((row) => ({
        sprintId: row.sprintId,
        sourceRepo: row.sourceRepo,
        sourcePath: row.sourcePath,
        title: row.title,
        status: row.status,
        signedBy: row.signedBy,
        signedAt: row.signedAt,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        affectedDistricts: row.affectedDistricts,
        affectedNodes: row.affectedNodes,
        ingestedAt: row.ingestedAt,
        hashCanonical: row.hashCanonical,
      }));
    }),

  /** Detalle completo de un sprint, incluyendo el markdown. */
  getById: publicProcedure
    .input(z.object({ sprintId: z.string().min(1).max(256) }))
    .query(async ({ input }) => {
      const row = await getSprintById(input.sprintId);
      if (!row) return null;
      return row;
    }),

  /** Estadísticas agregadas para el HUD: total + breakdown por status/distrito. */
  stats: publicProcedure.query(async () => {
    const total = await countSprints();
    const all = await listSprints({ limit: 1000 });
    const byStatus: Record<string, number> = {};
    const byDistrict: Record<string, number> = {};
    for (const s of all) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      const districts = (s.affectedDistricts as unknown) as string[];
      if (Array.isArray(districts)) {
        for (const d of districts) {
          byDistrict[d] = (byDistrict[d] ?? 0) + 1;
        }
      }
    }
    return { total, byStatus, byDistrict };
  }),

  /**
   * Dispara el ingestor desde GitHub. Protected + owner-only.
   * El frontend muestra esto como un botón "Refrescar desde GitHub" solo al
   * owner, según la doctrina §3.5 de "una sola palanca de escritura".
   */
  triggerIngest: protectedProcedure
    .input(z.object({ branch: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.openId !== ENV.ownerOpenId) {
        throw new Error("Solo el owner puede disparar el ingestor");
      }
      const branch = input?.branch ?? "main";
      const result = await ingestSprintsFromGitHub(branch);
      return result;
    }),
});

export type SprintsRouter = typeof sprintsRouter;
