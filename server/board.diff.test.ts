/**
 * Vitest del Sprint v3.0 / T1 — diff entre snapshots.
 *
 * Verifica el corazón de la sincronización viva: si la fuente cambia,
 * el SHA del payload cambia, y por tanto el handler /api/scheduled/refreshBoard
 * detecta el cambio e inserta un snapshot nuevo. Si la fuente NO cambia,
 * el SHA permanece y el handler reporta `no_changes_detected`.
 *
 * Estrategia: copiamos el genoma a un archivo temporal, ejecutamos el script
 * apuntando a una ruta alternativa vía override, comparamos el payload_sha
 * antes y después de mutar el archivo.
 *
 * Como build_board_data.py decide la fuente vía rutas hardcoded (canonical
 * mount o local fallback), aquí trabajamos a nivel del JSON resultante:
 *   1. Ejecutamos el script (snapshot A)
 *   2. Capturamos sha_A
 *   3. Mutamos el snapshot local de respaldo en scripts/board_sources/
 *   4. Re-ejecutamos
 *   5. Si hubiera cambio en fuente, sha_B ≠ sha_A
 *
 * Para no contaminar el repo del Monstruo, esto solo es válido cuando
 * SOURCE_MODE=local_snapshot_fallback. En CI ese es el caso. En sandbox con
 * el mount activo, validamos solo determinismo (sha estable entre ejecuciones
 * sin cambios) — eso ya está cubierto en board.snapshot.test.ts.
 */
import { describe, it, expect } from "vitest";
import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = resolve(__dirname, "..");
const SCRIPT_PATH = resolve(PROJECT_ROOT, "scripts/build_board_data.py");
const BOARD_PATH = resolve(PROJECT_ROOT, "client/src/data/board_data.json");
const LOCAL_GENOME = resolve(
  PROJECT_ROOT,
  "scripts/board_sources/MONSTRUO_GENOME.yaml",
);
const CANONICAL_GENOME = "/mnt/desktop/el-monstruo/MONSTRUO_GENOME.yaml";

const PYTHON_ENV = {
  PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
};

function runScript() {
  return spawnSync("/usr/bin/python3.11", [SCRIPT_PATH], {
    cwd: PROJECT_ROOT,
    encoding: "utf-8",
    env: PYTHON_ENV,
  });
}

function readSha(): string {
  const board = JSON.parse(readFileSync(BOARD_PATH, "utf-8")) as {
    meta: { payload_sha: string; total_nodes: number; system_health: number };
  };
  return board.meta.payload_sha;
}

describe("BoardData snapshot diff (T1 sincronización viva)", () => {
  it("ejecuciones consecutivas sobre la misma fuente producen el mismo SHA (determinismo)", () => {
    const r1 = runScript();
    expect(r1.status).toBe(0);
    const sha1 = readSha();

    const r2 = runScript();
    expect(r2.status).toBe(0);
    const sha2 = readSha();

    expect(sha2).toBe(sha1);
  });

  it("una mutación en el genoma cambia el SHA del payload (diff real)", () => {
    // Solo podemos mutar la fuente local; nunca la canonical mount.
    // Si hay mount canónico activo, este test salta con un warning explícito
    // pero NO falla (cero ruido en sandbox local del developer).
    const hasCanonical = existsSync(CANONICAL_GENOME);
    if (hasCanonical) {
      console.warn(
        "[board.diff.test] mount canónico activo, test de mutación skipped",
      );
      return;
    }

    expect(existsSync(LOCAL_GENOME)).toBe(true);

    // Backup del genoma local
    const backupPath = `${LOCAL_GENOME}.test-backup`;
    copyFileSync(LOCAL_GENOME, backupPath);

    try {
      const original = readFileSync(LOCAL_GENOME, "utf-8");

      // Snapshot A
      const rA = runScript();
      expect(rA.status).toBe(0);
      const shaA = readSha();

      // Mutación: agregamos una línea al final del genoma
      writeFileSync(
        LOCAL_GENOME,
        original + "\n# test-mutation: " + Date.now() + "\n",
      );

      // Snapshot B
      const rB = runScript();
      expect(rB.status).toBe(0);
      const shaB = readSha();

      expect(shaB).not.toBe(shaA);
    } finally {
      // Restaurar siempre
      copyFileSync(backupPath, LOCAL_GENOME);
      // Re-ejecutar para dejar BOARD_PATH consistente con el genoma original
      runScript();
    }
  });

  it("source_mode declarado coincide con la realidad del filesystem", () => {
    runScript();
    const board = JSON.parse(readFileSync(BOARD_PATH, "utf-8")) as {
      meta: { source_mode: string; source_path: string };
    };
    const hasCanonical = existsSync(CANONICAL_GENOME);
    if (hasCanonical) {
      expect(board.meta.source_mode).toBe("canonical_mount");
      expect(board.meta.source_path).toContain("/mnt/desktop/el-monstruo");
    } else {
      expect(board.meta.source_mode).toBe("local_snapshot_fallback");
      expect(board.meta.source_path).toContain("scripts/board_sources");
    }
  });
});
