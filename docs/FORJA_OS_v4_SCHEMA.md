# Forja OS v4 — Schema SQL Canónico

**Las 8 tablas del kernel D+ con migración Drizzle TypeScript lista para `pnpm db:push`**

| Campo | Valor |
|---|---|
| Versión schema | v4.0 |
| Doctrina madre | `FORJA_OS_v4_MONSTRUO.md` |
| Sprint plan | `FORJA_OS_SPRINT_v0_1_v2.md` |
| Engine | TiDB / MySQL-compatible (Manus webdev default) |
| ORM | Drizzle ORM |
| RLS | Aplicada vía policies en server-side context (no Postgres RLS, TiDB usa filtros explícitos en queries) |

---

## 0. Filosofía del schema

GPT-5.5 Pro fue explícito:

> "Cada acción del agente debe estar firmada, observable y revertible. La cadena de evidencia es lo que convierte autonomía en autoridad operativa."

El schema canónico v4 cumple cinco propiedades inmutables:

1. **Append-only crítico:** ningún `UPDATE` o `DELETE` directo a `evidence_receipts`, `policy_decisions`, `revocation_events`, `oracle_readings`. Solo INSERT. Cualquier "modificación" es un INSERT subsecuente que referencia el original.
2. **Hash chain enforced:** `evidence_receipts.parent_hash` referencia el receipt anterior; constraint a nivel aplicación verifica consistencia.
3. **Ed25519 signatures verifiables:** todas las firmas en columnas `BYTEA(64)` o `VARCHAR(128)` (hex), reproducibles desde el hash canónico.
4. **Server-side RLS:** TiDB no soporta Postgres RLS; las policies de acceso se aplican como middleware de tRPC procedures verificando `ctx.user.role` y `envelope.operator_open_id`.
5. **Soft-delete por revocation:** envelope no se borra, se marca `is_active = false` cuando expira o es revocado. Auditoría preservada.

---

## 1. Tabla 1 — `root_authority_envelopes`

Almacena los Authority Envelopes raíz firmados por el operador soberano.

```typescript
// drizzle/schema.ts

import { mysqlTable, varchar, json, timestamp, boolean, int, bigint, text } from 'drizzle-orm/mysql-core';

export const rootAuthorityEnvelopes = mysqlTable('root_authority_envelopes', {
  // Identidad
  envelopeId: varchar('envelope_id', { length: 36 }).primaryKey(),  // UUID
  operatorOpenId: varchar('operator_open_id', { length: 64 }).notNull(),
  operatorPublicKey: varchar('operator_public_key', { length: 128 }).notNull(),  // hex ed25519 public
  
  // Misión y dominio
  missionCapsuleId: varchar('mission_capsule_id', { length: 36 }).notNull(),  // FK -> mission_capsules.id
  domainScope: json('domain_scope').notNull(),  // JSON: { repos: [], envs: [], resources: [] }
  
  // Autoridad
  powerLaneMax: int('power_lane_max').notNull(),  // 0-6
  capabilitiesAllowed: json('capabilities_allowed').notNull(),  // string[]
  capabilitiesDenied: json('capabilities_denied').notNull(),
  prohibited: json('prohibited').notNull(),  // ProhibitedAction[] absolutas
  
  // Presupuesto
  budgetMaxTokens: bigint('budget_max_tokens', { mode: 'number' }).notNull(),
  budgetMaxCostUsd: int('budget_max_cost_usd_cents').notNull(),  // en centavos
  budgetMaxActions: int('budget_max_actions').notNull(),
  budgetMaxDurationSeconds: int('budget_max_duration_seconds').notNull(),
  
  // Oracle gates
  oracleGates: json('oracle_gates').notNull(),  // OracleGate[]
  rollbackRequired: boolean('rollback_required').notNull().default(true),
  
  // Tiempo
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  ttlSeconds: int('ttl_seconds').notNull(),
  expiresAt: timestamp('expires_at').notNull(),  // computed = issued_at + ttl
  
  // Estado
  isActive: boolean('is_active').notNull().default(true),
  revokedAt: timestamp('revoked_at'),
  revokedReason: text('revoked_reason'),
  
  // Firma
  canonicalHash: varchar('canonical_hash', { length: 64 }).notNull(),  // SHA-256 hex
  signature: varchar('signature', { length: 128 }).notNull(),  // ed25519 signature hex
  
  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const rootAuthorityEnvelopesIndex = {
  byOperator: 'idx_envelope_operator',
  byActive: 'idx_envelope_active',
  byExpires: 'idx_envelope_expires',
};
```

