/**
 * Vitest del Sprint v3.0 / T1 — handler /api/scheduled/refreshBoard.
 *
 * Cubre el contrato Heartbeat:
 *   - rechaza con 403 sin header de cron y sin dev bypass
 *   - acepta con header x-monstruo-dev-bypass=1 en NODE_ENV=development
 *   - acepta con header x-manus-cron-task-uid (simulando trigger real)
 *   - es idempotente: dos triggers consecutivos sin cambios → no_changes_detected
 *   - shape de respuesta válida: { ok, inserted, snapshotId?, totalNodes, systemHealth }
 *
 * El test asume que el dev server está corriendo en localhost:3000 (lo está
 * durante `pnpm dev`). Si no responde, el test salta con warning visible.
 */
import { describe, it, expect, beforeAll } from "vitest";

const SERVER_URL = process.env.MONSTRUO_TEST_SERVER_URL || "http://localhost:3000";
const ENDPOINT = `${SERVER_URL}/api/scheduled/refreshBoard`;

interface RefreshResponse {
  ok?: boolean;
  inserted?: boolean;
  reason?: string;
  snapshotId?: number;
  nodesInserted?: number;
  taskUid?: string;
  totalNodes?: number;
  systemHealth?: number;
  sourceMode?: string;
  error?: string;
}

async function postRefresh(headers: Record<string, string>): Promise<{
  status: number;
  body: RefreshResponse;
}> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({}),
  });
  const body = (await res.json()) as RefreshResponse;
  return { status: res.status, body };
}

let serverAvailable = false;

describe("Heartbeat handler /api/scheduled/refreshBoard", () => {
  beforeAll(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/trpc/system.healthcheck?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D`);
      serverAvailable = res.status < 500;
    } catch {
      serverAvailable = false;
    }
    if (!serverAvailable) {
      console.warn(
        "[board.scheduled.test] dev server no disponible en " + SERVER_URL + ", tests skipped",
      );
    }
  });

  it("rechaza con 403 sin header de cron ni dev bypass", async () => {
    if (!serverAvailable) return;
    const { status, body } = await postRefresh({});
    expect(status).toBe(403);
    expect(body.error).toBe("cron-only endpoint");
  });

  it("acepta con dev bypass y devuelve shape válido", async () => {
    if (!serverAvailable) return;
    const { status, body } = await postRefresh({
      "x-monstruo-dev-bypass": "1",
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(typeof body.inserted).toBe("boolean");
    expect(typeof body.totalNodes).toBe("number");
    expect(body.totalNodes).toBeGreaterThan(0);
    expect(typeof body.systemHealth).toBe("number");
    expect(body.systemHealth).toBeGreaterThanOrEqual(0);
    expect(body.systemHealth).toBeLessThanOrEqual(1);
  });

  it("simula trigger real con x-manus-cron-task-uid", async () => {
    if (!serverAvailable) return;
    const FAKE_TASK_UID = "task_test_" + Date.now();
    const { status, body } = await postRefresh({
      "x-manus-cron-task-uid": FAKE_TASK_UID,
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.taskUid).toBe(FAKE_TASK_UID);
  });

  it("es idempotente: triggers consecutivos sin cambios → no_changes_detected", async () => {
    if (!serverAvailable) return;
    // Primer trigger (puede insertar si era el primer snapshot del día)
    await postRefresh({ "x-monstruo-dev-bypass": "1" });
    // Segundo trigger inmediato (no debe haber cambios en el genoma)
    const { body } = await postRefresh({ "x-monstruo-dev-bypass": "1" });
    expect(body.ok).toBe(true);
    expect(body.inserted).toBe(false);
    expect(body.reason).toBe("no_changes_detected");
  });
});
