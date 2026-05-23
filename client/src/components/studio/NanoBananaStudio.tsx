/**
 * Nano Banana Studio — interfaz operable para generar imágenes con Gemini real.
 *
 * Esta es LA PIEZA OPERABLE central del Catastro: la única candidata que ya
 * está conectada a producción. Permite a Alfredo (y a su papá) generar imágenes
 * desde el Tablero usando Nano Banana Pro.
 *
 * Estética: Forja Industrial Brutalista — naranja forja sobre grafito.
 */
"use no memo";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  Download,
  Zap,
  Crown,
  Lock,
} from "lucide-react";

interface GeneratedAsset {
  url: string;
  key: string;
  prompt: string;
  model: string;
  timestamp: number;
}

interface NanoBananaStudioProps {
  open: boolean;
  onClose: () => void;
}

export function NanoBananaStudio({ open, onClose }: NanoBananaStudioProps) {
  const { isAuthenticated } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [tier, setTier] = useState<"top" | "fast">("top");
  const [history, setHistory] = useState<GeneratedAsset[]>([]);

  const generate = trpc.gemini.generateImage.useMutation({
    onSuccess: (data) => {
      setHistory((prev) => [
        {
          url: data.url,
          key: data.key,
          prompt: data.prompt,
          model: data.model,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
      setPrompt("");
    },
  });

  const handleGenerate = () => {
    if (!prompt.trim() || generate.isPending) return;
    generate.mutate({ prompt: prompt.trim(), tier });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: "spring", damping: 24, stiffness: 220 }}
          className="relative w-full max-w-5xl h-[85vh] bg-card border-2 border-primary/30 rounded-lg shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow:
              "0 0 0 1px rgba(255, 138, 38, 0.1), 0 30px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255, 138, 38, 0.15)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-gradient-to-r from-primary/10 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight uppercase">
                  Nano Banana Studio
                </h2>
                <p className="text-xs text-muted-foreground">
                  Candidata operable · Generación real con Gemini
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-md hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Auth gate */}
          {!isAuthenticated ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 gap-4">
              <Lock className="w-12 h-12 text-primary/60" />
              <h3 className="text-xl font-bold">Inicia sesión para operar</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Nano Banana Studio requiere autenticación para usar las
                capacidades reales del Monstruo. Tus generaciones quedan
                guardadas en tu sesión.
              </p>
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Iniciar sesión con Manus
              </Button>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] overflow-hidden">
              {/* Left: prompt panel */}
              <div className="border-r border-primary/20 bg-background/40 flex flex-col p-5 gap-4 overflow-y-auto">
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2 block">
                    Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe la imagen que quieres crear...&#10;&#10;Ej: Un león dorado caminando entre piezas de maquinaria forjada en hierro, luz de atardecer industrial, cinematográfico"
                    rows={8}
                    className="w-full bg-background border border-primary/20 rounded-md p-3 text-sm font-mono resize-none focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="text-[10px] text-muted-foreground mt-1 text-right">
                    {prompt.length} / 4000
                  </div>
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mb-2 block">
                    Modelo
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTier("top")}
                      className={`flex flex-col items-center gap-1 px-3 py-3 rounded-md border-2 transition-all ${
                        tier === "top"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-primary/20 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Crown className="w-4 h-4" />
                      <span className="text-xs font-bold">Pro</span>
                      <span className="text-[10px] opacity-80">
                        gemini-3-pro-image
                      </span>
                    </button>
                    <button
                      onClick={() => setTier("fast")}
                      className={`flex flex-col items-center gap-1 px-3 py-3 rounded-md border-2 transition-all ${
                        tier === "fast"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-primary/20 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      <span className="text-xs font-bold">Flash</span>
                      <span className="text-[10px] opacity-80">
                        3.1-flash-image
                      </span>
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generate.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wide uppercase py-6"
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Materializando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generar imagen
                    </>
                  )}
                </Button>

                {generate.error && (
                  <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-3">
                    Error: {generate.error.message}
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground/60 leading-relaxed border-t border-primary/10 pt-3">
                  Esta es la única candidata del Catastro operable hoy.
                  Cada imagen generada se guarda en el storage de tu sesión.
                </div>
              </div>

              {/* Right: gallery */}
              <div className="flex-1 overflow-y-auto p-5 bg-background/20">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-muted-foreground/60">
                    <ImageIcon className="w-16 h-16 opacity-30" />
                    <p className="text-sm">
                      Tus imágenes aparecerán aquí
                    </p>
                    <p className="text-[11px] opacity-70 max-w-xs">
                      Escribe un prompt a la izquierda y presiona Generar.
                      La materialización tarda 5–20 segundos.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {history.map((asset, idx) => (
                      <motion.div
                        key={asset.timestamp}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="group relative rounded-lg overflow-hidden border border-primary/20 bg-background/60"
                      >
                        <img
                          src={asset.url}
                          alt={asset.prompt}
                          className="w-full h-auto block"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                          <p className="text-[11px] text-white/90 line-clamp-3 mb-2">
                            {asset.prompt}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] uppercase tracking-widest text-primary bg-primary/20 px-2 py-0.5 rounded">
                              {asset.model.includes("pro") ? "Pro" : "Flash"}
                            </span>
                            <a
                              href={asset.url}
                              download
                              className="ml-auto text-[10px] text-white/80 hover:text-primary flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Descargar
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
