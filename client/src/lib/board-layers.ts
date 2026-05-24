/**
 * Sprint v3.0 / T4 — Capas conmutables del Tablero.
 *
 * El mismo board se puede ver bajo 5 lentes distintos: Distrito (default),
 * Salud, Antigüedad, Tamaño y Cambio reciente. Cada capa decide qué color y
 * qué altura tiene cada nodo, sin tocar la geometría base ni el layout.
 *
 * Las funciones `getColor` y `getHeight` son puras: misma entrada → mismo
 * output. Eso las hace trivialmente testeables y compatibles con animaciones
 * R3F (lerp entre capas anterior y nueva).
 */
import type { BoardData, BoardNode } from "./board-types";

export type LayerId =
  | "district"
  | "health"
  | "age"
  | "size"
  | "change";

export interface LayerDescriptor {
  id: LayerId;
  /** Etiqueta corta para el switcher en el HUD. */
  label: string;
  /** Etiqueta en Modo Papá. */
  labelPapa: string;
  /** Una frase que explica para qué sirve esta capa. */
  description: string;
  /** Emoji-icono ASCII compacto para el botón. */
  glyph: string;
  /** Devuelve el color hex para un nodo bajo esta capa. */
  getColor: (node: BoardNode, data: BoardData) => string;
  /** Devuelve la altura (escala 3D) para un nodo bajo esta capa. */
  getHeight: (node: BoardNode, data: BoardData) => number;
  /** Leyenda (color → significado) que se renderiza debajo del switcher. */
  legend: ReadonlyArray<{ color: string; label: string }>;
}

// ──────────────────────────────────────────────────────────────────────
// Helpers compartidos
// ──────────────────────────────────────────────────────────────────────

/** Altura base proporcional a LOC (escala log). Compatible con Building.tsx. */
export function locToHeight(loc: number): number {
  if (loc <= 0) return 0.4;
  return 0.4 + Math.log10(loc + 1) * 0.55;
}

/** Mezcla lineal entre dos colores hex. t∈[0,1]. */
export function mixHex(a: string, b: string, t: number): string {
  const ax = parseInt(a.replace("#", ""), 16);
  const bx = parseInt(b.replace("#", ""), 16);
  const ar = (ax >> 16) & 0xff;
  const ag = (ax >> 8) & 0xff;
  const ab = ax & 0xff;
  const br = (bx >> 16) & 0xff;
  const bg = (bx >> 8) & 0xff;
  const bb = bx & 0xff;
  const tt = Math.max(0, Math.min(1, t));
  const r = Math.round(ar + (br - ar) * tt);
  const g = Math.round(ag + (bg - ag) * tt);
  const bch = Math.round(ab + (bb - ab) * tt);
  return (
    "#" +
    ((1 << 24) | (r << 16) | (g << 8) | bch).toString(16).slice(1).toUpperCase()
  );
}

/** Edad en días desde el campo last_updated del nodo. */
export function nodeAgeDays(node: BoardNode, now: Date = new Date()): number {
  if (!node.last_updated) return 999;
  const t = Date.parse(node.last_updated);
  if (Number.isNaN(t)) return 999;
  const ms = now.getTime() - t;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// ──────────────────────────────────────────────────────────────────────
// CAPA 1 — DISTRITO (default, identidad cromática original)
// ──────────────────────────────────────────────────────────────────────

const layerDistrict: LayerDescriptor = {
  id: "district",
  label: "Distrito",
  labelPapa: "Por barrio",
  description: "El color cuenta a qué barrio pertenece la pieza.",
  glyph: "▦",
  getColor: (node, data) => {
    const d = data.districts.find((d) => d.id === node.district);
    return d?.color ?? "#F97316";
  },
  getHeight: (node) => locToHeight(node.loc),
  legend: [
    // Se hidrata en runtime por LayerSwitcher con los distritos vivos.
  ],
};

// ──────────────────────────────────────────────────────────────────────
// CAPA 2 — SALUD (pintar piezas degradadas en rojo, futuras en gris)
// ──────────────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  ACTIVE: "#22C55E",
  SPRINT: "#F59E0B",
  DEGRADED: "#DC2626",
  FUTURE: "#52525B",
};

const layerHealth: LayerDescriptor = {
  id: "health",
  label: "Salud",
  labelPapa: "Cómo va",
  description: "Verde funciona, ámbar en obra, rojo enfermo, gris falta.",
  glyph: "♥",
  getColor: (node) => HEALTH_COLOR[node.status] ?? "#71717A",
  getHeight: (node) => locToHeight(node.loc),
  legend: [
    { color: HEALTH_COLOR.ACTIVE, label: "Funciona" },
    { color: HEALTH_COLOR.SPRINT, label: "En obra" },
    { color: HEALTH_COLOR.DEGRADED, label: "Enferma" },
    { color: HEALTH_COLOR.FUTURE, label: "Falta" },
  ],
};

