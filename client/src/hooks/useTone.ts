/**
 * Sprint v3.0 / T3 — hook useTone().
 *
 * Devuelve el tono activo (default | papa) y traductores enlazados,
 * para que cada componente del HUD pueda mapear vocabulario sin tener que
 * pasar `tone` en cada llamada.
 *
 * Política: El tono se deriva del AccessibilityContext (`mode`). Si en el
 * futuro queremos un toggle independiente de tono (sin cambiar tipografía),
 * basta agregar un nuevo context y cambiar este hook — los consumidores
 * NO se enteran.
 */
import { useAccessibility } from "@/contexts/AccessibilityContext";
import {
  type Tone,
  translateLabel,
  translateStatus,
  translateStatusDescription,
  translateDistrict,
  humanizeMetric,
  humanizeKernelTerm,
} from "@/lib/tone";

export function useTone() {
  const { mode } = useAccessibility();
  const tone: Tone = mode === "papa" ? "papa" : "default";
  const isPapa = tone === "papa";

  return {
    tone,
    isPapa,
    label: (nodeId: string, fallback: string) =>
      translateLabel(nodeId, fallback, tone),
    status: (status: string) => translateStatus(status, tone),
    statusDescription: (status: string) =>
      translateStatusDescription(status, tone),
    district: (districtId: string, fallback: string) =>
      translateDistrict(districtId, fallback, tone),
    metric: (metric: "loc", value: number) => humanizeMetric(metric, value, tone),
    term: (raw: string) => humanizeKernelTerm(raw, tone),
  };
}
