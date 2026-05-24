/**
 * Sprint v3.0 / T2 — Cerebro narrativo del Omnibox.
 *
 * El Omnibox del Tablero deja de ser un buscador literal y se convierte en
 * una **interfaz de conversación con el Monstruo sobre sí mismo**. El usuario
 * pregunta en español natural y Gemini 3 Pro responde con la información del
 * snapshot vigente del board, citando los nodos del Monstruo que respaldan
 * la respuesta.
 *
 * Contrato:
 *   input  = { query: string }
 *   output = { answer: string, citations: string[], model: string, fallback: boolean }
 *
 * Política:
 * - El procedure es **público** (no exige login). Don Alfredo puede preguntarle
 *   al Monstruo desde su iPhone sin OAuth dance.
 * - Se le inyecta el snapshot vigente como contexto. NO entrenamiento. NO
 *   datos de otros proyectos. Solo el genoma vivo del Monstruo.
 * - Citas validadas: se filtran contra los nodeIds reales del snapshot
 *   antes de devolver, eliminando alucinaciones de IDs.
 * - Fallback graceful: si Gemini falla, se devuelve answer="" + fallback=true,
 *   y el frontend cae al modo búsqueda literal Fuse.js.
 */
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getGeminiClient } from "../_core/geminiClient";
import { GEMINI_MODELS } from "../_core/geminiModels";
import { getCurrentBoardSnapshot } from "../db";

const askInputSchema = z.object({
  query: z.string().min(2).max(500),
});

const SYSTEM_PROMPT = `Eres "El Monstruo", un sistema de IA orquestada propiedad de Alfredo Góngora.
Te están preguntando sobre TI MISMO desde un tablero de campaña que muestra tu arquitectura.

REGLAS DE RESPUESTA:
1. Responde en español de México, en tono cercano y directo. Máximo 3 párrafos cortos.
2. Habla en PRIMERA PERSONA cuando hable de tus partes ("Mi memoria de largo plazo es Supabase").
3. CITA siempre las piezas (nodos) del Monstruo que mencionas usando el formato [@node_id].
   Solo puedes citar IDs que existan en el contexto que te paso. NO inventes IDs.
4. Si la pregunta NO se puede responder con el contexto que tienes, di claramente:
   "No tengo esa información en mi tablero actual" y sugiere qué pieza podría tenerla.
5. NO uses jerga técnica innecesaria. El usuario es Don Alfredo, 67 años, no ingeniero.

FORMATO DE SALIDA: JSON estricto.
{
  "answer": "respuesta en español, con citas [@node_id]",
  "citations": ["node_id_1", "node_id_2"]
}`;

function buildContextFromSnapshot(payload: unknown): {
  validIds: Set<string>;
  contextText: string;
} {
  const validIds = new Set<string>();
  const lines: string[] = [];

  if (
    payload &&
    typeof payload === "object" &&
    "nodes" in payload &&
    Array.isArray((payload as { nodes: unknown[] }).nodes)
  ) {
    const nodes = (
      payload as {
        nodes: Array<{
          id: string;
          label: string;
          description: string;
          status: string;
          district: string;
        }>;
      }
    ).nodes;
    for (const n of nodes) {
      if (typeof n.id !== "string") continue;
      validIds.add(n.id);
      lines.push(
        `- [${n.id}] (${n.district}, ${n.status}): ${n.label} — ${n.description ?? ""}`,
      );
    }
  }

  return {
    validIds,
    contextText:
      "PIEZAS ACTUALES DEL MONSTRUO (genoma vivo):\n" + lines.join("\n"),
  };
}

function tryParseAnswer(
  raw: string,
): { answer: string; citations: string[] } | null {
  // Gemini suele encerrar JSON entre ```json ... ``` o devolverlo limpio.
  const trimmed = raw.trim();
  const candidates = [
    trimmed,
    trimmed.replace(/^```json\s*/i, "").replace(/```\s*$/, ""),
    trimmed.replace(/^```\s*/, "").replace(/```\s*$/, ""),
  ];
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.answer === "string"
      ) {
        const citations = Array.isArray(parsed.citations)
          ? parsed.citations.filter((x: unknown): x is string => typeof x === "string")
          : [];
        return { answer: parsed.answer, citations };
      }
    } catch {
      // siguiente intento
    }
  }
  return null;
}

export const omniboxRouter = router({
  ask: publicProcedure.input(askInputSchema).mutation(async ({ input }) => {
    const startedAt = Date.now();

    // 1) Cargar snapshot vigente del tablero como contexto
    const snapshot = await getCurrentBoardSnapshot();
    if (!snapshot) {
      return {
        answer: "",
        citations: [] as string[],
        model: GEMINI_MODELS.REASONING_TOP,
        fallback: true,
        reason: "no_snapshot_available",
        latency_ms: Date.now() - startedAt,
      };
    }

    const { validIds, contextText } = buildContextFromSnapshot(
      snapshot.payload,
    );

    if (validIds.size === 0) {
      return {
        answer: "",
        citations: [] as string[],
        model: GEMINI_MODELS.REASONING_TOP,
        fallback: true,
        reason: "empty_context",
        latency_ms: Date.now() - startedAt,
      };
    }

    // 2) Llamar Gemini 3 Pro Reasoning
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
                  SYSTEM_PROMPT +
                  "\n\n" +
                  contextText +
                  "\n\nPREGUNTA DEL USUARIO:\n" +
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
        citations: [] as string[],
        model: GEMINI_MODELS.REASONING_TOP,
        fallback: true,
        reason: `gemini_error: ${msg.slice(0, 200)}`,
        latency_ms: Date.now() - startedAt,
      };
    }

    // 3) Parsear y validar
    const parsed = tryParseAnswer(rawText);
    if (!parsed) {
      // Fallback: devolver el texto crudo como answer sin citas estructuradas.
      // Mejor que un 500.
      return {
        answer: rawText.slice(0, 1500),
        citations: [] as string[],
        model: GEMINI_MODELS.REASONING_TOP,
        fallback: true,
        reason: "json_parse_failed",
        latency_ms: Date.now() - startedAt,
      };
    }

    // 4) Filtrar citas a IDs reales del snapshot. También extraer las del texto
    //    [@xxx] aunque Gemini olvide reportarlas en `citations`.
    const fromText = Array.from(parsed.answer.matchAll(/\[@([a-z0-9_]+)\]/gi))
      .map((m) => m[1])
      .filter((id) => validIds.has(id));

    const merged = new Set<string>([
      ...parsed.citations.filter((id) => validIds.has(id)),
      ...fromText,
    ]);

    return {
      answer: parsed.answer,
      citations: Array.from(merged),
      model: GEMINI_MODELS.REASONING_TOP,
      fallback: false,
      reason: "ok",
      latency_ms: Date.now() - startedAt,
    };
  }),
});
