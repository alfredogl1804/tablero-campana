/**
 * routers/forja.ts — Hito 8 v1.1
 * tRPC router for Forja shadow adapter.
 * Default mode: shadow (record only, never invoke kernel).
 */
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  recordShadowIntent,
  listShadowCalls,
  getShadowCallById,
  statsShadowCalls,
  FORJA_ALLOWED_ENDPOINTS,
} from "../lib/forjaShadowAdapter";

export const forjaShadowRouter = router({
  // Public read of allowlist + stats (no PII)
  allowlist: publicProcedure.query(() => ({
    endpoints: FORJA_ALLOWED_ENDPOINTS,
    mode: "shadow" as const,
    note: "All calls are recorded as shadow intents only; kernel is never invoked. Switch to enforce requires DSC.",
  })),

  stats: publicProcedure.query(async () => {
    return await statsShadowCalls();
  }),

  list: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const calls = await listShadowCalls(limit);
      return calls.map((c) => ({
        callId: c.callId,
        endpoint: c.endpoint,
        bodyHash: c.bodyHash,
        bodyPreview: c.bodyPreview,
        actorRole: c.actorRole,
        intent: c.intent,
        status: c.status,
        reasonNote: c.reasonNote,
        wouldCallAt: c.wouldCallAt,
      }));
    }),

  getById: publicProcedure
    .input(z.object({ callId: z.string().min(1) }))
    .query(async ({ input }) => {
      const call = await getShadowCallById(input.callId);
      if (!call) return null;
      return {
        callId: call.callId,
        endpoint: call.endpoint,
        bodyHash: call.bodyHash,
        bodyPreview: call.bodyPreview,
        actorRole: call.actorRole,
        intent: call.intent,
        status: call.status,
        reasonNote: call.reasonNote,
        wouldCallAt: call.wouldCallAt,
      };
    }),

  // Recording an intent requires authenticated user (actor traceability)
  recordIntent: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().min(1),
        body: z.record(z.string(), z.unknown()),
        reasonNote: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await recordShadowIntent({
        endpoint: input.endpoint,
        body: input.body,
        actorOpenId: ctx.user.openId,
        actorRole: ctx.user.role,
        reasonNote: input.reasonNote,
      });
      return result;
    }),
});
