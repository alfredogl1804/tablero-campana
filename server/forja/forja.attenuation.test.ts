/**
 * Forja v4 — Tests del verificador de atenuación monotónica.
 *
 * Cumple criterio literal del plan canónico:
 *   docs/FORJA_OS_SPRINT_v0_1_v2.md §3 línea 303-304:
 *   "Test cubre 5 casos: scope ⊆, capability ⊆, budget ≤, TTL ≤, depth = 1.
 *    Test cubre 3 casos de rechazo: scope expansion, capability addition, budget excess."
 *
 * Cobertura adicional sobre el mínimo del plan: depth cap, TTL extension,
 * inheritance de denies, capability cruzada con denied.
 */

import { describe, expect, it } from "vitest";
import {
  FORJA_MAX_DEPTH,
  type ChildSubEnvelopeShape,
  type ParentEnvelopeShape,
  verifyAttenuation,
} from "./attenuation-verifier";

const HOUR_MS = 60 * 60 * 1000;

function makeParent(overrides: Partial<ParentEnvelopeShape> = {}): ParentEnvelopeShape {
  return {
    domainScope: {
      repos: ["alfredogl1804/tablero-campana", "alfredogl1804/like-kukulkan-tickets"],
      envs: ["staging", "development"],
      resources: ["server/forja/*", "server/lib/*"],
    },
    capabilitiesAllowed: ["read_repo", "edit_files", "run_tests", "deploy_staging"],
    capabilitiesDenied: ["production_deploy", "delete_database"],
    budgetMaxTokens: 100_000,
    budgetMaxCostUsdCents: 500,
    budgetMaxActions: 50,
    budgetMaxDurationSeconds: 7200,
    expiresAt: new Date(Date.now() + 24 * HOUR_MS),
    depth: 0,
    ...overrides,
  };
}

function makeChild(parent: ParentEnvelopeShape, overrides: Partial<ChildSubEnvelopeShape> = {}): ChildSubEnvelopeShape {
  return {
    domainScope: {
      repos: ["alfredogl1804/tablero-campana"],
      envs: ["staging"],
      resources: ["server/forja/*"],
    },
    capabilitiesAllowed: ["read_repo", "edit_files"],
    budgetMaxTokens: 50_000,
    budgetMaxCostUsdCents: 250,
    budgetMaxActions: 25,
    budgetMaxDurationSeconds: 3600,
    expiresAt: new Date(parent.expiresAt.getTime() - HOUR_MS),
    depth: (parent.depth ?? 0) + 1,
    ...overrides,
  };
}

describe("Forja attenuation-verifier — 5 casos válidos (cumplimiento del plan)", () => {
  it("acepta cuando scope del child es subset estricto del parent", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      domainScope: { repos: ["alfredogl1804/tablero-campana"], envs: ["staging"], resources: ["server/forja/*"] },
    });
    expect(verifyAttenuation(parent, child)).toEqual({ ok: true });
  });

  it("acepta cuando capabilities del child son subset del parent.allowed sin tocar denied", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      capabilitiesAllowed: ["read_repo"],
    });
    expect(verifyAttenuation(parent, child)).toEqual({ ok: true });
  });

  it("acepta cuando todos los budgets del child son ≤ parent (estrictamente menores)", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      budgetMaxTokens: 10_000,
      budgetMaxCostUsdCents: 50,
      budgetMaxActions: 5,
      budgetMaxDurationSeconds: 600,
    });
    expect(verifyAttenuation(parent, child)).toEqual({ ok: true });
  });

  it("acepta cuando TTL del child es ≤ parent (expira antes)", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      expiresAt: new Date(parent.expiresAt.getTime() - 12 * HOUR_MS),
    });
    expect(verifyAttenuation(parent, child)).toEqual({ ok: true });
  });

  it("acepta cuando depth = parent.depth + 1 dentro del cap", () => {
    const parent = makeParent({ depth: 0 });
    const child = makeChild(parent, { depth: 1 });
    expect(verifyAttenuation(parent, child)).toEqual({ ok: true });
  });
});

