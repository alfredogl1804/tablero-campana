/**
 * Forja v4 — BoundaryGateway
 *
 * El cuerpo del kernel: cada tool call del agente debe pasar por aquí ANTES
 * de ejecutarse. El gateway:
 *   1. Carga envelope activo (root o sub)
 *   2. Verifica firma ed25519
 *   3. Verifica TTL no expirado
 *   4. Verifica no revocado
 *   5. Verifica capability ∈ allowed && ∉ denied
 *   6. Verifica resource ⊆ domainScope
 *   7. Verifica powerLaneRequested ≤ powerLaneMax
 *   8. Verifica budget actual + estimado ≤ budgetMax
 *   9. Verifica oracle gates pasan (lecturas firmadas válidas)
 *  10. Verifica capability ∉ prohibitedActions
 *
 * Si todo pasa → emite Capability Token (de un solo uso, TTL ~60s).
 * Si algo falla → registra policy_decision="deny" + razones.
 */

import { randomUUID, createHash } from "node:crypto";
import { eq, and, sql, gt, desc } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  rootAuthorityEnvelopes,
  subEnvelopes,
  capabilityTokens,
  policyDecisions,
  oracleReadings,
  revocationEvents,
  evidenceReceipts,
} from "../../drizzle/schema.js";
import { canonicalHash } from "./canonical.js";
import { verifyEd25519 } from "./ed25519.js";
import type {
  GatewayAuthorizeRequest,
  GatewayDecision,
  GatewayViolation,
  PowerLaneLevel,
} from "./types.js";

const TOKEN_TTL_SECONDS = 60;
const ENGINE_VERSION = "forja-v4-0.1.0";

/**
 * Carga envelope activo (root o sub) por ID.
 */
