/**
 * Auditoría de las tablas candidatas a bus de eventos del kernel.
 *
 * Decisión Alfredo (Spike día 0): antes de implementar el Hito A,
 * auditar TODAS las tablas que parecen ser bus de eventos para no
 * inventar lo que ya existe (Obj #7).
 *
 * Para cada tabla, recolecta:
 *  - row count
 *  - schema (vía OpenAPI definitions)
 *  - last 3 rows (para entender el shape real de los datos)
 *  - signals: ¿tiene firma? ¿hash canónico? ¿agent_key_id? ¿payload JSON?
 */

import fs from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const CANDIDATES = [
  "catastro_eventos",
  "events",
  "forja_sprints",
  "kernel_audit_log",
  "memory_events",
  "monstruo_event_stream",
  "runtime_events",
  "security_web_events",
  "thread_immunity_events",
];

const headers = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
};

interface TableAudit {
  table: string;
  rowCount: number | string;
  columns: string[];
  signals: {
    hasSignature: boolean;
    hasHash: boolean;
    hasAgentKey: boolean;
    hasPayload: boolean;
    hasTimestamp: boolean;
  };
  recentRows: unknown[];
  error?: string;
}

async function fetchSchema(): Promise<Record<string, { properties?: Record<string, { type?: string; description?: string }> }>> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/?select=*`, { headers });
  const json = (await resp.json()) as { definitions?: Record<string, never> };
  return (json.definitions ?? {}) as Record<string, { properties?: Record<string, { type?: string; description?: string }> }>;
}

async function auditTable(table: string, definitions: Record<string, { properties?: Record<string, { type?: string; description?: string }> }>): Promise<TableAudit> {
  const def = definitions[table];
  const columns = def?.properties ? Object.keys(def.properties) : [];

  // Heurísticas para detectar firma/hash/agent_key
  const hasSignature = columns.some((c) =>
    /signature|signed|sign_alg|ed25519|public_key/i.test(c),
  );
  const hasHash = columns.some((c) => /hash|canonical|digest|integrity/i.test(c));
  const hasAgentKey = columns.some((c) =>
    /agent_key|agent_id|signer|emitter|emitted_by|publisher/i.test(c),
  );
  const hasPayload = columns.some((c) => /payload|body|data|content|event_data/i.test(c));
  const hasTimestamp = columns.some((c) =>
    /^(created|emitted|published|occurred|event)_at$/i.test(c) || c === "timestamp",
  );

  // Row count
  let rowCount: number | string;
  try {
    const countResp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
    });
    const range = countResp.headers.get("content-range");
    rowCount = range ? parseInt(range.split("/")[1] ?? "0", 10) : "?";
  } catch (e) {
    rowCount = `error: ${(e as Error).message}`;
  }

  // Recent rows
  let recentRows: unknown[] = [];
  try {
    const tsCol = columns.find(
      (c) => /^(created|emitted|published|occurred|event)_at$/i.test(c) || c === "timestamp",
    );
    const orderClause = tsCol ? `&order=${tsCol}.desc` : "";
    const resp = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=2${orderClause}`,
      { headers },
    );
    if (resp.ok) {
      recentRows = (await resp.json()) as unknown[];
    } else {
      recentRows = [{ error: `HTTP ${resp.status}` }];
    }
  } catch (e) {
    recentRows = [{ error: (e as Error).message }];
  }

  return {
    table,
    rowCount,
    columns,
    signals: { hasSignature, hasHash, hasAgentKey, hasPayload, hasTimestamp },
    recentRows,
  };
}

async function main() {
  console.log("════════════════════════════════════════════════════════════");
  console.log("  AUDITORÍA DE TABLAS DE EVENTOS DEL KERNEL");
  console.log("  Decisión Alfredo: Opción C del Spike día 0");
  console.log("════════════════════════════════════════════════════════════\n");

  const definitions = await fetchSchema();
  const audits: TableAudit[] = [];

  for (const table of CANDIDATES) {
    process.stdout.write(`Auditando ${table}... `);
    const audit = await auditTable(table, definitions);
    audits.push(audit);
    console.log(`${audit.rowCount} rows, ${audit.columns.length} cols`);
  }

  // Print summary table
  console.log("\n╭─ Resumen ─────────────────────────────────────────────────────╮");
  console.log("│ Tabla                       Rows    Sig  Hash AgKy Payl Ts  │");
  console.log("├───────────────────────────────────────────────────────────────┤");
  for (const a of audits) {
    const s = a.signals;
    const flags = [s.hasSignature, s.hasHash, s.hasAgentKey, s.hasPayload, s.hasTimestamp]
      .map((b) => (b ? " ✓ " : " · "))
      .join("  ");
    console.log(
      `│ ${a.table.padEnd(28)} ${String(a.rowCount).padStart(6)} ${flags} │`,
    );
  }
  console.log("╰───────────────────────────────────────────────────────────────╯");

  // Save full report
  const outPath = "/tmp/audit_kernel_event_tables.json";
  fs.writeFileSync(outPath, JSON.stringify(audits, null, 2));
  console.log(`\nReporte completo guardado en: ${outPath}`);

  // Verdict
  console.log("\n╭─ Recomendación arquitectónica ────────────────────────────╮");
  const richTables = audits.filter((a) => {
    const s = a.signals;
    return s.hasPayload && s.hasTimestamp && (s.hasHash || s.hasSignature);
  });
  if (richTables.length > 0) {
    console.log("│ Tablas con shape de bus firmable (payload + ts + hash/sig):");
    richTables.forEach((t) => console.log(`│   - ${t.table} (${t.rowCount} rows)`));
  } else {
    console.log("│ Ninguna tabla cumple el criterio bus firmable v1.1.");
    console.log("│ Recomendación: crear kernel_events_stream nueva.");
  }
  console.log("╰───────────────────────────────────────────────────────────╯");
}

main().catch((e) => {
  console.error("AUDIT FAILED:", e);
  process.exit(1);
});
