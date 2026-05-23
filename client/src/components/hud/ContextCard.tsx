/**
 * ContextCard — panel flotante derecho cuando un nodo está seleccionado
 * Muestra:
 * - Nombre y descripción del componente (lenguaje natural, sin jerga)
 * - Estado visual con explicación
 * - Conexiones (entradas/salidas) navegables
 * - Acciones contextuales (placeholder para v2)
 */
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Hammer,
  Clock,
  Code2,
  Calendar,
  Sparkles,
} from "lucide-react";
import type { BoardNode, BoardData } from "@/lib/board-types";
import { Button } from "@/components/ui/button";

interface ContextCardProps {
  node: BoardNode | null;
  data: BoardData;
  onClose: () => void;
  onSelectNode: (id: string) => void;
  onOpenStudio?: () => void;
}

const STATUS_META = {
  ACTIVE: {
    label: "Activa",
    description: "Funcionando en producción",
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  DEGRADED: {
    label: "Degradada",
    description: "Funciona parcialmente · necesita atención",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
  },
  SPRINT: {
    label: "En construcción",
    description: "Trabajándose ahora mismo",
    icon: Hammer,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
  },
  FUTURE: {
    label: "Futura",
    description: "Aún no construida — planeada",
    icon: Clock,
    color: "text-stone-400",
    bg: "bg-stone-500/10 border-stone-500/30",
  },
} as const;

export function ContextCard({ node, data, onClose, onSelectNode, onOpenStudio }: ContextCardProps) {
  return (
    <AnimatePresence mode="wait">
      {node && (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: 30, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 30, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="absolute right-6 top-6 bottom-6 w-[380px] z-20 pointer-events-auto"
        >
          <ContextCardContent
            node={node}
            data={data}
            onClose={onClose}
            onSelectNode={onSelectNode}
            onOpenStudio={onOpenStudio}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ContextCardContent({
  node,
  data,
  onClose,
  onSelectNode,
  onOpenStudio,
}: {
  node: BoardNode;
  data: BoardData;
  onClose: () => void;
  onSelectNode: (id: string) => void;
  onOpenStudio?: () => void;
}) {
  const isNanoBanana = node.id === "nano_banana_pro";
  const district = data.districts.find((d) => d.id === node.district);
  const statusMeta = STATUS_META[node.status];
  const StatusIcon = statusMeta.icon;
  const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

  return (
    <div className="forja-panel forja-grain rounded-lg h-full flex flex-col overflow-hidden">
      {/* Header con cierre */}
      <div className="px-5 pt-5 pb-4 border-b border-white/5 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 size-8 rounded flex items-center justify-center hover:bg-white/5 text-muted-foreground hover:text-foreground transition"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>

        {district && (
          <div className="flex items-center gap-2 mb-2">
            <span
              className="size-1.5 rounded-sm"
              style={{ background: district.color }}
            />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
              {district.label}
            </span>
          </div>
        )}

        <h3 className="text-2xl font-bold text-foreground tracking-tight pr-8 leading-tight">
          {node.label}
        </h3>

        {/* Estado badge */}
        <div
          className={`inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded border ${statusMeta.bg}`}
        >
          <StatusIcon className={`size-3 ${statusMeta.color}`} />
          <span className={`text-[11px] font-medium ${statusMeta.color}`}>
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Descripción humana */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-1.5">
            Qué es
          </div>
          <p className="text-[14px] leading-relaxed text-foreground/90">
            {node.description}
          </p>
        </div>

        {/* Estado explicado */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-1.5">
            Estado actual
          </div>
          <p className="text-[13px] leading-relaxed text-foreground/80">
            {statusMeta.description}
          </p>
          {node.gap && (
            <div className="mt-2 p-2.5 rounded border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-200/90 leading-relaxed">
                  {node.gap}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Métricas */}
        {node.loc > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <MiniStat
              icon={<Code2 className="size-3" />}
              label="Tamaño"
              value={node.loc.toLocaleString()}
              unit="líneas"
            />
            <MiniStat
              icon={<Calendar className="size-3" />}
              label="Última act."
              value={new Date(node.last_updated).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
              })}
            />
          </div>
        )}

        {/* Conexiones */}
        {(node.connections_in.length > 0 || node.connections_out.length > 0) && (
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-2">
              Conexiones
            </div>

            {node.connections_out.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-[11px] text-orange-400/90 mb-1.5">
                  <ArrowUpRight className="size-3" />
                  <span>Envía a {node.connections_out.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {node.connections_out.map((id) => {
                    const target = nodeMap.get(id);
                    if (!target) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => onSelectNode(id)}
                        className="px-2 py-1 rounded text-[11px] bg-orange-500/10 border border-orange-500/20 text-orange-200 hover:bg-orange-500/20 hover:border-orange-500/40 transition"
                      >
                        {target.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {node.connections_in.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-blue-400/90 mb-1.5">
                  <ArrowDownRight className="size-3" />
                  <span>Recibe de {node.connections_in.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {node.connections_in.map((id) => {
                    const target = nodeMap.get(id);
                    if (!target) return null;
                    return (
                      <button
                        key={id}
                        onClick={() => onSelectNode(id)}
                        className="px-2 py-1 rounded text-[11px] bg-blue-500/10 border border-blue-500/20 text-blue-200 hover:bg-blue-500/20 hover:border-blue-500/40 transition"
                      >
                        {target.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="px-5 py-4 border-t border-white/5 bg-black/20 space-y-2">
        {isNanoBanana && onOpenStudio && (
          <Button
            variant="default"
            size="sm"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-bold tracking-wide"
            onClick={onOpenStudio}
          >
            <Sparkles className="size-4 mr-2" />
            Abrir Studio operable
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-white/10 hover:bg-white/5"
          onClick={() => {
            // Placeholder Fase 2: Pedir mejora vía Gemini reasoning
          }}
        >
          {isNanoBanana ? "Pedir mejora a esta pieza" : "Pedir mejora a esta pieza"}
        </Button>
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="p-2.5 rounded border border-white/5 bg-black/20">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono mb-1">
        {icon}
        {label}
      </div>
      <div className="text-base font-mono font-semibold text-foreground tabular-nums">
        {value}{" "}
        {unit && <span className="text-[10px] text-muted-foreground font-normal">{unit}</span>}
      </div>
    </div>
  );
}
