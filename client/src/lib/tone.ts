/**
 * Sprint v3.0 / T3 — Modo Papá funcional.
 *
 * Este módulo es el **cerebro narrativo del Tablero**. Convierte vocabulario
 * técnico del Monstruo (IDs internos, métricas LOC, status enum, módulos del
 * kernel, distritos arquitectónicos) en frases que Don Alfredo Góngora —
 * usuario primario, 67 años, no ingeniero — entiende sin traductor.
 *
 * Política:
 * - El diccionario es **manual y curado**. Nada de heurísticas. Si una pieza
 *   no está aquí, fallback al label original (no inventamos traducciones).
 * - Las traducciones se aplican SOLO cuando `tone === "papa"`. En modo
 *   `default` el HUD sigue siendo técnico (audiencia ingeniera).
 * - El diccionario se valida con Vitest (`server/tone.dictionary.test.ts`)
 *   para evitar drift silencioso al añadir nodos nuevos.
 *
 * Estructura:
 * - `NODE_LABEL_PAPA`: traducciones de IDs específicos del genoma del Monstruo.
 * - `STATUS_LABEL_PAPA` / `STATUS_DESCRIPTION_PAPA`: traducción del enum.
 * - `DISTRICT_LABEL_PAPA`: traducción de los 5 distritos.
 * - `KERNEL_TERM_PAPA`: traducción de jerga ("kernel", "supabase", "stack",
 *   "deploy", "uptime", "loc", "snapshot", "fallback").
 * - Helpers `translateLabel`, `translateStatus`, `translateDistrict`,
 *   `humanizeMetric`, `humanizeKernelTerm`.
 */

export type Tone = "default" | "papa";

// ───────────────────────────────────────────────────────────────────
// Diccionario canónico de nodos del Monstruo → frase humana
// IDs vienen de scripts/build_board_data.py (mapeo del genoma).
// ───────────────────────────────────────────────────────────────────
export const NODE_LABEL_PAPA: Record<string, string> = {
  // ── Cognición (cómo piensa el Monstruo)
  embrion_loop: "Cómo piensa",
  memory: "Su memoria",
  anti_dory: "Lo que no se le olvida",
  memento: "Su libreta de notas",
  catastro: "Catálogo de sus piezas",
  catastros: "Catálogos por dominio",
  vanguard: "Lo que está aprendiendo",
  learning: "Cómo se hace más listo",
  collective: "Cómo trabaja con otras IAs",
  main: "El director de orquesta",
  auth: "Quién entra y quién no",
  background_store: "Lo que recuerda en silencio",
  adaptive_model_selector: "Elige qué cerebro usar",
  cost_optimizer: "Cuida el presupuesto",
  causal_decomposer: "Encuentra la causa real",

  // ── Interfaces (por dónde habla)
  bot_telegram: "El Monstruo en Telegram",
  sat_el_monstruo_bot: "El bot principal",
  sat_el_monstruo_command_center: "El tablero de mando",
  sat_like_kukulkan_tickets: "La taquilla de boletos",
  sat_monstruo_quantum_realm: "El Monstruo en versión 3D",
  browser: "El Monstruo en el navegador",
  a2ui: "Cómo te habla a ti",
  agui_adapter: "Cómo habla con otras IAs",
  plugins: "Sus extensiones",

  // ── Infraestructura (dónde vive)
  kernel_production: "Su cuerpo en producción",
  supabase_main: "Su memoria de largo plazo",
  sms_v4: "Memoria soberana (v4)",
  sat_apps_la_forja: "El taller donde se construye",
  sat_apps_mobile: "Las apps del celular",
  sat_forja_mcp: "Conector con otros sistemas",

  // ── Capacidades (qué sabe hacer)
  brand: "Su identidad y voz",
  brand_engine: "El motor de su marca",
  embriones: "Sus mini-Monstruos especializados",
  embrion_specializations: "Reglas de los embriones",
  embrion_creativo: "El embrión creativo",
  embrion_estratega: "El embrión estratega",
  embrion_financiero: "El embrión que cuida el dinero",
  embrion_investigador: "El embrión investigador",
  embrion_tecnico: "El embrión técnico",
  embrion_ventas: "El embrión de ventas",
  embrion_vigia: "El embrión vigía",
  design: "Su lenguaje visual",
  motion: "Cómo se comunica visualmente",
  dashboards: "Sus tableros de control",
  alerts: "Sus alarmas",
  milestones: "Sus metas",
  rotor: "El que coordina todo",
  runner: "El que ejecuta tareas",
  guardian_runner: "El guardián que protege",
  product_architect: "El que diseña productos",
  critic_visual: "El crítico visual",
  critic_visual_browserless_fallback: "Crítico visual (modo respaldo)",
  validation: "Quien revisa que todo esté bien",
  security: "Su seguridad",
  sovereignty: "Su independencia",

  // ── Futuro (lo que viene)
  gap_bot_offline: "Modo sin conexión (planeado)",
  gap_collective_ram_only: "Memoria colectiva (planeada)",
  gap_domain_embriones_doctrine_only: "Embriones de dominio (planeados)",
  gap_embeddings_pending: "Búsqueda inteligente (planeada)",
  gap_embrion_loop_isolated: "Loop de pensamiento aislado (planeado)",
  gap_embriones_stateless: "Embriones con memoria propia (planeados)",
  sat_el_mundo_de_tata: "El Mundo de Tata (planeado)",
};

// ───────────────────────────────────────────────────────────────────
// Status enum (ACTIVE | DEGRADED | SPRINT | FUTURE) → frase humana
// ───────────────────────────────────────────────────────────────────
export const STATUS_LABEL_PAPA: Record<string, string> = {
  ACTIVE: "Funcionando",
  DEGRADED: "Con problemas",
  SPRINT: "En obra",
  FUTURE: "Por hacer",
};

