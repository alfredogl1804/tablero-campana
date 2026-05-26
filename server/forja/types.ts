/**
 * Forja v4 — Tipos canónicos compartidos.
 *
 * Estos tipos definen la forma exacta del envelope firmado por el operador.
 * Deben coincidir byte-a-byte con scripts/forja/keygen-and-sign.mjs.
 */

/** Power Lane levels (L0-L6). L3 es operación normal staging. */
export type PowerLaneLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface DomainScope {
  repos: string[];
  envs: string[];
  resources: string[];
}

export interface OracleGate {
  oracleId: string;
  condition: string;
}

export interface ProhibitedAction {
  category: string;
  description: string;
}

export interface EnvelopeBudget {
  maxTokens: number;
  maxCostUsdCents: number;
  maxActions: number;
  maxDurationSeconds: number;
}

/**
 * Authority Envelope raíz — el payload que el operador firma con ed25519.
 * Las firmas son válidas sobre el SHA-256 del canonical JSON de este objeto
 * SIN los campos `signature` y `canonicalHash` (que se añaden post-firma).
 */
export interface AuthorityEnvelopePayload {
  envelopeId: string;
  operatorOpenId: string;
  operatorPublicKey: string;
  missionCapsuleId: string;
  domainScope: DomainScope;
  powerLaneMax: PowerLaneLevel;
  capabilitiesAllowed: string[];
  capabilitiesDenied: string[];
  prohibited: ProhibitedAction[];
  budget: EnvelopeBudget;
  oracleGates: OracleGate[];
  rollbackRequired: boolean;
  issuedAt: string; // ISO 8601
  ttlSeconds: number;
  expiresAt: string; // ISO 8601
}

export interface SignedAuthorityEnvelope extends AuthorityEnvelopePayload {
  canonicalHash: string;
  signature: string;
}

/** Resultado de gatewayAuthorize: allow/deny + detalle. */
export type GatewayDecision =
  | {
      decision: "allow";
      tokenId: string;
      tokenSignature: string;
      expiresAt: Date;
      reasons: string[];
    }
  | {
      decision: "deny";
      reasons: string[];
      violations: GatewayViolation[];
    };

export type GatewayViolation =
  | "envelope_not_found"
  | "envelope_expired"
  | "envelope_revoked"
  | "envelope_signature_invalid"
  | "capability_denied_explicit"
  | "capability_not_allowed"
  | "resource_out_of_scope"
  | "power_lane_exceeded"
  | "budget_tokens_exceeded"
  | "budget_cost_exceeded"
  | "budget_actions_exceeded"
  | "budget_duration_exceeded"
  | "oracle_gate_failed"
  | "depth_exceeded"
  | "prohibited_action"
  | "internal_error";

/** Request al gateway por parte de un agente antes de cada tool call. */
export interface GatewayAuthorizeRequest {
  envelopeId: string;
  envelopeType: "root" | "sub";
  capability: string;
  resource: string;
  powerLaneRequested: PowerLaneLevel;
  estimatedTokens?: number;
  estimatedCostUsdCents?: number;
  estimatedDurationSeconds?: number;
  toolCallInputHash: string;
}
