/**
 * Forja v4 — Test E2E del flujo SubEnvelope (Día 8)
 *
 * Verifica end-to-end:
 *   1. Setup — root envelope (Día 7 piloto) está en DB activo
 *   2. Hito 1 — agente principal genera sub-envelope válido firmado, persiste, gateway lo autoriza
 *   3. Hito 2 — sub-envelope con scope expansion es rechazado en createSubEnvelope (atenuación)
 *   4. Hito 3 — sub-envelope con capability addition es rechazado (atenuación)
 *   5. Hito 4 — sub-envelope con budget excess es rechazado (atenuación)
 *   6. Hito 5 — gateway con sub válido en DB pero parent revocado → deny por parent_envelope_inactive
 *
 * Run: pnpm vitest run server/forja/forja.subenvelope.e2e.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  rootAuthorityEnvelopes,
  subEnvelopes,
  missionCapsules,
  evidenceReceipts,
  capabilityTokens,
  policyDecisions,
  oracleReadings,
} from "../../drizzle/schema.js";
import { canonicalHash } from "./canonical.js";
import { ed25519GenerateKeypair, signEd25519 } from "./ed25519.js";
import { gatewayAuthorize } from "./gateway.js";
import { forjaRouter } from "./router.js";

interface SignedEnvelope {
  envelopeId: string;
  operatorOpenId: string;
  operatorPublicKey: string;
  missionCapsuleId: string;
  domainScope: { repos: string[]; envs: string[]; resources: string[] };
  powerLaneMax: number;
  capabilitiesAllowed: string[];
  capabilitiesDenied: string[];
  prohibited: { category: string; description: string }[];
  budget: {
    maxTokens: number;
    maxCostUsdCents: number;
    maxActions: number;
    maxDurationSeconds: number;
  };
  oracleGates: { oracleId: string; condition: string }[];
  rollbackRequired: boolean;
  issuedAt: string;
  ttlSeconds: number;
  canonicalHash: string;
  signature: string;
  [key: string]: unknown;
}

const ENVELOPE_PATH = resolve(__dirname, "../../forja_envelopes/envelope-piloto-day2-signed.json");

interface SubPayload {
  subEnvelopeId: string;
  rootEnvelopeId: string;
  parentEnvelopeId: string;
  parentHash: string;
  domainScope: { repos: string[]; envs: string[]; resources: string[] };
  capabilitiesAllowed: string[];
  budget: { maxTokens: number; maxCostUsdCents: number; maxActions: number; maxDurationSeconds: number };
  ttlSeconds: number;
  taskDescription: string;
  issuedByAgentId: string;
  issuedByPublicKey: string;
  issuedAt: string;
  expiresAt: string;
  depth: number;
}

function buildSignedSub(payload: SubPayload, agentPrivateKey: string) {
  const hash = canonicalHash(payload as unknown as Record<string, unknown>);
  const signature = signEd25519(hash, agentPrivateKey);
  return { ...payload, canonicalHash: hash, signature };
}

describe("Forja v4 — sub-envelope E2E (Día 8)", () => {
  let envelope: SignedEnvelope;
  let db: NonNullable<Awaited<ReturnType<typeof getDb>>>;
  let agentKeypair: { privateKeyHex: string; publicKeyHex: string };
  const subIdsCreated: string[] = [];
  // Caller used by publicProcedure invocations; ctx is empty for public routes.
  const caller = forjaRouter.createCaller({} as never);

  beforeAll(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("Database unavailable");
    db = conn;

    envelope = JSON.parse(readFileSync(ENVELOPE_PATH, "utf-8"));
    agentKeypair = ed25519GenerateKeypair();

    // Asegurar mission capsule + envelope root activo (idempotente)
    const existingMission = await db
      .select()
      .from(missionCapsules)
      .where(eq(missionCapsules.missionId, envelope.missionCapsuleId))
      .limit(1);
    if (existingMission.length === 0) {
      await db.insert(missionCapsules).values({
        missionId: envelope.missionCapsuleId,
        title: "Forja v4 sub-envelope E2E mission",
        description: "Día 8 — sub-envelope primitive verification",
        acceptanceCriteria: [],
        domain: envelope.domainScope.repos[0] ?? "tablero-campana",
        initiatedBy: envelope.operatorOpenId,
        outcome: "in_progress",
      });
    }

    const existing = await db
      .select()
      .from(rootAuthorityEnvelopes)
      .where(eq(rootAuthorityEnvelopes.envelopeId, envelope.envelopeId))
      .limit(1);
    if (existing.length === 0) {
      const futureExpire = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(rootAuthorityEnvelopes).values({
        envelopeId: envelope.envelopeId,
        operatorOpenId: envelope.operatorOpenId,
        operatorPublicKey: envelope.operatorPublicKey,
        missionCapsuleId: envelope.missionCapsuleId,
        domainScope: envelope.domainScope,
        powerLaneMax: envelope.powerLaneMax,
        capabilitiesAllowed: envelope.capabilitiesAllowed,
        capabilitiesDenied: envelope.capabilitiesDenied,
        prohibited: envelope.prohibited,
        budgetMaxTokens: envelope.budget.maxTokens,
        budgetMaxCostUsdCents: envelope.budget.maxCostUsdCents,
        budgetMaxActions: envelope.budget.maxActions,
        budgetMaxDurationSeconds: envelope.budget.maxDurationSeconds,
        oracleGates: envelope.oracleGates,
        rollbackRequired: envelope.rollbackRequired,
        issuedAt: new Date(envelope.issuedAt),
        ttlSeconds: envelope.ttlSeconds,
        expiresAt: futureExpire,
        canonicalHash: envelope.canonicalHash,
        signature: envelope.signature,
        isActive: true,
      } as typeof rootAuthorityEnvelopes.$inferInsert);
    } else {
      // Si existe pero está revocado/inactivo (heredado de otra suite), reactivar
      await db
        .update(rootAuthorityEnvelopes)
        .set({ isActive: true, revokedAt: null, revokedReason: null })
        .where(eq(rootAuthorityEnvelopes.envelopeId, envelope.envelopeId));
    }

    // Insertar oracle readings frescas para que gateway pase oracle gates
    const validUntil = new Date(Date.now() + 60 * 60 * 1000);
    for (const gate of envelope.oracleGates) {
      const value = { status: "green" };
      const valueHash = createHash("sha256").update(JSON.stringify(value)).digest("hex");
      await db.insert(oracleReadings).values({
        readingId: randomUUID(),
        oracleId: gate.oracleId,
        value,
        signedBy: "forja-kernel-test-oracle",
        validUntil,
        hash: valueHash,
        signature: "0".repeat(128),
      });
    }
  });

  afterAll(async () => {
    if (!db) return;
    if (subIdsCreated.length > 0) {
      await db.delete(subEnvelopes).where(inArray(subEnvelopes.subEnvelopeId, subIdsCreated));
    }
    await db.delete(evidenceReceipts).where(eq(evidenceReceipts.envelopeId, envelope.envelopeId));
    await db.delete(capabilityTokens).where(eq(capabilityTokens.envelopeId, envelope.envelopeId));
    await db.delete(policyDecisions).where(eq(policyDecisions.envelopeId, envelope.envelopeId));
    const oracleIds = envelope.oracleGates.map((g) => g.oracleId);
    if (oracleIds.length > 0) {
      await db.delete(oracleReadings).where(inArray(oracleReadings.oracleId, oracleIds));
    }
    await db.delete(rootAuthorityEnvelopes).where(eq(rootAuthorityEnvelopes.envelopeId, envelope.envelopeId));
    await db.delete(missionCapsules).where(eq(missionCapsules.missionId, envelope.missionCapsuleId));
  });

  function basePayload(overrides: Partial<SubPayload> = {}): SubPayload {
    const subEnvelopeId = randomUUID();
    return {
      subEnvelopeId,
      rootEnvelopeId: envelope.envelopeId,
      parentEnvelopeId: envelope.envelopeId,
      parentHash: envelope.canonicalHash,
      domainScope: {
        repos: envelope.domainScope.repos.slice(0, 1),
        envs: envelope.domainScope.envs.slice(0, 1),
        resources: envelope.domainScope.resources.slice(0, 1),
      },
      capabilitiesAllowed: ["read_repo"],
      budget: {
        maxTokens: Math.floor(envelope.budget.maxTokens / 2),
        maxCostUsdCents: Math.floor(envelope.budget.maxCostUsdCents / 2),
        maxActions: Math.max(1, Math.floor(envelope.budget.maxActions / 2)),
        maxDurationSeconds: Math.floor(envelope.budget.maxDurationSeconds / 2),
      },
      ttlSeconds: 1800,
      taskDescription: "Sub-agent reading repository contents (E2E test)",
      issuedByAgentId: "forja-test-principal-agent",
      issuedByPublicKey: agentKeypair.publicKeyHex,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      depth: 1,
      ...overrides,
    };
  }

  it("Hito 1 — sub-envelope válido es persistido y gateway lo autoriza", async () => {
    const payload = basePayload();
    const signed = buildSignedSub(payload, agentKeypair.privateKeyHex);

    const result = await caller.createSubEnvelope(signed);
    expect(result.attenuationVerified).toBe(true);
    expect(result.depth).toBe(1);
    subIdsCreated.push(payload.subEnvelopeId);

    // Verificar persistencia
    const persisted = await db
      .select()
      .from(subEnvelopes)
      .where(eq(subEnvelopes.subEnvelopeId, payload.subEnvelopeId))
      .limit(1);
    expect(persisted.length).toBe(1);
    expect(persisted[0].canonicalHash).toBe(signed.canonicalHash);
    expect(persisted[0].depth).toBe(1);

    // Gateway debe autorizar capability dentro del sub
    const decision = await gatewayAuthorize({
      envelopeId: payload.subEnvelopeId,
      envelopeType: "sub",
      capability: "read_repo",
      resource: payload.domainScope.repos[0],
      powerLaneRequested: 1,
      estimatedTokens: 100,
      estimatedCostUsdCents: 10,
      estimatedDurationSeconds: 30,
      toolCallInputHash: createHash("sha256").update("sub-test-input-1").digest("hex"),
    });
    expect(decision.decision).toBe("allow");
  });

  it("Hito 2 — sub con scope expansion es rechazado por createSubEnvelope (atenuación)", async () => {
    const payload = basePayload({
      domainScope: {
        repos: [...envelope.domainScope.repos, "alfredogl1804/repo-fuera-de-scope"],
        envs: envelope.domainScope.envs.slice(0, 1),
        resources: envelope.domainScope.resources.slice(0, 1),
      },
    });
    const signed = buildSignedSub(payload, agentKeypair.privateKeyHex);

    await expect(caller.createSubEnvelope(signed)).rejects.toThrow(/attenuation_violated.*scope_repos_expansion/);
  });

  it("Hito 3 — sub con capability addition (production_deploy) es rechazado", async () => {
    const payload = basePayload({
      capabilitiesAllowed: ["read_repo", "production_deploy"],
    });
    const signed = buildSignedSub(payload, agentKeypair.privateKeyHex);

    await expect(caller.createSubEnvelope(signed)).rejects.toThrow(/attenuation_violated.*capability_added/);
  });

  it("Hito 4 — sub con budget excess es rechazado", async () => {
    const payload = basePayload({
      budget: {
        maxTokens: envelope.budget.maxTokens * 2,
        maxCostUsdCents: envelope.budget.maxCostUsdCents,
        maxActions: envelope.budget.maxActions,
        maxDurationSeconds: envelope.budget.maxDurationSeconds,
      },
    });
    const signed = buildSignedSub(payload, agentKeypair.privateKeyHex);

    await expect(caller.createSubEnvelope(signed)).rejects.toThrow(/attenuation_violated.*budget_tokens_exceeded/);
  });

  it("Hito 5 — gateway niega sub cuando parent root es revocado", async () => {
    // Crear sub válido
    const payload = basePayload();
    const signed = buildSignedSub(payload, agentKeypair.privateKeyHex);
    const result = await caller.createSubEnvelope(signed);
    expect(result.attenuationVerified).toBe(true);
    subIdsCreated.push(payload.subEnvelopeId);

    // Revocar parent root
    await db
      .update(rootAuthorityEnvelopes)
      .set({ isActive: false, revokedAt: new Date(), revokedReason: "test revoke for Hito 5" })
      .where(eq(rootAuthorityEnvelopes.envelopeId, envelope.envelopeId));

    try {
      const decision = await gatewayAuthorize({
        envelopeId: payload.subEnvelopeId,
        envelopeType: "sub",
        capability: "read_repo",
        resource: payload.domainScope.repos[0],
        powerLaneRequested: 1,
        estimatedTokens: 100,
        estimatedCostUsdCents: 10,
        estimatedDurationSeconds: 30,
        toolCallInputHash: createHash("sha256").update("sub-test-input-2").digest("hex"),
      });
      expect(decision.decision).toBe("deny");
      if (decision.decision === "deny") {
        expect(decision.violations).toContain("parent_envelope_inactive");
      }
    } finally {
      // Re-activar para no afectar tests posteriores
      await db
        .update(rootAuthorityEnvelopes)
        .set({ isActive: true, revokedAt: null, revokedReason: null })
        .where(eq(rootAuthorityEnvelopes.envelopeId, envelope.envelopeId));
    }
  });
});