export const STATUS_LABEL_DEFAULT: Record<string, string> = {
  ACTIVE: "Activa",
  DEGRADED: "Degradada",
  SPRINT: "En construcción",
  FUTURE: "Futura",
};

export const STATUS_DESCRIPTION_PAPA: Record<string, string> = {
  ACTIVE: "Está prendida y haciendo su trabajo",
  DEGRADED: "Funciona a medias — necesita revisión",
  SPRINT: "Se está construyendo ahora mismo",
  FUTURE: "Todavía no existe — está planeada",
};

export const STATUS_DESCRIPTION_DEFAULT: Record<string, string> = {
  ACTIVE: "Funcionando en producción",
  DEGRADED: "Funciona parcialmente · necesita atención",
  SPRINT: "Trabajándose ahora mismo",
  FUTURE: "Aún no construida — planeada",
};

// ───────────────────────────────────────────────────────────────────
// Distritos del Monstruo → frase humana
// ───────────────────────────────────────────────────────────────────
export const DISTRICT_LABEL_PAPA: Record<string, string> = {
  cognicion: "Cómo piensa",
  interfaces: "Por dónde habla",
  infraestructura: "Dónde vive",
  capacidades: "Qué sabe hacer",
  futuro: "Lo que viene",
};

// ───────────────────────────────────────────────────────────────────
// Jerga del kernel y de la plataforma → frase humana
// ───────────────────────────────────────────────────────────────────
export const KERNEL_TERM_PAPA: Record<string, string> = {
  kernel: "cerebro",
  supabase: "memoria",
  memoria: "memoria",
  loc: "tamaño",
  "líneas": "tamaño",
  snapshot: "foto",
  fallback: "respaldo",
  static: "respaldo",
  mount: "fuente viva",
  canonical_mount: "fuente viva",
  local_snapshot_fallback: "respaldo local",
  deploy: "publicación",
  uptime: "tiempo encendido",
  health: "salud",
  stack: "tecnología",
  endpoint: "puerta de entrada",
  api: "puerta de entrada",
  trpc: "comunicación interna",
  tablero: "tablero",
  hace: "hace",
  sincronizando: "actualizando",
  "snapshot local": "datos viejos",
  "error de conexión": "sin conexión",
};

// ───────────────────────────────────────────────────────────────────
// Helpers públicos
// ───────────────────────────────────────────────────────────────────

/**
 * Traduce el `label` de un nodo según el tono.
 * - tone="default": devuelve `fallbackLabel` (lo que ya muestra el HUD).
 * - tone="papa": busca en NODE_LABEL_PAPA por id; si no existe, devuelve fallback.
 */
export function translateLabel(
  nodeId: string,
  fallbackLabel: string,
  tone: Tone,
): string {
  if (tone !== "papa") return fallbackLabel;
  return NODE_LABEL_PAPA[nodeId] ?? fallbackLabel;
}

/**
 * Traduce un status enum.
 */
export function translateStatus(status: string, tone: Tone): string {
  const dict = tone === "papa" ? STATUS_LABEL_PAPA : STATUS_LABEL_DEFAULT;
  return dict[status] ?? status;
}

/**
 * Traduce la descripción de un status (texto largo).
 */
export function translateStatusDescription(status: string, tone: Tone): string {
  const dict =
    tone === "papa" ? STATUS_DESCRIPTION_PAPA : STATUS_DESCRIPTION_DEFAULT;
  return dict[status] ?? "";
}

/**
 * Traduce un distrito.
 */
export function translateDistrict(
  districtId: string,
  fallbackLabel: string,
  tone: Tone,
): string {
  if (tone !== "papa") return fallbackLabel;
  return DISTRICT_LABEL_PAPA[districtId] ?? fallbackLabel;
}

/**
 * Humaniza una métrica (LOC en líneas → "tamaño chico/mediano/grande/enorme").
 */
export function humanizeMetric(
  metric: "loc",
  value: number,
  tone: Tone,
): { value: string; unit: string } {
  if (metric === "loc") {
    if (tone !== "papa") {
      return {
        value: value.toLocaleString("es-MX"),
        unit: "líneas",
      };
    }
    // Modo papá: bucket cualitativo
    if (value === 0) return { value: "—", unit: "" };
    if (value < 200) return { value: "Chiquita", unit: "" };
    if (value < 1000) return { value: "Mediana", unit: "" };
    if (value < 5000) return { value: "Grande", unit: "" };
    return { value: "Enorme", unit: "" };
  }
  return { value: String(value), unit: "" };
}

/**
 * Humaniza una palabra/término de jerga.
 */
export function humanizeKernelTerm(term: string, tone: Tone): string {
  if (tone !== "papa") return term;
  const lower = term.toLowerCase();
  return KERNEL_TERM_PAPA[lower] ?? term;
}

/**
 * Cuenta cuántos nodos del board tienen entrada en NODE_LABEL_PAPA (cobertura
 * del diccionario). Se usa en tests para detectar drift cuando se añaden
 * piezas nuevas al genoma.
 */
export function dictionaryCoverage(nodeIds: string[]): {
  total: number;
  covered: number;
  missing: string[];
  ratio: number;
} {
  const missing: string[] = [];
  let covered = 0;
  for (const id of nodeIds) {
    if (NODE_LABEL_PAPA[id]) covered++;
    else missing.push(id);
  }
  return {
    total: nodeIds.length,
    covered,
    missing,
    ratio: nodeIds.length === 0 ? 0 : covered / nodeIds.length,
  };
}
