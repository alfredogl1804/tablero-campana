/**
 * Cliente Gemini para invocar APIs de razonamiento e imágenes.
 * Usa @google/genai (SDK oficial).
 */
import { GoogleGenAI } from "@google/genai";

let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en el entorno del servidor.");
  }
  _client = new GoogleGenAI({ apiKey });
  return _client;
}
