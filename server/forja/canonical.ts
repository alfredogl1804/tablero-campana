/**
 * Forja v4 — Canonical JSON Serialization (RFC 8785 JCS-compatible subset)
 *
 * Determinismo total para hashing reproducible. Misma semántica que el cliente
 * scripts/forja/keygen-and-sign.mjs (canonicalize) para que firmas hechas en Mac
 * verifiquen byte-a-byte en el server.
 *
 * Reglas:
 * - Objects: keys sorteadas lexicográficamente
 * - Arrays: orden preservado
 * - Strings: JSON.stringify (escape estándar UTF-16, RFC 8259)
 * - Numbers: JSON.stringify (no notación científica para enteros < 2^53)
 * - Booleans/null: literal
 * - undefined: removido (no aparece en JSON canónico)
 *
 * NO soporta: BigInt, Date, Symbol, Function, Map, Set. El operador debe
 * serializar a primitivos antes.
 */

export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const parts = value.map((item) => canonicalize(item));
    return `[${parts.join(",")}]`;
  }

  if (value instanceof Date) {
    throw new Error(
      "canonicalize: Date is not supported (serialize to ISO string or unix timestamp first)",
    );
  }
  if (value instanceof Map || value instanceof Set) {
    throw new Error("canonicalize: Map/Set are not supported (convert to plain object/array first)");
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys
      .filter((k) => obj[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`);
    return `{${parts.join(",")}}`;
  }

  throw new Error(
    `canonicalize: unsupported type ${typeof value} (BigInt, Date, Symbol, Function, Map, Set are not supported)`,
  );
}

/**
 * Compute SHA-256 hex digest of canonicalized payload.
 * Usa Node.js crypto nativo para evitar deps adicionales.
 */
import { createHash } from "node:crypto";

export function canonicalHash(value: unknown): string {
  const canonical = canonicalize(value);
  const hash = createHash("sha256").update(canonical, "utf8").digest("hex");
  return hash;
}
