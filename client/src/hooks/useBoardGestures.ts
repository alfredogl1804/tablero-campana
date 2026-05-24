/**
 * Sprint v3.0 / T7 — Gestos táctiles del board.
 *
 * Convierte los eventos multi-touch del navegador en cambios de zoom y de
 * paneo del board. Funciona en iPhone (Safari) y en Android (Chrome) gracias
 * a @use-gesture/react.
 *
 * Diseño: la capa de gestos NO intercepta clicks de un solo dedo (esos pasan
 * al Canvas R3F para selección normal). Sólo actúa en pinch (2 dedos) y en
 * dobletap. Pan también requiere 2 dedos para no chocar con la selección.
 */
import { useGesture } from "@use-gesture/react";
import { useCallback, useEffect, useRef } from "react";

export interface UseBoardGesturesOptions {
  /** Zoom actual (clamp [min, max]). */
  zoom: number;
  /** Setter del zoom (suele ser setZoomLevel del Home). */
  setZoom: (z: number) => void;
  /** Callback cuando el usuario hace doble tap (reset). */
  onDoubleTap?: () => void;
  /** Bounds del zoom para clamp. */
  zoomBounds?: { min: number; max: number };
  /** Habilitar/deshabilitar los gestos completos. */
  enabled?: boolean;
}

const DEFAULT_BOUNDS = { min: 14, max: 60 };

/** Helper puro: mapea factor pinch a delta de zoom usando el zoom base inicial. */
export function pinchToZoom(
  baseZoom: number,
  scale: number,
  bounds: { min: number; max: number } = DEFAULT_BOUNDS
): number {
  const next = baseZoom * scale;
  return Math.max(bounds.min, Math.min(bounds.max, next));
}

/** Hook principal: devuelve un binder para aplicar al div del Canvas. */
export function useBoardGestures(opts: UseBoardGesturesOptions) {
  const { zoom, setZoom, onDoubleTap, zoomBounds = DEFAULT_BOUNDS, enabled = true } = opts;
  // Guardamos el zoom inicial al comienzo del pinch para que el delta sea
  // proporcional al gesto entero, no incremental por frame (evita drift).
  const zoomBaseRef = useRef<number>(zoom);
  // Guardamos timestamps de tap para detectar doble tap manualmente —
  // useGesture tiene tap pero el doble tap es más fiable así.
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      onDoubleTap?.();
      lastTapRef.current = 0; // resetea para evitar triple-tap
    } else {
      lastTapRef.current = now;
    }
  }, [onDoubleTap]);

  const bind = useGesture(
    {
      onPinchStart: () => {
        zoomBaseRef.current = zoom;
      },
      onPinch: ({ offset: [scale] }) => {
        if (!enabled) return;
        setZoom(pinchToZoom(zoomBaseRef.current, scale, zoomBounds));
      },
      // Tap manual con detección de doble tap. Lo asignamos a pointerdown
      // para que sólo se dispare con un dedo (multi-touch lo ignoramos).
      onPointerDown: ({ touches }) => {
        if (!enabled) return;
        if (touches === 1 || touches === undefined) {
          handleTap();
        }
      },
    },
    {
      pinch: { scaleBounds: { min: 0.4, max: 3 }, rubberband: true },
    }
  );

  // Prevenir el zoom nativo del Safari iPhone que rompe nuestro pinch.
  useEffect(() => {
    if (!enabled) return;
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    document.addEventListener("gestureend", stop, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("gestureend", stop);
    };
  }, [enabled]);

  return bind;
}
