/**
 * Sprint v3.0 / T6 — Acciones desde ContextCard.
 *
 * El ContextCard del Tablero deja de ser solo informativo y se convierte en
 * un panel operativo. Don Alfredo puede:
 *   1. Anotar un incidente sobre la pieza activa (BUG/IDEA/RIESGO/OBSERVACION)
 *   2. Re-declarar el estado de la pieza si el genoma se equivocó (override)
 *   3. Preguntar al Monstruo en lenguaje natural sobre esa pieza específica
 *      (askAbout = especialización de omnibox.ask, enfocado en un solo nodo)
 *
 * Política de procedures:
 * - reportIncident, listIncidents, setOverride, clearOverride, askAbout son
 *   `publicProcedure` para que el iPhone pueda usarlas sin OAuth dance. Si más
 *   adelante se requiere autoría real por usuario, se promueven a protectedProcedure
 *   y se reemplaza `reporter: 'system'` por `ctx.user.openId`.
 *
 * Validación de citas y trazabilidad:
 * - Cada incident y override se ata al snapshotId vigente al momento de su
 *   creación, para reconstruir el contexto histórico ("¿bajo qué snapshot
 *   declaró Alfredo este BUG?").
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getGeminiClient } from "../_core/geminiClient";
import { GEMINI_MODELS } from "../_core/geminiModels";
import {
  clearBoardOverride,
  countOpenIncidentsForNode,
  getActiveOverrideForNode,
  getCurrentBoardSnapshot,
  insertBoardIncident,
  insertBoardOverride,
  listBoardIncidentsForNode,
  resolveBoardIncident,
} from "../db";

const reportIncidentInput = z.object({
  nodeId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9_]+$/i, "nodeId must be alphanumeric/underscore"),
  kind: z.enum(["BUG", "IDEA", "RIESGO", "OBSERVACION"]),
  severity: z.enum(["low", "med", "high"]).default("med"),
  message: z.string().min(2).max(2000),
});

const listIncidentsInput = z.object({
  nodeId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9_]+$/i),
  limit: z.number().int().min(1).max(100).default(20),
});

const resolveIncidentInput = z.object({
  id: z.number().int().positive(),
});

const setOverrideInput = z.object({
  nodeId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9_]+$/i),
  statusOverride: z.enum(["ACTIVE", "DEGRADED", "SPRINT", "FUTURE"]),
  note: z.string().max(1000).optional(),
  // ISO datetime opcional. NULL = permanente hasta clear manual.
  expiresAt: z.string().datetime().optional(),
});

const clearOverrideInput = z.object({
  id: z.number().int().positive(),
});

const askAboutInput = z.object({
  nodeId: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9_]+$/i),
  query: z.string().min(2).max(500),
});

interface BoardNodeShape {
  id: string;
  label: string;
  description?: string;
  status: string;
  district: string;
  loc?: number;
  last_updated?: string;
  connections_in?: string[];
  connections_out?: string[];
}

function findNodeInPayload(payload: unknown, nodeId: string): BoardNodeShape | null {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("nodes" in payload) ||
    !Array.isArray((payload as { nodes: unknown[] }).nodes)
  ) {
    return null;
  }
  const nodes = (payload as { nodes: BoardNodeShape[] }).nodes;
  return nodes.find((n) => n.id === nodeId) ?? null;
}

const ASK_ABOUT_PROMPT = `Eres "El Monstruo" hablando con Don Alfredo sobre UNA pieza específica de tu arquitectura.

REGLAS:
1. Responde en español de México, máximo 2 párrafos cortos.
2. Habla en PRIMERA PERSONA sobre esa pieza ("Esta pieza me sirve para...").
3. Usa el contexto que te paso de la pieza y de las piezas relacionadas. NO inventes.
4. Si la pregunta es ambigua, contesta lo más probable y sugiere afinar.
5. Si la pregunta no se puede responder con el contexto, dilo claro.

FORMATO DE SALIDA: JSON estricto.
{ "answer": "respuesta corta en español" }`;

export const contextActionsRouter = router({
  // ─────────── INCIDENTS ───────────
  reportIncident: publicProcedure
    .input(reportIncidentInput)
    .mutation(async ({ input }) => {
      const snapshot = await getCurrentBoardSnapshot();
      const inserted = await insertBoardIncident({
        nodeId: input.nodeId,
        kind: input.kind,
        severity: input.severity,
        message: input.message,
        reporter: "system",
        snapshotId: snapshot?.id ?? null,
      });

      if (!inserted) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo registrar el incidente (db no disponible)",
        });
      }

      return inserted;
    }),

  listIncidents: publicProcedure
    .input(listIncidentsInput)
    .query(async ({ input }) => {
      const incidents = await listBoardIncidentsForNode(input.nodeId, input.limit);
      const openCount = await countOpenIncidentsForNode(input.nodeId);
      return { incidents, openCount };
    }),

  resolveIncident: publicProcedure
    .input(resolveIncidentInput)
    .mutation(async ({ input }) => {
      const updated = await resolveBoardIncident(input.id);
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Incidente no encontrado",
        });
      }
      return updated;
    }),

  // ─────────── OVERRIDES ───────────
  setOverride: publicProcedure
    .input(setOverrideInput)
    .mutation(async ({ input }) => {
      const inserted = await insertBoardOverride({
        nodeId: input.nodeId,
        statusOverride: input.statusOverride,
        note: input.note ?? null,
        reporter: "system",
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      });
      if (!inserted) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo registrar el override (db no disponible)",
        });
      }
      return inserted;
    }),

  getActiveOverride: publicProcedure
    .input(z.object({ nodeId: z.string().min(1).max(128) }))
    .query(async ({ input }) => {
      return getActiveOverrideForNode(input.nodeId);
    }),

  clearOverride: publicProcedure
    .input(clearOverrideInput)
    .mutation(async ({ input }) => {
      const updated = await clearBoardOverride(input.id);
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Override no encontrado",
        });
      }
      return updated;
    }),

  // ─────────── ASK-ABOUT (Gemini focalizado en un nodo) ───────────
  askAbout: publicProcedure
    .input(askAboutInput)
    .mutation(async ({ input }) => {
      const startedAt = Date.now();

      const snapshot = await getCurrentBoardSnapshot();
      if (!snapshot) {
        return {
          answer: "",
          model: GEMINI_MODELS.REASONING_TOP,
          fallback: true,
          reason: "no_snapshot_available",
          latency_ms: Date.now() - startedAt,
        };
      }

      const target = findNodeInPayload(snapshot.payload, input.nodeId);
      if (!target) {
        return {
          answer: "",
          model: GEMINI_MODELS.REASONING_TOP,
          fallback: true,
          reason: "node_not_in_snapshot",
          latency_ms: Date.now() - startedAt,
        };
      }

      // Contexto enfocado: la pieza + sus conexiones inmediatas.
      const allNodes =
        (snapshot.payload as { nodes: BoardNodeShape[] }).nodes ?? [];
      const related = new Set<string>([
        ...(target.connections_in ?? []),
        ...(target.connections_out ?? []),
      ]);
      const relatedNodes = allNodes.filter((n) => related.has(n.id));

      const ctxLines: string[] = [];
      ctxLines.push(`PIEZA ACTIVA: [${target.id}] (${target.district}, ${target.status})`);
      ctxLines.push(`Etiqueta: ${target.label}`);
      ctxLines.push(`Descripción: ${target.description ?? ""}`);
      ctxLines.push(`LOC: ${target.loc ?? 0}, último cambio: ${target.last_updated ?? "?"}`);
      ctxLines.push("");
      ctxLines.push("PIEZAS DIRECTAMENTE CONECTADAS:");
      for (const r of relatedNodes) {
        ctxLines.push(`- [${r.id}] (${r.status}): ${r.label}`);
      }

      let rawText = "";
      try {
        const client = getGeminiClient();
        const result = await client.models.generateContent({
          model: GEMINI_MODELS.REASONING_TOP,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    ASK_ABOUT_PROMPT +
                    "\n\n" +
                    ctxLines.join("\n") +
                    "\n\nPREGUNTA:\n" +
                    input.query,
                },
              ],
            },
          ],
        });
        rawText = result.text ?? "";
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          answer: "",
          model: GEMINI_MODELS.REASONING_TOP,
          fallback: true,
          reason: `gemini_error: ${msg.slice(0, 200)}`,
          latency_ms: Date.now() - startedAt,
        };
      }

      // Parseo permisivo
      const trimmed = rawText.trim();
      const candidates = [
        trimmed,
        trimmed.replace(/^```json\s*/i, "").replace(/```\s*$/, ""),
        trimmed.replace(/^```\s*/, "").replace(/```\s*$/, ""),
      ];
      for (const c of candidates) {
        try {
          const parsed = JSON.parse(c);
          if (parsed && typeof parsed.answer === "string") {
            return {
              answer: parsed.answer,
              model: GEMINI_MODELS.REASONING_TOP,
              fallback: false,
              reason: "ok",
              latency_ms: Date.now() - startedAt,
            };
          }
        } catch {
          // try next
        }
      }

      // Si no parseó JSON, devolvemos texto crudo capado
      return {
        answer: rawText.slice(0, 1200),
        model: GEMINI_MODELS.REASONING_TOP,
        fallback: true,
        reason: "json_parse_failed",
        latency_ms: Date.now() - startedAt,
      };
    }),
});
