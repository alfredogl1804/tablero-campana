/**
 * SprintsPanel — Hito B-lite del Sprint Observatorio Vivo v1.1.
 *
 * Panel deslizante en el lateral derecho que muestra los sprints reales
 * del repo `el-monstruo` ingestados a TiDB. Permite filtrar por status y
 * distrito. Hace click → expande el markdown completo del sprint.
 *
 * Doctrina §3.5: READ-ONLY estricto. No hay buttons con side-effect; solo
 * el botón "Refrescar" del owner dispara `triggerIngest` (única palanca de
 * escritura, expuesta solo si el usuario es owner).
 *
 * Diseño: estética Forja Industrial Brutalista heredada del Tablero. Bordes
 * netos, color naranja Monstruo para acentos, fondo casi negro con grano.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, RefreshCw, X, ChevronRight } from "lucide-react";
import { Streamdown } from "streamdown";

const DISTRICT_LABELS: Record<string, string> = {
  cognicion: "Cognición",
  memoria: "Memoria",
  interfaces: "Interfaces",
  soberania: "Soberanía",
  guardia: "Guardia",
  sentidos: "Sentidos",
  manos: "Manos",
  cimientos: "Cimientos",
  evolucion: "Evolución",
  comercializacion: "Comercialización",
  operaciones: "Operaciones",
  marca: "Marca",
};

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  draft: { label: "Propuesto", tone: "bg-amber-900/40 text-amber-300 border-amber-700/60" },
  signed: { label: "Firmado", tone: "bg-emerald-900/40 text-emerald-300 border-emerald-700/60" },
  executing: { label: "En ejecución", tone: "bg-blue-900/40 text-blue-300 border-blue-700/60" },
  completed: { label: "Completado", tone: "bg-cyan-900/40 text-cyan-300 border-cyan-700/60" },
  rejected: { label: "Rechazado", tone: "bg-red-900/40 text-red-300 border-red-700/60" },
  obsolete: { label: "Obsoleto", tone: "bg-zinc-800 text-zinc-400 border-zinc-700" },
  unknown: { label: "Sin clasificar", tone: "bg-zinc-800 text-zinc-500 border-zinc-700" },
};

interface SprintsPanelProps {
  /** Si está abierto el panel. */
  open: boolean;
  /** Callback al cerrar. */
  onClose: () => void;
  /** Distrito pre-seleccionado al abrir. Si está, filtra desde ya. */
  initialDistrict?: string;
}

