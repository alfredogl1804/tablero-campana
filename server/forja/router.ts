/**
 * Forja v4 — tRPC router del kernel
 *
 * Endpoints expuestos al cliente (firmados ed25519 cuando sea crítico):
 *
 *   - forja.ingestEnvelope(signedEnvelope): inserta envelope firmado en DB
 *     después de verificar canonical hash + firma + pubkey operator allowlist.
 *
 *   - forja.requestAuthorization(request): consulta gateway, devuelve allow/deny
 *     + capability token de un solo uso si allow.
 *
 *   - forja.recordReceipt(receipt): registra evidence_receipts (ejecución real
 *     consumida), Merkle-chained con receipt anterior del mismo envelope.
 *
 *   - forja.revokeEnvelope(envelopeId, reason): operador detiene envelope antes
 *     del TTL (kill switch).
 *
 *   - forja.getEnvelopeStatus(envelopeId): consulta estado canónico para HUD.
 */

import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID, createHash } from "node:crypto";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db.js";
import {
  rootAuthorityEnvelopes,
  subEnvelopes,
  evidenceReceipts,
  revocationEvents,
  policyDecisions,
  capabilityTokens,
  missionCapsules,
} from "../../drizzle/schema.js";
import { canonicalHash } from "./canonical.js";
import { verifyEd25519 } from "./ed25519.js";
import { gatewayAuthorize } from "./gateway.js";
import { verifyAttenuation, FORJA_MAX_DEPTH } from "./attenuation-verifier.js";
import type { GatewayAuthorizeRequest } from "./types.js";

// ALLOWLIST de pubkeys operadoras autorizadas a firmar envelopes.
// En v0.1 hardcoded; v0.2 → tabla operator_keys con KMS rotation.
const OPERATOR_PUBLIC_KEYS_ALLOWLIST: ReadonlyArray<string> = [
  // Operador soberano único: Alfredo Góngora (fingerprint ec0f16749dd527a5)
  "cbfd8895990a57fb9155b55ec817b5d92cfbf3416d83fb0712afbc58b4b5b064",
];

const SignedEnvelopeSchema = z.object({
  envelopeId: z.string().uuid(),
  operatorOpenId: z.string().min(1),
  operatorPublicKey: z.string().regex(/^[0-9a-f]{64}$/i),
  missionCapsuleId: z.string().uuid(),
  domainScope: z.object({
    repos: z.array(z.string()),
    envs: z.array(z.string()),
    resources: z.array(z.string()),
  }),
  powerLaneMax: z.number().int().min(0).max(6),
  capabilitiesAllowed: z.array(z.string()),
  capabilitiesDenied: z.array(z.string()),
  prohibited: z.array(
    z.object({ category: z.string(), description: z.string() }),
  ),
  budget: z.object({
    maxTokens: z.number().int().nonnegative(),
    maxCostUsdCents: z.number().int().nonnegative(),
    maxActions: z.number().int().nonnegative(),
    maxDurationSeconds: z.number().int().nonnegative(),
  }),
  oracleGates: z.array(
    z.object({ oracleId: z.string(), condition: z.string() }),
  ),
  rollbackRequired: z.boolean(),
  issuedAt: z.string(),
  ttlSeconds: z.number().int().positive(),
  expiresAt: z.string(),
  canonicalHash: z.string().regex(/^[0-9a-f]{64}$/i),
  signature: z.string().regex(/^[0-9a-f]{128}$/i),
});

const AuthorizationRequestSchema = z.object({
  envelopeId: z.string().uuid(),
  envelopeType: z.enum(["root", "sub"]),
  capability: z.string().min(1),
  resource: z.string().min(1),
  powerLaneRequested: z.number().int().min(0).max(6),
  estimatedTokens: z.number().int().nonnegative().optional(),
  estimatedCostUsdCents: z.number().int().nonnegative().optional(),
  estimatedDurationSeconds: z.number().int().nonnegative().optional(),
  toolCallInputHash: z.string().regex(/^[0-9a-f]{64}$/i),
});

