/**
 * StarMapPanel — Mapa estelar del ecosistema del Monstruo.
 *
 * Hito C — Sprint Observatorio Vivo v1.1.
 *
 * Drawer lateral derecho que muestra:
 *  - Visualización 2D radial: kernel central + satélites por categoría
 *  - Lista filtrable por categoría/status
 *  - Badge de freshness (días desde último push)
 *  - Click → detalle del proyecto + histórico de pings
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { X, ExternalLink, Activity, Clock, Globe, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarMapPanelProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  kernel_core: "Núcleo",
  production_app: "Producción",
  interface: "Interfaz",
  infrastructure: "Infraestructura",
  lab: "Laboratorio",
};

const CATEGORY_COLOR: Record<string, string> = {
  kernel_core: "#FF8800",
  production_app: "#22C55E",
  interface: "#A855F7",
  infrastructure: "#3B82F6",
  lab: "#F59E0B",
};

const STATUS_COLOR: Record<string, string> = {
  active: "#22C55E",
  dormant: "#F59E0B",
  deprecated: "#EF4444",
  unknown: "#6B7280",
};

function freshnessLabel(pushedAt: Date | string | null): string {
  if (!pushedAt) return "—";
  const ms = Date.now() - new Date(pushedAt).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}m`;
  return `${Math.floor(days / 365)}a`;
}

export function StarMapPanel({ open, onClose }: StarMapPanelProps) {
  const projectsQ = trpc.ecosystem.list.useQuery(undefined, {
    enabled: open,
    refetchInterval: open ? 60_000 : false,
  });
  const statsQ = trpc.ecosystem.stats.useQuery(undefined, {
    enabled: open,
    refetchInterval: open ? 60_000 : false,
  });
  const refreshM = trpc.ecosystem.refreshAll.useMutation({
    onSuccess: () => {
      projectsQ.refetch();
      statsQ.refetch();
    },
  });
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const projects = projectsQ.data ?? [];
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (filterCategory && p.category !== filterCategory) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  }, [projects, filterCategory, filterStatus]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 480, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 480, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="fixed top-0 right-0 h-full w-[480px] z-40 pointer-events-auto bg-zinc-950/95 backdrop-blur-md border-l border-orange-500/30 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-orange-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <h2 className="text-base font-bold text-orange-100 uppercase tracking-wider">
                Mapa Estelar
              </h2>
              {statsQ.data && (
                <span className="text-xs text-zinc-500">
                  · {statsQ.data.total} proyectos
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => refreshM.mutate()}
                disabled={refreshM.isPending}
                className={cn(
                  "p-1.5 rounded hover:bg-orange-500/10 transition",
                  refreshM.isPending && "animate-spin",
                )}
                title="Refrescar"
              >
                <RefreshCw className="w-4 h-4 text-zinc-400" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-orange-500/10 transition"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Stats strip */}
          {statsQ.data && (
            <div className="px-5 py-3 border-b border-orange-500/10 bg-orange-950/20">
              <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wide">
                {Object.entries(statsQ.data.byCategory).map(([cat, n]) => (
                  <button
                    key={cat}
                    onClick={() =>
                      setFilterCategory(filterCategory === cat ? null : cat)
                    }
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded border transition",
                      filterCategory === cat
                        ? "border-orange-500 bg-orange-500/20 text-orange-200"
                        : "border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600",
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLOR[cat] ?? "#888" }}
                    />
                    {CATEGORY_LABEL[cat] ?? cat} <b className="text-zinc-200">{n}</b>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-2 text-[10px] uppercase tracking-wide">
                {Object.entries(statsQ.data.byStatus).map(([st, n]) => (
                  <button
                    key={st}
                    onClick={() =>
                      setFilterStatus(filterStatus === st ? null : st)
                    }
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded border transition",
                      filterStatus === st
                        ? "border-orange-500 bg-orange-500/20 text-orange-200"
                        : "border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600",
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[st] ?? "#888" }}
                    />
                    {st} <b className="text-zinc-200">{n}</b>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Star visualization (mini SVG radial) */}
          <div className="px-5 py-4 border-b border-orange-500/10">
            <svg viewBox="-300 -240 600 480" className="w-full h-44">
              {/* Orbit rings */}
              {[100, 180, 260].map((r) => (
                <circle
                  key={r}
                  cx={0}
                  cy={0}
                  r={r}
                  fill="none"
                  stroke="rgba(255,136,0,0.08)"
                  strokeDasharray="2,4"
                  strokeWidth={1}
                />
              ))}
              {/* Connection lines from kernel to each satellite */}
              {filtered
                .filter((p) => p.projectId !== "el-monstruo")
                .map((p) => (
                  <line
                    key={`line-${p.projectId}`}
                    x1={0}
                    y1={0}
                    x2={p.starX ?? 0}
                    y2={p.starY ?? 0}
                    stroke="rgba(255,136,0,0.15)"
                    strokeWidth={1}
                  />
                ))}
              {/* Kernel center */}
              <circle cx={0} cy={0} r={16} fill="#FF8800" opacity={0.9}>
                <animate
                  attributeName="r"
                  values="14;18;14"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={0} cy={0} r={8} fill="#FFB957" />
              {/* Satellites */}
              {filtered.map((p) => (
                <g
                  key={p.projectId}
                  onClick={() => setSelectedId(p.projectId)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    cx={p.starX ?? 0}
                    cy={p.starY ?? 0}
                    r={selectedId === p.projectId ? 9 : 6}
                    fill={STATUS_COLOR[p.status] ?? "#666"}
                    stroke={CATEGORY_COLOR[p.category] ?? "#888"}
                    strokeWidth={2}
                    opacity={p.status === "active" ? 1 : 0.55}
                  />
                  {selectedId === p.projectId && (
                    <text
                      x={(p.starX ?? 0) + 12}
                      y={(p.starY ?? 0) - 8}
                      fontSize={11}
                      fill="#fff"
                      fontFamily="ui-sans-serif"
                    >
                      {p.displayName}
                    </text>
                  )}
                </g>
              ))}
            </svg>
            <div className="text-[9px] text-zinc-500 uppercase tracking-widest text-center -mt-1">
              Kernel + {filtered.length} satélites
            </div>
          </div>

          {/* Project list */}
          <div className="flex-1 overflow-y-auto">
            {projectsQ.isLoading && (
              <div className="p-5 text-zinc-500 text-sm">Cargando ecosistema…</div>
            )}
            {filtered.map((p) => {
              const fresh = freshnessLabel(p.lastPushedAt);
              const isSelected = selectedId === p.projectId;
              return (
                <div
                  key={p.projectId}
                  onClick={() =>
                    setSelectedId(isSelected ? null : p.projectId)
                  }
                  className={cn(
                    "px-5 py-3 border-b border-zinc-900 cursor-pointer transition",
                    isSelected
                      ? "bg-orange-500/10"
                      : "hover:bg-zinc-900/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: STATUS_COLOR[p.status] ?? "#666",
                          boxShadow:
                            p.status === "active"
                              ? `0 0 8px ${STATUS_COLOR[p.status]}`
                              : "none",
                        }}
                      />
                      <span className="text-sm font-semibold text-zinc-100 truncate">
                        {p.displayName}
                      </span>
                    </div>
                    <span
                      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0"
                      style={{
                        color: CATEGORY_COLOR[p.category] ?? "#888",
                        borderColor: `${CATEGORY_COLOR[p.category] ?? "#888"}55`,
                      }}
                    >
                      {CATEGORY_LABEL[p.category] ?? p.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fresh}
                    </span>
                    {p.deployTarget && p.deployTarget !== "none" && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {p.deployTarget}
                      </span>
                    )}
                    {p.district && (
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {p.district}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-3 pt-3 border-t border-orange-500/20 space-y-2 text-xs text-zinc-400"
                    >
                      {p.description && <p>{p.description}</p>}
                      {p.stackTags && (
                        <div className="flex flex-wrap gap-1">
                          {p.stackTags.split(",").map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]"
                            >
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      {p.githubRepo && p.githubOwner && (
                        <a
                          href={`https://github.com/${p.githubOwner}/${p.githubRepo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {p.githubOwner}/{p.githubRepo}
                        </a>
                      )}
                      {p.deployUrl && (
                        <a
                          href={p.deployUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {p.deployUrl}
                        </a>
                      )}
                      {p.lastPing && (
                        <div className="text-[10px] text-zinc-600">
                          Último ping: {p.lastPing.status} · fuente {p.lastPing.source}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && !projectsQ.isLoading && (
              <div className="p-5 text-zinc-500 text-sm text-center">
                Sin proyectos para los filtros activos.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
