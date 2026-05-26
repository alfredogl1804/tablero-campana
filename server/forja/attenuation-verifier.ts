/**
 * Forja v4 — Verificador de atenuación monotónica para sub-envelopes.
 *
 * Sprint v0.1 Día 8 (docs/FORJA_OS_SPRINT_v0_1_v2.md §3, líneas 298-308).
 *
 * Doctrina: un sub-envelope DEBE ser estrictamente más restrictivo o igual que su parent.
 * El sistema es seguro solo si esta propiedad se cumple en cada nivel de la cadena.
 *
 * Cinco invariantes obligatorios. Si cualquiera falla, el sub-envelope es rechazado.
 *
 * 1. Scope subset:           child.domainScope     ⊆ parent.domainScope
 * 2. Capabilities subset:    child.capabilities    ⊆ parent.capabilitiesAllowed \ parent.capabilitiesDenied
 * 3. Budget non-expansion:   child.budget          ≤ parent.budget (en cada métrica)
 * 4. TTL non-expansion:      child.expiresAt       ≤ parent.expiresAt
 * 5. Depth cap:              child.depth           = parent.depth + 1  ∧  child.depth ≤ MAX_DEPTH
 *
 * MAX_DEPTH = 2 en v0.1 (declarado explícitamente en plan §9 "Lo que NO entrega el sprint").
 *
 * Función pura — sin DB, sin side effects. Apta para verificación en tiempo de
 * ingest (subEnvelope.create) y en tiempo de autorización (gateway).
 */

export const FORJA_MAX_DEPTH = 2;

/**
 * Shape mínimo del parent para verificar atenuación.
 * Compatible con root_authority_envelopes (depth implícito=0) y sub_envelopes (depth=1).
 */
export interface ParentEnvelopeShape {
  domainScope: { repos: string[]; envs: string[]; resources: string[] };
  capabilitiesAllowed: string[];
  /** Solo presente en root envelopes; sub envelopes no tienen capabilitiesDenied. */
  capabilitiesDenied?: string[];
  budgetMaxTokens: number;
  budgetMaxCostUsdCents: number;
  budgetMaxActions: number;
  budgetMaxDurationSeconds: number;
  expiresAt: Date;
  /** Para root envelopes, depth es implícitamente 0. */
  depth?: number;
}

/**
 * Shape del sub-envelope candidato a verificar.
 */
export interface ChildSubEnvelopeShape {
  domainScope: { repos: string[]; envs: string[]; resources: string[] };
  capabilitiesAllowed: string[];
  budgetMaxTokens: number;
  budgetMaxCostUsdCents: number;
  budgetMaxActions: number;
  budgetMaxDurationSeconds: number;
  expiresAt: Date;
  depth: number;
}

export type AttenuationViolation =
  | "scope_repos_expansion"
  | "scope_envs_expansion"
  | "scope_resources_expansion"
  | "capability_added"
  | "capability_inherits_denied"
  | "budget_tokens_exceeded"
  | "budget_cost_exceeded"
  | "budget_actions_exceeded"
  | "budget_duration_exceeded"
  | "ttl_extended_beyond_parent"
  | "depth_not_monotonic"
  | "depth_cap_exceeded";

export type AttenuationVerdict =
  | { ok: true }
  | { ok: false; violation: AttenuationViolation; detail: string };

/**
 * Verifica que `child` esté correctamente atenuado respecto a `parent`.
 *
 * Devuelve `{ ok: true }` si todos los 5 invariantes se cumplen,
 * o `{ ok: false, violation, detail }` con el primer invariante violado.
 *
 * La verificación es determinística y short-circuit en el primer fallo
 * para que el detail siempre apunte al invariante específico que rompió.
 */
