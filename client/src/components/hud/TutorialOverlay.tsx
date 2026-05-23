/**
 * TutorialOverlay — onboarding corto la primera vez
 * 4 pasos: Vista, Click, Búsqueda, Estados
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X, Compass, MousePointerClick, Search, Hammer } from "lucide-react";

interface TutorialOverlayProps {
  onClose: () => void;
}

const STEPS = [
  {
    icon: Compass,
    title: "Bienvenido al Tablero de Campaña",
    body: "Esto es El Monstruo visto como una mesa de trabajo industrial. Cada pieza que ves es una parte real del sistema, con su tamaño y forma proporcional a lo que existe en el código.",
  },
  {
    icon: MousePointerClick,
    title: "Toca una pieza para conocerla",
    body: "Haz clic en cualquier edificio del tablero. Aparecerá un panel a la derecha que te explica qué es esa pieza, cómo se conecta con otras, y qué hace dentro del Monstruo.",
  },
  {
    icon: Search,
    title: "Pide algo en lenguaje natural",
    body: "Abajo está la barra de comando. Puedes buscar piezas por nombre, o escribir lo que quieres lograr. Por ejemplo: «mostrar la memoria» o «¿qué le falta a la app móvil?».",
  },
  {
    icon: Hammer,
    title: "Lee los colores y estados",
    body: "Las piezas con luz cálida están activas y funcionando. Las que pulsan en ámbar están degradadas. Las translúcidas naranjas están en construcción ahora. Las grises son piezas que aún faltan por construir.",
  },
];

export function TutorialOverlay({ onClose }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto"
      style={{ background: "rgba(10, 8, 6, 0.7)", backdropFilter: "blur(8px)" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="forja-panel rounded-xl w-[480px] p-7 relative"
          style={{
            boxShadow:
              "0 0 0 1px rgba(249,115,22,0.25), 0 24px 80px -20px rgba(249,115,22,0.3), 0 32px 80px -16px rgba(0,0,0,0.7)",
          }}
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 size-8 rounded flex items-center justify-center hover:bg-white/5 text-muted-foreground hover:text-foreground transition"
            aria-label="Cerrar tutorial"
          >
            <X className="size-4" />
          </button>

          <div className="size-12 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mb-5">
            <Icon className="size-5 text-orange-400" />
          </div>

          <h3 className="text-2xl font-bold text-foreground tracking-tight leading-tight mb-3">
            {current.title}
          </h3>

          <p className="text-[15px] leading-relaxed text-foreground/85 mb-6">
            {current.body}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === step
                    ? "bg-orange-500 w-8"
                    : i < step
                      ? "bg-orange-500/40 w-4"
                      : "bg-white/10 w-4"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-[13px] text-muted-foreground hover:text-foreground transition"
            >
              Saltar tutorial
            </button>
            <button
              onClick={() => {
                if (step < total - 1) {
                  setStep(step + 1);
                } else {
                  onClose();
                }
              }}
              className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium flex items-center gap-2 transition"
            >
              {step < total - 1 ? "Siguiente" : "Empezar"}
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
