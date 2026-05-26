/**
 * Forja v4 — Ed25519 Signature Verification (server-side)
 *
 * Mantiene paridad criptográfica con scripts/forja/keygen-and-sign.mjs (cliente).
 * Una firma generada en la Mac del operador DEBE verificar verdadera aquí.
 *
 * Library: @noble/curves v2 ed25519 (mismo módulo usado en client).
 */

import { ed25519 } from "@noble/curves/ed25519.js";

/**
 * Verify ed25519 signature.
 *
 * @param messageHashHex - Hex string SHA-256 hash of canonical payload (64 chars)
 * @param signatureHex   - Hex string ed25519 signature (128 chars)
 * @param publicKeyHex   - Hex string ed25519 public key (64 chars)
 * @returns true if signature is valid, false otherwise (no exceptions for invalid sigs)
 */
export function verifyEd25519(
  messageHashHex: string,
  signatureHex: string,
  publicKeyHex: string,
): boolean {
  if (typeof messageHashHex !== "string" || messageHashHex.length !== 64) {
    return false;
  }
  if (typeof signatureHex !== "string" || signatureHex.length !== 128) {
    return false;
  }
  if (typeof publicKeyHex !== "string" || publicKeyHex.length !== 64) {
    return false;
  }

  try {
    const messageBytes = hexToBytes(messageHashHex);
    const signatureBytes = hexToBytes(signatureHex);
    const publicKeyBytes = hexToBytes(publicKeyHex);

    return ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

/**
 * Convert hex string to Uint8Array (without prefix). Strict validation.
 */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("hexToBytes: odd-length hex string");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error(`hexToBytes: invalid hex char at position ${i * 2}`);
    }
    bytes[i] = byte;
  }
  return bytes;
}

/**
 * Compute ed25519 public key from private key (32 bytes raw).
 * Solo necesario si el server alguna vez firma; los agentes Forja firman
 * con su propia llave (no la del operador). Útil para tests.
 */
export function ed25519PublicKeyFromPrivate(privateKeyHex: string): string {
  if (privateKeyHex.length !== 64) {
    throw new Error("ed25519PublicKeyFromPrivate: private key must be 64 hex chars (32 bytes)");
  }
  const privateBytes = hexToBytes(privateKeyHex);
  const publicBytes = ed25519.getPublicKey(privateBytes);
  return bytesToHex(publicBytes);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