describe("Forja attenuation-verifier — 3 casos de rechazo (cumplimiento del plan)", () => {
  it("rechaza scope expansion: child agrega un repo no presente en parent", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      domainScope: {
        repos: ["alfredogl1804/tablero-campana", "alfredogl1804/repo-no-autorizado"],
        envs: ["staging"],
        resources: ["server/forja/*"],
      },
    });
    const verdict = verifyAttenuation(parent, child);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.violation).toBe("scope_repos_expansion");
      expect(verdict.detail).toContain("alfredogl1804/repo-no-autorizado");
    }
  });

  it("rechaza capability addition: child agrega una capability fuera de parent.allowed", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      capabilitiesAllowed: ["read_repo", "modify_billing"],
    });
    const verdict = verifyAttenuation(parent, child);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.violation).toBe("capability_added");
      expect(verdict.detail).toContain("modify_billing");
    }
  });

  it("rechaza budget excess: child pide más tokens que parent", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      budgetMaxTokens: 200_000,
    });
    const verdict = verifyAttenuation(parent, child);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.violation).toBe("budget_tokens_exceeded");
    }
  });
});

describe("Forja attenuation-verifier — invariantes adicionales (cobertura defensiva)", () => {
  it("rechaza child que hereda capability marcada como denied en parent", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      capabilitiesAllowed: ["read_repo", "production_deploy"],
    });
    const verdict = verifyAttenuation(parent, child);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.violation).toBe("capability_added");
    }
  });

  it("rechaza TTL extension: child expira después que parent", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      expiresAt: new Date(parent.expiresAt.getTime() + HOUR_MS),
    });
    const verdict = verifyAttenuation(parent, child);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.violation).toBe("ttl_extended_beyond_parent");
    }
  });

  it("rechaza depth no-monotónico: child con depth incorrecto", () => {
    const parent = makeParent({ depth: 0 });
    const child = makeChild(parent, { depth: 3 });
    const verdict = verifyAttenuation(parent, child);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.violation).toBe("depth_not_monotonic");
    }
  });

  it(`rechaza depth_cap_exceeded cuando excede FORJA_MAX_DEPTH=${FORJA_MAX_DEPTH}`, () => {
    const parent = makeParent({ depth: FORJA_MAX_DEPTH });
    const child = makeChild(parent, { depth: FORJA_MAX_DEPTH + 1 });
    const verdict = verifyAttenuation(parent, child);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.violation).toBe("depth_cap_exceeded");
    }
  });

  it("rechaza scope envs expansion (sub-caso de scope subset)", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      domainScope: { repos: parent.domainScope.repos, envs: ["staging", "production"], resources: parent.domainScope.resources },
    });
    const verdict = verifyAttenuation(parent, child);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.violation).toBe("scope_envs_expansion");
      expect(verdict.detail).toContain("production");
    }
  });

  it("acepta scope idéntico al parent (atenuación no es estrictamente menor, sino subset)", () => {
    const parent = makeParent();
    const child = makeChild(parent, {
      domainScope: parent.domainScope,
      capabilitiesAllowed: parent.capabilitiesAllowed.filter((c) => !parent.capabilitiesDenied?.includes(c)),
      budgetMaxTokens: parent.budgetMaxTokens,
      budgetMaxCostUsdCents: parent.budgetMaxCostUsdCents,
      budgetMaxActions: parent.budgetMaxActions,
      budgetMaxDurationSeconds: parent.budgetMaxDurationSeconds,
      expiresAt: parent.expiresAt,
    });
    expect(verifyAttenuation(parent, child)).toEqual({ ok: true });
  });
});

describe("Forja attenuation-verifier — propiedad pura (sin side-effects)", () => {
  it("la función no muta los argumentos", () => {
    const parent = makeParent();
    const child = makeChild(parent);
    const parentSnapshot = JSON.stringify({
      ...parent,
      expiresAt: parent.expiresAt.toISOString(),
    });
    const childSnapshot = JSON.stringify({
      ...child,
      expiresAt: child.expiresAt.toISOString(),
    });
    verifyAttenuation(parent, child);
    expect(JSON.stringify({ ...parent, expiresAt: parent.expiresAt.toISOString() })).toBe(parentSnapshot);
    expect(JSON.stringify({ ...child, expiresAt: child.expiresAt.toISOString() })).toBe(childSnapshot);
  });
});
