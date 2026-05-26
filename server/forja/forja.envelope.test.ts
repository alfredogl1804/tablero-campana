/**
 * Forja v4 — Authority Envelope Verification Tests
 *
 * Tests críticos:
 * 1. Canonical hash determinista (mismo input → mismo hash)
 * 2. Verificación de firma ed25519 del envelope piloto real (Día 0)
 * 3. Detectar tampering: cambiar 1 bit del envelope debe fallar verify
 * 4. Detectar pubkey diferente: firma válida con pubkey equivocada debe fallar
 *
 * El envelope piloto fue firmado en /Users/alfredogongora/.monstruo/
 * con llave operador `cbfd8895990a57fb9155b55ec817b5d92cfbf3416d83fb0712afbc58b4b5b064`.
 * Este test verifica que el server reproduce la verificación cliente byte-a-byte.
 */

import { describe, it, expect } from "vitest";
import { canonicalize, canonicalHash } from "./canonical.js";
import { verifyEd25519 } from "./ed25519.js";

describe("Forja v4 canonical JSON", () => {
  it("orders object keys lexicographically", () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { m: 3, a: 2, z: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
    expect(canonicalize(a)).toBe('{"a":2,"m":3,"z":1}');
  });

  it("preserves array order", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("handles nested structures deterministically", () => {
    const a = { outer: { z: [1, 2], a: 3 } };
    const b = { outer: { a: 3, z: [1, 2] } };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });

  it("filters undefined values", () => {
    const obj = { a: 1, b: undefined, c: 3 };
    expect(canonicalize(obj)).toBe('{"a":1,"c":3}');
  });

  it("throws on unsupported types", () => {
    expect(() => canonicalize(BigInt(1))).toThrow();
    expect(() => canonicalize(new Date())).toThrow();
  });

  it("computes consistent SHA-256 hash", () => {
    const obj = { foo: "bar", n: 42 };
    const h1 = canonicalHash(obj);
    const h2 = canonicalHash({ n: 42, foo: "bar" });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("Forja v4 ed25519 verification", () => {
  // Operador key: cbfd8895990a57fb9155b55ec817b5d92cfbf3416d83fb0712afbc58b4b5b064
  // Fingerprint:  ec0f16749dd527a5
  const OPERATOR_PUBLIC_KEY =
    "cbfd8895990a57fb9155b55ec817b5d92cfbf3416d83fb0712afbc58b4b5b064";

  it("rejects malformed inputs without throwing", () => {
    expect(verifyEd25519("", "", "")).toBe(false);
    expect(verifyEd25519("short", "alsoshort", "tooshort")).toBe(false);
    expect(verifyEd25519("Z".repeat(64), "0".repeat(128), OPERATOR_PUBLIC_KEY)).toBe(false);
  });

  it("rejects valid-shaped but tampered signature", () => {
    const messageHash = "1e179e2c65bdd9e98e2f8c63845a4ead0249812e929932a2665d49675f52543b";
    // Original signature pero con el primer byte flipped
    const tamperedSig =
      "ff040071a2fa2335120dfd1574a280603baaae1f05a2d3e282b4ddaa15e6292c2db95818e4290d59205198ee43bb5ed64f67cd5d3a13a45aabd874e251428704";
    expect(verifyEd25519(messageHash, tamperedSig, OPERATOR_PUBLIC_KEY)).toBe(false);
  });

  it("verifies the real piloto envelope signature (Día 0 firma soberana)", () => {
    // Datos exactos del envelope piloto firmado en Mac del operador
    // Archivo: /Users/alfredogongora/Downloads/envelope-piloto-day2-signed.json
    const messageHash =
      "1e179e2c65bdd9e98e2f8c63845a4ead0249812e929932a2665d49675f52543b";
    const signature =
      "01040071a2fa2335120dfd1574a280603baaae1f05a2d3e282b4ddaa15e6292c2db95818e4290d59205198ee43bb5ed64f67cd5d3a13a45aabd874e251428704";

    const valid = verifyEd25519(messageHash, signature, OPERATOR_PUBLIC_KEY);
    expect(valid).toBe(true);
  });

  it("rejects valid signature with WRONG public key", () => {
    const messageHash =
      "1e179e2c65bdd9e98e2f8c63845a4ead0249812e929932a2665d49675f52543b";
    const signature =
      "01040071a2fa2335120dfd1574a280603baaae1f05a2d3e282b4ddaa15e6292c2db95818e4290d59205198ee43bb5ed64f67cd5d3a13a45aabd874e251428704";
    // Pubkey aleatoria (no la del operador)
    const wrongKey = "0".repeat(64);

    expect(verifyEd25519(messageHash, signature, wrongKey)).toBe(false);
  });

  it("rejects signature for DIFFERENT message hash", () => {
    // Hash diferente al firmado
    const wrongHash = "0".repeat(64);
    const signature =
      "01040071a2fa2335120dfd1574a280603baaae1f05a2d3e282b4ddaa15e6292c2db95818e4290d59205198ee43bb5ed64f67cd5d3a13a45aabd874e251428704";

    expect(verifyEd25519(wrongHash, signature, OPERATOR_PUBLIC_KEY)).toBe(false);
  });
});
