/**
 * REGRESIÓN — v2.4 (postmortem Canvas 3D negro)
 *
 * Prohíbe que cualquier componente R3F del Canvas vuelva a depender de una URL
 * remota bloqueable. La causa raíz del bug del Canvas negro (validada con probe
 * de GPT-5.5 Pro Sabio #1) fue `<Text font="https://fonts.gstatic.com/...">`
 * en DistrictPlatform.tsx, que suspendía todo el árbol R3F esperando una CDN
 * que el sandbox y algunas redes móviles bloquean.
 *
 * Este test bloquea la regresión auditando el contenido de los archivos del
 * board sin necesidad de un navegador.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const BOARD_FILES = [
  "client/src/components/board/IsometricBoard.tsx",
  "client/src/components/board/DistrictPlatform.tsx",
  "client/src/components/board/Building.tsx",
  "client/src/components/board/ConnectionLines.tsx",
];

const REMOTE_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "Google Fonts CDN", regex: /https?:\/\/fonts\.(gstatic|googleapis)\.com/i },
  { name: "Three.js examples CDN", regex: /https?:\/\/threejs\.org\/examples/i },
  { name: "drei <Environment files=\"http..\"/>", regex: /<Environment[^>]+files\s*=\s*['"]https?:\/\//i },
  { name: "useTexture('http://...')", regex: /useTexture\(\s*['"]https?:\/\//i },
  { name: "useGLTF('http://...')", regex: /useGLTF\(\s*['"]https?:\/\//i },
  { name: "useLoader('...', 'http://...')", regex: /useLoader\([^)]*['"]https?:\/\//i },
];

describe("Canvas R3F debe ser inmune a CDNs externas (postmortem v2.4)", () => {
  for (const relPath of BOARD_FILES) {
    it(`${relPath} no contiene URLs remotas que bloqueen R3F`, () => {
      const fullPath = resolve(process.cwd(), relPath);
      const content = readFileSync(fullPath, "utf-8");

      const hits = REMOTE_PATTERNS.filter((p) => p.regex.test(content)).map((p) => p.name);

      expect(
        hits,
        `Archivo ${relPath} reintrodujo dependencias remotas bloqueantes: ${hits.join(", ")}.\n` +
          `Causa raíz histórica del Canvas negro v2.0–v2.3. Usar fuente local de drei o assets ` +
          `bundleados con \`manus-upload-file --webdev\`.`,
      ).toEqual([]);
    });
  }
});