**Reglas operativas server-side:**

- INSERT solo si `verify_ed25519(operatorPublicKey, signature, canonicalHash) === true`.
- INSERT solo si `canonicalHash === sha256(canonical_json(envelope))`.
- UPDATE permitido solo en `isActive`, `revokedAt`, `revokedReason`. Cualquier otro campo es immutable.
- DELETE prohibido. Auditoría histórica preservada.

---

## 2. Tabla 2 — `sub_envelopes`

Sub-envelopes derivados emitidos por agentes con scope estrictamente atenuado.

```typescript
export const subEnvelopes = mysqlTable('sub_envelopes', {
  subEnvelopeId: varchar('sub_envelope_id', { length: 36 }).primaryKey(),
  rootEnvelopeId: varchar('root_envelope_id', { length: 36 }).notNull(),  // FK
  parentEnvelopeId: varchar('parent_envelope_id', { length: 36 }).notNull(),  // root o otro sub
  parentHash: varchar('parent_hash', { length: 64 }).notNull(),  // hash del envelope padre
  
  // Atenuación
  domainScope: json('domain_scope').notNull(),  // ⊆ del padre
  capabilitiesAllowed: json('capabilities_allowed').notNull(),  // ⊆ del padre
  budgetMaxTokens: bigint('budget_max_tokens', { mode: 'number' }).notNull(),
  budgetMaxCostUsd: int('budget_max_cost_usd_cents').notNull(),
  budgetMaxActions: int('budget_max_actions').notNull(),
  budgetMaxDurationSeconds: int('budget_max_duration_seconds').notNull(),
  ttlSeconds: int('ttl_seconds').notNull(),
  
  taskDescription: text('task_description').notNull(),
  
  // Emisor
  issuedByAgentId: varchar('issued_by_agent_id', { length: 64 }).notNull(),
  issuedByPublicKey: varchar('issued_by_public_key', { length: 128 }).notNull(),
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  
  isActive: boolean('is_active').notNull().default(true),
  revokedAt: timestamp('revoked_at'),
  
  canonicalHash: varchar('canonical_hash', { length: 64 }).notNull(),
  signature: varchar('signature', { length: 128 }).notNull(),
  
  // Profundidad: 1 = sub directo del root, 2 = sub-de-sub. v0.1 cap = 2.
  depth: int('depth').notNull(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Reglas operativas:**

- INSERT solo si verificador de atenuación monotónica pasa: `domainScope ⊆ parent.domainScope`, `capabilitiesAllowed ⊆ parent.capabilitiesAllowed`, presupuestos `≤` parent, `ttl ≤ parent.remaining_ttl`.
- INSERT solo si `depth ≤ 2` en v0.1 (cap configurable).
- INSERT solo si firma del agente emisor verifica.

---

## 3. Tabla 3 — `mission_capsules`

Misiones estructuradas que el operador autoriza vía envelope.

```typescript
export const missionCapsules = mysqlTable('mission_capsules', {
  missionId: varchar('mission_id', { length: 36 }).primaryKey(),
  
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  acceptanceCriteria: json('acceptance_criteria').notNull(),  // string[]
  
  // Contexto
  domain: varchar('domain', { length: 100 }).notNull(),  // ej: "tablero-campana", "ticketlike-staging"
  initiatedBy: varchar('initiated_by', { length: 64 }).notNull(),  // operator_open_id u "auto"
  
  // Resultado
  outcome: varchar('outcome', { length: 20 }),  // 'success', 'failure', 'revoked', 'timeout', 'in_progress'
  outcomeReason: text('outcome_reason'),
  outcomeReceiptHash: varchar('outcome_receipt_hash', { length: 64 }),  // hash del receipt de cierre
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
});
```

---

## 4. Tabla 4 — `capability_tokens`

Tokens corto-vivos emitidos por el gateway por cada tool call autorizado.

```typescript
export const capabilityTokens = mysqlTable('capability_tokens', {
  tokenId: varchar('token_id', { length: 36 }).primaryKey(),
  envelopeId: varchar('envelope_id', { length: 36 }).notNull(),  // root o sub
  envelopeType: varchar('envelope_type', { length: 10 }).notNull(),  // 'root' | 'sub'
  
  capability: varchar('capability', { length: 100 }).notNull(),  // ej: "write_branch", "deploy_staging"
  resource: varchar('resource', { length: 200 }).notNull(),  // recurso específico
  
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),  // típico TTL = 60s
  
  consumedAt: timestamp('consumed_at'),  // se marca cuando el agente lo usa
  consumedByActionHash: varchar('consumed_by_action_hash', { length: 64 }),
  
  signature: varchar('signature', { length: 128 }).notNull(),  // firma del gateway
});
```

---

## 5. Tabla 5 — `policy_decisions`

Cada decisión del policy engine queda registrada para auditoría.

```typescript
export const policyDecisions = mysqlTable('policy_decisions', {
  decisionId: varchar('decision_id', { length: 36 }).primaryKey(),
  
  envelopeId: varchar('envelope_id', { length: 36 }).notNull(),
  envelopeType: varchar('envelope_type', { length: 10 }).notNull(),
  
  toolCallInputHash: varchar('tool_call_input_hash', { length: 64 }).notNull(),
  capability: varchar('capability', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 200 }).notNull(),
  
  decision: varchar('decision', { length: 10 }).notNull(),  // 'allow' | 'deny'
  reasonChain: json('reason_chain').notNull(),  // string[] explicando cada paso
  
  oracleReadingsConsulted: json('oracle_readings_consulted'),  // array de IDs
  
  decidedAt: timestamp('decided_at').notNull().defaultNow(),
  decidedByEngineVersion: varchar('decided_by_engine_version', { length: 20 }).notNull(),
});
```

---

## 6. Tabla 6 — `oracle_readings`

Lecturas firmadas de oracles externos verificables.

```typescript
export const oracleReadings = mysqlTable('oracle_readings', {
  readingId: varchar('reading_id', { length: 36 }).primaryKey(),
  
  oracleId: varchar('oracle_id', { length: 100 }).notNull(),  // ej: "github_ci_status:tablero-campana:main"
  
  value: json('value').notNull(),  // tipado por oracle
  
  signedBy: varchar('signed_by', { length: 128 }).notNull(),  // public key del oracle source
  signedAt: timestamp('signed_at').notNull().defaultNow(),
  validUntil: timestamp('valid_until').notNull(),
  
  hash: varchar('hash', { length: 64 }).notNull(),  // SHA-256 del payload canónico
  signature: varchar('signature', { length: 128 }).notNull(),
});
```

**Reglas:**

- INSERT solo. No UPDATE/DELETE.
- Gateway consulta `latest valid reading WHERE oracle_id = X AND validUntil > NOW()`.
- Si no hay reading válido, oracle gate falla → deny automático.

---

## 7. Tabla 7 — `revocation_events`

Eventos de revocación firmados.

```typescript
export const revocationEvents = mysqlTable('revocation_events', {
  eventId: varchar('event_id', { length: 36 }).primaryKey(),
  
  envelopeId: varchar('envelope_id', { length: 36 }).notNull(),
  envelopeType: varchar('envelope_type', { length: 10 }).notNull(),
  
  revokedAt: timestamp('revoked_at').notNull().defaultNow(),
  reason: text('reason').notNull(),
  triggeredBy: varchar('triggered_by', { length: 30 }).notNull(),  // 'operator' | 'oracle_violation' | 'auto_budget' | 'auto_ttl' | 'manual_admin'
  
  triggeredByPublicKey: varchar('triggered_by_public_key', { length: 128 }).notNull(),
  signature: varchar('signature', { length: 128 }).notNull(),
});
```

---

## 8. Tabla 8 — `evidence_receipts`

Cadena Merkle append-only de receipts firmados por el agente tras cada acción.

```typescript
export const evidenceReceipts = mysqlTable('evidence_receipts', {
  receiptId: varchar('receipt_id', { length: 36 }).primaryKey(),
  
  envelopeId: varchar('envelope_id', { length: 36 }).notNull(),  // root
  subEnvelopeId: varchar('sub_envelope_id', { length: 36 }),  // si la acción se ejecutó bajo sub
  capabilityTokenId: varchar('capability_token_id', { length: 36 }).notNull(),  // FK a capability_tokens
  
  // Cadena Merkle
  parentReceiptHash: varchar('parent_receipt_hash', { length: 64 }),  // null si es receipt 0
  merkleHash: varchar('merkle_hash', { length: 64 }).notNull(),  // hash incluyendo parent
  
  // Acción
  actionType: varchar('action_type', { length: 50 }).notNull(),  // ej: "git_commit", "deploy_staging", "test_run", "planning"
  inputHash: varchar('input_hash', { length: 64 }).notNull(),
  outputHash: varchar('output_hash', { length: 64 }),  // null si la acción aún no produjo output
  outcome: varchar('outcome', { length: 20 }).notNull(),  // 'success' | 'failure' | 'partial'
  
  // Costos
  tokensConsumed: int('tokens_consumed').default(0),
  costUsdCents: int('cost_usd_cents').default(0),
  durationMs: int('duration_ms').default(0),
  
  // Tiempo
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
  
  // Firma del agente
  signedByAgentId: varchar('signed_by_agent_id', { length: 64 }).notNull(),
  signedByPublicKey: varchar('signed_by_public_key', { length: 128 }).notNull(),
  signature: varchar('signature', { length: 128 }).notNull(),
});
```

**Reglas críticas:**

- INSERT solo. No UPDATE/DELETE jamás.
- Trigger pre-insert verifica `parentReceiptHash === sha256(canonical_json(parent_receipt))`.
- Cualquier intento de break del Merkle chain rechaza la inserción.

---

## 9. Migración Drizzle completa

```typescript
// drizzle/schema.ts (archivo completo a agregar al final)

