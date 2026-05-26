/**
 * sprintIngestor — Hito B-lite del Sprint Observatorio Vivo v1.1.
 *
 * Descarga los archivos `.md` de sprints desde el repo `el-monstruo` vía
 * GitHub API, los parsea con `sprintParser`, y hace UPSERT masivo en TiDB.
 *
 * Por qué GitHub API y no FUSE mount:
 *   - El sandbox de tablero-campana NO monta /mnt/desktop/el-monstruo (verifié,
 *     solo /mnt/desktop/el-monstruo del Mac, que no existe en producción).
 *   - El ingestor debe funcionar en Railway / cron / CI, donde no hay mount.
 *   - GitHub API es pública para repos públicos, no requiere PAT para read.
 *
 * Doctrina v1.1 §5: ingestor sin lock-in al ambiente local de Alfredo.
 */

import { parseSprintFile, type ParsedSprint } from "./sprintParser";
import { upsertSprint } from "../db";

const GITHUB_API = "https://api.github.com";
const REPO_OWNER = "alfredogl1804";
const REPO_NAME = "el-monstruo";
const DEFAULT_BRANCH = "main";

/** Carpetas en el repo a escanear, en orden. */
const SPRINT_DIRECTORIES = [
  "bridge/sprints_propuestos",
  "bridge/sprints_completados",
] as const;

interface GitHubContentEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
  sha: string;
}

interface IngestorResult {
  scanned: number;
  parsed: number;
  upserted: number;
  skipped: number;
  errors: Array<{ path: string; reason: string }>;
  durationMs: number;
}

/** Headers comunes para GitHub API; soporta token opcional. */
function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "tablero-campana-observatorio/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/** Lista archivos de un directorio del repo. */
async function listDirectory(path: string, branch: string): Promise<GitHubContentEntry[]> {
  const url = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const resp = await fetch(url, { headers: ghHeaders() });
  if (!resp.ok) {
    throw new Error(`GitHub API ${resp.status} para ${path}: ${await resp.text()}`);
  }
  const data = (await resp.json()) as GitHubContentEntry[];
  if (!Array.isArray(data)) {
    throw new Error(`Respuesta inesperada de GitHub API para ${path} (no es array)`);
  }
  return data;
}

/** Descarga el contenido bruto de un archivo. */
async function fetchRawContent(downloadUrl: string): Promise<string> {
  const resp = await fetch(downloadUrl, { headers: ghHeaders() });
  if (!resp.ok) {
    throw new Error(`GitHub raw ${resp.status}: ${await resp.text()}`);
  }
  return resp.text();
}

/** Convierte ParsedSprint + path → InsertSprint para upsertSprint. */
function toInsertSprint(parsed: ParsedSprint, sourcePath: string) {
  return {
    sprintId: parsed.sprintId,
    sourceRepo: `${REPO_OWNER}/${REPO_NAME}`,
    sourcePath,
    title: parsed.title,
    descriptionMd: parsed.descriptionMd,
    status: parsed.status,
    signedBy: parsed.signedBy,
    signedAt: null,
    startedAt: null,
    completedAt: null,
    affectedDistricts: parsed.affectedDistricts,
    affectedNodes: null,
    affectedProjects: null,
    dependencies: null,
    estimatedDays: null,
    actualDays: null,
    prNumbers: null,
    metadata: null,
    ingestedFrom: "ingestor_v1",
    hashCanonical: parsed.hashCanonical,
  };
}

/**
 * Ejecuta el ingestor completo.
 *
 * @param branch - Rama del repo a leer. Por defecto `main`.
 * @returns Estadísticas de la corrida.
 */
export async function ingestSprintsFromGitHub(
  branch: string = DEFAULT_BRANCH,
): Promise<IngestorResult> {
  const start = Date.now();
  const result: IngestorResult = {
    scanned: 0,
    parsed: 0,
    upserted: 0,
    skipped: 0,
    errors: [],
    durationMs: 0,
  };

  for (const dir of SPRINT_DIRECTORIES) {
    let entries: GitHubContentEntry[];
    try {
      entries = await listDirectory(dir, branch);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      result.errors.push({ path: dir, reason: `list dir failed: ${reason}` });
      continue;
    }

    const mdFiles = entries.filter(
      (e) => e.type === "file" && e.name.toLowerCase().endsWith(".md"),
    );

    for (const entry of mdFiles) {
      result.scanned++;
      if (!entry.download_url) {
        result.skipped++;
        continue;
      }

      let content: string;
      try {
        content = await fetchRawContent(entry.download_url);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        result.errors.push({ path: entry.path, reason });
        continue;
      }

      const parsed = parseSprintFile(entry.name, content);
      if (!parsed) {
        result.skipped++;
        continue;
      }
      result.parsed++;

      try {
        await upsertSprint(toInsertSprint(parsed, entry.path));
        result.upserted++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        result.errors.push({ path: entry.path, reason: `upsert failed: ${reason}` });
      }
    }
  }

  result.durationMs = Date.now() - start;
  return result;
}