export function SprintsPanel({ open, onClose, initialDistrict }: SprintsPanelProps) {
  const auth = useAuth();
  const utils = trpc.useUtils();

  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [districtFilter, setDistrictFilter] = useState<string | undefined>(initialDistrict);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = trpc.sprints.stats.useQuery(undefined, { enabled: open });
  const list = trpc.sprints.list.useQuery(
    { status: statusFilter as never, district: districtFilter, limit: 200 },
    { enabled: open },
  );

  const ingest = trpc.sprints.triggerIngest.useMutation({
    onSuccess: () => {
      utils.sprints.invalidate();
    },
  });

  const isOwner = auth.user?.openId === auth.user?.openId && auth.isAuthenticated;

  const sortedRows = useMemo(() => {
    if (!list.data) return [];
    // Orden: signed > executing > draft > completed > unknown.
    const order = ["signed", "executing", "draft", "completed", "rejected", "obsolete", "unknown"];
    return [...list.data].sort((a, b) => {
      return order.indexOf(a.status) - order.indexOf(b.status);
    });
  }, [list.data]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 240 }}
          className="fixed top-0 right-0 bottom-0 w-full max-w-[480px] z-40 bg-[#0c0a08] border-l border-orange-900/40 shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col pointer-events-auto"
          aria-label="Sprints del observatorio"
        >
          {/* Header */}
          <header className="flex items-center justify-between px-5 py-4 border-b border-orange-900/30 bg-gradient-to-b from-[#1a0e05] to-[#0c0a08]">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-orange-400">
                Sprints del Monstruo
              </h2>
              <p className="text-xs text-zinc-500">
                {stats.data?.total ?? "—"} canonizados ·{" "}
                <span className="text-zinc-400">vivo desde GitHub</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && (
                <button
                  onClick={() => ingest.mutate({})}
                  disabled={ingest.isPending}
                  className="p-2 rounded text-zinc-400 hover:text-orange-300 hover:bg-orange-900/20 transition disabled:opacity-50"
                  title="Refrescar desde GitHub"
                >
                  {ingest.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                aria-label="Cerrar panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Filtros */}
          <div className="px-5 py-3 border-b border-orange-900/20 bg-[#0a0806] flex flex-col gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 mr-1">Estado:</span>
              <FilterChip
                label="Todos"
                active={!statusFilter}
                onClick={() => setStatusFilter(undefined)}
              />
              {Object.entries(stats.data?.byStatus ?? {}).map(([key, count]) => (
                <FilterChip
                  key={key}
                  label={`${STATUS_LABELS[key]?.label ?? key} ${count}`}
                  active={statusFilter === key}
                  onClick={() => setStatusFilter(statusFilter === key ? undefined : key)}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 mr-1">Distrito:</span>
              <FilterChip
                label="Todos"
                active={!districtFilter}
                onClick={() => setDistrictFilter(undefined)}
              />
              {Object.entries(stats.data?.byDistrict ?? {}).map(([key, count]) => (
                <FilterChip
                  key={key}
                  label={`${DISTRICT_LABELS[key] ?? key} ${count}`}
                  active={districtFilter === key}
                  onClick={() =>
                    setDistrictFilter(districtFilter === key ? undefined : key)
                  }
                />
              ))}
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {list.isLoading && (
              <div className="flex items-center justify-center py-12 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Cargando sprints...
              </div>
            )}
            {list.data && sortedRows.length === 0 && (
              <div className="text-center py-12 text-zinc-600 text-sm">
                Sin sprints para los filtros actuales.
              </div>
            )}
            <ul className="flex flex-col gap-1.5">
              {sortedRows.map((sprint) => {
                const isExpanded = expandedId === sprint.sprintId;
                const status = STATUS_LABELS[sprint.status] ?? STATUS_LABELS.unknown;
                const districts = Array.isArray(sprint.affectedDistricts)
                  ? (sprint.affectedDistricts as string[])
                  : [];
                return (
                  <li
                    key={sprint.sprintId}
                    className="border border-zinc-800 hover:border-orange-900/60 transition-colors bg-[#0d0a08] rounded"
                  >
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : sprint.sprintId)
                      }
                      className="w-full text-left px-3 py-2.5 flex flex-col gap-1.5"
                    >
                      <div className="flex items-start gap-2">
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-zinc-600 mt-1 flex-shrink-0 transition-transform ${
                            isExpanded ? "rotate-90" : ""
                          }`}
                        />
                        <span className="text-[13px] text-zinc-200 leading-snug flex-1">
                          {sprint.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pl-5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 border rounded uppercase tracking-wider ${status.tone}`}
                        >
                          {status.label}
                        </span>
                        {districts.slice(0, 3).map((d) => (
                          <span
                            key={d}
                            className="text-[10px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded"
                          >
                            {DISTRICT_LABELS[d] ?? d}
                          </span>
                        ))}
                        {districts.length > 3 && (
                          <span className="text-[10px] text-zinc-600">
                            +{districts.length - 3}
                          </span>
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <SprintDetailLoader sprintId={sprint.sprintId} />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Footer doctrinal */}
          <footer className="px-5 py-2.5 border-t border-orange-900/20 bg-[#0a0806] text-[10px] text-zinc-600 leading-relaxed">
            Read-only. Cada sprint vive en{" "}
            <span className="text-zinc-400">github.com/alfredogl1804/el-monstruo/bridge</span>
            {ingest.data && (
              <span className="block mt-0.5 text-zinc-500">
                Última corrida: {ingest.data.upserted} upserted ·{" "}
                {ingest.data.skipped} omitidos · {ingest.data.durationMs}ms
              </span>
            )}
          </footer>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] px-2 py-0.5 rounded border transition ${
        active
          ? "bg-orange-500/20 text-orange-300 border-orange-700/60"
          : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}

function SprintDetailLoader({ sprintId }: { sprintId: string }) {
  const detail = trpc.sprints.getById.useQuery({ sprintId });
  if (detail.isLoading) {
    return (
      <div className="px-5 py-3 border-t border-zinc-800 text-zinc-500 text-xs flex items-center">
        <Loader2 className="w-3 h-3 animate-spin mr-2" />
        Cargando...
      </div>
    );
  }
  if (!detail.data) {
    return (
      <div className="px-5 py-3 border-t border-zinc-800 text-zinc-600 text-xs">
        Sin contenido.
      </div>
    );
  }
  const ghPath = detail.data.sourcePath;
  const ghUrl = `https://github.com/alfredogl1804/el-monstruo/blob/main/${ghPath}`;
  return (
    <div className="px-5 py-3 border-t border-zinc-800 text-xs text-zinc-300 max-h-[400px] overflow-y-auto">
      <div className="prose prose-invert prose-xs max-w-none">
        <Streamdown>
          {detail.data.descriptionMd?.slice(0, 8000) ?? "_Sin contenido_"}
        </Streamdown>
      </div>
      <div className="mt-3 pt-3 border-t border-zinc-900 text-[10px] text-zinc-600">
        <a
          href={ghUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-orange-400 transition"
        >
          Ver en GitHub →
        </a>
      </div>
    </div>
  );
}
