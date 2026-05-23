/**
 * Router tRPC de Gemini.
 * Expone:
 * - health: validación rápida de que la API key funciona y modelos están vivos
 * - listModels: catálogo de modelos disponibles
 * - generateImage: invoca Nano Banana Pro (gemini-3-pro-image-preview) o Flash
 * - reason: invoca razonamiento Pro o Fast
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getGeminiClient } from "../_core/geminiClient";
import { GEMINI_MODELS, resolveImageModel, resolveReasoningModel } from "../_core/geminiModels";
import { storagePut } from "../storage";

export const geminiRouter = router({
  health: publicProcedure.query(async () => {
    try {
      const client = getGeminiClient();
      const r = await client.models.generateContent({
        model: GEMINI_MODELS.HEALTHCHECK,
        contents: "ping",
      });
      const text = r.text ?? "";
      return {
        ok: true,
        model: GEMINI_MODELS.HEALTHCHECK,
        sample: text.slice(0, 80),
        timestamp: Date.now(),
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg, timestamp: Date.now() };
    }
  }),

  listModels: publicProcedure.query(() => {
    return {
      catalog: GEMINI_MODELS,
      validated_at: "2026-05-23",
      source: "https://generativelanguage.googleapis.com/v1beta/models",
    };
  }),

  generateImage: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(3).max(4000),
        tier: z.enum(["top", "fast"]).default("top"),
        // referenceUrls opcional: URLs públicas o /manus-storage/* a usar como referencias visuales
        referenceUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const client = getGeminiClient();
      const model = resolveImageModel(input.tier);

      // Construir contents con prompt + referencias opcionales
      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [{ text: input.prompt }];

      if (input.referenceUrls && input.referenceUrls.length > 0) {
        for (const url of input.referenceUrls.slice(0, 4)) {
          try {
            const resp = await fetch(url);
            if (!resp.ok) continue;
            const buf = Buffer.from(await resp.arrayBuffer());
            const mime = resp.headers.get("content-type") || "image/png";
            parts.push({
              inlineData: { mimeType: mime, data: buf.toString("base64") },
            });
          } catch {
            // ignore reference fetch failures
          }
        }
      }

      const result = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
      });

      // Extraer la primera imagen del response
      const candidates = result.candidates ?? [];
      let imageBase64: string | null = null;
      let imageMime = "image/png";
      let textOut = "";

      for (const cand of candidates) {
        const content = cand.content;
        if (!content?.parts) continue;
        for (const part of content.parts) {
          if ("inlineData" in part && part.inlineData?.data) {
            imageBase64 = part.inlineData.data;
            imageMime = part.inlineData.mimeType ?? "image/png";
          } else if ("text" in part && part.text) {
            textOut += part.text;
          }
        }
      }

      if (!imageBase64) {
        throw new Error("Gemini no devolvió imagen. Texto: " + textOut.slice(0, 200));
      }

      // Guardar en storage
      const ext = imageMime.includes("jpeg") ? "jpg" : imageMime.includes("webp") ? "webp" : "png";
      const fileKey = `nano-banana/${ctx.user.id}/${Date.now()}.${ext}`;
      const buffer = Buffer.from(imageBase64, "base64");
      const { url } = await storagePut(fileKey, buffer, imageMime);

      return {
        url,
        key: fileKey,
        mime: imageMime,
        model,
        prompt: input.prompt,
        text: textOut.trim() || null,
        bytes: buffer.length,
      };
    }),

  reason: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(8000),
        tier: z.enum(["top", "fast"]).default("fast"),
        system: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const client = getGeminiClient();
      const model = resolveReasoningModel(input.tier);
      const result = await client.models.generateContent({
        model,
        contents: input.system
          ? [
              { role: "user", parts: [{ text: input.system + "\n\n" + input.prompt }] },
            ]
          : input.prompt,
      });
      return {
        model,
        text: result.text ?? "",
      };
    }),
});
