/**
 * Catálogo de modelos Gemini vigentes — validado contra
 * https://generativelanguage.googleapis.com/v1beta/models el 23 may 2026.
 *
 * IMPORTANTE: NO actualizar estos identificadores basándose en datos de entrenamiento;
 * SIEMPRE re-validar contra el endpoint live antes de cambiar.
 */
export const GEMINI_MODELS = {
  REASONING_TOP: "gemini-3.1-pro-preview",
  REASONING_FAST: "gemini-3.5-flash",
  HEALTHCHECK: "gemini-3.5-flash",
  IMAGE_TOP: "gemini-3-pro-image-preview", // Nano Banana Pro
  IMAGE_FAST: "gemini-3.1-flash-image-preview", // Nano Banana 3.1 Flash
} as const;

export type GeminiTier = "top" | "fast";

export function resolveImageModel(tier: GeminiTier): string {
  return tier === "top" ? GEMINI_MODELS.IMAGE_TOP : GEMINI_MODELS.IMAGE_FAST;
}

export function resolveReasoningModel(tier: GeminiTier): string {
  return tier === "top" ? GEMINI_MODELS.REASONING_TOP : GEMINI_MODELS.REASONING_FAST;
}
