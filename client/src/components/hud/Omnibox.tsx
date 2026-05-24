/**
 * Omnibox — barra de comando en lenguaje natural (centro inferior)
 *
 * Sprint v3.0 / T2 — CEREBRO NARRATIVO.
 * El Omnibox dejó de ser un buscador literal: ahora cuando el usuario teclea
 * una pregunta y aprieta Enter, se llama a `omnibox.ask` (Gemini 3 Pro con
 * el snapshot vigente del board como contexto) y la respuesta se renderiza
 * con citas clickeables a nodos reales del Monstruo.
 *
 * Modo dual:
 *   - Mientras escribes: búsqueda literal Fuse.js (instantáneo)
 *   - Al apretar Enter: pregunta al Monstruo (Gemini, ~10-20s)
 *   - Si Gemini falla: cae graceful al modo búsqueda literal
 *
 * Diseño Forja: tipografía grande, glassmorphism, glow naranja al focus.
 */
import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Sparkles, Mic, Brain, Loader2 } from "lucide-react";
import Fuse from "fuse.js";
import type { BoardData, BoardNode } from "@/lib/board-types";
import { useTone } from "@/hooks/useTone";
import { trpc } from "@/lib/trpc";

interface OmniboxProps {
  data: BoardData;
  onSelectNode: (id: string) => void;
}

interface AskState {
  status: "idle" | "thinking" | "answered" | "error";
  query: string;
  answer: string;
  citations: string[];
  model: string;
  fallback: boolean;
  reason: string;
  latencyMs: number;
}

const INITIAL_ASK_STATE: AskState = {
  status: "idle",
  query: "",
  answer: "",
  citations: [],
  model: "",
  fallback: false,
  reason: "",
  latencyMs: 0,
};

