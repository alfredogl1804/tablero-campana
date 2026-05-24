/**
 * Sprint v3.0 / T1 — Heartbeat handler para refresco automático del Tablero.
 *
 * La plataforma Manus dispara este endpoint según el cron registrado vía
 * `manus-heartbeat create`. Cada trigger:
 *
 *   1. Autentica que el caller sea el cron system (req.headers["x-manus-cron-task-uid"])
 *   2. Ejecuta scripts/build_board_data.py contra el genoma vivo del Monstruo
 *   3. Lee el JSON resultante
 *   4. Persiste como nuevo snapshot en TiDB (idempotente vía SHA)
 *   5. Devuelve el resultado para que la plataforma lo registre en logs
 *
 * Idempotente: si el SHA del payload no cambió, no inserta snapshot nuevo
 * y devuelve `{ ok: true, inserted: false, reason: "no_changes_detected" }`.
 *
 * Política de errores: try/catch con JSON-encoded error en 500 para que
 * Investigate de la plataforma surface el stack verbatim.
 */
import type { Request, Response } from "express";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  getCurrentBoardSnapshot,
  insertBoardSnapshot,
} from "../db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT_PATH = path.join(PROJECT_ROOT, "scripts", "build_board_data.py");
const SRC_OUTPUT = path.join(
  PROJECT_ROOT,
  "client",
  "src",
  "data",
  "board_data.json",
);

interface BoardPayload {
  meta: {
    source_mode?: string;
    source_commit?: string;
    total_nodes: number;
    system_health: number;
    payload_sha?: string;
  };
  nodes: Array<{
    id: string;
    district: string;
    label: string;
    status: string;
    loc?: number;
    last_updated?: string;
    [key: string]: unknown;
  }>;
}

async function runBuildScript(): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const cleanEnv: NodeJS.ProcessEnv = { ...process.env };
    delete cleanEnv.OPENSSL_MODULES;
    delete cleanEnv.OPENSSL_CONF;
    delete cleanEnv.LD_LIBRARY_PATH;
    delete cleanEnv.NODE_OPTIONS;
    delete cleanEnv.PYTHONPATH;
    delete cleanEnv.PYTHONHOME;
    cleanEnv.PATH = "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin";

    const PYTHON_BIN = process.env.MONSTRUO_PYTHON_BIN || "/usr/bin/python3.11";
    const child = spawn(PYTHON_BIN, [SCRIPT_PATH], {
      cwd: PROJECT_ROOT,
      env: cleanEnv,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", c => (stdout += c.toString()));
    child.stderr.on("data", c => (stderr += c.toString()));
    child.on("error", err => reject(err));
    child.on("close", code => {
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(
          new Error(
            `build_board_data.py exited with code ${code}\nstderr:\n${stderr}`,
          ),
        );
    });
  });
}

export async function refreshBoardHandler(req: Request, res: Response) {
  // Verificar que el caller sea el cron system (sin §5c patches usamos el
  // header de la plataforma directamente).
  const cronTaskUid = req.headers["x-manus-cron-task-uid"];
  const isLocalDev =
    process.env.NODE_ENV !== "production" &&
    req.headers["x-monstruo-dev-bypass"] === "1";

  if (!cronTaskUid && !isLocalDev) {
    res.status(403).json({ error: "cron-only endpoint" });
    return;
  }

  try {
    await runBuildScript();
    const raw = await readFile(SRC_OUTPUT, "utf-8");
    const payload = JSON.parse(raw) as BoardPayload;

    // Idempotencia por SHA
    const previous = await getCurrentBoardSnapshot();
    const newSha = payload.meta.payload_sha;
    if (previous && newSha) {
      const prevPayload = (previous.payload as BoardPayload | null) ?? null;
      const prevSha = prevPayload?.meta?.payload_sha;
      if (prevSha && prevSha === newSha) {
        res.json({
          ok: true,
          inserted: false,
          reason: "no_changes_detected",
          taskUid: cronTaskUid ?? "dev-bypass",
          totalNodes: payload.meta.total_nodes,
          systemHealth: payload.meta.system_health,
        });
        return;
      }
    }

    const systemHealth = Math.round((payload.meta.system_health ?? 0) * 1000);
    const result = await insertBoardSnapshot(
      {
        sourceCommit: payload.meta.source_commit?.slice(0, 64) ?? null,
        sourceMode: payload.meta.source_mode ?? "unknown",
        totalNodes: payload.meta.total_nodes ?? payload.nodes.length,
        systemHealth,
        payload: payload as unknown as Record<string, unknown>,
      },
      payload.nodes.map(n => ({
        nodeId: n.id,
        district: n.district,
        label: n.label,
        status: n.status,
        loc: typeof n.loc === "number" ? n.loc : 0,
        lastUpdated: n.last_updated ?? null,
        raw: n as unknown as Record<string, unknown>,
      })),
    );

    if (!result) {
      res.status(503).json({
        error: "database not available",
        taskUid: cronTaskUid ?? "dev-bypass",
      });
      return;
    }

    res.json({
      ok: true,
      inserted: true,
      snapshotId: result.snapshotId,
      nodesInserted: result.nodesInserted,
      taskUid: cronTaskUid ?? "dev-bypass",
      totalNodes: payload.meta.total_nodes,
      systemHealth: payload.meta.system_health,
      sourceMode: payload.meta.source_mode,
    });
  } catch (err) {
    console.error("[scheduled/refreshBoard] failed:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: {
        url: req.url,
        taskUid: cronTaskUid ?? null,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