async function loadActiveEnvelope(envelopeId: string, type: "root" | "sub") {
  const db = await getDb();
  if (!db) return null;
  if (type === "root") {
    const rows = await db
      .select()
      .from(rootAuthorityEnvelopes)
      .where(eq(rootAuthorityEnvelopes.envelopeId, envelopeId))
      .limit(1);
    return rows[0] ?? null;
  }
  const rows = await db
    .select()
    .from(subEnvelopes)
    .where(eq(subEnvelopes.subEnvelopeId, envelopeId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Calcula gasto acumulado de un envelope desde sus receipts.
 */
async function getEnvelopeUsage(envelopeId: string) {
  const db = await getDb();
  if (!db) return { totalTokens: 0, totalCost: 0, totalDurationMs: 0, totalActions: 0 };
  const rows = await db
    .select({
      totalTokens: sql<number>`COALESCE(SUM(${evidenceReceipts.tokensConsumed}), 0)`,
      totalCost: sql<number>`COALESCE(SUM(${evidenceReceipts.costUsdCents}), 0)`,
      totalDuration: sql<number>`COALESCE(SUM(${evidenceReceipts.durationMs}), 0)`,
      totalActions: sql<number>`COUNT(*)`,
    })
    .from(evidenceReceipts)
    .where(eq(evidenceReceipts.envelopeId, envelopeId));
  const r = rows[0];
  return {
    totalTokens: Number(r?.totalTokens ?? 0),
    totalCost: Number(r?.totalCost ?? 0),
    totalDurationMs: Number(r?.totalDuration ?? 0),
    totalActions: Number(r?.totalActions ?? 0),
  };
}

/**
 * Verifica que `resource` esté dentro de los scopes permitidos.
 * Política simple v0.1: substring match en repos/envs/resources.
 * v0.2 evolucionará a glob/regex con Cedar/OpenFGA.
 */
function resourceInScope(
  resource: string,
  scope: { repos: string[]; envs: string[]; resources: string[] },
): boolean {
  const haystack = [...scope.repos, ...scope.envs, ...scope.resources];
  if (haystack.length === 0) return false;
  return haystack.some((s) => resource === s || resource.startsWith(`${s}/`) || resource.startsWith(`${s}:`));
}

/**
 * Verifica todos los oracle gates declarados.
 * v0.1: oracle reading válida con TTL no expirado y firmada.
 * v0.2 evolucionará a evaluación de `condition` (DSL).
 */
async function checkOracleGates(
  gates: Array<{ oracleId: string; condition: string }>,
): Promise<{ ok: boolean; consultedIds: string[]; failedIds: string[] }> {
  const consultedIds: string[] = [];
  const failedIds: string[] = [];

  const db = await getDb();
  if (!db) {
    return { ok: false, consultedIds, failedIds: gates.map((g) => g.oracleId) };
  }
  for (const gate of gates) {
    const rows = await db
      .select()
      .from(oracleReadings)
      .where(and(eq(oracleReadings.oracleId, gate.oracleId), gt(oracleReadings.validUntil, new Date())))
      .orderBy(desc(oracleReadings.signedAt))
      .limit(1);

    const reading = rows[0];
    if (!reading) {
      failedIds.push(gate.oracleId);
      continue;
    }
    consultedIds.push(reading.readingId);
    // v0.1: solo verifica existencia y vigencia. v0.2: evaluar condition.
  }

  return { ok: failedIds.length === 0, consultedIds, failedIds };
}

/**
 * Verifica si el envelope está revocado.
 */
async function isRevoked(envelopeId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(revocationEvents)
    .where(eq(revocationEvents.envelopeId, envelopeId));
  return Number(rows[0]?.count ?? 0) > 0;
}

/**
 * Registra una decisión del policy engine (allow/deny) en audit log.
 */
async function logDecision(args: {
  envelopeId: string;
  envelopeType: "root" | "sub";
  request: GatewayAuthorizeRequest;
  decision: "allow" | "deny";
  reasons: string[];
  oracleConsultedIds?: string[];
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(policyDecisions).values({
    decisionId: randomUUID(),
    envelopeId: args.envelopeId,
    envelopeType: args.envelopeType,
    toolCallInputHash: args.request.toolCallInputHash,
    capability: args.request.capability,
    resource: args.request.resource,
    decision: args.decision,
    reasonChain: args.reasons,
    oracleReadingsConsulted: args.oracleConsultedIds ?? [],
    decidedByEngineVersion: ENGINE_VERSION,
  });
}

/**
 * Función pública principal: autoriza o deniega un tool call.
 */
export async function gatewayAuthorize(
  request: GatewayAuthorizeRequest,
): Promise<GatewayDecision> {
  const reasons: string[] = [];
  const violations: GatewayViolation[] = [];
  let oracleConsultedIds: string[] = [];

  // 1. Cargar envelope
  const envelope = await loadActiveEnvelope(request.envelopeId, request.envelopeType);
  if (!envelope) {
    reasons.push(`envelope ${request.envelopeId} (${request.envelopeType}) not found`);
    violations.push("envelope_not_found");
    await logDecision({
      envelopeId: request.envelopeId,
      envelopeType: request.envelopeType,
      request,
      decision: "deny",
      reasons,
    });
    return { decision: "deny", reasons, violations };
  }

  // 2. Verificar TTL
  const now = new Date();
  if (envelope.expiresAt <= now) {
    reasons.push(`envelope expired at ${envelope.expiresAt.toISOString()}`);
    violations.push("envelope_expired");
  }

  // 3. Verificar no revocado
  const envAny = envelope as { isActive: boolean; revokedAt: Date | null; revokedReason?: string | null };
  if (!envAny.isActive || envAny.revokedAt) {
    reasons.push(`envelope revoked at ${envAny.revokedAt?.toISOString() ?? "unknown"}: ${envAny.revokedReason ?? "no reason"}`);
    violations.push("envelope_revoked");
  } else {
    const revoked = await isRevoked(request.envelopeId);
    if (revoked) {
      reasons.push("envelope has revocation event registered");
      violations.push("envelope_revoked");
    }
  }

  // Si ya hay violaciones críticas, denegar antes de chequeos costosos
  if (violations.length > 0) {
    await logDecision({
      envelopeId: request.envelopeId,
      envelopeType: request.envelopeType,
      request,
      decision: "deny",
      reasons,
    });
    return { decision: "deny", reasons, violations };
  }

  // 4. Verificar firma ed25519 sobre el canonicalHash almacenado.
  // El hash fue verificado contra el payload completo en el momento de ingestEnvelope
  // (ver router.ts ingestEnvelope). Aquí solo verificamos firma sobre el hash confiado.
  if (request.envelopeType === "root") {
    const root = envelope as typeof rootAuthorityEnvelopes.$inferSelect;
    const sigValid = verifyEd25519(root.canonicalHash, root.signature, root.operatorPublicKey);
    if (!sigValid) {
      reasons.push("ed25519 signature does not verify against operator public key");
      violations.push("envelope_signature_invalid");
    }
  }

  // 5. Verificar capability
  const allowed = (envelope as { capabilitiesAllowed: string[] }).capabilitiesAllowed ?? [];
  const denied = (envelope as { capabilitiesDenied?: string[] }).capabilitiesDenied ?? [];
  if (denied.includes(request.capability)) {
    reasons.push(`capability ${request.capability} explicitly denied`);
    violations.push("capability_denied_explicit");
  } else if (!allowed.includes(request.capability)) {
    reasons.push(`capability ${request.capability} not in allowed list`);
    violations.push("capability_not_allowed");
  }

  // 6. Verificar resource scope
  const domainScope = (envelope as { domainScope: { repos: string[]; envs: string[]; resources: string[] } }).domainScope;
  if (!resourceInScope(request.resource, domainScope)) {
    reasons.push(`resource ${request.resource} not in domain scope ${JSON.stringify(domainScope)}`);
    violations.push("resource_out_of_scope");
  }

  // 7. Verificar power lane (solo aplica a root; sub hereda)
  if (request.envelopeType === "root") {
    const pwMax = (envelope as { powerLaneMax: number }).powerLaneMax;
    if (request.powerLaneRequested > pwMax) {
      reasons.push(`power lane ${request.powerLaneRequested} > envelope max ${pwMax}`);
      violations.push("power_lane_exceeded");
    }
  }

  // 8. Verificar budget
  const usage = await getEnvelopeUsage(request.envelopeId);
  const bMaxTokens = Number((envelope as { budgetMaxTokens: number | bigint }).budgetMaxTokens ?? 0);
  const bMaxCost = Number((envelope as { budgetMaxCostUsdCents: number }).budgetMaxCostUsdCents ?? 0);
  const bMaxActions = Number((envelope as { budgetMaxActions: number }).budgetMaxActions ?? 0);
  const bMaxDuration = Number((envelope as { budgetMaxDurationSeconds: number }).budgetMaxDurationSeconds ?? 0);

  const estTokens = request.estimatedTokens ?? 0;
  const estCost = request.estimatedCostUsdCents ?? 0;
  const estDurationMs = (request.estimatedDurationSeconds ?? 0) * 1000;

  if (usage.totalTokens + estTokens > bMaxTokens) {
    reasons.push(`tokens budget would exceed: ${usage.totalTokens}+${estTokens}>${bMaxTokens}`);
    violations.push("budget_tokens_exceeded");
  }
  if (usage.totalCost + estCost > bMaxCost) {
    reasons.push(`cost budget would exceed: ${usage.totalCost}+${estCost}>${bMaxCost}`);
    violations.push("budget_cost_exceeded");
  }
  if (usage.totalActions + 1 > bMaxActions) {
    reasons.push(`actions budget would exceed: ${usage.totalActions}+1>${bMaxActions}`);
    violations.push("budget_actions_exceeded");
  }
  if (usage.totalDurationMs + estDurationMs > bMaxDuration * 1000) {
    reasons.push(`duration budget would exceed: ${usage.totalDurationMs}+${estDurationMs}>${bMaxDuration * 1000}`);
    violations.push("budget_duration_exceeded");
  }

  // 9. Verificar oracle gates (solo root; v0.1 simple)
  if (request.envelopeType === "root") {
    const gates = ((envelope as { oracleGates: Array<{ oracleId: string; condition: string }> }).oracleGates) ?? [];
    if (gates.length > 0) {
      const oracleResult = await checkOracleGates(gates);
      oracleConsultedIds = oracleResult.consultedIds;
      if (!oracleResult.ok) {
        reasons.push(`oracle gates failed: ${oracleResult.failedIds.join(", ")}`);
        violations.push("oracle_gate_failed");
      }
    }
  }

  // 10. Verificar prohibitions
  const prohibited = ((envelope as { prohibited?: Array<{ category: string; description: string }> }).prohibited) ?? [];
  for (const p of prohibited) {
    // Política simple v0.1: si capability contiene la categoría
    if (request.capability.includes(p.category) || request.resource.includes(p.category)) {
      reasons.push(`prohibited action match: ${p.category} (${p.description})`);
      violations.push("prohibited_action");
      break;
    }
  }

  if (violations.length > 0) {
    await logDecision({
      envelopeId: request.envelopeId,
      envelopeType: request.envelopeType,
      request,
      decision: "deny",
      reasons,
      oracleConsultedIds,
    });
    return { decision: "deny", reasons, violations };
  }

  // ALLOW: emitir capability token
  reasons.push("all gates passed");
  const tokenId = randomUUID();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_SECONDS * 1000);
  const tokenPayload = {
    tokenId,
    envelopeId: request.envelopeId,
    capability: request.capability,
    resource: request.resource,
    expiresAt: expiresAt.toISOString(),
  };
  // v0.1: HMAC con server JWT secret. v0.2: ed25519 propio del gateway.
  const tokenSignature = createHash("sha256")
    .update(canonicalHash(tokenPayload) + (process.env.JWT_SECRET ?? "forja-dev-only"))
    .digest("hex");

  const dbInsert = await getDb();
  if (dbInsert) await dbInsert.insert(capabilityTokens).values({
    tokenId,
    envelopeId: request.envelopeId,
    envelopeType: request.envelopeType,
    capability: request.capability,
    resource: request.resource,
    expiresAt,
    signature: tokenSignature,
  });

  await logDecision({
    envelopeId: request.envelopeId,
    envelopeType: request.envelopeType,
    request,
    decision: "allow",
    reasons,
    oracleConsultedIds,
  });

  return {
    decision: "allow",
    tokenId,
    tokenSignature,
    expiresAt,
    reasons,
  };
}
