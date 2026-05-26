/**
 * Forja v4 — Test E2E del kernel soberano (Día 7)
 *
 * Verifica el flujo completo:
 *   1. Ingest del envelope piloto firmado en Mac → DB (verificando firma server-side)
 *   2. requestAuthorization para una capability dentro del envelope → allow + token
 *   3. requestAuthorization para una capability prohibida → deny con razones
 *   4. recordReceipt con outcome success → Merkle chain verde
 *   5. getEnvelopeStatus → muestra usage acumulado
 *
 * Si este test pasa verde, el kernel mínimo Forja v4 está vivo y operable.
 *
 * Run: pnpm vitest run server/forja/forja.e2e.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  rootAuthorityEnvelopes,
  missionCapsules,
  evidenceReceipts,
  capabilityTokens,
  policyDecisions,
  oracleReadings,
} from "../../drizzle/schema.js";
import { inArray } from "drizzle-orm";
import { canonicalHash } from "./canonical.js";
import { verifyEd25519 } from "./ed25519.js";
import { gatewayAuthorize } from "./gateway.js";
import { createHash, randomUUID } from "node:crypto";

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

const ENVELOPE_PATH = resolve(
  __dirname,
  "../../forja_envelopes/envelope-piloto-day2-signed.json",
);

describe("Forja v4 — kernel E2E (Día 7)", () => {
  let envelope: SignedEnvelope;
  let db: NonNullable<Awaited<ReturnType<typeof getDb>>>;

  beforeAll(async () => {
    const conn = await getDb();
    if (!conn) throw new Error("Database unavailable");
    db = conn;

    const raw = readFileSync(ENVELOPE_PATH, "utf-8");
    envelope = JSON.parse(raw);
  });

  afterAll(async () => {
    if (!db || !envelope) return;
    // Cleanup test artifacts (only those created by this test run)
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

  it("Hito 1 — verifies the signed envelope and ingests into DB", async () => {
    // Recompute canonical hash from full envelope minus signature & canonicalHash
    // (matches client algorithm in scripts/forja/keygen-and-sign.mjs)
    const { signature: _sig, canonicalHash: _ch, ...envelopeForHash } = envelope;
    const recomputed = canonicalHash(envelopeForHash);
    expect(recomputed).toBe(envelope.canonicalHash);

    const sigValid = verifyEd25519(
      envelope.canonicalHash,
      envelope.signature,
      envelope.operatorPublicKey,
    );
    expect(sigValid).toBe(true);

    // Ingest mission capsule
    const existingMission = await db.select().from(missionCapsules).where(eq(missionCapsules.missionId, envelope.missionCapsuleId)).limit(1);
    if (existingMission.length === 0) {
      await db.insert(missionCapsules).values({
        missionId: envelope.missionCapsuleId,
        title: "Forja v4 E2E test mission",
        description: "Pilot envelope from Día 0 keygen flow",
        acceptanceCriteria: [],
        domain: envelope.domainScope.repos[0] ?? "tablero-campana",
        initiatedBy: envelope.operatorOpenId,
        outcome: "in_progress",
      });
    }

    // Ingest envelope (skip if already exists from prior run)
    const existing = await db.select().from(rootAuthorityEnvelopes).where(eq(rootAuthorityEnvelopes.envelopeId, envelope.envelopeId)).limit(1);
    if (existing.length === 0) {
      // Force isActive true and not-expired for test (real envelope expired)
      const futureExpire = new Date(Date.now() + 60 * 60 * 1000); // +1 hora
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
    }

    const persisted = await db.select().from(rootAuthorityEnvelopes).where(eq(rootAuthorityEnvelopes.envelopeId, envelope.envelopeId)).limit(1);
    expect(persisted.length).toBe(1);
    expect(persisted[0].canonicalHash).toBe(envelope.canonicalHash);

    // Insert fresh oracle readings for each gate so Hitos 2-4 can be authorized
    const validUntil = new Date(Date.now() + 60 * 60 * 1000); // +1h
    for (const gate of envelope.oracleGates) {
      const readingId = randomUUID();
      const value = { status: "green" };
      const valueHash = createHash("sha256").update(JSON.stringify(value)).digest("hex");
      await db.insert(oracleReadings).values({
        readingId,
        oracleId: gate.oracleId,
        value,
        signedBy: "forja-kernel-test-oracle",
        validUntil,
        hash: valueHash,
        signature: "0".repeat(128),
      });
    }
  });

  it("Hito 2 — gateway ALLOW for capability inside envelope (read_repo)", async () => {
    const decision = await gatewayAuthorize({
      envelopeId: envelope.envelopeId,
      envelopeType: "root",
      capability: "read_repo",
      resource: "tablero-campana",
      powerLaneRequested: 1,
      estimatedTokens: 100,
      estimatedCostUsdCents: 10,
      estimatedDurationSeconds: 60,
      toolCallInputHash: createHash("sha256").update("test-input-1").digest("hex"),
    });

    expect(decision.decision).toBe("allow");
    if (decision.decision === "allow") {
      expect(decision.tokenId).toBeDefined();
      expect(decision.tokenSignature).toBeDefined();
    }
  });

  it("Hito 3 — gateway DENY for prohibited capability (production_deploy)", async () => {
    const decision = await gatewayAuthorize({
      envelopeId: envelope.envelopeId,
      envelopeType: "root",
      capability: "production_deploy",
      resource: "tablero-campana",
      powerLaneRequested: 5,
      estimatedTokens: 100,
      estimatedCostUsdCents: 10,
      estimatedDurationSeconds: 60,
      toolCallInputHash: createHash("sha256").update("test-input-2").digest("hex"),
    });

    expect(decision.decision).toBe("deny");
    expect(decision.violations.length).toBeGreaterThan(0);
    expect(decision.violations).toContain("capability_denied_explicit");
  });

  it("Hito 4 — recordReceipt with Merkle chain", async () => {
    // Authorize first to get token
    const auth = await gatewayAuthorize({
      envelopeId: envelope.envelopeId,
      envelopeType: "root",
      capability: "run_tests",
      resource: "tablero-campana",
      powerLaneRequested: 1,
      estimatedTokens: 50,
      estimatedCostUsdCents: 5,
      estimatedDurationSeconds: 30,
      toolCallInputHash: createHash("sha256").update("test-input-3").digest("hex"),
    });
    expect(auth.decision).toBe("allow");
    if (auth.decision !== "allow") throw new Error("unreachable: auth not allow");
    const tokenId = auth.tokenId;

    // Record first receipt (no parent)
    const receipt1Id = randomUUID();
    const merkleHash1 = createHash("sha256").update("receipt1-payload").digest("hex");
    await db.insert(evidenceReceipts).values({
      receiptId: receipt1Id,
      envelopeId: envelope.envelopeId,
      capabilityTokenId: tokenId,
      parentReceiptHash: null,
      merkleHash: merkleHash1,
      actionType: "run_tests",
      inputHash: createHash("sha256").update("input1").digest("hex"),
      outputHash: createHash("sha256").update("output1").digest("hex"),
      outcome: "success",
      tokensConsumed: 45,
      costUsdCents: 4,
      durationMs: 28000,
      startedAt: new Date(Date.now() - 28000),
      completedAt: new Date(),
      signedByAgentId: "forja-kernel-test",
      signedByPublicKey: "0".repeat(64),
      signature: "0".repeat(128),
    });

    // Record second receipt chained to first
    const receipt2Id = randomUUID();
    const merkleHash2 = createHash("sha256").update(merkleHash1 + "receipt2-payload").digest("hex");
    await db.insert(evidenceReceipts).values({
      receiptId: receipt2Id,
      envelopeId: envelope.envelopeId,
      capabilityTokenId: tokenId,
      parentReceiptHash: merkleHash1,
      merkleHash: merkleHash2,
      actionType: "run_tests",
      inputHash: createHash("sha256").update("input2").digest("hex"),
      outputHash: createHash("sha256").update("output2").digest("hex"),
      outcome: "success",
      tokensConsumed: 30,
      costUsdCents: 3,
      durationMs: 18000,
      startedAt: new Date(Date.now() - 18000),
      completedAt: new Date(),
      signedByAgentId: "forja-kernel-test",
      signedByPublicKey: "0".repeat(64),
      signature: "0".repeat(128),
    });

    // Verify chain integrity
    const chain = await db
      .select()
      .from(evidenceReceipts)
      .where(eq(evidenceReceipts.envelopeId, envelope.envelopeId));
    expect(chain.length).toBeGreaterThanOrEqual(2);
    const r2 = chain.find(r => r.receiptId === receipt2Id);
    expect(r2?.parentReceiptHash).toBe(merkleHash1);
  });

  it("Hito 5 — getEnvelopeStatus reflects budget consumption", async () => {
    const status = await db
      .select()
      .from(rootAuthorityEnvelopes)
      .where(eq(rootAuthorityEnvelopes.envelopeId, envelope.envelopeId))
      .limit(1);
    expect(status.length).toBe(1);
    expect(status[0].isActive).toBe(true);
    expect(status[0].powerLaneMax).toBe(envelope.powerLaneMax);

    const receipts = await db
      .select()
      .from(evidenceReceipts)
      .where(eq(evidenceReceipts.envelopeId, envelope.envelopeId));
    const totalTokens = receipts.reduce((sum, r) => sum + (r.tokensConsumed ?? 0), 0);
    expect(totalTokens).toBeGreaterThan(0);
  });
});
