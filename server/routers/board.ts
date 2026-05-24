/**
 * Board Router — Sprint v3.0 / T1 Sincronización viva
 *
 * Expone:
 *   - board.current  → snapshot más reciente (lectura, pública)
 *   - board.refresh  → ejecuta el script Python, captura snapshot,
 *                      escribe a DB (mutación, protegida)
 *   - board.history  → lista metadata de snapshots para TimelineSlider (T5)
 *   - board.byId     → snapshot específico por id (T5)
 *
 * Filosofía: el script Python sigue siendo la fuente única de extracción
 * (DSC-G-008 cero drift). Este router orquesta su ejecución y persiste
 * el resultado.
 */
import { TRPCError } from "@trpc/server";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import {
  getBoardSnapshotById,
  getCurrentBoardSnapshot,
  insertBoardSnapshot,
  listBoardSnapshots,
} from "../db";
import {
  protectedProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT_PATH = path.join(PROJECT_ROOT, "scripts", "build_board_data.py");
const SRC_OUTPUT = path.join(PROJECT_ROOT, "client", "src", "data", "board_data.json");

interface BoardPayload {
  meta: {
    generated_from?: string;
    generated_at?: string;
    source_mode?: string;
    source_path?: string;
    source_commit?: string;
    version?: string;
    total_nodes: number;
    system_health: number;
    payload_sha?: string;
    timestamp?: string;
  };
  districts: unknown[];
  nodes: Array<{
    id: string;
    district: string;
    label: string;
    description?: string;
    status: string;
    loc?: number;
    last_updated?: string;
    [key: string]: unknown;
  }>;
}

/**
 * Ejecuta el script Python y resuelve cuando termina.
 * Lanza TRPCError si falla.
 */
async function runBuildScript(): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // tsx watch inyecta el cpython de uv (3.13) que tiene SRE module mismatch.
    // Usamos python3.11 del sistema con path absoluto + PATH saneado.
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

    child.stdout.on("data", chunk => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
    });

    child.on("error", err => reject(err));
    child.on("close", code => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `build_board_data.py exited with code ${code}\nstderr:\n${stderr}`,
          ),
        );
      }
    });
  });
}

async function readBoardJson(): Promise<BoardPayload> {
  const raw = await readFile(SRC_OUTPUT, "utf-8");
  return JSON.parse(raw) as BoardPayload;
}

/**
 * Persiste un BoardPayload en la base de datos como snapshot + nodos.
 * Es idempotente respecto al SHA: si el snapshot anterior tiene el mismo
 * payload_sha, no inserta uno nuevo.
 */
async function persistSnapshot(payload: BoardPayload): Promise<{
  inserted: boolean;
  snapshotId: number | null;
  reason?: string;
}> {
  const previous = await getCurrentBoardSnapshot();
  const newSha = payload.meta.payload_sha;

  if (previous && newSha) {
    // Comparar SHA del payload anterior
    const prevPayload = (previous.payload as BoardPayload | null) ?? null;
    const prevSha = prevPayload?.meta?.payload_sha;
    if (prevSha && prevSha === newSha) {
      return {
        inserted: false,
        snapshotId: previous.id,
        reason: "no_changes_detected",
      };
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
    return { inserted: false, snapshotId: null, reason: "db_unavailable" };
  }

  return { inserted: true, snapshotId: result.snapshotId };
}

export const boardRouter = router({
  /**
   * Devuelve el snapshot vigente del Tablero.
   * Si no hay ninguno en DB, ejecuta el script para crear el primero.
   * Si el script tampoco está disponible (no hay mount, no hay snapshot local),
   * devuelve null y el frontend cae al import estático como fallback.
   */
  current: publicProcedure.query(async () => {
    let row = await getCurrentBoardSnapshot();

    if (!row) {
      // No hay snapshot en DB — bootstrap automático
      try {
        await runBuildScript();
        const payload = await readBoardJson();
        const result = await persistSnapshot(payload);
        if (result.inserted && result.snapshotId !== null) {
          row = await getCurrentBoardSnapshot();
        }
      } catch (err) {
        console.warn("[board.current] bootstrap fallido:", err);
        return null;
      }
    }

    if (!row) return null;

    return {
      id: row.id,
      capturedAt: row.capturedAt,
      sourceCommit: row.sourceCommit,
      sourceMode: row.sourceMode,
      totalNodes: row.totalNodes,
      systemHealth: row.systemHealth / 1000,
      payload: row.payload as BoardPayload,
    };
  }),

  /**
   * Re-ejecuta el script y persiste un nuevo snapshot si hay cambios.
   * Solo usuarios autenticados pueden disparar refresh manual.
   * El cron heartbeat usa esta misma ruta vía el endpoint público
   * /api/heartbeat (configurado por separado).
   */
  refresh: protectedProcedure.mutation(async () => {
    try {
      const { stdout } = await runBuildScript();
      const payload = await readBoardJson();
      const result = await persistSnapshot(payload);

      return {
        ok: true,
        ...result,
        totalNodes: payload.meta.total_nodes,
        systemHealth: payload.meta.system_health,
        sourceMode: payload.meta.source_mode,
        scriptStdout: stdout.split("\n").slice(-10).join("\n"),
      };
    } catch (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err instanceof Error ? err.message : "refresh failed",
      });
    }
  }),

  /**
   * Lista los últimos N snapshots como metadata para el TimelineSlider de T5.
   */
  history: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 30;
      const rows = await listBoardSnapshots(limit);
      return rows.map(r => ({
        ...r,
        systemHealth: r.systemHealth / 1000,
      }));
    }),

  /**
   * Trae un snapshot histórico específico por id (para reconstruir
   * cómo se veía el Monstruo en un momento exacto del pasado).
   */
  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const row = await getBoardSnapshotById(input.id);
      if (!row) return null;
      return {
        id: row.id,
        capturedAt: row.capturedAt,
        sourceCommit: row.sourceCommit,
        sourceMode: row.sourceMode,
        totalNodes: row.totalNodes,
        systemHealth: row.systemHealth / 1000,
        payload: row.payload as BoardPayload,
      };
    }),
});
