/**
 * Router supabase — introspección viva del Supabase del Monstruo.
 *
 * Materializa el Objetivo #15 (Memoria Soberana) — el Tablero puede mostrar el
 * estado real de las 182 tablas del Monstruo: cuántas filas tiene cada una,
 * en qué familia vive, si responde, etc.
 *
 * Naming canónico: SUPABASE_SERVICE_KEY (sin _ROLE) — DSC-S-007 firmado el 10
 * may 2026.
 */
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

function authHeaders() {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
}

/**
 * Clasifica una tabla en una familia funcional según su prefijo conocido.
 * Mapeo derivado del inventario v0.8 (catastro 16, lightrag 14, v5 12,
 * embrion 11, forja 9, etc.). Familias no documentadas caen a "otros".
 */
function classifyFamily(tableName: string): string {
  const lower = tableName.toLowerCase();
  if (lower.startsWith("catastro_")) return "catastro";
  if (lower.startsWith("lightrag_")) return "lightrag";
  if (lower.startsWith("v5_")) return "v5";
  if (lower.startsWith("embrion_")) return "embrion";
  if (lower.startsWith("forja_")) return "forja";
  if (lower.startsWith("memory_") || lower.startsWith("mem_")) return "memory";
  if (lower.startsWith("kernel_")) return "kernel";
  if (lower.startsWith("agent_") || lower.startsWith("agents_")) return "agentes";
  if (lower.startsWith("error_")) return "errores";
  if (lower.startsWith("audit_") || lower.startsWith("auditoria_"))
    return "auditoria";
  if (lower.startsWith("sprint_")) return "sprints";
  if (lower.startsWith("ticket_")) return "ticketlike";
  return "otros";
}

export const supabaseRouter = router({
  /**
   * Healthcheck público. Confirma que el proyecto Supabase responde y que la
   * service key sigue válida. No expone datos sensibles.
   */
  health: publicProcedure.query(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return {
        ok: false,
        reason: "missing_env" as const,
        url: null,
        tables_visible: 0,
      };
    }
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: { ...authHeaders(), Accept: "application/openapi+json" },
      });
      if (!res.ok) {
        return {
          ok: false,
          reason: `http_${res.status}` as const,
          url: SUPABASE_URL,
          tables_visible: 0,
        };
      }
      const spec = (await res.json()) as { definitions?: Record<string, unknown> };
      return {
        ok: true,
        reason: "live" as const,
        url: SUPABASE_URL,
        tables_visible: Object.keys(spec.definitions ?? {}).length,
      };
    } catch (err) {
      return {
        ok: false,
        reason: "network_error" as const,
        url: SUPABASE_URL,
        tables_visible: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }),

  /**
   * Lista todas las tablas visibles agrupadas por familia. Solo metadata —
   * no devuelve filas. Procedimiento protegido para no exponer la estructura
   * a anónimos.
   */
  listTables: protectedProcedure.query(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error("Supabase no configurado");
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { ...authHeaders(), Accept: "application/openapi+json" },
    });
    if (!res.ok) {
      throw new Error(`PostgREST error: ${res.status}`);
    }
    const spec = (await res.json()) as { definitions?: Record<string, unknown> };
    const tables = Object.keys(spec.definitions ?? {});

    const byFamily: Record<string, string[]> = {};
    for (const t of tables) {
      const fam = classifyFamily(t);
      if (!byFamily[fam]) byFamily[fam] = [];
      byFamily[fam].push(t);
    }

    return {
      total: tables.length,
      families: Object.entries(byFamily)
        .map(([name, tables]) => ({ name, count: tables.length, tables: tables.sort() }))
        .sort((a, b) => b.count - a.count),
    };
  }),

  /**
   * Cuenta filas de una tabla específica. Usa el header HEAD + Prefer:count=exact
   * de PostgREST para obtener el count sin transferir filas.
   */
  countRows: protectedProcedure
    .input(z.object({ table: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        throw new Error("Supabase no configurado");
      }
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/${encodeURIComponent(input.table)}?select=*`,
        {
          method: "HEAD",
          headers: {
            ...authHeaders(),
            Prefer: "count=exact",
            Range: "0-0",
          },
        },
      );
      if (!res.ok && res.status !== 206) {
        throw new Error(`HTTP ${res.status}`);
      }
      // Content-Range: 0-0/N o */N
      const contentRange = res.headers.get("content-range") ?? "";
      const match = contentRange.match(/\/(\d+|\*)$/);
      const count = match && match[1] !== "*" ? parseInt(match[1]!, 10) : null;
      return { table: input.table, count, contentRange };
    }),
});
