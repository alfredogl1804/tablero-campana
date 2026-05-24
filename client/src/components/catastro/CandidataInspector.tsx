/**
 * CandidataInspector — panel lateral derecho con detalles de una candidata
 * del catastro. Aparece cuando el usuario selecciona un nodo dentro del
 * CatastroCluster.
 */
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  BookOpen,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type LedgerNode,
  type LedgerToolNode,
  type LedgerSupplierNode,
  type LedgerAgenteNode,
  categoryLabel,
  ENTITY_LABEL_ES,
  STATUS_LABEL_ES,
} from "@/lib/catastro-types";

interface CandidataInspectorProps {
  node: LedgerNode | null;
  onClose: () => void;
  onOpenStudio?: () => void;
}

export function CandidataInspector({ node, onClose, onOpenStudio }: CandidataInspectorProps) {
  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 30, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] z-10 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="forja-panel forja-grain h-full flex flex-col overflow-hidden border-l border-white/10">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-white/5 relative">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 size-8 rounded flex items-center justify-center hover:bg-white/5 text-muted-foreground hover:text-foreground transition"
                aria-label="Cerrar detalle"
              >
                <X className="size-4" />
              </button>

              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-2">
                {ENTITY_LABEL_ES[node.entity_type]} · {categoryLabel(node.category)}
              </div>
              <h3 className="text-xl font-bold text-foreground tracking-tight pr-8 leading-tight">
                {node.name}
              </h3>

              <div className="flex items-center gap-2 mt-3">
                <StatusBadge status={node.status} />
                {node.is_operable && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-500 text-[10px] font-bold uppercase tracking-wider text-black">
                    <Sparkles className="size-3" />
                    OPERABLE HOY
                  </span>
                )}
                {node.synthetic && (
                  <span className="inline-flex items-center px-2 py-1 rounded bg-blue-500/15 border border-blue-500/30 text-[10px] uppercase tracking-wider text-blue-200 font-mono">
                    Sintético
                  </span>
                )}
              </div>
            </div>

            {/* Cuerpo */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <Section title="Qué es">
                <p className="text-[14px] leading-relaxed text-foreground/90">
                  {node.description || "Sin descripción registrada."}
                </p>
              </Section>

              {node.synthetic && (
                <div className="p-3 rounded border border-blue-500/20 bg-blue-500/5">
                  <p className="text-[12px] text-blue-200/90 leading-relaxed">
                    Este nodo aún no existe en el catastro real del repositorio.
                    Se inyecta porque ya es operable desde el HUD. Cuando se
                    registre formalmente en el catastro, dejará de marcarse
                    como sintético.
                  </p>
                </div>
              )}

              {node.entity_type === "AGENTE" && (
                <AgenteDetails node={node as LedgerAgenteNode} />
              )}
              {node.entity_type === "TOOL" && (
                <ToolDetails node={node as LedgerToolNode} />
              )}
              {node.entity_type === "SUPPLIER" && (
                <SupplierDetails node={node as LedgerSupplierNode} />
              )}
            </div>

            {/* Acciones */}
            <div className="px-5 py-4 border-t border-white/5 bg-black/30 space-y-2">
              {node.is_operable && onOpenStudio && (
                <Button
                  size="sm"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 font-bold tracking-wide"
                  onClick={onOpenStudio}
                >
                  <Sparkles className="size-4 mr-2" />
                  Abrir Studio operable
                </Button>
              )}
              {!node.is_operable && (
                <p className="text-[11px] text-muted-foreground text-center py-1">
                  Esta candidata aún no es operable desde el HUD.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-1.5">
        {title}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: LedgerNode["status"] }) {
  const tone =
    status === "vigente_2026" || status === "vigente_2026_self_referencia"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : status === "degradado"
        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
        : "bg-white/[0.04] border-white/10 text-foreground/60";

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded border text-[10px] uppercase tracking-wider font-mono ${tone}`}>
      {STATUS_LABEL_ES[status] ?? status}
    </span>
  );
}

function AgenteDetails({ node }: { node: LedgerAgenteNode }) {
  return (
    <>
      {node.provider && (
        <Section title="Proveedor">
          <p className="text-[13px] text-foreground/80">
            {node.provider}
            {node.version && (
              <span className="text-muted-foreground"> · {node.version}</span>
            )}
          </p>
        </Section>
      )}
      {node.lessons && (
        <Section title="Lecciones para el Monstruo">
          <p className="text-[13px] leading-relaxed text-foreground/80 italic">
            {node.lessons}
          </p>
        </Section>
      )}
      {node.interfaces && node.interfaces.length > 0 && (
        <Section title="Interfaces">
          <div className="flex flex-wrap gap-1.5">
            {node.interfaces.map((iface) => (
              <span
                key={iface}
                className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono text-foreground/70"
              >
                {iface}
              </span>
            ))}
          </div>
        </Section>
      )}
      {node.auth_pattern && (
        <Section title="Autenticación">
          <p className="text-[12px] font-mono text-foreground/70">{node.auth_pattern}</p>
        </Section>
      )}
      {node.biblia_path && (
        <Section title="Biblia (referencia)">
          <p className="text-[11px] font-mono text-foreground/60 break-all flex items-start gap-2">
            <BookOpen className="size-3 mt-0.5 flex-shrink-0" />
            {node.biblia_path}
          </p>
          {node.biblia_size_bytes && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {(node.biblia_size_bytes / 1024).toFixed(1)} KB
            </p>
          )}
        </Section>
      )}
    </>
  );
}

function ToolDetails({ node }: { node: LedgerToolNode }) {
  return (
    <>
      {node.provider && (
        <Section title="Proveedor">
          <p className="text-[13px] text-foreground/80">{node.provider}</p>
        </Section>
      )}
      {node.pricing && (
        <Section title="Precio">
          <p className="text-[13px] text-foreground/80">{node.pricing}</p>
        </Section>
      )}
      {node.maturity && (
        <Section title="Madurez">
          <p className="text-[12px] font-mono text-foreground/70">
            {node.maturity}
          </p>
        </Section>
      )}
      {node.url && (
        <Section title="Sitio">
          <a
            href={node.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-orange-300 hover:text-orange-200 underline decoration-orange-500/30"
          >
            <ExternalLink className="size-3" />
            {new URL(node.url).hostname}
          </a>
        </Section>
      )}
      {node.oss_alternatives && node.oss_alternatives.length > 0 && (
        <Section title="Alternativas open source">
          <div className="flex flex-wrap gap-1.5">
            {node.oss_alternatives.map((alt) => (
              <span
                key={alt}
                className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[11px] font-mono text-foreground/70 inline-flex items-center gap-1"
              >
                <Wrench className="size-2.5" />
                {alt}
              </span>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function SupplierDetails({ node }: { node: LedgerSupplierNode }) {
  return (
    <>
      {(node.address || node.city) && (
        <Section title="Ubicación">
          <p className="text-[13px] text-foreground/80 flex items-start gap-2">
            <MapPin className="size-3.5 mt-0.5 flex-shrink-0 text-foreground/50" />
            <span>
              {node.address || node.city}
              {node.address && node.city && (
                <span className="block text-[11px] text-muted-foreground">
                  {node.city}
                </span>
              )}
            </span>
          </p>
        </Section>
      )}
      {node.phone && (
        <Section title="Teléfono">
          <a
            href={`tel:${node.phone.replace(/\s/g, "")}`}
            className="text-[13px] text-foreground/80 inline-flex items-center gap-1.5 hover:text-orange-300"
          >
            <Phone className="size-3.5" />
            {node.phone}
          </a>
        </Section>
      )}
      {node.email && (
        <Section title="Correo">
          <a
            href={`mailto:${node.email}`}
            className="text-[13px] text-foreground/80 inline-flex items-center gap-1.5 hover:text-orange-300"
          >
            <Mail className="size-3.5" />
            {node.email}
          </a>
        </Section>
      )}
      {node.url && (
        <Section title="Sitio">
          <a
            href={node.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-orange-300 hover:text-orange-200 underline decoration-orange-500/30 break-all"
          >
            <ExternalLink className="size-3 flex-shrink-0" />
            {node.url}
          </a>
        </Section>
      )}
      {node.representative_cases && (
        <Section title="Casos representativos">
          <p className="text-[12px] leading-relaxed text-foreground/70 italic">
            {node.representative_cases}
          </p>
        </Section>
      )}
    </>
  );
}
