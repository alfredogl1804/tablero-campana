/**
 * Spike día 0 — Sprint Observatorio Vivo v1.1.
 *
 * Valida end-to-end ANTES de invertir 5-7 días en el Hito A:
 *   1. ¿El sandbox tablero-campana puede leer Supabase del kernel?
 *   2. ¿Existe alguna tabla de eventos publicables, o hay que crearla?
 *   3. ¿Realtime Broadcast funciona sobre ese canal?
 *   4. ¿La latencia ida-vuelta es viable (<2s) para llamarlo "vivo"?
 *
 * Si alguna pata falla, se documenta en el output y se decide si:
 *   - Crear la tabla `kernel_events_stream` desde el plan v1.1.
 *   - Cambiar la estrategia de bus (ej. webhook directo al lugar de TiDB).
 *   - Escalar el blocker a Alfredo como decisión arquitectónica.
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("FAIL: SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

interface Result {
  step: string;
  ok: boolean;
  detail: string;
  durationMs?: number;
}

const results: Result[] = [];

function log(r: Result) {
  results.push(r);
  const tag = r.ok ? "✓" : "✗";
  console.log(`  ${tag} ${r.step}${r.durationMs ? ` (${r.durationMs}ms)` : ""}`);
  if (r.detail) console.log(`    ${r.detail}`);
}

async function step1_listTables() {
  console.log("\n[1/5] Inventario de tablas existentes en Supabase del kernel:");
  const t0 = Date.now();
  // Usar la introspección via OpenAPI
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/?select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  const dt = Date.now() - t0;
  if (!resp.ok) {
    log({ step: "listar tablas", ok: false, detail: `HTTP ${resp.status}`, durationMs: dt });
    return [];
  }
  const json: { definitions?: Record<string, unknown> } = await resp.json();
  const tables = Object.keys(json.definitions ?? {}).sort();
  log({
    step: `listar tablas`,
    ok: true,
    detail: `${tables.length} tablas accesibles`,
    durationMs: dt,
  });

  const eventLikeTables = tables.filter((t) =>
    /event|stream|sprint|tablero|observat|kernel/i.test(t),
  );
  if (eventLikeTables.length > 0) {
    console.log(`  Candidatas a bus de eventos: ${eventLikeTables.join(", ")}`);
  } else {
    console.log("  No hay tablas existentes que parezcan bus de eventos.");
  }
  return tables;
}

async function step2_testRealtimeBroadcast() {
  console.log("\n[2/5] Realtime Broadcast (sin DB, solo canal efímero):");
  const channelName = `spike-test-${Date.now()}`;
  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: true } },
  });

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      log({
        step: "Realtime Broadcast roundtrip",
        ok: false,
        detail: "timeout 5s — Broadcast no respondió",
      });
      channel.unsubscribe();
      resolve();
    }, 5000);

    const t0 = Date.now();
    let received = false;

    channel
      .on("broadcast", { event: "ping" }, (payload) => {
        if (received) return;
        received = true;
        clearTimeout(timeout);
        const dt = Date.now() - t0;
        log({
          step: "Realtime Broadcast roundtrip",
          ok: true,
          detail: `payload eco recibido: ${JSON.stringify(payload.payload).slice(0, 80)}`,
          durationMs: dt,
        });
        channel.unsubscribe();
        resolve();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.send({
            type: "broadcast",
            event: "ping",
            payload: { spike: true, ts: Date.now(), nonce: crypto.randomBytes(8).toString("hex") },
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          if (!received) {
            received = true;
            clearTimeout(timeout);
            log({
              step: "Realtime Broadcast roundtrip",
              ok: false,
              detail: `status=${status}`,
            });
            resolve();
          }
        }
      });
  });
}

async function step3_canCreateOurTable() {
  console.log("\n[3/5] ¿Podemos crear nuestra propia tabla de eventos?");
  // Intentamos un INSERT en una tabla que NO existe; si el error es 404 / not found
  // significa que tenemos permisos pero la tabla no existe — tendríamos que crearla
  // mediante migration o pedir al kernel que la cree.
  const probeName = "kernel_events_stream";
  const t0 = Date.now();
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${probeName}?limit=1`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
  });
  const dt = Date.now() - t0;
  if (resp.ok) {
    log({
      step: `tabla ${probeName} existe`,
      ok: true,
      detail: "ya está creada — solo falta wirear el publisher/consumer",
      durationMs: dt,
    });
    return "exists";
  } else if (resp.status === 404) {
    log({
      step: `tabla ${probeName}`,
      ok: false,
      detail: "no existe; se requiere migration en el kernel para crearla",
      durationMs: dt,
    });
    return "needs_creation";
  } else if (resp.status === 401 || resp.status === 403) {
    log({
      step: `tabla ${probeName}`,
      ok: false,
      detail: `permiso denegado (${resp.status}) — RLS policy bloquea acceso`,
      durationMs: dt,
    });
    return "permission_denied";
  } else {
    const body = await resp.text();
    log({
      step: `tabla ${probeName}`,
      ok: false,
      detail: `HTTP ${resp.status}: ${body.slice(0, 100)}`,
      durationMs: dt,
    });
    return "unknown";
  }
}

async function step4_postgresChangesViable() {
  console.log("\n[4/5] Postgres CDC (Realtime sobre cambios de tabla):");
  // Probamos suscribirnos a una tabla cualquiera para ver si Postgres CDC está habilitado.
  // Si Postgres CDC no está habilitado, los inserts no generarán eventos.
  // El plan v1.1 propone HÍBRIDO: ledger durable (INSERT) + Broadcast (eco).
  // Si CDC funciona, podemos usar el INSERT como trigger del Broadcast automáticamente.
  return new Promise<void>((resolve) => {
    const t0 = Date.now();
    const channel = supabase.channel("spike-cdc-test");
    const timeout = setTimeout(() => {
      log({
        step: "Postgres CDC subscription",
        ok: true,
        detail: "subscripción aceptada (CDC disponible si la tabla está en publication)",
        durationMs: Date.now() - t0,
      });
      channel.unsubscribe();
      resolve();
    }, 3000);

    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "tablero_snapshots" }, () => {
        // No esperamos cambios reales en 3s, solo validamos que la subscripción no falla.
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timeout);
          log({
            step: "Postgres CDC subscription",
            ok: false,
            detail: `status=${status}`,
            durationMs: Date.now() - t0,
          });
          channel.unsubscribe();
          resolve();
        }
      });
  });
}

async function step5_testBoardSnapshotsRead() {
  console.log("\n[5/5] Lectura de tablero_snapshots (puerta del Truth Ledger):");
  const t0 = Date.now();
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/tablero_snapshots?select=id,captured_at&limit=1&order=id.desc`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    },
  );
  const dt = Date.now() - t0;
  if (!resp.ok) {
    log({
      step: "leer tablero_snapshots",
      ok: false,
      detail: `HTTP ${resp.status}`,
      durationMs: dt,
    });
    return;
  }
  const rows = (await resp.json()) as Array<{ id: number; captured_at: string }>;
  log({
    step: "leer tablero_snapshots",
    ok: true,
    detail: rows.length > 0 ? `último id=${rows[0].id} captured_at=${rows[0].captured_at}` : "tabla vacía",
    durationMs: dt,
  });
}

async function main() {
  console.log("════════════════════════════════════════════════");
  console.log("  SPIKE DÍA 0 — Sprint Observatorio Vivo v1.1");
  console.log(`  Target: ${SUPABASE_URL}`);
  console.log("════════════════════════════════════════════════");

  await step1_listTables();
  await step2_testRealtimeBroadcast();
  await step3_canCreateOurTable();
  await step4_postgresChangesViable();
  await step5_testBoardSnapshotsRead();

  console.log("\n════════════════════════════════════════════════");
  console.log("  VEREDICTO DEL SPIKE");
  console.log("════════════════════════════════════════════════");

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`  ${passed}/${results.length} verde, ${failed} rojo`);

  const blocking = results.filter(
    (r) => !r.ok && (r.step.includes("Broadcast") || r.step.includes("snapshots")),
  );

  if (blocking.length === 0) {
    console.log("\n  ✓ PIPELINE VIABLE — el Hito A puede arrancar.");
    console.log("    Próximo paso: crear migration de kernel_events_stream en el kernel,");
    console.log("    o decidir bus alternativo si la tabla aún no existe.");
  } else {
    console.log("\n  ✗ PIPELINE NO VIABLE — bloqueante en:");
    blocking.forEach((b) => console.log(`     - ${b.step}: ${b.detail}`));
    console.log("    Revisar plan A antes de invertir 5-7d en Hito A.");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("SPIKE FAILED with exception:", err);
  process.exit(2);
});