// ... (imports y tablas existentes del template) ...

// ============================================================
// FORJA OS v4 — Authority Envelopes Kernel
// ============================================================

export const rootAuthorityEnvelopes = mysqlTable('root_authority_envelopes', {
  envelopeId: varchar('envelope_id', { length: 36 }).primaryKey(),
  operatorOpenId: varchar('operator_open_id', { length: 64 }).notNull(),
  operatorPublicKey: varchar('operator_public_key', { length: 128 }).notNull(),
  missionCapsuleId: varchar('mission_capsule_id', { length: 36 }).notNull(),
  domainScope: json('domain_scope').notNull(),
  powerLaneMax: int('power_lane_max').notNull(),
  capabilitiesAllowed: json('capabilities_allowed').notNull(),
  capabilitiesDenied: json('capabilities_denied').notNull(),
  prohibited: json('prohibited').notNull(),
  budgetMaxTokens: bigint('budget_max_tokens', { mode: 'number' }).notNull(),
  budgetMaxCostUsdCents: int('budget_max_cost_usd_cents').notNull(),
  budgetMaxActions: int('budget_max_actions').notNull(),
  budgetMaxDurationSeconds: int('budget_max_duration_seconds').notNull(),
  oracleGates: json('oracle_gates').notNull(),
  rollbackRequired: boolean('rollback_required').notNull().default(true),
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  ttlSeconds: int('ttl_seconds').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  revokedAt: timestamp('revoked_at'),
  revokedReason: text('revoked_reason'),
  canonicalHash: varchar('canonical_hash', { length: 64 }).notNull(),
  signature: varchar('signature', { length: 128 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const subEnvelopes = mysqlTable('sub_envelopes', {
  subEnvelopeId: varchar('sub_envelope_id', { length: 36 }).primaryKey(),
  rootEnvelopeId: varchar('root_envelope_id', { length: 36 }).notNull(),
  parentEnvelopeId: varchar('parent_envelope_id', { length: 36 }).notNull(),
  parentHash: varchar('parent_hash', { length: 64 }).notNull(),
  domainScope: json('domain_scope').notNull(),
  capabilitiesAllowed: json('capabilities_allowed').notNull(),
  budgetMaxTokens: bigint('budget_max_tokens', { mode: 'number' }).notNull(),
  budgetMaxCostUsdCents: int('budget_max_cost_usd_cents').notNull(),
  budgetMaxActions: int('budget_max_actions').notNull(),
  budgetMaxDurationSeconds: int('budget_max_duration_seconds').notNull(),
  ttlSeconds: int('ttl_seconds').notNull(),
  taskDescription: text('task_description').notNull(),
  issuedByAgentId: varchar('issued_by_agent_id', { length: 64 }).notNull(),
  issuedByPublicKey: varchar('issued_by_public_key', { length: 128 }).notNull(),
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  revokedAt: timestamp('revoked_at'),
  canonicalHash: varchar('canonical_hash', { length: 64 }).notNull(),
  signature: varchar('signature', { length: 128 }).notNull(),
  depth: int('depth').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const missionCapsules = mysqlTable('mission_capsules', {
  missionId: varchar('mission_id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description').notNull(),
  acceptanceCriteria: json('acceptance_criteria').notNull(),
  domain: varchar('domain', { length: 100 }).notNull(),
  initiatedBy: varchar('initiated_by', { length: 64 }).notNull(),
  outcome: varchar('outcome', { length: 20 }),
  outcomeReason: text('outcome_reason'),
  outcomeReceiptHash: varchar('outcome_receipt_hash', { length: 64 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  closedAt: timestamp('closed_at'),
});

export const capabilityTokens = mysqlTable('capability_tokens', {
  tokenId: varchar('token_id', { length: 36 }).primaryKey(),
  envelopeId: varchar('envelope_id', { length: 36 }).notNull(),
  envelopeType: varchar('envelope_type', { length: 10 }).notNull(),
  capability: varchar('capability', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 200 }).notNull(),
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  consumedAt: timestamp('consumed_at'),
  consumedByActionHash: varchar('consumed_by_action_hash', { length: 64 }),
  signature: varchar('signature', { length: 128 }).notNull(),
});

export const policyDecisions = mysqlTable('policy_decisions', {
  decisionId: varchar('decision_id', { length: 36 }).primaryKey(),
  envelopeId: varchar('envelope_id', { length: 36 }).notNull(),
  envelopeType: varchar('envelope_type', { length: 10 }).notNull(),
  toolCallInputHash: varchar('tool_call_input_hash', { length: 64 }).notNull(),
  capability: varchar('capability', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 200 }).notNull(),
  decision: varchar('decision', { length: 10 }).notNull(),
  reasonChain: json('reason_chain').notNull(),
  oracleReadingsConsulted: json('oracle_readings_consulted'),
  decidedAt: timestamp('decided_at').notNull().defaultNow(),
  decidedByEngineVersion: varchar('decided_by_engine_version', { length: 20 }).notNull(),
});

export const oracleReadings = mysqlTable('oracle_readings', {
  readingId: varchar('reading_id', { length: 36 }).primaryKey(),
  oracleId: varchar('oracle_id', { length: 100 }).notNull(),
  value: json('value').notNull(),
  signedBy: varchar('signed_by', { length: 128 }).notNull(),
  signedAt: timestamp('signed_at').notNull().defaultNow(),
  validUntil: timestamp('valid_until').notNull(),
  hash: varchar('hash', { length: 64 }).notNull(),
  signature: varchar('signature', { length: 128 }).notNull(),
});

export const revocationEvents = mysqlTable('revocation_events', {
  eventId: varchar('event_id', { length: 36 }).primaryKey(),
  envelopeId: varchar('envelope_id', { length: 36 }).notNull(),
  envelopeType: varchar('envelope_type', { length: 10 }).notNull(),
  revokedAt: timestamp('revoked_at').notNull().defaultNow(),
  reason: text('reason').notNull(),
  triggeredBy: varchar('triggered_by', { length: 30 }).notNull(),
  triggeredByPublicKey: varchar('triggered_by_public_key', { length: 128 }).notNull(),
  signature: varchar('signature', { length: 128 }).notNull(),
});

export const evidenceReceipts = mysqlTable('evidence_receipts', {
  receiptId: varchar('receipt_id', { length: 36 }).primaryKey(),
  envelopeId: varchar('envelope_id', { length: 36 }).notNull(),
  subEnvelopeId: varchar('sub_envelope_id', { length: 36 }),
  capabilityTokenId: varchar('capability_token_id', { length: 36 }).notNull(),
  parentReceiptHash: varchar('parent_receipt_hash', { length: 64 }),
  merkleHash: varchar('merkle_hash', { length: 64 }).notNull(),
  actionType: varchar('action_type', { length: 50 }).notNull(),
  inputHash: varchar('input_hash', { length: 64 }).notNull(),
  outputHash: varchar('output_hash', { length: 64 }),
  outcome: varchar('outcome', { length: 20 }).notNull(),
  tokensConsumed: int('tokens_consumed').default(0),
  costUsdCents: int('cost_usd_cents').default(0),
  durationMs: int('duration_ms').default(0),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at').notNull().defaultNow(),
  signedByAgentId: varchar('signed_by_agent_id', { length: 64 }).notNull(),
  signedByPublicKey: varchar('signed_by_public_key', { length: 128 }).notNull(),
  signature: varchar('signature', { length: 128 }).notNull(),
});
```

---

## 10. Tipos TypeScript canónicos

```typescript
// shared/forja-types.ts

import { z } from 'zod';

export const PowerLane = z.number().int().min(0).max(6);
export type PowerLane = z.infer<typeof PowerLane>;

export const DomainScopeSchema = z.object({
  repos: z.array(z.string()),
  envs: z.array(z.string()),
  resources: z.array(z.string()),
});
export type DomainScope = z.infer<typeof DomainScopeSchema>;

export const ProhibitedActionSchema = z.object({
  category: z.enum([
    'production_deploy',
    'customer_data_access',
    'root_credentials',
    'public_communication',
    'price_modification',
    'database_destructive',
    'self_modification',
  ]),
  description: z.string(),
});
export type ProhibitedAction = z.infer<typeof ProhibitedActionSchema>;

export const OracleGateSchema = z.object({
  oracleId: z.string(),
  condition: z.string(),  // ej: "value === 'green'", "value < 100"
});
export type OracleGate = z.infer<typeof OracleGateSchema>;

export const BudgetSchema = z.object({
  maxTokens: z.number().int().positive(),
  maxCostUsdCents: z.number().int().positive(),
  maxActions: z.number().int().positive(),
  maxDurationSeconds: z.number().int().positive(),
});
export type Budget = z.infer<typeof BudgetSchema>;

export const RootAuthorityEnvelopeSchema = z.object({
  envelopeId: z.string().uuid(),
  operatorOpenId: z.string(),
  operatorPublicKey: z.string().length(64),  // hex 32 bytes
  
  missionCapsuleId: z.string().uuid(),
  domainScope: DomainScopeSchema,
  
  powerLaneMax: PowerLane,
  capabilitiesAllowed: z.array(z.string()),
  capabilitiesDenied: z.array(z.string()),
  prohibited: z.array(ProhibitedActionSchema),
  
  budget: BudgetSchema,
  oracleGates: z.array(OracleGateSchema),
  rollbackRequired: z.boolean(),
  
  issuedAt: z.string().datetime(),
  ttlSeconds: z.number().int().positive(),
  
  canonicalHash: z.string().length(64),
  signature: z.string().length(128),
});
export type RootAuthorityEnvelope = z.infer<typeof RootAuthorityEnvelopeSchema>;
```

---

## 11. Validadores server-side críticos

### 11.1 `verifyEnvelopeSignature(envelope)`

```typescript
import { sha256 } from '@noble/hashes/sha256';
import { ed25519 } from '@noble/curves/ed25519';

export function canonicalJsonStringify(obj: any): string {
  // JSON canónico: keys ordenadas alfabéticamente, sin whitespace
  const sortKeys = (o: any): any => {
    if (Array.isArray(o)) return o.map(sortKeys);
    if (o && typeof o === 'object') {
      return Object.keys(o).sort().reduce((acc, k) => {
        acc[k] = sortKeys(o[k]);
        return acc;
      }, {} as any);
    }
    return o;
  };
  return JSON.stringify(sortKeys(obj));
}

export function computeEnvelopeHash(envelope: Omit<RootAuthorityEnvelope, 'signature' | 'canonicalHash'>): string {
  const canonical = canonicalJsonStringify(envelope);
  const hashBytes = sha256(new TextEncoder().encode(canonical));
  return Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function verifyEnvelopeSignature(envelope: RootAuthorityEnvelope): boolean {
  // 1. Verificar que canonicalHash es el hash correcto
  const { signature, canonicalHash, ...envelopeForHash } = envelope;
  const computedHash = computeEnvelopeHash(envelopeForHash as any);
  if (computedHash !== canonicalHash) return false;
  
  // 2. Verificar firma ed25519
  const publicKeyBytes = Buffer.from(envelope.operatorPublicKey, 'hex');
  const signatureBytes = Buffer.from(signature, 'hex');
  const messageBytes = Buffer.from(canonicalHash, 'hex');
  
  return ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
}
```

### 11.2 `verifyAttenuationMonotonic(parent, child)`

```typescript
export function verifyAttenuationMonotonic(
  parent: RootAuthorityEnvelope | SubEnvelope,
  child: SubEnvelope
): { ok: boolean; reason?: string } {
  // Domain scope debe ser ⊆
  if (!isSubsetOf(child.domainScope.repos, parent.domainScope.repos)) {
    return { ok: false, reason: 'child.domainScope.repos exceeds parent' };
  }
  if (!isSubsetOf(child.domainScope.envs, parent.domainScope.envs)) {
    return { ok: false, reason: 'child.domainScope.envs exceeds parent' };
  }
  if (!isSubsetOf(child.domainScope.resources, parent.domainScope.resources)) {
    return { ok: false, reason: 'child.domainScope.resources exceeds parent' };
  }
  
  // Capabilities ⊆
  if (!isSubsetOf(child.capabilitiesAllowed, parent.capabilitiesAllowed)) {
    return { ok: false, reason: 'child.capabilitiesAllowed exceeds parent' };
  }
  
  // Budgets ≤
  if (child.budgetMaxTokens > parent.budgetMaxTokens) {
    return { ok: false, reason: 'child budget tokens exceeds parent' };
  }
  if (child.budgetMaxCostUsdCents > parent.budgetMaxCostUsdCents) {
    return { ok: false, reason: 'child budget cost exceeds parent' };
  }
  if (child.budgetMaxActions > parent.budgetMaxActions) {
    return { ok: false, reason: 'child budget actions exceeds parent' };
  }
  
  // TTL ≤ remaining ttl del padre
  const parentRemainingMs = new Date(parent.expiresAt).getTime() - Date.now();
  const childTtlMs = child.ttlSeconds * 1000;
  if (childTtlMs > parentRemainingMs) {
    return { ok: false, reason: 'child TTL exceeds parent remaining TTL' };
  }
  
  // Depth cap (v0.1: max 2)
  if (child.depth > 2) {
    return { ok: false, reason: 'depth exceeds v0.1 cap of 2' };
  }
  
  return { ok: true };
}

function isSubsetOf<T>(child: T[], parent: T[]): boolean {
  const parentSet = new Set(parent);
  return child.every(item => parentSet.has(item));
}
```

### 11.3 `gatewayAuthorize(toolCall, envelopeId)`

Algoritmo central. Implementación completa en sprint plan §5 Primitiva 9.

---

## 12. Tests requeridos del schema

```typescript
// server/_core/forja/schema.test.ts
import { describe, it, expect } from 'vitest';

describe('Forja v4 schema', () => {
  it('all 8 tables exist', async () => {
    const tables = await db.execute(sql`SHOW TABLES`);
    const tableNames = tables.map(t => Object.values(t)[0]);
    expect(tableNames).toContain('root_authority_envelopes');
    expect(tableNames).toContain('sub_envelopes');
    expect(tableNames).toContain('mission_capsules');
    expect(tableNames).toContain('capability_tokens');
    expect(tableNames).toContain('policy_decisions');
    expect(tableNames).toContain('oracle_readings');
    expect(tableNames).toContain('revocation_events');
    expect(tableNames).toContain('evidence_receipts');
  });
  
  it('envelope insert with valid signature succeeds', async () => { /* ... */ });
  it('envelope insert with invalid signature throws', async () => { /* ... */ });
  it('sub_envelope with monotonic attenuation succeeds', async () => { /* ... */ });
  it('sub_envelope with scope expansion fails', async () => { /* ... */ });
  it('evidence_receipt without parent_hash fails (after first)', async () => { /* ... */ });
});
```

---

## 13. Próximos pasos del sprint

Con este schema commiteado y migrado:

1. Día 0 — pre-flight checklist arranca con `pnpm db:push` que aplica las 8 tablas.
2. Implementar validadores server-side (`server/_core/forja/`).
3. Implementar BoundaryGateway con algoritmo `gatewayAuthorize`.
4. Tests `pnpm test forja-kernel` cubren signature + atenuación + Merkle chain.
5. Día 1 puede arrancar.

---

**Firmado por:** Manus AI como autor técnico  
**Aprobado por:** Alfredo Góngora (decisiones A=SÍ B=SÍ ya recibidas)  
**Pendiente:** Hash canónico de la migración + commit en branch `design/forja-os-sovereign-agentic-fabric`

Fin del schema canónico v4.
