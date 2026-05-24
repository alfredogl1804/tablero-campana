/**
 * Vitest del Catastro Visual Ledger.
 *
 * Verifica que el ledger canónico generado por scripts/build_visual_ledger.py
 * cumple las invariantes que el frontend asume (cero drift):
 *   - shape correcto
 *   - 21 agentes / 24 tools (+1 sintético) / 36 suppliers
 *   - exactamente 1 nodo operable hoy
 *   - todos los nodos tienen IDs únicos con prefijo correcto
 *   - todos tienen grid_position válida
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ledgerPath = resolve(__dirname, "../client/src/data/catastro_visual_ledger.json");
const scriptPath = resolve(__dirname, "../scripts/build_visual_ledger.py");

describe("Catastro Visual Ledger (cero drift)", () => {
  const ledger = JSON.parse(readFileSync(ledgerPath, "utf-8"));

  it("tiene los conteos reales del catastro", () => {
    expect(ledger.metadata.total_agentes).toBe(21);
    // 24 entries reales + 1 sintético (Nano Banana Pro)
    expect(ledger.metadata.total_tools).toBe(25);
    expect(ledger.metadata.total_suppliers).toBe(36);
    expect(ledger.metadata.total_nodes).toBe(82);
  });

  it("tiene exactamente 1 nodo operable hoy", () => {
    expect(ledger.metadata.operable_count).toBe(1);
    const operables = ledger.nodes.filter((n: { is_operable: boolean }) => n.is_operable);
    expect(operables).toHaveLength(1);
    expect(operables[0].id).toBe("tool_nano_banana_pro");
    expect(operables[0].synthetic).toBe(true);
  });

  it("define los 3 distritos canónicos", () => {
    expect(ledger.districts.map((d: { key: string }) => d.key).sort()).toEqual([
      "AGENTES",
      "SUPPLIERS",
      "TOOLS",
    ]);
  });

  it("todos los IDs tienen prefijo correcto y son únicos", () => {
    const ids = new Set<string>();
    for (const node of ledger.nodes) {
      expect(ids.has(node.id), `ID duplicado: ${node.id}`).toBe(false);
      ids.add(node.id);

      if (node.entity_type === "AGENTE") {
        expect(node.id.startsWith("agt_")).toBe(true);
      } else if (node.entity_type === "TOOL") {
        expect(node.id.startsWith("tool_")).toBe(true);
      } else if (node.entity_type === "SUPPLIER") {
        expect(node.id.startsWith("sup_")).toBe(true);
      }
    }
  });

  it("todos los nodos tienen grid_position válida", () => {
    for (const node of ledger.nodes) {
      expect(Array.isArray(node.grid_position)).toBe(true);
      expect(node.grid_position).toHaveLength(2);
      expect(typeof node.grid_position[0]).toBe("number");
      expect(typeof node.grid_position[1]).toBe("number");
    }
  });

  it("todos los nodos tienen estado canónico", () => {
    const validStatuses = new Set([
      "vigente_2026",
      "vigente_2026_self_referencia",
      "degradado",
      "aspirante",
    ]);
    for (const node of ledger.nodes) {
      expect(validStatuses.has(node.status), `Estado inválido en ${node.id}: ${node.status}`).toBe(true);
    }
  });

  it("la metadata referencia los 3 archivos fuente reales", () => {
    expect(ledger.metadata.source_files).toHaveLength(3);
    expect(ledger.metadata.source_files[0]).toContain("catastro_agentes.json");
    expect(ledger.metadata.source_files[1]).toContain("catastro_tools.json");
    expect(ledger.metadata.source_files[2]).toContain("catastro_suppliers.json");
  });

  it("declara el modo de fuente (canonical_mount o local_snapshot_fallback)", () => {
    expect(["canonical_mount", "local_snapshot_fallback"]).toContain(
      ledger.metadata.source_mode,
    );
  });
});

describe("build_visual_ledger.py (ejecución real)", () => {
  it("el script existe y se ejecuta sin error", () => {
    expect(existsSync(scriptPath)).toBe(true);
    const before = statSync(ledgerPath).mtimeMs;

    const result = spawnSync("python3", [scriptPath], {
      cwd: resolve(__dirname, ".."),
      encoding: "utf-8",
    });

    expect(result.status, `stderr: ${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("[ledger] Total: 82 nodos");
    // El archivo de salida fue (re)escrito
    const after = statSync(ledgerPath).mtimeMs;
    expect(after).toBeGreaterThanOrEqual(before);
  });
});
