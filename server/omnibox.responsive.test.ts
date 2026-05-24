/**
 * REGRESIÓN — v2.4.2 (Omnibox responsive iPhone)
 *
 * En v2.4.1 detectamos en Safari iPhone real (capturas IMG_5497 / IMG_5498)
 * que el Omnibox tenía `w-[640px]` fijo, lo cual desbordaba el viewport del
 * iPhone (≤414px) y truncaba las primeras letras de cada sugerencia.
 *
 * Este test bloquea la regresión auditando el contenido del archivo:
 *   1. Prohíbe `w-[640px]` sin un `sm:` prefix o un `max-w` que lo limite.
 *   2. Exige que el input tenga `font-size >= 16px` para evitar el zoom-on-focus
 *      automático de iOS Safari.
 *   3. Exige que el contenedor exterior respete el viewport con un cálculo
 *      basado en `100vw` o `max-w-full`.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const OMNIBOX_PATH = "client/src/components/hud/Omnibox.tsx";

describe("Omnibox debe ser responsive en iPhone (postmortem v2.4.2)", () => {
  const fullPath = resolve(process.cwd(), OMNIBOX_PATH);
  const content = readFileSync(fullPath, "utf-8");

  it("no usa ancho fijo de 640px sin un breakpoint responsive", () => {
    // Se permite `sm:w-[640px]` y `max-w-[640px]`, pero NO `w-[640px]` solo.
    const danglingFixedWidth = /(?<![a-z:_-])w-\[640px\]/g;
    const matches = content.match(danglingFixedWidth) || [];

    expect(
      matches.length,
      `Omnibox reintrodujo ancho fijo sin breakpoint responsive (${matches.length} ocurrencias). ` +
        `En iPhone (≤414px) eso desborda el viewport y trunca las primeras letras de cada sugerencia. ` +
        `Usa \`w-full sm:w-[640px] max-w-[640px]\` en su lugar.`,
    ).toBe(0);
  });

  it("el input previene zoom-on-focus de iOS Safari (font-size >= 16px)", () => {
    // iOS hace auto-zoom cuando el input tiene fontSize < 16px y se le da focus.
    const hasInputFontSizeGuard =
      content.includes('fontSize: "max(16px') ||
      content.includes("fontSize: 'max(16px") ||
      content.includes("text-base sm:text-lg");

    expect(
      hasInputFontSizeGuard,
      "El input del Omnibox debe tener fontSize >= 16px en móvil para evitar el zoom-on-focus de iOS Safari. " +
        'Usa style={{ fontSize: "max(16px, 1rem)" }} o className="text-base sm:text-lg".',
    ).toBe(true);
  });

  it("el contenedor exterior respeta el viewport en móvil", () => {
    // El contenedor debe usar `100vw` con padding o `max-w-full` para no desbordar.
    const containerRespectsViewport =
      content.includes("w-[calc(100vw") ||
      content.includes("max-w-full") ||
      content.includes("max-w-[calc(100vw");

    expect(
      containerRespectsViewport,
      "El wrapper del Omnibox debe respetar el viewport en móvil. " +
        "Usa `w-[calc(100vw-1.5rem)] sm:w-auto` o `max-w-full`.",
    ).toBe(true);
  });
});
