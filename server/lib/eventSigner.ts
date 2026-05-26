/**
 * eventSigner — firmador y verificador ed25519 de eventos del bus del observatorio.
 *
 * Doctrina v1.1 §3.1 (UNÁNIME 5/5 sabios):
 *   Todo evento publicado al bus debe llevar:
 *     - signature_ed25519: base64 de la firma
 *     - event_hash_canonical: sha256 del payload canonicalizado
 *     - agent_key_id: id de la pubkey que firmó
 *
 * El payload se canonicaliza ordenando claves alfabéticamente (RFC 8785-like)
 * antes de hashear y firmar. El verificador re-canonicaliza para detectar
 * tampering aunque el JSON visual cambie de orden.
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "node:crypto";

// ── Canonicalización ────────────────────────────────────────────────────

/**
 * Convierte un valor a JSON canonicalizado: claves ordenadas alfabéticamente,
 * sin whitespace extra. Compatible con la canonical_jsonb del Postgres.
 */
export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys.map(
      (k) => JSON.stringify(k) + ":" + canonicalize(obj[k]),
    );
    return "{" + parts.join(",") + "}";
  }
  return JSON.stringify(value);
}

// ── Hash ────────────────────────────────────────────────────────────────

/**
 * Hash sha256 hex del JSON canonicalizado.
 * Este es el `event_hash_canonical` que va a la columna de la DB.
 */
export function hashCanonical(payload: unknown): string {
  return createHash("sha256").update(canonicalize(payload)).digest("hex");
}

// ── Firma ───────────────────────────────────────────────────────────────

export interface SignedEvent {
  payload: unknown;
  event_hash_canonical: string;
  signature_ed25519: string;
  agent_key_id: string;
}

/** Firma un payload con la privada ed25519 del observatorio. */
export function signEvent(
  payload: unknown,
  privateKeyPem: string,
  agentKeyId: string,
): SignedEvent {
  const hash = hashCanonical(payload);
  const privateKey = createPrivateKey({ key: privateKeyPem, format: "pem" });

  // ed25519: sign() recibe el message directamente, no el hash.
  // Firmamos el canonical_json para que sea reproducible.
  const signature = sign(null, Buffer.from(canonicalize(payload), "utf-8"), privateKey);

  return {
    payload,
    event_hash_canonical: hash,
    signature_ed25519: signature.toString("base64"),
    agent_key_id: agentKeyId,
  };
}

/** Verifica una firma ed25519 contra una pubkey conocida. */
export function verifySignature(
  payload: unknown,
  signatureBase64: string,
  publicKeyPem: string,
): boolean {
  try {
    const publicKey = createPublicKey({ key: publicKeyPem, format: "pem" });
    const signatureBytes = Buffer.from(signatureBase64, "base64");
    return verify(
      null,
      Buffer.from(canonicalize(payload), "utf-8"),
      publicKey,
      signatureBytes,
    );
  } catch {
    return false;
  }
}

/**
 * Verifica un evento completo: hash + firma + key_id en allowlist.
 * Esta es la función que usa el observatorio antes de renderizar.
 */
export function verifyEvent(
  event: SignedEvent,
  allowedKeys: Map<string, string>,
): { valid: boolean; reason?: string } {
  // 1. Hash debe coincidir con el payload actual.
  const computedHash = hashCanonical(event.payload);
  if (computedHash !== event.event_hash_canonical) {
    return { valid: false, reason: "hash_mismatch" };
  }

  // 2. agent_key_id debe estar en la allowlist.
  const pubKey = allowedKeys.get(event.agent_key_id);
  if (!pubKey) {
    return { valid: false, reason: "unknown_key_id" };
  }

  // 3. Firma debe verificar contra la pubkey.
  if (!verifySignature(event.payload, event.signature_ed25519, pubKey)) {
    return { valid: false, reason: "invalid_signature" };
  }

  return { valid: true };
}

// ── Helpers para env ────────────────────────────────────────────────────

/**
 * Algunos sistemas de inyección de secrets transforman los newlines reales
 * en la secuencia literal `\n`. Esta función lo revierte para que el PEM
 * sea parseable por createPrivateKey/createPublicKey.
 */
function normalizePem(pem: string): string {
  return pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
}

export function getSignerFromEnv(): {
  privatePem: string;
  publicPem: string;
  keyId: string;
} {
  const privatePem = process.env.OBSERVATORIO_SIGNER_PRIVATE_PEM;
  const publicPem = process.env.OBSERVATORIO_SIGNER_PUBLIC_PEM;
  const keyId = process.env.OBSERVATORIO_SIGNER_KEY_ID;

  if (!privatePem || !publicPem || !keyId) {
    throw new Error(
      "Observatorio signer no configurado: faltan OBSERVATORIO_SIGNER_PRIVATE_PEM / PUBLIC_PEM / KEY_ID",
    );
  }

  return {
    privatePem: normalizePem(privatePem),
    publicPem: normalizePem(publicPem),
    keyId,
  };
}
