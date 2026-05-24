/**
 * TimelineSlider — Sprint v3.0 / T5 Memoria histórica
 *
 * Permite a Don Alfredo viajar al pasado del Monstruo: muestra los últimos N
 * snapshots como burbujas en una línea de tiempo horizontal. Al seleccionar
 * uno, el resto del HUD reconstruye el estado del board en ese momento.
 *
 * Reglas:
 * 1. La burbuja "ahora" siempre es la más reciente.
 * 2. Tamaño de burbuja proporcional a `total_nodes` (más nodos = más grande).
 * 3. Color de borde según `system_health` (verde >0.75, ámbar 0.55-0.75, rojo <0.55).
 * 4. Hover muestra `capturedAt` + nodos + salud.
 * 5. Tono Modo Papá traduce "snapshots" → "fotografías del Monstruo".
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, ArrowLeft } from "lucide-react";
import { useTone } from "@/hooks/useTone";
import { trpc } from "@/lib/trpc";

interface TimelineSliderProps {
  /** Id del snapshot histórico activo. null = viendo el ahora. */
  activeSnapshotId: number | null;
  /** Callback cuando el usuario selecciona un snapshot. null = volver al ahora. */
  onSelectSnapshot: (id: number | null) => void;
  /** Id del snapshot vigente (current). Para destacar la burbuja "ahora". */
  currentSnapshotId: number | null;
}

function healthColor(h: number): string {
  if (h >= 0.75) return "rgb(34, 197, 94)"; // verde
  if (h >= 0.55) return "rgb(245, 158, 11)"; // ámbar
  return "rgb(239, 68, 68)"; // rojo
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const ms = now - date.getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "hace segundos";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.round(h / 24);
  return `hace ${d}d`;
}

export function TimelineSlider({
  activeSnapshotId,
  onSelectSnapshot,
  currentSnapshotId,
}: TimelineSliderProps) {
  const tn = useTone();
  const history = trpc.board.history.useQuery(
    { limit: 30 },
    { refetchInterval: 60_000, refetchOnWindowFocus: false },
  );

  const sortedSnapshots = useMemo(() => {
    const rows = history.data ?? [];
    // Cliente: viejo → nuevo (izquierda → derecha)
    return [...rows].sort(
      (a, b) =>
        new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
    );
  }, [history.data]);

  const isTimeTraveling = activeSnapshotId !== null;
  const titleNow = tn.isPapa ? "ahora" : "live";
  const titleHistory = tn.isPapa
    ? "Línea del tiempo del Monstruo"
    : "Timeline";
  const subtitleHistory = tn.isPapa
    ? "Cada burbuja es una fotografía. Toca una para ver cómo estaba el Monstruo en ese momento."
    : "Snapshots históricos. Click en una burbuja para reconstruir ese momento.";

  if (history.isLoading) {
    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto">
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-full px-4 py-2 text-xs text-zinc-400 flex items-center gap-2 backdrop-blur-md">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>{tn.isPapa ? "Cargando memoria…" : "Cargando timeline…"}</span>
        </div>
      </div>
    );
  }

  if (sortedSnapshots.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto z-30 max-w-[92vw]"
    >
      <div className="bg-zinc-900/85 border border-zinc-800 rounded-2xl px-4 py-3 backdrop-blur-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              {titleHistory}
            </span>
            {isTimeTraveling && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 uppercase tracking-wide">
                {tn.isPapa ? "Viaje en el tiempo" : "Time travel"}
              </span>
            )}
          </div>
          {isTimeTraveling && (
            <button
              type="button"
              onClick={() => onSelectSnapshot(null)}
              className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              {tn.isPapa ? "Volver al ahora" : "Back to live"}
            </button>
          )}
        </div>

        {/* Subtitle */}
        <p className="text-[10px] text-zinc-500 mb-3 leading-snug">
          {subtitleHistory}
        </p>

        {/* Burbujas */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1 px-1 scrollbar-thin scrollbar-thumb-zinc-700"
          style={{ maxWidth: "min(90vw, 760px)" }}
        >
          {sortedSnapshots.map((snap) => {
            const isActive =
              activeSnapshotId === snap.id ||
              (activeSnapshotId === null && snap.id === currentSnapshotId);
            const isLatest = snap.id === currentSnapshotId;
            const size = Math.max(
              22,
              Math.min(38, 16 + Math.sqrt(snap.totalNodes ?? 0) * 2.2),
            );
            const color = healthColor(snap.systemHealth ?? 0);
            const date = new Date(snap.capturedAt);
            const tooltip = [
              isLatest ? `(${titleNow}) ` : "",
              formatRelative(date),
              " · ",
              snap.totalNodes ?? 0,
              tn.isPapa ? " piezas" : " nodes",
              " · ",
              tn.isPapa ? "salud " : "health ",
              ((snap.systemHealth ?? 0) * 100).toFixed(0),
              "%",
            ].join("");

            return (
              <button
                key={snap.id}
                type="button"
                title={tooltip}
                onClick={() => onSelectSnapshot(isLatest ? null : snap.id)}
                className="relative flex-shrink-0 transition-transform hover:scale-110"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                }}
              >
                <span
                  className="block rounded-full transition-all"
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: isActive
                      ? color
                      : `${color.slice(0, -1)}, 0.25)`.replace("rgb", "rgba"),
                    border: `2px solid ${color}`,
                    boxShadow: isActive
                      ? `0 0 14px ${color}`
                      : "none",
                  }}
                />
                {isLatest && (
                  <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-amber-500 text-black font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    •
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer mini-stats */}
        <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-500">
          <span>
            {sortedSnapshots.length} {tn.isPapa ? "fotografías" : "snapshots"}
          </span>
          <span>
            {tn.isPapa ? "más viejo" : "oldest"} →{" "}
            {tn.isPapa ? "más nuevo" : "newest"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
