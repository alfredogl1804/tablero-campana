/**
 * ModoPapaToggle — Switch de accesibilidad
 * Activa modo "Papá": tipografía mayor, focus rings visibles,
 * áreas táctiles más grandes, animaciones más lentas.
 */
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { useAccessibility } from "@/contexts/AccessibilityContext";

export function ModoPapaToggle() {
  const { mode, toggle } = useAccessibility();
  const active = mode === "papa";

  return (
    <button
      onClick={toggle}
      aria-pressed={active}
      aria-label={
        active ? "Desactivar Modo Papá" : "Activar Modo Papá (más legible)"
      }
      title={active ? "Modo Papá activo · click para desactivar" : "Modo Papá · accesibilidad"}
      className={`forja-panel forja-bevel rounded-full pl-2 pr-3 py-1.5 flex items-center gap-2 transition-all hover:scale-[1.04] ${
        active
          ? "ring-1 ring-orange-500/60 shadow-[0_0_16px_rgba(249,115,22,0.35)]"
          : ""
      }`}
    >
      <span
        className={`size-7 rounded-full flex items-center justify-center transition-colors ${
          active
            ? "bg-orange-500/20 text-orange-400"
            : "bg-black/30 text-muted-foreground"
        }`}
      >
        <Eye className="size-3.5" />
      </span>
      <div className="flex flex-col items-start leading-none">
        <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70 font-mono">
          Modo Papá
        </span>
        <span
          className={`text-[11px] font-medium transition-colors ${
            active ? "text-orange-400" : "text-foreground/70"
          }`}
        >
          {active ? "Activado" : "Desactivado"}
        </span>
      </div>
      {/* Switch visual */}
      <div
        className={`relative w-8 h-4 rounded-full transition-colors ${
          active ? "bg-orange-500/40" : "bg-black/40 border border-white/10"
        }`}
      >
        <motion.span
          className={`absolute top-0.5 size-3 rounded-full ${
            active ? "bg-orange-400" : "bg-muted-foreground/60"
          }`}
          animate={{ left: active ? "1.1rem" : "0.125rem" }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          style={{
            boxShadow: active ? "0 0 8px rgba(249,115,22,0.6)" : "none",
          }}
        />
      </div>
    </button>
  );
}
