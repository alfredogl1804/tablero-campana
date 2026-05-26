/**
 * sprintParser — Hito B-lite del Sprint Observatorio Vivo v1.1.
 *
 * Parser tolerante para los archivos `.md` de sprints en el repo
 * `el-monstruo`. Estos archivos no usan frontmatter YAML; usan un header
 * estructurado en markdown con líneas tipo `**Estado:** Propuesto`.
 *
 * Diseño:
 *   - Pure function: in = (filename, content), out = ParsedSprint | null.
 *   - No I/O. No hace fetch ni acceso a disco. Útil para tests unitarios.
 *   - Conservador: si no encuentra título o estado válido, devuelve null
 *     y el ingestor lo loggea como skipped.
 *
 * Doctrina v1.1 §3.2: status normalizado a un set finito sin mysqlEnum.
 */

import { createHash } from "node:crypto";

/** Status canónicos del observatorio. */
export const SPRINT_STATUSES = [
  "draft",
  "signed",
  "executing",
  "completed",
  "rejected",
  "obsolete",
  "unknown",
] as const;

export type SprintStatus = (typeof SPRINT_STATUSES)[number];

/** Mapping desde texto libre español a status canónico. */
const STATUS_MAP: Record<string, SprintStatus> = {
  // Draft / propuesto
  propuesto: "draft",
  draft: "draft",
  borrador: "draft",
  proposed: "draft",
  // Signed
  firmado: "signed",
  signed: "signed",
  sealed: "signed",
  canonizado: "signed",
  // Executing
  "en curso": "executing",
  ejecutando: "executing",
  "en ejecución": "executing",
  "en ejecucion": "executing",
  executing: "executing",
  active: "executing",
  // Completed
  completado: "completed",
  cerrado: "completed",
  completed: "completed",
  closed: "completed",
  "verde declarado": "completed",
  // Rejected
  rechazado: "rejected",
  rejected: "rejected",
  // Obsolete
  obsoleto: "obsolete",
  obsolete: "obsolete",
  archivado: "obsolete",
};

/** Distritos canónicos del genoma del Monstruo. */
const KNOWN_DISTRICTS = [
  "cognicion",
  "memoria",
  "interfaces",
  "soberania",
  "guardia",
  "sentidos",
  "manos",
  "cimientos",
  "evolucion",
  "comercializacion",
  "operaciones",
  "marca",
] as const;

/**
 * Heurística de palabras clave que sugieren un distrito.
 *
 * Reglas:
 *   - Las keywords son específicas; términos genéricos que aparecen en casi
 *     cualquier sprint ("sprint", "bridge", "ui", "bot") fueron removidos
 *     porque generaban falsos positivos.
 *   - Si ningún distrito matchea, el parser cae a `["operaciones"]` como
 *     fallback (lógica en `inferDistricts`).
 */
const DISTRICT_KEYWORDS: Record<string, string[]> = {
  cognicion: ["llm", "razonamiento", "cognition", "embedding", "sabios", "prompt"],
  memoria: ["memoria persistente", "supabase", "tidb", "ledger", "episodic", "semantic memory"],
  interfaces: ["tablero", "command center", "telegram", "frontend", "flutter", "pwa", "a2ui"],
  soberania: ["sovereign", "soberania", "jwt", "oauth", "capability token", "root authority"],
  guardia: ["guardian", "rls", "security audit", "thread immunity", "policy decision"],
  sentidos: ["traffic ingest", "telemetry", "observability", "event collector"],
  manos: ["forja", "tool dispatch", "stripe checkout"],
  cimientos: ["error memory", "vanguard", "design system", "magna cache"],
  evolucion: ["embrion", "embrión", "colmena", "cidp"],
  comercializacion: ["pricing", "checkout", "venta"],
  operaciones: ["sprint compiler", "memento", "audit operacional"],
  marca: ["brand engine", "brand dna", "naming convention"],
};

export interface ParsedSprint {
  /** ID derivado del filename (sin extensión, slugificado). */
  sprintId: string;
  title: string;
  descriptionMd: string;
  status: SprintStatus;
  signedBy: string | null;
  affectedDistricts: string[];
  /** sha256 hex del MD canónico. Usado para detectar cambios. */
  hashCanonical: string;
}

