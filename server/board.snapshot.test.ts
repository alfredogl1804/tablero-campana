/**
 * Vitest del Sprint v3.0 / T1 — Sincronización viva del Tablero.
 *
 * Verifica las invariantes que el frontend asume del board_data.json
 * generado por scripts/build_board_data.py desde el genoma vivo del Monstruo:
 *
 *   - shape canónico compatible con client/src/lib/board-types.ts
 *   - los 5 distritos siempre presentes (cognicion, interfaces, infraestructura, capacidades, futuro)
 *   - todos los nodos pertenecen a alguno de los 5 distritos
 *   - todos los status son válidos (ACTIVE | DEGRADED | SPRINT | FUTURE)
 *   - todos los IDs son únicos
 *   - todos tienen grid_position válida
 *   - el script es idempotente (mismo SHA si la fuente no cambió)
 *   - declara source_mode (canonical_mount o local_snapshot_fallback)
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(__dirname, "..");
const BOARD_PATH = resolve(PROJECT_ROOT, "client/src/data/board_data.json");
const SCRIPT_PATH = resolve(PROJECT_ROOT, "scripts/build_board_data.py");

const VALID_DISTRICTS = new Set([
  "cognicion",
  "interfaces",
  "infraestructura",
  "capacidades",
  "futuro",
]);

const VALID_STATUSES = new Set(["ACTIVE", "DEGRADED", "SPRINT", "FUTURE"]);

interface BoardNode {
  id: string;
  district: string;
  label: string;
  description: string;
  status: string;
  loc: number;
  connections_in: string[];
  connections_out: string[];
  grid_position: [number, number];
  last_updated: string;
  gap?: string;
}

interface BoardData {
  meta: {
    generated_from: string;
    generated_at: string;
    source_mode: string;
    source_path: string;
    source_commit: string;
    version: string;
    total_nodes: number;
    system_health: number;
    payload_sha: string;
  };
  districts: Array<{
    id: string;
    label: string;
    description: string;
    color: string;
    icon: string;
    health: number;
    grid_origin: [number, number];
    grid_size: [number, number];
    node_count: number;
  }>;
  nodes: BoardNode[];
}

describe("BoardData snapshot (cero drift)", () => {
  const board = JSON.parse(readFileSync(BOARD_PATH, "utf-8")) as BoardData;

  it("declara los 5 distritos canónicos del Tablero", () => {
    const ids = board.districts.map(d => d.id).sort();
    expect(ids).toEqual([
      "capacidades",
      "cognicion",
      "futuro",
      "infraestructura",
      "interfaces",
    ]);
  });

  it("tiene metadata completa con SHA determinístico", () => {
    expect(board.meta.version).toBeDefined();
    expect(board.meta.payload_sha).toMatch(/^[a-f0-9]{16}$/);
    expect(board.meta.total_nodes).toBeGreaterThan(0);
    expect(board.meta.system_health).toBeGreaterThanOrEqual(0);
    expect(board.meta.system_health).toBeLessThanOrEqual(1);
  });

  it("declara source_mode válido", () => {
    expect(["canonical_mount", "local_snapshot_fallback"]).toContain(
      board.meta.source_mode,
    );
  });

  it("todos los nodos pertenecen a alguno de los 5 distritos", () => {
    for (const node of board.nodes) {
      expect(
        VALID_DISTRICTS.has(node.district),
        `Nodo ${node.id} apunta a distrito inválido: ${node.district}`,
      ).toBe(true);
    }
  });

  it("todos los status son canónicos", () => {
    for (const node of board.nodes) {
      expect(
        VALID_STATUSES.has(node.status),
        `Nodo ${node.id} tiene status inválido: ${node.status}`,
      ).toBe(true);
    }
  });

  it("todos los IDs son únicos", () => {
    const seen = new Set<string>();
    for (const node of board.nodes) {
      expect(seen.has(node.id), `ID duplicado: ${node.id}`).toBe(false);
      seen.add(node.id);
    }
  });

  it("todos los nodos tienen grid_position válida [x, z]", () => {
    for (const node of board.nodes) {
      expect(Array.isArray(node.grid_position)).toBe(true);
      expect(node.grid_position).toHaveLength(2);
      expect(typeof node.grid_position[0]).toBe("number");
      expect(typeof node.grid_position[1]).toBe("number");
    }
  });

  it("total_nodes en meta coincide con el array nodes", () => {
    expect(board.meta.total_nodes).toBe(board.nodes.length);
  });

  it("node_count por distrito coincide con la realidad", () => {
    for (const district of board.districts) {
      const realCount = board.nodes.filter(n => n.district === district.id).length;
      expect(district.node_count, `Distrito ${district.id} declara ${district.node_count} pero hay ${realCount}`).toBe(realCount);
    }
  });

  it("todos los distritos tienen salud entre 0 y 1", () => {
    for (const district of board.districts) {
      expect(district.health).toBeGreaterThanOrEqual(0);
      expect(district.health).toBeLessThanOrEqual(1);
    }
  });

  it("todos los nodos del distrito Futuro tienen status FUTURE o tienen gap declarado", () => {
    const futureNodes = board.nodes.filter(n => n.district === "futuro");
    for (const node of futureNodes) {
      const hasFutureStatus = node.status === "FUTURE";
      const hasGap = typeof node.gap === "string" && node.gap.length > 0;
      expect(
        hasFutureStatus || hasGap,
        `Nodo ${node.id} en distrito futuro debe tener status FUTURE o gap declarado`,
      ).toBe(true);
    }
  });
});

describe("build_board_data.py (ejecución real e idempotencia)", () => {
  it("el script existe", () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true);
  });

  it("se ejecuta sin error y reescribe el archivo de salida", () => {
    const before = statSync(BOARD_PATH).mtimeMs;
    const result = spawnSync("/usr/bin/python3.11", [SCRIPT_PATH], {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      env: {
        PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
      },
    });
    expect(result.status, `stderr: ${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("[board] Total:");
    expect(result.stdout).toContain("[board] Salud del sistema:");
    const after = statSync(BOARD_PATH).mtimeMs;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it("es idempotente: dos ejecuciones consecutivas producen el mismo SHA", () => {
    const run = () =>
      spawnSync("/usr/bin/python3.11", [SCRIPT_PATH], {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        env: {
          PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
        },
      });

    const r1 = run();
    expect(r1.status).toBe(0);
    const board1 = JSON.parse(readFileSync(BOARD_PATH, "utf-8")) as BoardData;
    const sha1 = board1.meta.payload_sha;

    const r2 = run();
    expect(r2.status).toBe(0);
    const board2 = JSON.parse(readFileSync(BOARD_PATH, "utf-8")) as BoardData;
    const sha2 = board2.meta.payload_sha;

    expect(sha2).toBe(sha1);
  });
});
