/**
 * Router tRPC del Observatorio Vivo (Hito A).
 * Expone:
 *   - observatorio.getRecent: últimos N eventos verificados.
 *   - observatorio.getMetrics: métricas del observer (status, lag, dropped).
 *   - observatorio.publishTest: publish manual para testing/demo.
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getEventObserver } from "../lib/eventObserver";
import { EventPublisher } from "../lib/eventPublisher";

export const observatorioRouter = router({
  getRecent: publicProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(250).default(50),
          onlyVerified: z.boolean().default(true),
        })
        .default({ limit: 50, onlyVerified: true }),
    )
    .query(({ input }) => {
      const observer = getEventObserver();
      return observer.getRecent(input.limit, { onlyVerified: input.onlyVerified });
    }),

  getMetrics: publicProcedure.query(() => {
    const observer = getEventObserver();
    return observer.getMetrics();
  }),

  publishTest: protectedProcedure
    .input(
      z.object({
        event_type: z.string().min(1),
        source: z.string().min(1),
        payload: z.record(z.string(), z.unknown()),
        affects_districts: z.array(z.string()).optional(),
        affects_projects: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const publisher = new EventPublisher();
      const { id, signed } = await publisher.publish({
        source_table: "manual_publish",
        event_type: input.event_type,
        source: input.source,
        payload: input.payload,
        affects_districts: input.affects_districts,
        affects_projects: input.affects_projects,
      });
      return {
        id,
        agent_key_id: signed.agent_key_id,
        event_hash_canonical: signed.event_hash_canonical,
      };
    }),
});