export function Omnibox({ data, onSelectNode }: OmniboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [ask, setAsk] = useState<AskState>(INITIAL_ASK_STATE);
  const inputRef = useRef<HTMLInputElement>(null);
  const tn = useTone();

  const askMutation = trpc.omnibox.ask.useMutation();

  // Mapa de IDs válidos para validar citas en el frontend (defensa en profundidad).
  const nodeById = useMemo(() => {
    const map = new Map<string, BoardNode>();
    for (const n of data.nodes) map.set(n.id, n);
    return map;
  }, [data.nodes]);

  // Índice Fuse.js para búsqueda fuzzy tolerante a errores
  const fuse = useMemo(
    () =>
      new Fuse(data.nodes, {
        keys: [
          { name: "label", weight: 2 },
          { name: "description", weight: 1 },
          { name: "id", weight: 0.5 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [data.nodes],
  );

  // Atajo: tecla "/" abre la omnibox
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
        setAsk(INITIAL_ASK_STATE);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const matches = useMemo<BoardNode[]>(() => {
    if (!query.trim()) return [];
    return fuse
      .search(query.trim())
      .slice(0, 8)
      .map((r) => r.item);
  }, [query, fuse]);

  /**
   * Pregunta al Monstruo (Gemini 3 Pro). Si falla, no rompe nada — el usuario
   * sigue viendo los matches literales debajo.
   */
  async function handleAsk() {
    const q = query.trim();
    if (q.length < 2) return;
    setAsk({ ...INITIAL_ASK_STATE, status: "thinking", query: q });
    try {
      const result = await askMutation.mutateAsync({ query: q });
      setAsk({
        status: result.fallback && !result.answer ? "error" : "answered",
        query: q,
        answer: result.answer,
        citations: result.citations,
        model: result.model,
        fallback: result.fallback,
        reason: result.reason,
        latencyMs: result.latency_ms,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setAsk({
        ...INITIAL_ASK_STATE,
        status: "error",
        query: q,
        reason: msg,
      });
    }
  }

  function handleCitationClick(id: string) {
    if (!nodeById.has(id)) return;
    onSelectNode(id);
    setOpen(false);
    setQuery("");
    setAsk(INITIAL_ASK_STATE);
  }

  function resetAsk() {
    setAsk(INITIAL_ASK_STATE);
  }

  return (
    <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0)+1.5rem)] sm:bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-auto px-3 sm:px-0">
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="closed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(true)}
            className="forja-panel forja-bevel rounded-full px-5 py-3 flex items-center gap-3 hover:scale-[1.02] transition-transform group max-w-full"
          >
            <Search className="size-4 text-orange-500 group-hover:text-orange-400" />
            <span className="text-sm text-muted-foreground">
              Pregúntale al Monstruo
            </span>
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/40 border border-white/10 text-muted-foreground">
              /  ·  ⌘K
            </kbd>
          </motion.button>
        ) : (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="forja-panel rounded-xl w-full sm:w-[640px] max-w-[640px] overflow-hidden"
            style={{
              boxShadow:
                "0 0 0 1px rgba(249,115,22,0.3), 0 24px 80px -20px rgba(249,115,22,0.25), 0 32px 80px -16px rgba(0,0,0,0.6)",
            }}
          >
            {/* Input */}
            <div className="flex items-center px-5 py-4 border-b border-white/5">
              {ask.status === "thinking" ? (
                <Loader2 className="size-5 text-orange-500 mr-3 flex-shrink-0 animate-spin" />
              ) : ask.status === "answered" ? (
                <Brain className="size-5 text-orange-500 mr-3 flex-shrink-0" />
              ) : (
                <Search className="size-5 text-orange-500 mr-3 flex-shrink-0" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (ask.status !== "idle") resetAsk();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim().length >= 2) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                placeholder="Pregúntale al Monstruo... ej: «¿cómo piensas?»"
                disabled={ask.status === "thinking"}
                className="flex-1 bg-transparent outline-none text-base sm:text-lg text-foreground placeholder:text-muted-foreground/60 font-medium min-w-0 disabled:opacity-50"
                style={{ fontSize: "max(16px, 1rem)" }}
              />
              <button
                className="size-8 rounded flex items-center justify-center hover:bg-white/5 text-muted-foreground hover:text-orange-400 transition mr-1 disabled:opacity-30"
                aria-label="Hablar"
                disabled={ask.status === "thinking"}
                onClick={() => {
                  /* Placeholder Web Speech API */
                }}
              >
                <Mic className="size-4" />
              </button>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/40 border border-white/10 text-muted-foreground">
                ↵
              </kbd>
            </div>

            {/* Cuerpo: estado de pensamiento, respuesta o búsqueda literal */}
            <div className="max-h-[420px] overflow-y-auto">
              {/* THINKING */}
              {ask.status === "thinking" && (
                <ThinkingState query={ask.query} />
              )}

              {/* ANSWERED */}
              {ask.status === "answered" && (
                <AnswerCard
                  answer={ask.answer}
                  citations={ask.citations}
                  nodeById={nodeById}
                  onCitationClick={handleCitationClick}
                  fallback={ask.fallback}
                  latencyMs={ask.latencyMs}
                  toneLabel={tn.label}
                />
              )}

              {/* ERROR */}
              {ask.status === "error" && (
                <ErrorCard reason={ask.reason} onRetry={handleAsk} />
              )}

              {/* IDLE — búsqueda literal y sugerencias */}
              {ask.status === "idle" && (
                <>
                  {!query.trim() && <Suggestions onPick={(s) => setQuery(s)} />}

                  {matches.length > 0 && (
                    <div className="py-2">
                      <div className="px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
                        Coincidencias literales · presiona ↵ para preguntarle al
                        Monstruo
                      </div>
                      {matches.map((n) => {
                        const district = data.districts.find(
                          (d) => d.id === n.district,
                        );
                        return (
                          <button
                            key={n.id}
                            onClick={() => {
                              onSelectNode(n.id);
                              setOpen(false);
                              setQuery("");
                            }}
                            className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-orange-500/10 transition group text-left"
                          >
                            <span
                              className="size-2 rounded-sm flex-shrink-0"
                              style={{
                                background: district?.color ?? "#F97316",
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {tn.label(n.id, n.label)}
                              </div>
                              <div className="text-[12px] text-muted-foreground truncate">
                                {n.description}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-muted-foreground border border-white/5 flex-shrink-0">
                              {district
                                ? tn.district(district.id, district.label)
                                : ""}
                            </span>
                            <ArrowRight className="size-4 text-muted-foreground group-hover:text-orange-400 transition flex-shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {query.trim() && matches.length === 0 && (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Ningún nombre coincide. Pregúntale al Monstruo
                        directamente.
                      </p>
                      <button
                        onClick={handleAsk}
                        className="px-4 py-2 rounded-md bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-200 text-sm font-medium inline-flex items-center gap-2 transition"
                      >
                        <Brain className="size-4" />
                        Preguntar al Monstruo
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Subcomponentes
// ──────────────────────────────────────────────────────────────────────

function ThinkingState({ query }: { query: string }) {
  return (
    <div className="px-5 py-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-8 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
          <Brain className="size-4 text-orange-400 animate-pulse" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-orange-400 font-mono">
            El Monstruo está pensando
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Consultando su genoma y razonando con Gemini 3 Pro · ~10-20s
          </div>
        </div>
      </div>
      <div className="text-sm text-foreground/80 italic border-l-2 border-orange-500/40 pl-3">
        “{query}”
      </div>
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="size-1.5 rounded-full bg-orange-400/60"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface AnswerCardProps {
  answer: string;
  citations: string[];
  nodeById: Map<string, BoardNode>;
  onCitationClick: (id: string) => void;
  fallback: boolean;
  latencyMs: number;
  toneLabel: (id: string, fallback: string) => string;
}

function AnswerCard({
  answer,
  citations,
  nodeById,
  onCitationClick,
  fallback,
  latencyMs,
  toneLabel,
}: AnswerCardProps) {
  // Renderiza el texto reemplazando [@node_id] por chips clickeables.
  const rendered = useMemo<ReactNode[]>(() => {
    const parts: ReactNode[] = [];
    const regex = /\[@([a-z0-9_]+)\]/gi;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    let key = 0;
    while ((m = regex.exec(answer)) !== null) {
      if (m.index > lastIndex) {
        parts.push(
          <span key={`t-${key++}`}>{answer.slice(lastIndex, m.index)}</span>,
        );
      }
      const id = m[1];
      const node = nodeById.get(id);
      if (node) {
        const label = toneLabel(node.id, node.label);
        parts.push(
          <button
            key={`c-${key++}`}
            onClick={() => onCitationClick(id)}
            className="inline-flex items-center gap-1 px-1.5 py-0 rounded bg-orange-500/15 hover:bg-orange-500/30 border border-orange-500/30 text-orange-200 text-[13px] font-medium transition mx-0.5 align-baseline"
            title={`Ir a ${label}`}
          >
            {label}
          </button>,
        );
      } else {
        // Cita inválida — render texto plano (defensa)
        parts.push(<span key={`t-${key++}`}>{m[0]}</span>);
      }
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < answer.length) {
      parts.push(<span key={`t-${key++}`}>{answer.slice(lastIndex)}</span>);
    }
    return parts;
  }, [answer, nodeById, onCitationClick, toneLabel]);

  return (
    <div className="px-5 py-5">
      <div className="text-[15px] leading-relaxed text-foreground/95 whitespace-pre-wrap">
        {rendered}
      </div>

      {citations.length > 0 && (
        <div className="mt-5 pt-4 border-t border-white/5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono mb-2">
            Piezas mencionadas · click para abrir
          </div>
          <div className="flex flex-wrap gap-1.5">
            {citations.map((id) => {
              const node = nodeById.get(id);
              if (!node) return null;
              return (
                <button
                  key={id}
                  onClick={() => onCitationClick(id)}
                  className="px-2 py-1 rounded-md bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-200 text-[12px] font-medium transition flex items-center gap-1.5"
                >
                  <span className="size-1.5 rounded-full bg-orange-400" />
                  {toneLabel(node.id, node.label)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 text-[10px] text-muted-foreground/60 font-mono">
        <span>{latencyMs}ms</span>
        {fallback && (
          <span className="text-amber-400/80">modo respaldo</span>
        )}
      </div>
    </div>
  );
}

function ErrorCard({
  reason,
  onRetry,
}: {
  reason: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-5 py-6">
      <div className="text-sm text-amber-300 font-medium mb-2">
        El Monstruo no pudo responder ahora.
      </div>
      <div className="text-[12px] text-muted-foreground mb-4 break-words">
        {reason || "Error desconocido"}
      </div>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 rounded-md bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-200 text-[13px] font-medium transition"
      >
        Reintentar
      </button>
    </div>
  );
}

function Suggestions({ onPick }: { onPick: (s: string) => void }) {
  const suggestions = [
    "¿Cómo piensas?",
    "¿Qué le falta a la app móvil?",
    "¿Dónde guardas la memoria?",
    "¿Qué piezas están degradadas?",
  ];
  return (
    <div className="py-3">
      <div className="px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
        Prueba preguntando
      </div>
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          className="w-full text-left px-4 py-2 text-[13px] text-foreground/70 hover:bg-white/5 hover:text-foreground transition flex items-center gap-2"
        >
          <Sparkles className="size-3 text-orange-500/70" />
          {s}
        </button>
      ))}
    </div>
  );
}
