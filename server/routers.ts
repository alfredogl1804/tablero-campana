import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { boardRouter } from "./routers/board";
import { geminiRouter } from "./routers/gemini";
import { omniboxRouter } from "./routers/omnibox";
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
  gemini: geminiRouter,
  omnibox: omniboxRouter,
  supabase: supabaseRouter,
});

export type AppRouter = typeof appRouter;