export function verifyAttenuation(
  parent: ParentEnvelopeShape,
  child: ChildSubEnvelopeShape,
): AttenuationVerdict {
  // Invariante 1 — Scope subset (repos, envs, resources)
  const reposViolation = findExpansion(child.domainScope.repos, parent.domainScope.repos);
  if (reposViolation) {
    return {
      ok: false,
      violation: "scope_repos_expansion",
      detail: `child includes repo "${reposViolation}" not present in parent.domainScope.repos`,
    };
  }
  const envsViolation = findExpansion(child.domainScope.envs, parent.domainScope.envs);
  if (envsViolation) {
    return {
      ok: false,
      violation: "scope_envs_expansion",
      detail: `child includes env "${envsViolation}" not present in parent.domainScope.envs`,
    };
  }
  const resourcesViolation = findExpansion(child.domainScope.resources, parent.domainScope.resources);
  if (resourcesViolation) {
    return {
      ok: false,
      violation: "scope_resources_expansion",
      detail: `child includes resource "${resourcesViolation}" not present in parent.domainScope.resources`,
    };
  }

  // Invariante 2 — Capabilities subset (allowed ∩ ¬denied)
  const parentDenied = new Set(parent.capabilitiesDenied ?? []);
  const parentAllowed = new Set(parent.capabilitiesAllowed);
  for (const cap of child.capabilitiesAllowed) {
    if (!parentAllowed.has(cap)) {
      return {
        ok: false,
        violation: "capability_added",
        detail: `child requires capability "${cap}" not in parent.capabilitiesAllowed`,
      };
    }
    if (parentDenied.has(cap)) {
      return {
        ok: false,
        violation: "capability_inherits_denied",
        detail: `child requires capability "${cap}" but parent.capabilitiesDenied lists it`,
      };
    }
  }

  // Invariante 3 — Budget non-expansion (4 dimensiones)
  if (child.budgetMaxTokens > parent.budgetMaxTokens) {
    return {
      ok: false,
      violation: "budget_tokens_exceeded",
      detail: `child.budgetMaxTokens=${child.budgetMaxTokens} > parent.budgetMaxTokens=${parent.budgetMaxTokens}`,
    };
  }
  if (child.budgetMaxCostUsdCents > parent.budgetMaxCostUsdCents) {
    return {
      ok: false,
      violation: "budget_cost_exceeded",
      detail: `child.budgetMaxCostUsdCents=${child.budgetMaxCostUsdCents} > parent.budgetMaxCostUsdCents=${parent.budgetMaxCostUsdCents}`,
    };
  }
  if (child.budgetMaxActions > parent.budgetMaxActions) {
    return {
      ok: false,
      violation: "budget_actions_exceeded",
      detail: `child.budgetMaxActions=${child.budgetMaxActions} > parent.budgetMaxActions=${parent.budgetMaxActions}`,
    };
  }
  if (child.budgetMaxDurationSeconds > parent.budgetMaxDurationSeconds) {
    return {
      ok: false,
      violation: "budget_duration_exceeded",
      detail: `child.budgetMaxDurationSeconds=${child.budgetMaxDurationSeconds} > parent.budgetMaxDurationSeconds=${parent.budgetMaxDurationSeconds}`,
    };
  }

  // Invariante 4 — TTL non-expansion
  if (child.expiresAt.getTime() > parent.expiresAt.getTime()) {
    return {
      ok: false,
      violation: "ttl_extended_beyond_parent",
      detail: `child.expiresAt=${child.expiresAt.toISOString()} > parent.expiresAt=${parent.expiresAt.toISOString()}`,
    };
  }

  // Invariante 5 — Depth (monotónico + cap)
  const parentDepth = parent.depth ?? 0;
  if (child.depth !== parentDepth + 1) {
    return {
      ok: false,
      violation: "depth_not_monotonic",
      detail: `child.depth=${child.depth} must equal parent.depth+1=${parentDepth + 1}`,
    };
  }
  if (child.depth > FORJA_MAX_DEPTH) {
    return {
      ok: false,
      violation: "depth_cap_exceeded",
      detail: `child.depth=${child.depth} > FORJA_MAX_DEPTH=${FORJA_MAX_DEPTH} (v0.1 cap)`,
    };
  }

  return { ok: true };
}

/**
 * Helper interno: retorna el primer elemento de `child` no presente en `parent`,
 * o `null` si child ⊆ parent.
 */
function findExpansion(child: string[], parent: string[]): string | null {
  const parentSet = new Set(parent);
  for (const item of child) {
    if (!parentSet.has(item)) return item;
  }
  return null;
}
