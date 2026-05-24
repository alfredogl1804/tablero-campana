/**
 * Sprint v3.0 / T7 — Gestos táctiles iPhone.
 *
 * Verifica el helper puro `pinchToZoom` que mapea el factor del pinch al nuevo
 * nivel de zoom respetando los bounds. La integración con
 * @use-gesture/react se valida en el navegador (no se puede simular pinch
 * fielmente en jsdom).
 */
import { describe, it, expect } from "vitest";
import { pinchToZoom } from "../client/src/hooks/useBoardGestures";

const BOUNDS = { min: 14, max: 60 };

describe("pinchToZoom — helper puro", () => {
  it("scale=1 deja el zoom igual al base", () => {
    expect(pinchToZoom(28, 1, BOUNDS)).toBe(28);
  });

  it("scale=2 duplica el zoom respetando max", () => {
    expect(pinchToZoom(20, 2, BOUNDS)).toBe(40);
  });

  it("scale=0.5 corta el zoom a la mitad respetando min", () => {
    expect(pinchToZoom(40, 0.5, BOUNDS)).toBe(20);
  });

  it("clampea hacia max cuando el resultado excede el bound superior", () => {
    expect(pinchToZoom(40, 5, BOUNDS)).toBe(60);
  });

  it("clampea hacia min cuando el resultado cae bajo el bound inferior", () => {
    expect(pinchToZoom(20, 0.1, BOUNDS)).toBe(14);
  });

  it("usa los bounds default cuando no se proveen", () => {
    // Default bounds: { min: 14, max: 60 }
    expect(pinchToZoom(28, 1)).toBe(28);
    expect(pinchToZoom(28, 100)).toBe(60);
    expect(pinchToZoom(28, 0)).toBe(14);
  });

  it("respeta bounds custom diferentes a los default", () => {
    const tightBounds = { min: 24, max: 32 };
    expect(pinchToZoom(28, 0.5, tightBounds)).toBe(24);
    expect(pinchToZoom(28, 2, tightBounds)).toBe(32);
    expect(pinchToZoom(28, 1, tightBounds)).toBe(28);
  });

  it("es función pura: mismo input → mismo output", () => {
    const a = pinchToZoom(28, 1.7, BOUNDS);
    const b = pinchToZoom(28, 1.7, BOUNDS);
    const c = pinchToZoom(28, 1.7, BOUNDS);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
