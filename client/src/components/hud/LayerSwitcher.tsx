/**
 * Sprint v3.0 / T4 — LayerSwitcher.
 *
 * Conmutador de las 5 lentes del board: Distrito · Salud · Antigüedad · Tamaño
 * · Cambio. Se anima al cambiar y muestra una leyenda de colores debajo.
 *
 * Diseño Forja: chips compactos, glow naranja en activo, texto pequeño en
 * mayúsculas anchas, glassmorphism del tema.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useLayer } from "@/hooks/useLayer";
import { useTone } from "@/hooks/useTone";
import type { BoardData } from "@/lib/board-types";

interface LayerSwitcherProps {
  data: BoardData;
}

export function LayerSwitcher({ data }: LayerSwitcherProps) {
  const { layerId, setLayerId, layer, layers } = useLayer();
  const tn = useTone();
  const [open, setOpen] = useState(false);

  // Hidratar la leyenda del distrito en runtime con los distritos vivos.
  const hydratedLegend =
    layer.id === "district"
      ? data.districts.map((d) => ({
          color: d.color,
          label: tn.district(d.id, d.label),
        }))
      : Array.from(layer.legend);

  return (
    <div className="absolute top-[calc(env(safe-area-inset-top,0)+5.5rem)] right-4 z-30 pointer-events-auto">
      <div
        className="forja-panel forja-bevel rounded-xl overflow-hidden"
        style={{
          boxShadow:
            "0 0 0 1px rgba(249,115,22,0.18), 0 16px 50px -16px rgba(0,0,0,0.55)",
        }}
      >
        {/* Header */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-orange-500/5 transition"
        >
          <div className="flex items-center gap-2">
            <span
              className="size-6 rounded-md flex items-center justify-center text-[14px] text-orange-300 bg-orange-500/15 border border-orange-500/30"
              aria-hidden
            >
              {layer.glyph}
            </span>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-mono leading-tight">
                Lente
              </div>
              <div className="text-[13px] font-semibold text-foreground leading-tight">
                {tn.isPapa ? layer.labelPapa : layer.label}
              </div>
            </div>
          </div>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Switcher de capas */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="border-t border-white/5 overflow-hidden"
            >
              <div className="p-2 grid grid-cols-1 gap-1">
                {layers.map((l) => {
                  const isActive = l.id === layerId;
                  return (
                    <button
                      key={l.id}
                      onClick={() => {
                        setLayerId(l.id);
                      }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition border ${
                        isActive
                          ? "bg-orange-500/15 border-orange-500/40 text-orange-100"
                          : "border-transparent hover:bg-white/5 text-foreground/80"
                      }`}
                    >
                      <span
                        className={`size-5 rounded flex items-center justify-center text-[12px] ${
                          isActive
                            ? "bg-orange-500/30 text-orange-200"
                            : "bg-white/5 text-muted-foreground"
                        }`}
                      >
                        {l.glyph}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-medium truncate">
                          {tn.isPapa ? l.labelPapa : l.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 truncate">
                          {l.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leyenda */}
        {hydratedLegend.length > 0 && (
          <div className="border-t border-white/5 px-3 py-2">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70 font-mono mb-1.5">
              Leyenda
            </div>
            <div className="flex flex-col gap-1">
              {hydratedLegend.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-sm flex-shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-[11px] text-foreground/85 truncate">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
