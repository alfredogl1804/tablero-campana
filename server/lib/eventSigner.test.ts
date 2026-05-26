import { describe, it, expect } from "vitest";
import {
  canonicalize,
  hashCanonical,
  signEvent,
  verifySignature,
  verifyEvent,
  getSignerFromEnv,
} from "./eventSigner";

describe("canonicalize", () => {
  it("orders keys alphabetically", () => {
    expect(canonicalize({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("recursively orders nested objects", () => {
    expect(canonicalize({ b: { y: 1, x: 2 }, a: 1 })).toBe('{"a":1,"b":{"x":2,"y":1}}');
  });

  it("preserves array order", () => {
    expect(canonicalize([3, 1, 2])).toBe("[3,1,2]");
  });

  it("handles primitives", () => {
    expect(canonicalize(null)).toBe("null");
    expect(canonicalize(true)).toBe("true");
    expect(canonicalize(42)).toBe("42");
    expect(canonicalize("hola")).toBe('"hola"');
  });

  it("produces same output regardless of key insertion order", () => {
    const a = { foo: 1, bar: 2, baz: 3 };
    const b = { baz: 3, bar: 2, foo: 1 };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });
});

describe("hashCanonical", () => {
  it("produces deterministic 64-char hex", () => {
    const h = hashCanonical({ event: "test", value: 42 });
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it("same payload => same hash", () => {
    const p = { x: 1, y: 2 };
    expect(hashCanonical(p)).toBe(hashCanonical(p));
  });

  it("key order doesn't affect hash", () => {
    expect(hashCanonical({ a: 1, b: 2 })).toBe(hashCanonical({ b: 2, a: 1 }));
  });
});

describe("signEvent + verifyEvent roundtrip with REAL injected env keys", () => {
  it("env vars are injected", () => {
    expect(process.env.OBSERVATORIO_SIGNER_KEY_ID).toBeTruthy();
    expect(process.env.OBSERVATORIO_SIGNER_PRIVATE_PEM).toContain("BEGIN PRIVATE KEY");
    expect(process.env.OBSERVATORIO_SIGNER_PUBLIC_PEM).toContain("BEGIN PUBLIC KEY");
  });

  it("getSignerFromEnv returns valid keys", () => {
    const signer = getSignerFromEnv();
    expect(signer.keyId).toBe(process.env.OBSERVATORIO_SIGNER_KEY_ID);
    expect(signer.privatePem).toContain("PRIVATE KEY");
    expect(signer.publicPem).toContain("PUBLIC KEY");
  });

  it("signs and verifies a payload roundtrip", () => {
    const { privatePem, publicPem, keyId } = getSignerFromEnv();
    const payload = {
      event_type: "sprint_signed",
      source: "manus_b_thread",
      sprint_id: "S0_T2_audit_inicial",
      ts: "2026-05-26T06:00:00Z",
    };

    const signed = signEvent(payload, privatePem, keyId);

    expect(signed.signature_ed25519).toBeTruthy();
    expect(signed.signature_ed25519.length).toBeGreaterThanOrEqual(64);
    expect(signed.event_hash_canonical).toMatch(/^[a-f0-9]{64}$/);
    expect(signed.agent_key_id).toBe(keyId);

    expect(verifySignature(payload, signed.signature_ed25519, publicPem)).toBe(true);
  });

  it("verifyEvent succeeds with allowlist match", () => {
    const { privatePem, publicPem, keyId } = getSignerFromEnv();
    const payload = { event: "test", value: 99 };
    const signed = signEvent(payload, privatePem, keyId);

    const allowed = new Map([[keyId, publicPem]]);
    const result = verifyEvent(signed, allowed);
    expect(result.valid).toBe(true);
  });

  it("verifyEvent rejects unknown key_id", () => {
    const { privatePem, keyId } = getSignerFromEnv();
    const signed = signEvent({ x: 1 }, privatePem, keyId);
    const allowed = new Map<string, string>();
    const result = verifyEvent(signed, allowed);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("unknown_key_id");
  });

  it("verifyEvent rejects tampered payload (hash mismatch)", () => {
    const { privatePem, publicPem, keyId } = getSignerFromEnv();
    const signed = signEvent({ x: 1 }, privatePem, keyId);
    const tampered = { ...signed, payload: { x: 2 } };
    const allowed = new Map([[keyId, publicPem]]);
    const result = verifyEvent(tampered, allowed);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("hash_mismatch");
  });

  it("verifyEvent rejects forged signature with valid hash", () => {
    const { privatePem, publicPem, keyId } = getSignerFromEnv();
    const signed = signEvent({ x: 1 }, privatePem, keyId);
    const forged = {
      ...signed,
      signature_ed25519: Buffer.from(new Uint8Array(64).fill(0)).toString("base64"),
    };
    const allowed = new Map([[keyId, publicPem]]);
    const result = verifyEvent(forged, allowed);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_signature");
  });

  it("signature changes for different payloads (sanity)", () => {
    const { privatePem, keyId } = getSignerFromEnv();
    const a = signEvent({ x: 1 }, privatePem, keyId);
    const b = signEvent({ x: 2 }, privatePem, keyId);
    expect(a.signature_ed25519).not.toBe(b.signature_ed25519);
    expect(a.event_hash_canonical).not.toBe(b.event_hash_canonical);
  });

  it("same payload signed twice produces same signature (deterministic ed25519)", () => {
    const { privatePem, keyId } = getSignerFromEnv();
    const a = signEvent({ x: 1, y: 2 }, privatePem, keyId);
    const b = signEvent({ y: 2, x: 1 }, privatePem, keyId);
    expect(a.signature_ed25519).toBe(b.signature_ed25519);
    expect(a.event_hash_canonical).toBe(b.event_hash_canonical);
  });
});
