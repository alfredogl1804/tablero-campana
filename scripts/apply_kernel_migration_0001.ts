/**
 * Apply migration 0001_kernel_events_stream_signed to the kernel Supabase.
 *
 * Decisión arquitectónica B (post Spike día 0): no toca tablas existentes,
 * solo crea kernel_events_stream_signed nueva. Reversible con DROP TABLE.
 *
 * Usa la pg_meta API de Supabase (service_role) para ejecutar SQL via REST.
 */

import fs from "node:fs";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const SQL_PATH = path.join(
  __dirname,
  "..",
  "migrations",
  "kernel",
  "0001_kernel_events_stream_signed.sql",
);

async function execSql(sql: string): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  // Usamos la función pg_meta query (POST /pg/query) si existe, o el RPC exec_sql.
  // Estrategia recomendada por Supabase: usar la URL pg-meta que viene con la project.
  // Como puede no estar expuesta públicamente, intentamos primero con REST PostgREST
  // RPC de un wrapper si existe, y caemos a un cliente postgres directo.

  // Approach 1: Use the pg_meta Studio endpoint (interno).
  const url = `${SUPABASE_URL}/pg-meta/default/query`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (resp.ok) {
    return { ok: true, data: await resp.json() };
  }
  return { ok: false, error: `HTTP ${resp.status}: ${await resp.text()}` };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("FAIL: SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos.");
    process.exit(1);
  }

  console.log(`Reading migration: ${SQL_PATH}`);
  const sql = fs.readFileSync(SQL_PATH, "utf-8");
  console.log(`SQL length: ${sql.length} chars\n`);

  console.log("Applying via pg-meta endpoint...");
  const result = await execSql(sql);
  if (result.ok) {
    console.log("✓ Migration applied successfully.");
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    console.log("✗ pg-meta failed:", result.error);
    console.log("\nFallback: try direct postgres connection?");
    console.log(
      "Para aplicar la migration manualmente:\n" +
        `  1. Abre el Studio de Supabase del kernel\n` +
        `  2. Pega el contenido de ${SQL_PATH}\n` +
        `  3. Run`,
    );
    process.exit(1);
  }
}

main();