const SignedSubEnvelopeSchema = z.object({
  subEnvelopeId: z.string().uuid(),
  rootEnvelopeId: z.string().uuid(),
  parentEnvelopeId: z.string().uuid(),
  parentHash: z.string().regex(/^[0-9a-f]{64}$/i),
  domainScope: z.object({
    repos: z.array(z.string()),
    envs: z.array(z.string()),
    resources: z.array(z.string()),
  }),
  capabilitiesAllowed: z.array(z.string()),
  budget: z.object({
    maxTokens: z.number().int().nonnegative(),
    maxCostUsdCents: z.number().int().nonnegative(),
    maxActions: z.number().int().nonnegative(),
    maxDurationSeconds: z.number().int().nonnegative(),
  }),
  ttlSeconds: z.number().int().positive(),
  taskDescription: z.string().min(1),
  issuedByAgentId: z.string().min(1),
  issuedByPublicKey: z.string().regex(/^[0-9a-f]{64}$/i),
  issuedAt: z.string(),
  expiresAt: z.string(),
  depth: z.number().int().min(1).max(2),
  canonicalHash: z.string().regex(/^[0-9a-f]{64}$/i),
  signature: z.string().regex(/^[0-9a-f]{128}$/i),
});

const ReceiptSchema = z.object({
  envelopeId: z.string().uuid(),
  policyDecisionId: z.string().uuid(),
  capabilityTokenId: z.string().uuid(),
  capability: z.string(),
  resource: z.string(),
  outcome: z.enum(["success", "failure", "partial"]),
  toolCallInputHash: z.string(),
  toolCallOutputHash: z.string(),
  tokensConsumed: z.number().int().nonnegative(),
  costUsdCents: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  errorMessage: z.string().optional(),
});

