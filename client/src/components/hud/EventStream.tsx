/**
 * EventStream HUD — overlay flotante que muestra el bus vivo del observatorio.
 *
 * Doctrina v1.1:
 *   - Lee solo eventos verificados (firma ed25519 válida).
 *   - Dot indicator de status: live (verde) | polling (ambar) | down (rojo).
 *   - Polling tRPC cada 2s mientras la pestaña esté visible.
 *   - Auto-collapse cuando hay >5min sin eventos para no distraer.
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Activity, ShieldCheck, AlertTriangle, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EventStreamProps {
  initialOpen?: boolean;
}

export function EventStream({ initialOpen = false }: EventStreamProps) {
  const [open, setOpen] = useState(initialOpen);

  // Polling cada 2 segundos cuando está abierto
  const eventsQuery = trpc.observatorio.getRecent.useQuery(
    { limit: 50, onlyVerified: true },
    {
      refetchInterval: open ? 2000 : false,
      enabled: open,
      refetchOnWindowFocus: true,
    },
  );

  const metricsQuery = trpc.observatorio.getMetrics.useQuery(undefined, {
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const events = eventsQuery.data ?? [];
  const metrics = metricsQuery.data;

  const statusColor = useMemo(() => {
    if (!metrics) return "bg-zinc-500";
    if (metrics.status === "live") return "bg-green-500";
    if (metrics.status === "polling_fallback") return "bg-amber-500";
    if (metrics.status === "connecting") return "bg-blue-500";
    return "bg-red-500";
  }, [metrics]);

  return (
    <>
      {/* Dot indicator persistente arriba derecha */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir Stream del Observatorio"
        className="fixed top-4 right-4 z-30 pointer-events-auto flex items-center gap-2 rounded-full bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 border border-zinc-700/60 hover:border-zinc-500 transition-colors shadow-lg"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute inset-0 rounded-full ${statusColor} animate-ping opacity-50`} />
          <span className={`relative rounded-full h-2.5 w-2.5 ${statusColor}`} />
        </span>
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-200">
          BUS
        </span>
        {metrics && (
          <span className="text-xs font-mono text-zinc-400">
            {metrics.total_verified}/{metrics.total_received}
          </span>
        )}
      </button>

      {/* Drawer con stream */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: "spring", damping: 24 }}
            className="fixed top-16 right-4 bottom-4 w-[420px] z-30 pointer-events-auto"
          >
            <div className="h-full bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-lg shadow-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-zinc-300" />
                  <h2 className="text-sm font-bold tracking-wide uppercase text-zinc-100">
                    Bus del Observatorio
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-zinc-400 hover:text-zinc-100"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Metrics ribbon */}
              {metrics && (
                <div className="px-4 py-2 bg-zinc-900/50 border-b border-zinc-800 grid grid-cols-3 gap-2 text-xs font-mono">
                  <div>
                    <div className="text-zinc-500 uppercase">Status</div>
                    <div className={`font-bold ${
                      metrics.status === "live" ? "text-green-400" :
                      metrics.status === "polling_fallback" ? "text-amber-400" :
                      metrics.status === "connecting" ? "text-blue-400" : "text-red-400"
                    }`}>
                      {metrics.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 uppercase">Verified</div>
                    <div className="text-zinc-100">
                      {metrics.total_verified}
                      {metrics.total_rejected > 0 && (
                        <span className="text-red-400 ml-1">
                          (-{metrics.total_rejected})
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 uppercase">Lag</div>
                    <div className="text-zinc-100">
                      {metrics.last_lag_ms !== null
                        ? metrics.last_lag_ms < 60000
                          ? `${metrics.last_lag_ms}ms`
                          : `${Math.floor(metrics.last_lag_ms / 1000)}s`
                        : "—"}
                    </div>
                  </div>
                </div>
              )}

              {/* Stream */}
              <div className="flex-1 overflow-y-auto">
                {events.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 text-sm">
                    {eventsQuery.isLoading
                      ? "Suscribiendo al bus..."
                      : "Sin eventos verificados todavía. El bus está vivo, esperando publicaciones firmadas."}
                  </div>
                ) : (
                  <ul className="divide-y divide-zinc-800/50">
                    {events.map((ev) => (
                      <EventRow key={ev.id} event={ev} />
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-zinc-800 text-[10px] font-mono text-zinc-600 flex justify-between">
                <span>kernel_events_stream_signed</span>
                <span>v1 · ed25519</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface EventRowProps {
  event: {
    id: number;
    event_type: string;
    source: string;
    source_table: string;
    payload: Record<string, unknown>;
    emitted_at: string;
    verified: boolean;
    affects_districts: string[] | null;
  };
}

function EventRow({ event }: EventRowProps) {
  const [expanded, setExpanded] = useState(false);
  const ago = formatDistanceToNow(new Date(event.emitted_at), { addSuffix: true });

  return (
    <li className="px-4 py-3 hover:bg-zinc-900/40 transition-colors">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-2">
          {event.verified ? (
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-green-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-red-400 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-bold text-zinc-200 truncate">
                {event.event_type}
              </span>
              <span className="text-[10px] font-mono text-zinc-500 flex-shrink-0">
                {ago}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-zinc-500 truncate">
                {event.source}
              </span>
              {event.affects_districts && event.affects_districts.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {event.affects_districts.join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <pre className="mt-2 ml-5 p-2 bg-zinc-900/80 rounded text-[10px] text-zinc-300 overflow-x-auto">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      )}
    </li>
  );
}
