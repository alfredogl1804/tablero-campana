/**
 * forjaShadowAdapter — Hito 8 v1.1
 *
 * Adapter Forja↔kernel del Tablero del Monstruo, en modo shadow estricto.
 *
 * Doctrina v1.1 §3.5 + ADR 0002:
 *   - El Tablero NO ejecuta acciones materiales sobre el kernel.
 *   - Cualquier intent de invocar al kernel se registra en `forja_shadow_calls`
 *     con bodyHash, actor, endpoint y razón.
 *   - El switch a modo enforce REQUIERE DSC firmado por Alfredo + key rotation.
 *
 * Contrato canónico que NUNCA se llama (solo se shadow-registra):
 *   POST {KERNEL_MONSTRUO_BASE_URL}{endpoint}
 *   Headers: Content-Type: application/json
 *   Body: input.body (JSON)
 *   ↳ apps/la-forja/api/src/puertas/kernel_monstruo.ts → invokeKernelMonstruo
 */

import crypto from "crypto";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { forjaShadowCalls } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export interface ForjaIntent {
  endpoint: string; // e.g. "/sop/query", "/v1/events/emit"
  body: Record<string, unknown>;
  actorOpenId?: string;
  actorRole?: string;
  reasonNote?: string;
}

export interface ForjaShadowResult {
  callId: string;
  status: "recorded";
  endpoint: string;
  bodyHash: string;
  wouldCallAt: Date;
  mode: "shadow";
}

/**
 * Allowed endpoints whitelist — solo endpoints reales del kernel ya conocidos.
 * Si el endpoint solicitado no está aquí, se rechaza incluso en modo shadow,
 * porque registrar intenciones a endpoints inexistentes contamina la auditoría.
 */
const ALLOWED_ENDPOINTS = new Set<string>([
  "/v1/events/emit",
  "/v1/events/crystallize",
  "/v1/events/stream",
  "/v1/events/stats",
  "/sop/query",
  "/epia/record",
  "/maoc/orchestrate",
  "/health",
]);

export class ForjaShadowError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ForjaShadowError";
  }
}

function canonicalize(body: Record<string, unknown>): string {
  // Stable JSON for hashing — sort keys recursively
  const sortKeys = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v !== null && typeof v === "object") {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(v as Record<string, unknown>).sort();
      for (const k of keys) {
        sorted[k] = sortKeys((v as Record<string, unknown>)[k]);
      }
      return sorted;
    }
    return v;
  };
  return JSON.stringify(sortKeys(body));
}

export function hashBody(body: Record<string, unknown>): string {
  const canonical = canonicalize(body);
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Records a shadow intent. Never calls the kernel.
 * Returns the recorded call descriptor for telemetry.
 */
export async function recordShadowIntent(
  intent: ForjaIntent,
): Promise<ForjaShadowResult> {
  if (!intent.endpoint.startsWith("/")) {
    throw new ForjaShadowError(
      "invalid_endpoint",
      `Endpoint must start with "/": got ${intent.endpoint}`,
    );
  }

  if (!ALLOWED_ENDPOINTS.has(intent.endpoint)) {
    throw new ForjaShadowError(
      "endpoint_not_whitelisted",
      `Endpoint ${intent.endpoint} is not in the kernel canonical whitelist (ADR 0002).`,
    );
  }

  const db = await getDb();
  if (!db) {
    throw new ForjaShadowError("db_unavailable", "TiDB is not configured");
  }

  const callId = nanoid(21);
  const bodyHash = hashBody(intent.body);
  const bodyJson = JSON.stringify(intent.body);
  const bodyPreview = bodyJson.length > 500
    ? bodyJson.slice(0, 497) + "..."
    : bodyJson;
  const wouldCallAt = new Date();

  await db.insert(forjaShadowCalls).values({
    callId,
    endpoint: intent.endpoint,
    bodyHash,
    bodyPreview,
    actorOpenId: intent.actorOpenId,
    actorRole: intent.actorRole,
    intent: "shadow",
    status: "recorded",
    reasonNote: intent.reasonNote,
    wouldCallAt,
  });

  return {
    callId,
    status: "recorded",
    endpoint: intent.endpoint,
    bodyHash,
    wouldCallAt,
    mode: "shadow",
  };
}

export async function listShadowCalls(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(forjaShadowCalls)
    .orderBy(desc(forjaShadowCalls.wouldCallAt))
    .limit(limit);
}

export async function getShadowCallById(callId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(forjaShadowCalls)
    .where(eq(forjaShadowCalls.callId, callId))
    .limit(1);
  return rows[0] ?? null;
}

export async function statsShadowCalls() {
  const db = await getDb();
  if (!db) {
    return { total: 0, byEndpoint: {}, lastCallAt: null };
  }
  const rows = await db.select().from(forjaShadowCalls);
  const byEndpoint: Record<string, number> = {};
  let lastCallAt: Date | null = null;
  for (const r of rows) {
    byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] ?? 0) + 1;
    if (!lastCallAt || r.wouldCallAt > lastCallAt) lastCallAt = r.wouldCallAt;
  }
  return { total: rows.length, byEndpoint, lastCallAt };
}

export const FORJA_ALLOWED_ENDPOINTS = Array.from(ALLOWED_ENDPOINTS);
