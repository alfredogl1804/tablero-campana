/**
 * Sprint v3.0 / T4 — Hook useLayer.
 *
 * Maneja la capa activa del board (Distrito | Salud | Antigüedad | Tamaño |
 * Cambio) y la persiste en localStorage para que la elección sobreviva al
 * refresh.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BOARD_LAYERS,
  DEFAULT_LAYER,
  getLayer,
  isValidLayer,
  type LayerId,
  type LayerDescriptor,
} from "@/lib/board-layers";

const STORAGE_KEY = "tablero-campana-layer-v1";

export function useLayer() {
  const [layerId, setLayerIdState] = useState<LayerId>(() => {
    if (typeof window === "undefined") return DEFAULT_LAYER;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && isValidLayer(raw)) return raw;
    } catch {
      // localStorage puede fallar (modo privado, sandbox)
    }
    return DEFAULT_LAYER;
  });

  const setLayerId = useCallback((next: LayerId) => {
    setLayerIdState(next);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      /* no-op */
    }
  }, []);

  // Sync entre pestañas
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue && isValidLayer(e.newValue)) {
        setLayerIdState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const layer: LayerDescriptor = useMemo(() => getLayer(layerId), [layerId]);

  return {
    layerId,
    setLayerId,
    layer,
    layers: BOARD_LAYERS,
  };
}
