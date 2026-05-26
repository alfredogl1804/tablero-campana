import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { boardRouter } from "./routers/board";
import { contextActionsRouter } from "./routers/contextActions";
import { forjaRouter } from "./forja/router";
import { forjaShadowRouter } from "./routers/forja";
import { geminiRouter } from "./routers/gemini";
import { ecosystemRouter } from "./routers/ecosystem";
import { observatorioRouter } from "./routers/observatorio";
import { omniboxRouter } from "./routers/omnibox";
import { sprintsRouter } from "./routers/sprints";
import { supabaseRouter } from "./routers/supabase";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  board: boardRouter,
  contextActions: contextActionsRouter,
  ecosystem: ecosystemRouter,
  forja: forjaRouter,
  forjaShadow: forjaShadowRouter,
  gemini: geminiRouter,
  observatorio: observatorioRouter,
  omnibox: omniboxRouter,
  sprints: sprintsRouter,
  supabase: supabaseRouter,
});

export type AppRouter = typeof appRouter;
