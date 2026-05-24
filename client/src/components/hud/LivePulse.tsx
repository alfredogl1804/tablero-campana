/**
 * LivePulse — Panel HUD izquierdo "siempre visible"
 * Muestra estado vital del Monstruo en tiempo real:
 * - Salud del sistema (% global)
 * - Total de nodos activos / degraded / sprint / future
 * - Distritos con estado
 * - Pulso de actividad (animación)
 */
import { motion } from "framer-motion";
import { Activity, AlertTriangle, CheckCircle2, Hammer, Clock } from "lucide-react";
import type { BoardData } from "@/lib/board-types";
import { trpc } from "@/lib/trpc";

interface LivePulseProps {
  data: BoardData;
  onSelectDistrict?: (id: string) => void;
}

export function LivePulse({ data, onSelectDistrict }: LivePulseProps) {
  // Pulso vivo del Supabase (Memoria Soberana). Si la red falla, el footer
  // simplemente cae al estado "sin conexión" sin tirar la app.
  const supabaseHealth = trpc.supabase.health.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });

  const stats = {
    active: data.nodes.filter((n) => n.status === "ACTIVE").length,
    degraded: data.nodes.filter((n) => n.status === "DEGRADED").length,
    sprint: data.nodes.filter((n) => n.status === "SPRINT").length,
    future: data.nodes.filter((n) => n.status === "FUTURE").length,
  };

  const healthPct = Math.round(data.meta.system_health * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
      className="absolute left-6 top-6 bottom-6 w-[300px] z-20 pointer-events-auto"
    >
      <div className="forja-panel forja-grain rounded-lg h-full flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-amber-500/70 uppercase mb-1">
            <span
              className={`size-1.5 rounded-full ${
                supabaseHealth.data?.ok
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                  : "bg-amber-500 animate-pulse"
              }`}
            />
            {supabaseHealth.data?.ok ? "En vivo" : "Snapshot"} ·{" "}
            {new Date().toLocaleString("es-MX", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            El Monstruo
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tablero de campaña · v2.0
          </p>
        </div>

        {/* Salud del sistema */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Salud del sistema
            </span>
            <span className="text-3xl font-bold text-orange-500 font-mono tabular-nums">
              {healthPct}%
            </span>
          </div>
          {/* Barra forjada */}
          <div className="relative h-2 rounded-full bg-black/40 overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${healthPct}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #F97316 0%, #FFA500 60%, #FFE4B5 100%)",
                boxShadow: "0 0 12px rgba(249, 115, 22, 0.6)",
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            {data.meta.total_nodes} piezas en operación · actualizado{" "}
            {new Date(data.meta.timestamp).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>

        {/* Stats por estado */}
        <div className="px-5 py-4 border-b border-white/5 space-y-2.5">
          <StatRow
            icon={<CheckCircle2 className="size-3.5" />}
            label="Activas"
            count={stats.active}
            color="text-emerald-400"
            iconBg="bg-emerald-500/15 border-emerald-500/30"
          />
          <StatRow
            icon={<Hammer className="size-3.5" />}
            label="En construcción"
            count={stats.sprint}
            color="text-orange-400"
            iconBg="bg-orange-500/15 border-orange-500/30"
            pulsing
          />
          <StatRow
            icon={<AlertTriangle className="size-3.5" />}
            label="Degradadas"
            count={stats.degraded}
            color="text-amber-400"
            iconBg="bg-amber-500/15 border-amber-500/30"
          />
          <StatRow
            icon={<Clock className="size-3.5" />}
            label="Futuras"
            count={stats.future}
            color="text-stone-400"
            iconBg="bg-stone-500/10 border-stone-500/20"
          />
        </div>

        {/* Distritos */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-3">
            Distritos
          </div>
          <div className="space-y-2">
            {data.districts.map((d, i) => (
              <motion.button
                key={d.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                onClick={() => onSelectDistrict?.(d.id)}
                className="w-full text-left group p-2.5 rounded-md border border-white/5 bg-black/20 hover:bg-black/40 hover:border-white/10 transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-sm"
                      style={{ background: d.color, boxShadow: `0 0 8px ${d.color}80` }}
                    />
                    <span className="text-[13px] font-medium text-foreground">
                      {d.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                    {Math.round(d.health * 100)}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-black/40 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${d.health * 100}%`,
                      background: d.color,
                      opacity: 0.85,
                    }}
                  />
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Footer — kernel + memoria viva (Supabase) */}
        <div className="px-5 py-3 border-t border-white/5 bg-black/30 space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <Activity className="size-3 text-amber-400/60" />
            <span className="text-muted-foreground">kernel</span>
            <span className="text-muted-foreground/70">v0.84.8 · web</span>
            <span className="ml-auto text-muted-foreground/50">Railway · MX</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span
              className={`size-1.5 rounded-full ${
                supabaseHealth.data?.ok
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                  : supabaseHealth.isLoading
                    ? "bg-amber-400 animate-pulse"
                    : "bg-stone-500"
              }`}
            />
            <span className="text-muted-foreground">memoria</span>
            <span className="text-muted-foreground/70">
              {supabaseHealth.data?.ok
                ? `${supabaseHealth.data.tables_visible} tablas vivas`
                : supabaseHealth.isLoading
                  ? "verificando…"
                  : "sin conexión"}
            </span>
            <span className="ml-auto text-muted-foreground/50">supabase</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatRow({
  icon,
  label,
  count,
  color,
  iconBg,
  pulsing,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  iconBg: string;
  pulsing?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`size-7 rounded border flex items-center justify-center ${iconBg} ${color} ${pulsing ? "forja-pulse" : ""}`}
      >
        {icon}
      </div>
      <span className="text-sm text-foreground/85 flex-1">{label}</span>
      <span className={`text-base font-bold font-mono tabular-nums ${color}`}>
        {count}
      </span>
    </div>
  );
}
