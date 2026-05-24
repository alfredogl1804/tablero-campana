/**
 * Omnibox — barra de comando en lenguaje natural (centro inferior)
 * Diseño Forja: tipografía grande, glassmorphism, glow naranja al focus
 * Permite buscar componentes y (en Fase 2) dar directivas
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Sparkles, Mic } from "lucide-react";
import Fuse from "fuse.js";
import type { BoardData, BoardNode } from "@/lib/board-types";
import { useTone } from "@/hooks/useTone";

interface OmniboxProps {
  data: BoardData;
  onSelectNode: (id: string) => void;
}

export function Omnibox({ data, onSelectNode }: OmniboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // T3 Sprint v3.0 — traducción a tono Modo Papá.
  const tn = useTone();

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
    [data.nodes]
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
      }
      // Cmd+K / Ctrl+K también abre
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

  const isCommandLike = query.trim().length > 12 && matches.length === 0;

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
              Busca o pide algo al Monstruo
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
              <Search className="size-5 text-orange-500 mr-3 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pide algo... ej: «¿qué le falta a la app móvil?»"
                className="flex-1 bg-transparent outline-none text-base sm:text-lg text-foreground placeholder:text-muted-foreground/60 font-medium min-w-0"
                style={{ fontSize: "max(16px, 1rem)" }}
              />
              <button
                className="size-8 rounded flex items-center justify-center hover:bg-white/5 text-muted-foreground hover:text-orange-400 transition mr-1"
                aria-label="Hablar"
                onClick={() => {
                  /* Placeholder Web Speech API */
                }}
              >
                <Mic className="size-4" />
              </button>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/40 border border-white/10 text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Resultados / Sugerencias */}
            <div className="max-h-[360px] overflow-y-auto">
              {!query.trim() && <Suggestions />}

              {matches.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
                    Componentes encontrados
                  </div>
                  {matches.map((n) => {
                    const district = data.districts.find((d) => d.id === n.district);
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
                          {district ? tn.district(district.id, district.label) : ""}
                        </span>
                        <ArrowRight className="size-4 text-muted-foreground group-hover:text-orange-400 transition flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {isCommandLike && (
                <div className="px-4 py-4 border-t border-white/5">
                  <div className="flex items-start gap-3 p-3 rounded-md bg-orange-500/5 border border-orange-500/20">
                    <Sparkles className="size-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-orange-200 font-medium mb-1">
                        Esto parece una directiva al Monstruo
                      </div>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                        En la próxima fase, esto se convertirá en una orden real
                        para construir o modificar piezas del sistema. Por ahora,
                        está en preparación.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {query.trim() && matches.length === 0 && !isCommandLike && (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No encontré componentes con ese nombre.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Suggestions() {
  const suggestions = [
    "¿Qué piezas están degradadas?",
    "Mostrar la memoria del Monstruo",
    "¿Qué falta por construir?",
    "Buscar Catastro",
  ];
  return (
    <div className="py-3">
      <div className="px-4 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-mono">
        Prueba pidiendo
      </div>
      {suggestions.map((s) => (
        <div
          key={s}
          className="px-4 py-2 text-[13px] text-foreground/70 hover:bg-white/3 transition flex items-center gap-2"
        >
          <Sparkles className="size-3 text-orange-500/70" />
          {s}
        </div>
      ))}
    </div>
  );
}
