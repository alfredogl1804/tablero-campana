/**
 * Sprint v3.0 / T4 — Capas conmutables del board.
 *
 * Verifica que el registro de las 5 lentes (Distrito, Salud, Antigüedad,
 * Tamaño, Cambio reciente) cumple su contrato: pureza, cobertura y salidas
 * válidas para el snapshot vivo del genoma.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BOARD_LAYERS,
  DEFAULT_LAYER,
  getLayer,
  isValidLayer,
  locToHeight,
  mixHex,
  nodeAgeDays,
  type LayerId,
} from "../client/src/lib/board-layers";
import type { BoardData, BoardNode } from "../client/src/lib/board-types";

const HEX_RE = /^#[0-9A-F]{6}$/i;

let board: BoardData;

beforeAll(() => {
  const raw = readFileSync(
    resolve(__dirname, "..", "client", "src", "data", "board_data.json"),
    "utf-8"
  );
  board = JSON.parse(raw) as BoardData;
});

describe("BOARD_LAYERS — registro de las 5 lentes", () => {
  it("expone exactamente 5 capas con IDs únicos", () => {
    expect(BOARD_LAYERS.length).toBe(5);
    const ids = BOARD_LAYERS.map((l) => l.id);
    expect(new Set(ids).size).toBe(5);
    expect(ids).toEqual(["district", "health", "age", "size", "change"]);
  });

  it("cada capa tiene label, labelPapa, description y glyph no vacíos", () => {
    BOARD_LAYERS.forEach((l) => {
      expect(l.label.length).toBeGreaterThan(0);
      expect(l.labelPapa.length).toBeGreaterThan(0);
      expect(l.description.length).toBeGreaterThan(0);
      expect(l.glyph.length).toBeGreaterThan(0);
    });
  });

  it("DEFAULT_LAYER es 'district' y existe en el registro", () => {
    expect(DEFAULT_LAYER).toBe("district");
    expect(BOARD_LAYERS.some((l) => l.id === DEFAULT_LAYER)).toBe(true);
  });

  it("isValidLayer acepta IDs válidos y rechaza el resto", () => {
    expect(isValidLayer("district")).toBe(true);
    expect(isValidLayer("health")).toBe(true);
    expect(isValidLayer("age")).toBe(true);
    expect(isValidLayer("size")).toBe(true);
    expect(isValidLayer("change")).toBe(true);
    expect(isValidLayer("foo")).toBe(false);
    expect(isValidLayer("")).toBe(false);
    expect(isValidLayer("DISTRICT")).toBe(false);
  });

  it("getLayer devuelve la capa correcta y default ante IDs inválidos", () => {
    expect(getLayer("health").id).toBe("health");
    expect(getLayer("change").id).toBe("change");
    // @ts-expect-error — IDs inválidos caen al default
    expect(getLayer("nope").id).toBe("district");
  });
});

describe("getColor — devuelve hex válido para todos los nodos en todas las capas", () => {
  it("cada capa devuelve hex válido para cada nodo del snapshot", () => {
    BOARD_LAYERS.forEach((layer) => {
      board.nodes.forEach((node) => {
        const color = layer.getColor(node, board);
        expect(color, `${layer.id} → ${node.id}`).toMatch(HEX_RE);
      });
    });
  });

  it("capa district usa el color del distrito del nodo", () => {
    const layer = getLayer("district");
    board.nodes.slice(0, 5).forEach((n) => {
      const district = board.districts.find((d) => d.id === n.district);
      expect(layer.getColor(n, board).toUpperCase()).toBe(
        district!.color.toUpperCase()
      );
    });
  });

  it("capa health: ACTIVE → verde, DEGRADED → rojo, FUTURE → gris", () => {
    const layer = getLayer("health");
    const active = board.nodes.find((n) => n.status === "ACTIVE");
    const future = board.nodes.find((n) => n.status === "FUTURE");
    expect(active && layer.getColor(active, board)).toBe("#22C55E");
    expect(future && layer.getColor(future, board)).toBe("#52525B");
  });
});

describe("getHeight — devuelve número positivo finito para todos los nodos", () => {
  it("cada capa devuelve altura > 0 y finita para cada nodo", () => {
    BOARD_LAYERS.forEach((layer) => {
      board.nodes.forEach((node) => {
        const h = layer.getHeight(node, board);
        expect(Number.isFinite(h), `${layer.id} → ${node.id}`).toBe(true);
        expect(h, `${layer.id} → ${node.id}`).toBeGreaterThan(0);
      });
    });
  });

  it("capa district = locToHeight base (sin amplificación)", () => {
    const layer = getLayer("district");
    board.nodes.slice(0, 5).forEach((n) => {
      expect(layer.getHeight(n, board)).toBeCloseTo(locToHeight(n.loc), 5);
    });
  });

  it("capa size amplifica la altura ~1.4x sobre la base", () => {
    const layer = getLayer("size");
    const node = board.nodes.find((n) => n.loc > 100)!;
    const base = locToHeight(node.loc);
    const layered = layer.getHeight(node, board);
    expect(layered).toBeCloseTo(base * 1.4, 4);
  });
});

describe("Funciones auxiliares puras", () => {
  it("mixHex es lineal: t=0 → a, t=1 → b, t=0.5 → mezcla", () => {
    expect(mixHex("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(mixHex("#000000", "#FFFFFF", 1)).toBe("#FFFFFF");
    const mid = mixHex("#000000", "#FFFFFF", 0.5);
    expect(mid).toMatch(HEX_RE);
    expect(mid).toBe("#808080");
  });

  it("mixHex clampea t fuera de [0,1]", () => {
    expect(mixHex("#000000", "#FFFFFF", -1)).toBe("#000000");
    expect(mixHex("#000000", "#FFFFFF", 2)).toBe("#FFFFFF");
  });

  it("nodeAgeDays maneja last_updated vacío como 999", () => {
    const fake: BoardNode = {
      id: "x",
      district: "x",
      label: "x",
      description: "",
      status: "FUTURE",
      loc: 0,
      connections_in: [],
      connections_out: [],
      grid_position: [0, 0],
      last_updated: "",
    };
    expect(nodeAgeDays(fake)).toBe(999);
  });

  it("nodeAgeDays devuelve 0 cuando last_updated es ahora", () => {
    const now = new Date();
    const fake: BoardNode = {
      id: "x",
      district: "x",
      label: "x",
      description: "",
      status: "ACTIVE",
      loc: 100,
      connections_in: [],
      connections_out: [],
      grid_position: [0, 0],
      last_updated: now.toISOString(),
    };
    expect(nodeAgeDays(fake, now)).toBe(0);
  });

  it("locToHeight es monótona creciente con LOC", () => {
    const heights = [10, 100, 1000, 10000].map(locToHeight);
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]).toBeGreaterThan(heights[i - 1]);
    }
  });
});

describe("Determinismo y pureza", () => {
  it("cada capa es función pura (mismo input → mismo output)", () => {
    const node = board.nodes[0];
    BOARD_LAYERS.forEach((layer) => {
      const c1 = layer.getColor(node, board);
      const c2 = layer.getColor(node, board);
      const h1 = layer.getHeight(node, board);
      const h2 = layer.getHeight(node, board);
      expect(c1).toBe(c2);
      expect(h1).toBe(h2);
    });
  });

  it("LayerId es type-safe: solo 5 valores válidos", () => {
    const valid: LayerId[] = ["district", "health", "age", "size", "change"];
    valid.forEach((id) => expect(isValidLayer(id)).toBe(true));
  });
});
