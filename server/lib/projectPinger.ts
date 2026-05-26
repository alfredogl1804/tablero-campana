/**
 * projectPinger — actualiza la salud de los proyectos del catálogo.
 *
 * Estrategias:
 *   1. GitHub freshness ping: consulta `https://api.github.com/repos/{owner}/{repo}`
 *      y mira `pushed_at`. Si hace >30 días que no hay push, status = "dormant".
 *      Si hace >180 días = "deprecated".
 *   2. Deploy URL ping (si existe): HEAD request al deploy_url, captura latencia
 *      y http status.
 *
 * Cada ping se loguea en `project_health_pings` para histórico.
 */

import { getDb } from "../db";
import { connectedProjects, projectHealthPings } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

const DORMANT_THRESHOLD_DAYS = 30;
const DEPRECATED_THRESHOLD_DAYS = 180;

interface PingResult {
  projectId: string;
  prevStatus: string;
  newStatus: string;
  changed: boolean;
  pushedAt: string | null;
  deployHttpStatus?: number;
  deployLatencyMs?: number;
}

async function fetchGithubPushedAt(
  owner: string,
  repo: string,
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "tablero-campana-observatorio/1.0",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { pushed_at?: string };
    return data.pushed_at ?? null;
  } catch {
    return null;
  }
}

async function pingDeployUrl(
  url: string,
): Promise<{ status: number; latencyMs: number } | null> {
  const start = Date.now();
  try {
    const resp = await fetch(url, {
      method: "GET", // HEAD a veces no responde, GET con redirect simple
      signal: AbortSignal.timeout(8000),
      redirect: "manual",
    });
    return {
      status: resp.status,
      latencyMs: Date.now() - start,
    };
  } catch {
    return null;
  }
}

function statusFromPushedAt(pushedAtIso: string | null): string {
  if (!pushedAtIso) return "unknown";
  const ageMs = Date.now() - new Date(pushedAtIso).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > DEPRECATED_THRESHOLD_DAYS) return "deprecated";
  if (ageDays > DORMANT_THRESHOLD_DAYS) return "dormant";
  return "active";
}

export async function pingAllProjects(): Promise<PingResult[]> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const projects = await db.select().from(connectedProjects);
  const results: PingResult[] = [];

  for (const proj of projects) {
    if (proj.category === "ephemeral_e2e") continue;

    let pushedAt: string | null = null;
    if (proj.githubOwner && proj.githubRepo) {
      pushedAt = await fetchGithubPushedAt(proj.githubOwner, proj.githubRepo);
    }
    const newStatus = statusFromPushedAt(pushedAt);

    let deployHttpStatus: number | undefined;
    let deployLatencyMs: number | undefined;
    if (proj.deployUrl) {
      const dping = await pingDeployUrl(proj.deployUrl);
      if (dping) {
        deployHttpStatus = dping.status;
        deployLatencyMs = dping.latencyMs;
      }
    }

    const prevStatus = proj.status;
    const changed = prevStatus !== newStatus;

    // Update connected_projects
    await db
      .update(connectedProjects)
      .set({
        status: newStatus,
        lastPushedAt: pushedAt ? new Date(pushedAt) : null,
        lastSeenAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(connectedProjects.projectId, proj.projectId));

    // Insert health ping
    await db.insert(projectHealthPings).values({
      projectId: proj.projectId,
      status:
        newStatus === "active"
          ? "ok"
          : newStatus === "dormant"
            ? "degraded"
            : newStatus === "deprecated"
              ? "down"
              : "unknown",
      latencyMs: deployLatencyMs ?? null,
      httpStatus: deployHttpStatus ?? null,
      source: "scheduled_cron",
      notes: pushedAt ? `pushed_at=${pushedAt}` : "no github data",
    });

    results.push({
      projectId: proj.projectId,
      prevStatus,
      newStatus,
      changed,
      pushedAt,
      deployHttpStatus,
      deployLatencyMs,
    });
  }

  return results;
}
