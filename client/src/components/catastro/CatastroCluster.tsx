/**
 * CatastroCluster — vista isométrica de las candidatas del catastro.
 *
 * Reemplaza al ContextCard normal cuando se hace click en el nodo
 * "catastro" del distrito Cognición. Muestra los 82 nodos reales del
 * ledger generado por scripts/build_visual_ledger.py organizados en
 * 3 distritos (Agentes / Tools / Suppliers) y agrupados por categoría.
 *
 * - Cero drift: importa el ledger generado, no parsea las fuentes crudas.
 * - Estética coherente con el Tablero (Forja Industrial Brutalista).
 * - Vista 2D isométrica simulada (CSS transforms) para evitar otra
 *   instancia R3F que compita con el Canvas principal.
 * - Halo / marker para nodos con is_operable=true (Nano Banana Pro hoy).
 */
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { X, Sparkles, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import ledgerRaw from "@/data/catastro_visual_ledger.json";
import {
  type CatastroLedger,
  type LedgerNode,
  type EntityType,
  categoryLabel,
  ENTITY_LABEL_ES,
  STATUS_LABEL_ES,
} from "@/lib/catastro-types";
import { CandidataInspector } from "./CandidataInspector";

const ledger = ledgerRaw as unknown as CatastroLedger;

const DISTRICT_TINT: Record<EntityType, string> = {
  AGENTE: "#FF7A1A",
  TOOL: "#4FC3F7",
  SUPPLIER: "#9CCC65",
};

interface CatastroClusterProps {
  open: boolean;
  onClose: () => void;
  onOpenStudio?: () => void;
}

export function CatastroCluster({ open, onClose, onOpenStudio }: CatastroClusterProps) {
  const [filter, setFilter] = useState<EntityType | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<LedgerNode | null>(null);

  const groupedByDistrict = useMemo(() => {
    const groups: Record<EntityType, Record<string, LedgerNode[]>> = {
      AGENTE: {},
      TOOL: {},
      SUPPLIER: {},
    };

    const q = query.trim().toLowerCase();

    for (const node of ledger.nodes) {
      if (filter !== "ALL" && node.entity_type !== filter) continue;
      if (q) {
        const haystack = [
          node.name,
          node.category,
          node.description,
          ("provider" in node && (node as { provider?: string }).provider) || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) continue;
      }
      const bucket = groups[node.entity_type];
      if (!bucket[node.category]) bucket[node.category] = [];
      bucket[node.category].push(node);
    }

    return groups;
  }, [filter, query]);

  const total = useMemo(
    () =>
      Object.values(groupedByDistrict)
        .flatMap((catMap) => Object.values(catMap))
        .reduce((acc, arr) => acc + arr.length, 0),
    [groupedByDistrict],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/85 backdrop-blur-md pointer-events-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="forja-panel forja-grain w-full h-full md:w-[95vw] md:h-[92vh] md:my-auto md:rounded-lg flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/30">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono mb-1">
                  Distrito Cognición · Catastro de IAs
                </div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  El inventario vivo del Monstruo
                </h2>
                <p className="text-[13px] text-foreground/70 mt-1">
                  {ledger.metadata.total_nodes} candidatas reales del repo —
                  {" "}{ledger.metadata.total_agentes} agentes,{" "}
                  {ledger.metadata.total_tools} herramientas,{" "}
                  {ledger.metadata.total_suppliers} proveedores.{" "}
                  <span className="text-orange-400 font-medium">
                    {ledger.metadata.operable_count} operable hoy
                  </span>
                  .
                </p>
              </div>
              <button
                onClick={onClose}
                className="size-9 rounded flex items-center justify-center hover:bg-white/5 text-muted-foreground hover:text-foreground transition"
                aria-label="Cerrar catastro"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-3 border-b border-white/5 flex items-center gap-3 bg-black/20">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, categoría, proveedor…"
                  className="w-full pl-9 pr-3 py-2 rounded bg-black/40 border border-white/10 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="flex items-center gap-1">
                {(["ALL", "AGENTE", "TOOL", "SUPPLIER"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded text-[12px] font-medium transition border ${
                      filter === f
                        ? "bg-orange-500/15 border-orange-500/40 text-orange-200"
                        : "border-white/10 text-foreground/60 hover:bg-white/5"
                    }`}
                  >
                    {f === "ALL" ? "Todo" : ENTITY_LABEL_ES[f] + "s"}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono">
                {total} mostradas
              </div>
            </div>

            {/* Cluster body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {(Object.keys(groupedByDistrict) as EntityType[]).map((entityType) => {
                const districtMap = groupedByDistrict[entityType];
                const categories = Object.keys(districtMap).sort();
                if (categories.length === 0) return null;

                const totalInDistrict = categories.reduce(
                  (acc, cat) => acc + districtMap[cat].length,
                  0,
                );

                return (
                  <section key={entityType}>
                    <div className="flex items-baseline gap-3 mb-3 pb-2 border-b border-white/5">
                      <span
                        className="size-2 rounded-sm"
                        style={{ background: DISTRICT_TINT[entityType] }}
                      />
                      <h3 className="text-lg font-bold text-foreground tracking-tight">
                        {ENTITY_LABEL_ES[entityType]}s
                      </h3>
                      <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
                        {totalInDistrict} entradas
                      </span>
                    </div>

                    <div className="space-y-5">
                      {categories.map((category) => (
                        <CategoryRow
                          key={`${entityType}-${category}`}
                          entityType={entityType}
                          category={category}
                          nodes={districtMap[category]}
                          onSelect={setSelected}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              {total === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                  <p className="text-[14px]">
                    No se encontraron candidatas con esos filtros.
                  </p>
                </div>
              )}
            </div>

            {/* Footer informativo */}
            <div className="px-6 py-3 border-t border-white/5 bg-black/30 flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground font-mono">
                Generado por scripts/build_visual_ledger.py ·{" "}
                {new Date(ledger.metadata.generated_at).toLocaleString("es-MX", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
              <div className="text-[11px] text-foreground/50">
                Política: {ledger.metadata.policy}
              </div>
            </div>
          </motion.div>

          <CandidataInspector
            node={selected}
            onClose={() => setSelected(null)}
            onOpenStudio={onOpenStudio}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CategoryRow({
  entityType,
  category,
  nodes,
  onSelect,
}: {
  entityType: EntityType;
  category: string;
  nodes: LedgerNode[];
  onSelect: (n: LedgerNode) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[12px] font-medium text-foreground/80">
          {categoryLabel(category)}
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {nodes.length} {nodes.length === 1 ? "pieza" : "piezas"}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {nodes.map((node) => (
          <CandidataTile
            key={node.id}
            node={node}
            tint={DISTRICT_TINT[entityType]}
            onClick={() => onSelect(node)}
          />
        ))}
      </div>
    </div>
  );
}

function CandidataTile({
  node,
  tint,
  onClick,
}: {
  node: LedgerNode;
  tint: string;
  onClick: () => void;
}) {
  const isOperable = node.is_operable;
  const isDegraded = node.status === "degradado";
  const isAspirante = node.status === "aspirante";

  return (
    <button
      onClick={onClick}
      className={`group relative text-left px-3 py-2.5 rounded border transition overflow-hidden ${
        isOperable
          ? "border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20 shadow-[0_0_18px_rgba(255,122,26,0.25)]"
          : isAspirante
            ? "border-white/10 bg-white/[0.02] hover:bg-white/[0.05] opacity-70"
            : isDegraded
              ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
              : "border-white/10 bg-black/30 hover:bg-white/[0.05]"
      }`}
    >
      {/* Indicador de tipo */}
      <span
        className="absolute top-0 left-0 h-full w-[3px]"
        style={{ background: tint }}
      />

      {/* Halo operable */}
      {isOperable && (
        <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-500 text-[9px] font-bold uppercase tracking-wider text-black">
          <Sparkles className="size-2.5" />
          OPERABLE
        </span>
      )}

      <div className="text-[12px] font-medium text-foreground leading-tight pr-2 line-clamp-2">
        {node.name}
      </div>

      <div className="mt-1 flex items-center gap-2">
        {"provider" in node && node.provider && (
          <span className="text-[10px] text-muted-foreground font-mono truncate">
            {node.provider}
          </span>
        )}
        {node.synthetic && (
          <span className="text-[9px] uppercase tracking-wider text-blue-300/80 font-mono">
            sintético
          </span>
        )}
      </div>

      <div className="mt-1.5 text-[10px] text-muted-foreground/80">
        {STATUS_LABEL_ES[node.status] ?? node.status}
      </div>
    </button>
  );
}
