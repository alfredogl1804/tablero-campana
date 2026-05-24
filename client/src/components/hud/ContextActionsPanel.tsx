/**
 * Sprint v3.0 / T6 — ContextActionsPanel.
 *
 * Tres acciones operativas que el usuario lanza desde la pieza activa:
 *   1. Anotar incidente  → abre IncidentModal (formulario)
 *   2. Cambiar estado    → abre OverrideModal (dropdown + nota + TTL)
 *   3. Preguntar al Monstruo sobre esta pieza → abre AskAboutModal (Gemini focal)
 *
 * Renderiza:
 *   - 3 botones (footer del ContextCard)
 *   - Chip "Estado redeclarado por ti" cuando hay override activo
 *   - Lista compacta de los 3 incidentes más recientes
 *
 * Diseño:
 *   - Modal-style nativo (no shadcn dialog para mantener consistencia con
 *     el HUD industrial existente). Cierra con click fuera, Esc, o botón X.
 *   - Modo Papá renombra los botones y placeholders.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Bug,
  Lightbulb,
  ShieldAlert,
  MessageSquare,
  Pencil,
  Send,
  X,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTone } from "@/hooks/useTone";
import { trpc } from "@/lib/trpc";
import type { BoardNode } from "@/lib/board-types";

type IncidentKind = "BUG" | "IDEA" | "RIESGO" | "OBSERVACION";
type Severity = "low" | "med" | "high";
type StatusOverride = "ACTIVE" | "DEGRADED" | "SPRINT" | "FUTURE";

const KIND_META: Record<
  IncidentKind,
  { label: string; labelPapa: string; icon: typeof Bug; color: string }
> = {
  BUG: {
    label: "BUG",
    labelPapa: "Está roto",
    icon: Bug,
    color: "text-red-400",
  },
  IDEA: {
    label: "IDEA",
    labelPapa: "Idea de mejora",
    icon: Lightbulb,
    color: "text-amber-300",
  },
  RIESGO: {
    label: "RIESGO",
    labelPapa: "Algo puede reventar",
    icon: ShieldAlert,
    color: "text-orange-400",
  },
  OBSERVACION: {
    label: "OBSERVACIÓN",
    labelPapa: "Solo observar",
    icon: Eye,
    color: "text-stone-400",
  },
};

const STATUS_META: Record<
  StatusOverride,
  { label: string; labelPapa: string }
> = {
  ACTIVE: { label: "Activa", labelPapa: "Funciona bien" },
  DEGRADED: { label: "Degradada", labelPapa: "Funciona a medias" },
  SPRINT: { label: "En construcción", labelPapa: "Trabajándose ahora" },
  FUTURE: { label: "Futura", labelPapa: "Aún no construida" },
};

export function ContextActionsPanel({ node }: { node: BoardNode }) {
  const tn = useTone();
  const utils = trpc.useUtils();

  const [openModal, setOpenModal] = useState<
    null | "incident" | "override" | "ask"
  >(null);

  // Datos vivos de la pieza
  const incidentsQuery = trpc.contextActions.listIncidents.useQuery(
    { nodeId: node.id, limit: 3 },
    { staleTime: 30_000 },
  );
  const overrideQuery = trpc.contextActions.getActiveOverride.useQuery(
    { nodeId: node.id },
    { staleTime: 30_000 },
  );

  const refetchAll = async () => {
    await Promise.all([
      utils.contextActions.listIncidents.invalidate({ nodeId: node.id }),
      utils.contextActions.getActiveOverride.invalidate({ nodeId: node.id }),
    ]);
  };

  const activeOverride = overrideQuery.data;
  const incidents = incidentsQuery.data?.incidents ?? [];
  const openCount = incidentsQuery.data?.openCount ?? 0;

  return (
    <>
      {/* Sección informativa: override activo + incidentes recientes */}
      {(activeOverride || incidents.length > 0) && (
        <div className="space-y-3">
          {activeOverride && (
            <div className="p-3 rounded border border-violet-500/30 bg-violet-500/10">
              <div className="flex items-start gap-2">
                <Pencil className="size-3.5 text-violet-300 flex-shrink-0 mt-0.5" />
                <div className="text-[12px] text-violet-100/95 leading-relaxed">
                  <strong className="font-semibold">
                    {tn.isPapa
                      ? "Tú redeclaraste esta pieza como"
                      : "Override activo:"}
                    {" "}
                    {tn.isPapa
                      ? STATUS_META[activeOverride.statusOverride].labelPapa
                      : STATUS_META[activeOverride.statusOverride].label}
                  </strong>
                  {activeOverride.note && (
                    <div className="mt-0.5 text-violet-200/80">
                      {activeOverride.note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {incidents.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-2">
                {tn.isPapa
                  ? `Anotaciones recientes (${openCount} abiertas)`
                  : `Incidentes (${openCount} abiertos)`}
              </div>
              <div className="space-y-1.5">
                {incidents.map((inc) => {
                  const meta = KIND_META[inc.kind as IncidentKind];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={inc.id}
                      className={`p-2 rounded border border-white/5 bg-black/20 ${
                        inc.resolvedAt ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`size-3 ${meta.color}`} />
                        <span className={`text-[10px] uppercase font-mono ${meta.color}`}>
                          {tn.isPapa ? meta.labelPapa : meta.label}
                        </span>
                        {inc.resolvedAt && (
                          <span className="text-[9px] uppercase font-mono text-emerald-400 ml-auto">
                            resuelta
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-foreground/85 leading-snug">
                        {inc.message}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Botonera de acciones */}
      <div className="grid grid-cols-3 gap-2">
        <ActionButton
          icon={<AlertTriangle className="size-3.5" />}
          label={tn.isPapa ? "Anotar" : "Anotar"}
          onClick={() => setOpenModal("incident")}
        />
        <ActionButton
          icon={<Pencil className="size-3.5" />}
          label={tn.isPapa ? "Redeclarar" : "Override"}
          onClick={() => setOpenModal("override")}
        />
        <ActionButton
          icon={<MessageSquare className="size-3.5" />}
          label={tn.isPapa ? "Preguntar" : "Preguntar"}
          onClick={() => setOpenModal("ask")}
        />
      </div>

      <AnimatePresence>
        {openModal === "incident" && (
          <IncidentModal
            node={node}
            onClose={() => setOpenModal(null)}
            onSubmitted={async () => {
              await refetchAll();
              setOpenModal(null);
            }}
          />
        )}
        {openModal === "override" && (
          <OverrideModal
            node={node}
            activeId={activeOverride?.id ?? null}
            onClose={() => setOpenModal(null)}
            onSubmitted={async () => {
              await refetchAll();
              setOpenModal(null);
            }}
          />
        )}
        {openModal === "ask" && (
          <AskAboutModal node={node} onClose={() => setOpenModal(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-2 py-2 rounded border border-white/10 hover:border-white/30 hover:bg-white/5 transition text-foreground/85 hover:text-foreground"
    >
      {icon}
      <span className="text-[10px] uppercase tracking-wider font-mono">{label}</span>
    </button>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // ESC cierra el modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="forja-panel forja-grain rounded-lg w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-base font-bold tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="size-7 rounded flex items-center justify-center hover:bg-white/5 text-muted-foreground hover:text-foreground transition"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function IncidentModal({
  node,
  onClose,
  onSubmitted,
}: {
  node: BoardNode;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const tn = useTone();
  const [kind, setKind] = useState<IncidentKind>("BUG");
  const [severity, setSeverity] = useState<Severity>("med");
  const [message, setMessage] = useState("");

  const reportMutation = trpc.contextActions.reportIncident.useMutation();

  const submit = async () => {
    if (message.trim().length < 2) return;
    await reportMutation.mutateAsync({
      nodeId: node.id,
      kind,
      severity,
      message: message.trim(),
    });
    onSubmitted();
  };

  return (
    <ModalShell
      title={tn.isPapa ? "Anotar algo de esta pieza" : "Levantar incidente"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-2 block">
            {tn.isPapa ? "¿Qué tipo de anotación?" : "Tipo"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(KIND_META) as [IncidentKind, typeof KIND_META[IncidentKind]][]).map(
              ([k, meta]) => {
                const Icon = meta.icon;
                const active = kind === k;
                return (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={`flex items-center gap-2 px-3 py-2 rounded border text-left text-[12px] transition ${
                      active
                        ? "border-orange-500/50 bg-orange-500/10 text-foreground"
                        : "border-white/10 hover:border-white/20 text-foreground/70"
                    }`}
                  >
                    <Icon className={`size-3.5 ${meta.color}`} />
                    {tn.isPapa ? meta.labelPapa : meta.label}
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-2 block">
            {tn.isPapa ? "¿Qué tan urgente?" : "Severidad"}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["low", "med", "high"] as Severity[]).map((s) => {
              const active = severity === s;
              const labelMap: Record<Severity, { tech: string; papa: string }> = {
                low: { tech: "low", papa: "Tranquilo" },
                med: { tech: "med", papa: "Importante" },
                high: { tech: "high", papa: "Urgente" },
              };
              return (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`px-3 py-2 rounded border text-[12px] transition ${
                    active
                      ? "border-orange-500/50 bg-orange-500/10 text-foreground"
                      : "border-white/10 hover:border-white/20 text-foreground/70"
                  }`}
                >
                  {tn.isPapa ? labelMap[s].papa : labelMap[s].tech}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-2 block">
            {tn.isPapa ? "¿Qué pasa?" : "Descripción"}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              tn.isPapa
                ? "Cuéntale al Monstruo qué notaste de esta pieza..."
                : "Describe brevemente el incidente..."
            }
            rows={4}
            className="w-full px-3 py-2 rounded border border-white/10 bg-black/30 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-orange-500/50 focus:outline-none resize-none"
            style={{ fontSize: "max(16px, 0.875rem)" }}
            maxLength={2000}
          />
          <div className="text-[10px] text-muted-foreground/60 text-right mt-1 font-mono">
            {message.length}/2000
          </div>
        </div>

        {reportMutation.error && (
          <div className="p-2.5 rounded border border-red-500/30 bg-red-500/10 text-[12px] text-red-200">
            No se pudo guardar: {reportMutation.error.message}
          </div>
        )}

        <Button
          onClick={submit}
          disabled={reportMutation.isPending || message.trim().length < 2}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wide"
        >
          {reportMutation.isPending ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              {tn.isPapa ? "Guardando..." : "Guardando..."}
            </>
          ) : (
            <>
              <Send className="size-4 mr-2" />
              {tn.isPapa ? "Guardar anotación" : "Reportar incidente"}
            </>
          )}
        </Button>
      </div>
    </ModalShell>
  );
}

function OverrideModal({
  node,
  activeId,
  onClose,
  onSubmitted,
}: {
  node: BoardNode;
  activeId: number | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const tn = useTone();
  const [statusOverride, setStatusOverride] = useState<StatusOverride>(node.status);
  const [note, setNote] = useState("");

  const setMutation = trpc.contextActions.setOverride.useMutation();
  const clearMutation = trpc.contextActions.clearOverride.useMutation();

  const submit = async () => {
    await setMutation.mutateAsync({
      nodeId: node.id,
      statusOverride,
      note: note.trim() || undefined,
    });
    onSubmitted();
  };

  const clear = async () => {
    if (!activeId) return;
    await clearMutation.mutateAsync({ id: activeId });
    onSubmitted();
  };

  return (
    <ModalShell
      title={tn.isPapa ? "Redeclarar el estado de esta pieza" : "Override de status"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-[12px] text-foreground/70 leading-relaxed">
          {tn.isPapa
            ? "Si el genoma del Monstruo dice algo distinto a la realidad, puedes redeclararlo aquí. Tu palabra manda."
            : "El status calculado por el genoma será sobrescrito hasta que limpies este override."}
        </p>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-2 block">
            {tn.isPapa ? "¿Cómo está realmente?" : "Status declarado"}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(STATUS_META) as [
              StatusOverride,
              typeof STATUS_META[StatusOverride],
            ][]).map(([s, meta]) => {
              const active = statusOverride === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusOverride(s)}
                  className={`px-3 py-2 rounded border text-left text-[12px] transition ${
                    active
                      ? "border-violet-500/50 bg-violet-500/10 text-foreground"
                      : "border-white/10 hover:border-white/20 text-foreground/70"
                  }`}
                >
                  {tn.isPapa ? meta.labelPapa : meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-2 block">
            {tn.isPapa ? "¿Por qué?" : "Nota (opcional)"}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              tn.isPapa
                ? "Explica brevemente para que el Monstruo aprenda..."
                : "Razón del override..."
            }
            rows={3}
            className="w-full px-3 py-2 rounded border border-white/10 bg-black/30 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-violet-500/50 focus:outline-none resize-none"
            style={{ fontSize: "max(16px, 0.875rem)" }}
            maxLength={1000}
          />
        </div>

        {(setMutation.error || clearMutation.error) && (
          <div className="p-2.5 rounded border border-red-500/30 bg-red-500/10 text-[12px] text-red-200">
            {setMutation.error?.message ?? clearMutation.error?.message}
          </div>
        )}

        <div className="flex gap-2">
          {activeId && (
            <Button
              variant="outline"
              onClick={clear}
              disabled={clearMutation.isPending}
              className="flex-1 border-white/10 hover:bg-white/5"
            >
              {clearMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : tn.isPapa ? (
                "Borrar redeclaración"
              ) : (
                "Limpiar override"
              )}
            </Button>
          )}
          <Button
            onClick={submit}
            disabled={setMutation.isPending}
            className="flex-1 bg-violet-500 hover:bg-violet-500/90 text-white font-bold tracking-wide"
          >
            {setMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : tn.isPapa ? (
              "Redeclarar"
            ) : (
              "Aplicar override"
            )}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function AskAboutModal({
  node,
  onClose,
}: {
  node: BoardNode;
  onClose: () => void;
}) {
  const tn = useTone();
  const [query, setQuery] = useState("");

  const askMutation = trpc.contextActions.askAbout.useMutation();
  const result = askMutation.data;

  const submit = async () => {
    if (query.trim().length < 2) return;
    await askMutation.mutateAsync({
      nodeId: node.id,
      query: query.trim(),
    });
  };

  const humanLabel = tn.label(node.id, node.label);

  return (
    <ModalShell
      title={
        tn.isPapa
          ? `Preguntar sobre "${humanLabel}"`
          : `Ask about ${node.id}`
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-[12px] text-foreground/70 leading-relaxed">
          {tn.isPapa
            ? "El Monstruo te va a contestar usando solo lo que sabe de esta pieza y de las que conecta directamente."
            : "Gemini 3 Pro responde con contexto enfocado en este nodo y sus conexiones inmediatas."}
        </p>

        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-2 block">
            {tn.isPapa ? "Tu pregunta" : "Pregunta"}
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder={
              tn.isPapa
                ? "¿Qué hace exactamente esta pieza? ¿Qué le falta?"
                : "Ej: ¿Cuál es el rol de este nodo?"
            }
            rows={3}
            className="w-full px-3 py-2 rounded border border-white/10 bg-black/30 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:border-orange-500/50 focus:outline-none resize-none"
            style={{ fontSize: "max(16px, 0.875rem)" }}
            maxLength={500}
          />
          <div className="text-[10px] text-muted-foreground/60 text-right mt-1 font-mono">
            {query.length}/500 · ⌘+Enter
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={askMutation.isPending || query.trim().length < 2}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wide"
        >
          {askMutation.isPending ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              {tn.isPapa
                ? "El Monstruo está pensando..."
                : "Razonando..."}
            </>
          ) : (
            <>
              <Send className="size-4 mr-2" />
              {tn.isPapa ? "Preguntar" : "Enviar"}
            </>
          )}
        </Button>

        {result && (
          <div
            className={`p-3 rounded border ${
              result.fallback
                ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                : "border-orange-500/30 bg-orange-500/5 text-foreground/95"
            }`}
          >
            {result.answer ? (
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </p>
            ) : (
              <p className="text-[12px] text-amber-100/90">
                {tn.isPapa
                  ? "El Monstruo no pudo contestarte ahora. Intenta de nuevo en un momento."
                  : `Fallback: ${result.reason}`}
              </p>
            )}
            {!result.fallback && (
              <div className="text-[10px] text-muted-foreground/60 font-mono mt-2">
                {result.model} · {result.latency_ms}ms
              </div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