// ──────────────────────────────────────────────────────────────────────
// CAPA 3 — ANTIGÜEDAD (color por edad de last_updated)
// ──────────────────────────────────────────────────────────────────────

const AGE_FRESH = "#FBBF24";
const AGE_OLD = "#312E81";

const layerAge: LayerDescriptor = {
  id: "age",
  label: "Antigüedad",
  labelPapa: "Qué tan reciente",
  description: "Dorado son piezas tocadas hoy, azul son piezas viejas.",
  glyph: "⌛",
  getColor: (node) => {
    const days = nodeAgeDays(node);
    if (node.status === "FUTURE") return "#3F3F46";
    // 0 días → fresh, ≥30 días → old
    const t = Math.min(1, days / 30);
    return mixHex(AGE_FRESH, AGE_OLD, t);
  },
  getHeight: (node) => locToHeight(node.loc),
  legend: [
    { color: AGE_FRESH, label: "Tocada hoy" },
    { color: mixHex(AGE_FRESH, AGE_OLD, 0.5), label: "Hace ~2 semanas" },
    { color: AGE_OLD, label: "Hace 1 mes o más" },
    { color: "#3F3F46", label: "Sin construir" },
  ],
};

// ──────────────────────────────────────────────────────────────────────
// CAPA 4 — TAMAÑO (color por tamaño en LOC, altura amplificada)
// ──────────────────────────────────────────────────────────────────────

const SIZE_SMALL = "#F0FDF4";
const SIZE_LARGE = "#7C2D12";

const layerSize: LayerDescriptor = {
  id: "size",
  label: "Tamaño",
  labelPapa: "Qué tan grande",
  description: "Más oscuro = más grande. La altura se amplifica.",
  glyph: "⬛",
  getColor: (node) => {
    if (node.loc <= 0) return "#3F3F46";
    // 0 LOC → small, ≥3000 LOC → large
    const t = Math.min(1, Math.log10(node.loc + 1) / Math.log10(3001));
    return mixHex(SIZE_SMALL, SIZE_LARGE, t);
  },
  // En esta capa la altura es el dato: usamos amplificación 1.4x
  getHeight: (node) => locToHeight(node.loc) * 1.4,
  legend: [
    { color: SIZE_SMALL, label: "Chiquita (<100)" },
    { color: mixHex(SIZE_SMALL, SIZE_LARGE, 0.5), label: "Mediana (~500)" },
    { color: SIZE_LARGE, label: "Enorme (>3000)" },
  ],
};

// ──────────────────────────────────────────────────────────────────────
// CAPA 5 — CAMBIO RECIENTE (resalta lo tocado en últimos 7 días)
// ──────────────────────────────────────────────────────────────────────

const CHANGE_HOT = "#F97316";
const CHANGE_COLD = "#1F2937";

const layerChange: LayerDescriptor = {
  id: "change",
  label: "Cambio",
  labelPapa: "Qué se movió",
  description: "Naranja brillante = cambió esta semana. Gris = no se ha tocado.",
  glyph: "✦",
  getColor: (node) => {
    if (node.status === "FUTURE") return "#3F3F46";
    const days = nodeAgeDays(node);
    if (days <= 7) return CHANGE_HOT;
    if (days <= 14) return mixHex(CHANGE_HOT, CHANGE_COLD, 0.5);
    return CHANGE_COLD;
  },
  // Lo que cambió se eleva más para destacarlo visualmente.
  getHeight: (node) => {
    const base = locToHeight(node.loc);
    if (node.status === "FUTURE") return base;
    const days = nodeAgeDays(node);
    if (days <= 7) return base * 1.35;
    if (days <= 14) return base * 1.1;
    return base * 0.85;
  },
  legend: [
    { color: CHANGE_HOT, label: "Cambió esta semana" },
    { color: mixHex(CHANGE_HOT, CHANGE_COLD, 0.5), label: "Cambió este mes" },
    { color: CHANGE_COLD, label: "Sin cambios recientes" },
  ],
};

// ──────────────────────────────────────────────────────────────────────
// Registro
// ──────────────────────────────────────────────────────────────────────

export const BOARD_LAYERS: ReadonlyArray<LayerDescriptor> = [
  layerDistrict,
  layerHealth,
  layerAge,
  layerSize,
  layerChange,
];

export const DEFAULT_LAYER: LayerId = "district";

export function getLayer(id: LayerId): LayerDescriptor {
  return BOARD_LAYERS.find((l) => l.id === id) ?? layerDistrict;
}

export function isValidLayer(id: string): id is LayerId {
  return BOARD_LAYERS.some((l) => l.id === id);
}