/** Slugifica filename a sprint_id estable. */
export function filenameToSprintId(filename: string): string {
  return filename
    .replace(/\.md$/i, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();
}

/** Extrae el primer header `# ...` del archivo. */
function extractTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }
  return fallback;
}

/** Busca una línea `**Campo:** valor` y devuelve el valor (o null). */
function extractField(content: string, field: string): string | null {
  // Soporta variantes:
  //   **Campo:** valor
  //   **Campo**: valor
  //   *Campo:* valor
  // Estrategia: regex no-greedy en el delimitador de markdown.
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    // **Campo:** valor   o   *Campo:* valor
    new RegExp(`\\*+\\s*${escaped}\\s*:\\s*\\*+\\s*(.+?)$`, "im"),
    // **Campo**: valor
    new RegExp(`\\*+\\s*${escaped}\\s*\\*+\\s*:\\s*(.+?)$`, "im"),
    // Campo: valor (sin markdown)
    new RegExp(`^\\s*${escaped}\\s*:\\s*(.+?)$`, "im"),
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m) {
      return m[1].trim();
    }
  }
  return null;
}

/** Normaliza texto libre español → status canónico. */
export function normalizeStatus(raw: string | null): SprintStatus {
  if (!raw) return "unknown";
  const lower = raw.toLowerCase().trim();
  for (const [key, value] of Object.entries(STATUS_MAP)) {
    if (lower.includes(key)) return value;
  }
  return "unknown";
}

/** Heurística para inferir distritos afectados desde el contenido. */
function inferDistricts(title: string, content: string): string[] {
  const text = `${title}\n${content}`.toLowerCase();
  const found = new Set<string>();
  for (const [district, keywords] of Object.entries(DISTRICT_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) {
      found.add(district);
    }
  }
  // Fallback: si no encontró nada, asignar "operaciones" porque es un sprint.
  if (found.size === 0) {
    found.add("operaciones");
  }
  return Array.from(found);
}

/** Hash determinista del contenido canonizado (trim + lowercase newlines). */
function canonicalHash(content: string): string {
  const canonical = content.trim().replace(/\r\n/g, "\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Parsea un archivo de sprint. Devuelve null si no parece un sprint válido
 * (ej. README, _INDEX, archivos sin título).
 */
export function parseSprintFile(
  filename: string,
  content: string,
): ParsedSprint | null {
  // Skip files que claramente no son sprints individuales.
  const baseName = filename.replace(/\.md$/i, "").toLowerCase();
  if (
    baseName === "readme" ||
    baseName === "_index" ||
    baseName === "index" ||
    baseName.startsWith("audit_") ||
    baseName.startsWith("cowork_") ||
    baseName.startsWith("manus_to_") ||
    baseName.startsWith("alfredo_to_")
  ) {
    return null;
  }

  const titleFallback = filename.replace(/\.md$/i, "").replace(/_/g, " ");
  const title = extractTitle(content, titleFallback);

  // Si el título no menciona "sprint" ni "spr-" ni "DSC", probablemente no
  // es un sprint canónico. Heurística laxa.
  const titleLower = title.toLowerCase();
  const filenameLower = filename.toLowerCase();
  const looksLikeSprint =
    titleLower.includes("sprint") ||
    titleLower.includes("spr-") ||
    filenameLower.startsWith("sprint") ||
    filenameLower.startsWith("spr-");

  if (!looksLikeSprint) {
    return null;
  }

  const statusRaw = extractField(content, "Estado");
  const status = normalizeStatus(statusRaw);

  const signedByRaw = extractField(content, "Hilo") ?? extractField(content, "Firmado por");
  const signedBy = signedByRaw ? signedByRaw.replace(/\([^)]*\)/g, "").trim().slice(0, 64) : null;

  const districts = inferDistricts(title, content);

  return {
    sprintId: filenameToSprintId(filename),
    title: title.slice(0, 256),
    descriptionMd: content.slice(0, 65000),
    status,
    signedBy,
    affectedDistricts: districts,
    hashCanonical: canonicalHash(content),
  };
}
