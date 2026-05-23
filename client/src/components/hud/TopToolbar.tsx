/**
 * TopToolbar — barra superior con marca, zoom, modo, y ayuda
 */
import { motion } from "framer-motion";
import { Plus, Minus, Maximize2, HelpCircle } from "lucide-react";
import { ModoPapaToggle } from "./ModoPapaToggle";

interface TopToolbarProps {
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
  onResetView: () => void;
  onOpenHelp: () => void;
}

export function TopToolbar({
  zoomLevel,
  onZoomChange,
  onResetView,
  onOpenHelp,
}: TopToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-3"
    >
      {/* Brand */}
      <div className="forja-panel rounded-md px-4 py-2 flex items-center gap-2.5">
        <div
          className="size-6 rounded-sm"
          style={{
            background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
            boxShadow:
              "0 0 12px rgba(249,115,22,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset",
          }}
        />
        <div className="flex flex-col leading-none">
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono">
            Quantum Realm
          </span>
          <span className="text-xs font-bold text-foreground tracking-tight mt-0.5">
            v2.0 — Forja
          </span>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="forja-panel rounded-md flex items-center">
        <button
          onClick={() => onZoomChange(Math.max(15, zoomLevel - 5))}
          className="size-9 flex items-center justify-center hover:bg-orange-500/10 hover:text-orange-400 transition text-muted-foreground"
          aria-label="Alejar"
        >
          <Minus className="size-3.5" />
        </button>
        <div className="w-px h-5 bg-white/5" />
        <div className="px-3 text-[11px] font-mono tabular-nums text-foreground/80 min-w-[44px] text-center">
          {Math.round((zoomLevel / 28) * 100)}%
        </div>
        <div className="w-px h-5 bg-white/5" />
        <button
          onClick={() => onZoomChange(Math.min(60, zoomLevel + 5))}
          className="size-9 flex items-center justify-center hover:bg-orange-500/10 hover:text-orange-400 transition text-muted-foreground"
          aria-label="Acercar"
        >
          <Plus className="size-3.5" />
        </button>
        <div className="w-px h-5 bg-white/5" />
        <button
          onClick={onResetView}
          className="size-9 flex items-center justify-center hover:bg-orange-500/10 hover:text-orange-400 transition text-muted-foreground"
          aria-label="Centrar vista"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>

      {/* Modo Papá toggle */}
      <ModoPapaToggle />

      {/* Help */}
      <button
        onClick={onOpenHelp}
        className="forja-panel rounded-md size-9 flex items-center justify-center hover:bg-orange-500/10 hover:text-orange-400 transition text-muted-foreground"
        aria-label="Ayuda"
      >
        <HelpCircle className="size-4" />
      </button>
    </motion.div>
  );
}