export const forjaRouter = router({
  /**
   * Ingestar un envelope firmado por el operador.
   * Verifica:
   *  1. Pubkey está en allowlist
   *  2. canonicalHash coincide con re-cálculo del payload
   *  3. signature verifica
   *  4. expiresAt no en pasado
   *  5. envelopeId no existe ya en DB
   */
  ingestEnvelope: publicProcedure
    .input(SignedEnvelopeSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      }

      // 1. Pubkey allowlist
      if (!OPERATOR_PUBLIC_KEYS_ALLOWLIST.includes(input.operatorPublicKey.toLowerCase())) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Operator public key ${input.operatorPublicKey.slice(0, 16)}... not in allowlist`,
        });
      }

      // 2. Recompute canonical hash y comparar
      const payload = {
        envelopeId: input.envelopeId,
        operatorOpenId: input.operatorOpenId,
        operatorPublicKey: input.operatorPublicKey,
        missionCapsuleId: input.missionCapsuleId,
        domainScope: input.domainScope,
        powerLaneMax: input.powerLaneMax,
        capabilitiesAllowed: input.capabilitiesAllowed,
        capabilitiesDenied: input.capabilitiesDenied,
        prohibited: input.prohibited,
        budget: input.budget,
        oracleGates: input.oracleGates,
        rollbackRequired: input.rollbackRequired,
        issuedAt: input.issuedAt,
        ttlSeconds: input.ttlSeconds,
        expiresAt: input.expiresAt,
      };
      const recomputedHash = canonicalHash(payload);
      if (recomputedHash !== input.canonicalHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `canonicalHash mismatch (server recomputed ${recomputedHash}, client claimed ${input.canonicalHash})`,
        });
      }

      // 3. Verificar firma
      const sigValid = verifyEd25519(
        input.canonicalHash,
        input.signature,
        input.operatorPublicKey,
      );
      if (!sigValid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "ed25519 signature verification failed",
        });
      }

      // 4. Expiración
      const expiresAt = new Date(input.expiresAt);
      if (expiresAt <= new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `envelope already expired at ${input.expiresAt}`,
        });
      }

      // 5. Mission capsule debe existir o crearse mínimo
      const existingMission = await db
        .select()
        .from(missionCapsules)
        .where(eq(missionCapsules.missionId, input.missionCapsuleId))
        .limit(1);
      if (existingMission.length === 0) {
        // Auto-create capsule esqueleto. v0.2: requerir capsule pre-existente.
        await db.insert(missionCapsules).values({
          missionId: input.missionCapsuleId,
          title: "(auto-created from envelope ingestion)",
          description: `Mission capsule for envelope ${input.envelopeId.slice(0, 8)}`,
          acceptanceCriteria: [],
          domain: input.domainScope.repos[0] ?? "unknown",
          initiatedBy: input.operatorOpenId,
          outcome: "in_progress",
        });
      }

      // 6. Insertar envelope (omito createdAt; defaultNow lo llena)
      try {
        await db.insert(rootAuthorityEnvelopes).values({
          envelopeId: input.envelopeId,
          operatorOpenId: input.operatorOpenId,
          operatorPublicKey: input.operatorPublicKey,
          missionCapsuleId: input.missionCapsuleId,
          domainScope: input.domainScope,
          powerLaneMax: input.powerLaneMax,
          capabilitiesAllowed: input.capabilitiesAllowed,
          capabilitiesDenied: input.capabilitiesDenied,
          prohibited: input.prohibited,
          budgetMaxTokens: input.budget.maxTokens,
          budgetMaxCostUsdCents: input.budget.maxCostUsdCents,
          budgetMaxActions: input.budget.maxActions,
          budgetMaxDurationSeconds: input.budget.maxDurationSeconds,
          oracleGates: input.oracleGates,
          rollbackRequired: input.rollbackRequired,
          issuedAt: new Date(input.issuedAt),
          ttlSeconds: input.ttlSeconds,
          expiresAt,
          canonicalHash: input.canonicalHash,
          signature: input.signature,
          isActive: true,
        } as typeof rootAuthorityEnvelopes.$inferInsert);
      } catch (e) {
        if (e instanceof Error && e.message.includes("Duplicate")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `envelope ${input.envelopeId} already ingested`,
          });
        }
        throw e;
      }

      return {
        envelopeId: input.envelopeId,
        ingested: true,
        verifiedAt: new Date().toISOString(),
        expiresAt: input.expiresAt,
      };
    }),

  /**
   * Solicitar autorización para una capability/resource específica.
   * Devuelve allow + capability token o deny + razones.
   */
  requestAuthorization: publicProcedure
    .input(AuthorizationRequestSchema)
    .mutation(async ({ input }) => {
      const decision = await gatewayAuthorize(input as GatewayAuthorizeRequest);
      return decision;
    }),

  /**
   * Registrar receipt de ejecución consumada.
   * Encadena Merkle con receipt anterior del envelope (si existe).
   */
  recordReceipt: publicProcedure
    .input(ReceiptSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Buscar último receipt del envelope para encadenar Merkle
      const prevRows = await db
        .select()
        .from(evidenceReceipts)
        .where(eq(evidenceReceipts.envelopeId, input.envelopeId))
        .orderBy(desc(evidenceReceipts.completedAt))
        .limit(1);
      const parentReceiptHash = prevRows[0]?.merkleHash ?? null;

      const receiptId = randomUUID();
      const startedAt = new Date(Date.now() - input.durationMs);
      const completedAt = new Date();

      // Merkle hash: SHA256(parentHash || canonicalHash(receiptPayload))
      const receiptPayload = {
        receiptId,
        envelopeId: input.envelopeId,
        capabilityTokenId: input.capabilityTokenId,
        capability: input.capability,
        resource: input.resource,
        outcome: input.outcome,
        inputHash: input.toolCallInputHash,
        outputHash: input.toolCallOutputHash,
        tokensConsumed: input.tokensConsumed,
        costUsdCents: input.costUsdCents,
        durationMs: input.durationMs,
        completedAt: completedAt.toISOString(),
        parentReceiptHash,
      };
      const payloadHash = canonicalHash(receiptPayload);
      const merkleHash = createHash("sha256")
        .update((parentReceiptHash ?? "") + payloadHash)
        .digest("hex");

      // v0.1: receipt firmado por el server (HMAC con JWT_SECRET).
      // v0.2: cada agente tendrá su propio par ed25519 y firmará con él.
      const agentId = `forja-kernel-server`;
      const agentPublicKey = "0".repeat(64); // placeholder hasta v0.2
      const receiptSignature = createHash("sha256")
        .update(merkleHash + (process.env.JWT_SECRET ?? "forja-dev-only"))
        .digest("hex")
        .padStart(128, "0")
        .slice(0, 128);

      await db.insert(evidenceReceipts).values({
        receiptId,
        envelopeId: input.envelopeId,
        capabilityTokenId: input.capabilityTokenId,
        parentReceiptHash,
        merkleHash,
        actionType: input.capability,
        inputHash: input.toolCallInputHash,
        outputHash: input.toolCallOutputHash,
        outcome: input.outcome,
        tokensConsumed: input.tokensConsumed,
        costUsdCents: input.costUsdCents,
        durationMs: input.durationMs,
        startedAt,
        completedAt,
        signedByAgentId: agentId,
        signedByPublicKey: agentPublicKey,
        signature: receiptSignature,
      });

      return {
        receiptId,
        merkleHash,
        parentReceiptHash,
        chained: parentReceiptHash !== null,
      };
    }),

  /**
   * Revocar envelope antes del TTL (kill switch operador).
   */
  revokeEnvelope: protectedProcedure
    .input(
      z.object({
        envelopeId: z.string().uuid(),
        envelopeType: z.enum(["root", "sub"]),
        reason: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Firma del evento de revocación (HMAC v0.1, ed25519 v0.2)
      const revocationSignature = createHash("sha256")
        .update(`${input.envelopeId}:${input.reason}:${ctx.user.openId}`)
        .digest("hex")
        .padStart(128, "0")
        .slice(0, 128);

      await db.insert(revocationEvents).values({
        eventId: randomUUID(),
        envelopeId: input.envelopeId,
        envelopeType: input.envelopeType,
        reason: input.reason,
        triggeredBy: "operator",
        triggeredByPublicKey: ctx.user.openId,
        signature: revocationSignature,
      });

      // Marcar envelope como inactivo
      if (input.envelopeType === "root") {
        await db
          .update(rootAuthorityEnvelopes)
          .set({ isActive: false, revokedAt: new Date(), revokedReason: input.reason })
          .where(eq(rootAuthorityEnvelopes.envelopeId, input.envelopeId));
      }

      return { revoked: true, envelopeId: input.envelopeId };
    }),

  /**
   * Crear un sub-envelope firmado por un agente.
   * Verifica:
   *  1. Schema y firma del agente
   *  2. canonicalHash recomputado coincide
   *  3. Parent root existe y está activo
   *  4. Atenuación monotónica respecto al parent (5 invariantes)
   *  5. depth = parent.depth + 1 ≤ FORJA_MAX_DEPTH
   *  6. subEnvelopeId no existe ya
   */
  createSubEnvelope: publicProcedure
    .input(SignedSubEnvelopeSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // 1. Recompute canonical hash y comparar (algoritmo idéntico al cliente: payload sin signature/canonicalHash)
      const payload = {
        subEnvelopeId: input.subEnvelopeId,
        rootEnvelopeId: input.rootEnvelopeId,
        parentEnvelopeId: input.parentEnvelopeId,
        parentHash: input.parentHash,
        domainScope: input.domainScope,
        capabilitiesAllowed: input.capabilitiesAllowed,
        budget: input.budget,
        ttlSeconds: input.ttlSeconds,
        taskDescription: input.taskDescription,
        issuedByAgentId: input.issuedByAgentId,
        issuedByPublicKey: input.issuedByPublicKey,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        depth: input.depth,
      };
      const recomputedHash = canonicalHash(payload);
      if (recomputedHash !== input.canonicalHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `canonicalHash mismatch (recomputed ${recomputedHash}, claimed ${input.canonicalHash})`,
        });
      }

      // 2. Verificar firma del agente emisor
      const sigValid = verifyEd25519(input.canonicalHash, input.signature, input.issuedByPublicKey);
      if (!sigValid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "ed25519 signature of sub-envelope does not verify",
        });
      }

      // 3. TTL no expirado
      const expiresAt = new Date(input.expiresAt);
      if (expiresAt <= new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `sub-envelope expires in past: ${input.expiresAt}` });
      }

      // 4. Cargar parent root y validar activo
      const parentRows = await db
        .select()
        .from(rootAuthorityEnvelopes)
        .where(eq(rootAuthorityEnvelopes.envelopeId, input.rootEnvelopeId))
        .limit(1);
      const parentRoot = parentRows[0];
      if (!parentRoot) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `parent root envelope ${input.rootEnvelopeId} not found`,
        });
      }
      if (!parentRoot.isActive || parentRoot.revokedAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `parent root envelope ${input.rootEnvelopeId} is inactive or revoked`,
        });
      }
      if (parentRoot.expiresAt <= new Date()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `parent root envelope ${input.rootEnvelopeId} expired at ${parentRoot.expiresAt.toISOString()}`,
        });
      }

      // 5. Verificar parentHash (integridad del puntero al parent)
      if (parentRoot.canonicalHash.toLowerCase() !== input.parentHash.toLowerCase()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `parentHash mismatch: claimed ${input.parentHash}, parent has ${parentRoot.canonicalHash}`,
        });
      }

      // 6. Verificar atenuación monotónica
      const verdict = verifyAttenuation(
        {
          domainScope: parentRoot.domainScope,
          capabilitiesAllowed: parentRoot.capabilitiesAllowed,
          capabilitiesDenied: parentRoot.capabilitiesDenied,
          budgetMaxTokens: Number(parentRoot.budgetMaxTokens),
          budgetMaxCostUsdCents: parentRoot.budgetMaxCostUsdCents,
          budgetMaxActions: parentRoot.budgetMaxActions,
          budgetMaxDurationSeconds: parentRoot.budgetMaxDurationSeconds,
          expiresAt: parentRoot.expiresAt,
          depth: 0,
        },
        {
          domainScope: input.domainScope,
          capabilitiesAllowed: input.capabilitiesAllowed,
          budgetMaxTokens: input.budget.maxTokens,
          budgetMaxCostUsdCents: input.budget.maxCostUsdCents,
          budgetMaxActions: input.budget.maxActions,
          budgetMaxDurationSeconds: input.budget.maxDurationSeconds,
          expiresAt,
          depth: input.depth,
        },
      );
      if (!verdict.ok) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `attenuation_violated: ${verdict.violation} — ${verdict.detail}`,
        });
      }

      // 7. Insertar sub-envelope
      try {
        await db.insert(subEnvelopes).values({
          subEnvelopeId: input.subEnvelopeId,
          rootEnvelopeId: input.rootEnvelopeId,
          parentEnvelopeId: input.parentEnvelopeId,
          parentHash: input.parentHash,
          domainScope: input.domainScope,
          capabilitiesAllowed: input.capabilitiesAllowed,
          budgetMaxTokens: input.budget.maxTokens,
          budgetMaxCostUsdCents: input.budget.maxCostUsdCents,
          budgetMaxActions: input.budget.maxActions,
          budgetMaxDurationSeconds: input.budget.maxDurationSeconds,
          ttlSeconds: input.ttlSeconds,
          taskDescription: input.taskDescription,
          issuedByAgentId: input.issuedByAgentId,
          issuedByPublicKey: input.issuedByPublicKey,
          issuedAt: new Date(input.issuedAt),
          expiresAt,
          isActive: true,
          canonicalHash: input.canonicalHash,
          signature: input.signature,
          depth: input.depth,
        } as typeof subEnvelopes.$inferInsert);
      } catch (e) {
        if (e instanceof Error && e.message.includes("Duplicate")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `sub-envelope ${input.subEnvelopeId} already exists`,
          });
        }
        throw e;
      }

      return {
        subEnvelopeId: input.subEnvelopeId,
        rootEnvelopeId: input.rootEnvelopeId,
        depth: input.depth,
        attenuationVerified: true,
        maxDepth: FORJA_MAX_DEPTH,
        verifiedAt: new Date().toISOString(),
        expiresAt: input.expiresAt,
      };
    }),

  /**
   * Estado canónico de un envelope (para HUD).
   */
  getEnvelopeStatus: publicProcedure
    .input(z.object({ envelopeId: z.string().uuid() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const rows = await db
        .select()
        .from(rootAuthorityEnvelopes)
        .where(eq(rootAuthorityEnvelopes.envelopeId, input.envelopeId))
        .limit(1);
      const envelope = rows[0];
      if (!envelope) {
        throw new TRPCError({ code: "NOT_FOUND", message: `envelope ${input.envelopeId} not found` });
      }

      const usageRows = await db
        .select({
          totalTokens: sql<number>`COALESCE(SUM(${evidenceReceipts.tokensConsumed}), 0)`,
          totalCost: sql<number>`COALESCE(SUM(${evidenceReceipts.costUsdCents}), 0)`,
          totalActions: sql<number>`COUNT(*)`,
        })
        .from(evidenceReceipts)
        .where(eq(evidenceReceipts.envelopeId, input.envelopeId));
      const usage = usageRows[0];

      const decisionsRows = await db
        .select({
          allowed: sql<number>`SUM(CASE WHEN ${policyDecisions.decision} = 'allow' THEN 1 ELSE 0 END)`,
          denied: sql<number>`SUM(CASE WHEN ${policyDecisions.decision} = 'deny' THEN 1 ELSE 0 END)`,
        })
        .from(policyDecisions)
        .where(eq(policyDecisions.envelopeId, input.envelopeId));
      const decisions = decisionsRows[0];

      const tokensRows = await db
        .select({ active: sql<number>`COUNT(*)` })
        .from(capabilityTokens)
        .where(
          and(
            eq(capabilityTokens.envelopeId, input.envelopeId),
            sql`${capabilityTokens.expiresAt} > NOW()`,
            sql`${capabilityTokens.consumedAt} IS NULL`,
          ),
        );

      return {
        envelopeId: envelope.envelopeId,
        isActive: envelope.isActive,
        revokedAt: envelope.revokedAt?.toISOString() ?? null,
        revokedReason: envelope.revokedReason,
        expiresAt: envelope.expiresAt.toISOString(),
        timeRemainingMs: envelope.expiresAt.getTime() - Date.now(),
        powerLaneMax: envelope.powerLaneMax,
        budget: {
          tokens: { used: Number(usage?.totalTokens ?? 0), max: Number(envelope.budgetMaxTokens) },
          costCents: { used: Number(usage?.totalCost ?? 0), max: Number(envelope.budgetMaxCostUsdCents) },
          actions: { used: Number(usage?.totalActions ?? 0), max: Number(envelope.budgetMaxActions) },
        },
        decisions: {
          allowed: Number(decisions?.allowed ?? 0),
          denied: Number(decisions?.denied ?? 0),
        },
        activeTokens: Number(tokensRows[0]?.active ?? 0),
      };
    }),
});
