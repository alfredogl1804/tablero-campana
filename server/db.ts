import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  boardEdges,
  boardEvents,
  boardIncidents,
  boardNodes,
  boardNodeStates,
  boardOverrides,
  boardSnapshots,
  InsertBoardEdge,
  InsertBoardEvent,
  InsertBoardIncident,
  InsertBoardNode,
  InsertBoardOverride,
  InsertBoardSnapshot,
  InsertSprint,
  InsertUser,
  sprints,
  SprintRow,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ───────────────────────────────────────────────────────────────────
// BOARD SNAPSHOT HELPERS — Sprint v3.0 / T1 Sincronización viva
// ───────────────────────────────────────────────────────────────────

/**
 * Inserta un snapshot completo del Tablero junto con todos sus nodos.
 *
 * ATOMICIDAD REAL (Sprint v4.0 / Tarea 0):
 * - Envuelve todo el flujo en `db.transaction(async (tx) => { ... })` para que
 *   Drizzle+mysql2 use una transacción real contra TiDB/MySQL. Si cualquier
 *   insert falla (snapshot o cualquier batch de nodes), el rollback es
 *   automático y queda DB consistente.
 * - Usa `tx.insert(...).$returningId()` (Drizzle ≥0.32 MySQL) para obtener el
 *   ID auto-generado del snapshot SIN la race condition del patrón anterior
 *   ("insert + select last id"), que era inseguro bajo concurrencia.
 *
 * Si la DB no está disponible, devuelve null (modo dev sin DB).
 */
export async function insertBoardSnapshot(
  snapshot: InsertBoardSnapshot,
  nodes: Omit<InsertBoardNode, "snapshotId">[],
  edges: Omit<InsertBoardEdge, "snapshotId">[] = [],
  /**
   * Sprint MEGA v4.0 / PR2 / Tarea 5 — Truth Ledger.
   *
   * Si se pasa, las observations se persisten en la MISMA transacción que el
   * snapshot, y el motor de cómputo materializa board_node_states. Si la
   * persistencia falla, el rollback revierte snapshot + nodes + edges +
   * observations + node_states todos juntos.
   *
   * Si no se pasa (undefined), comportamiento retrocompatible v4.0/PR1.
   */
  truthLedger?: {
    captureRunId: number;
    observations: Array<{
      collector: string;
      node_id: string | null;
      field: string;
      value: unknown;
      confidence: number;
      evidence: string | null;
      computed_from: string[];
    }>;
  },
): Promise<{
  snapshotId: number;
  nodesInserted: number;
  edgesInserted: number;
  observationsInserted: number;
  statesComputed: number;
} | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot insert board snapshot: database not available");
    return null;
  }

  return db.transaction(async (tx) => {
    // 1) Insertar el snapshot y recuperar el id auto-incrementado en una
    //    sola operación atómica usando $returningId (Drizzle MySQL ≥0.32).
    const inserted = await tx
      .insert(boardSnapshots)
      .values(snapshot)
      .$returningId();

    const snapshotId = inserted[0]?.id;
    if (snapshotId === undefined || snapshotId === null) {
      // Forzar rollback de la transacción.
      throw new Error(
        "insertBoardSnapshot: $returningId no devolvió un id para el snapshot."
      );
    }

    // 2) Insertar todos los nodes en lotes de 100, todos bajo la misma tx.
    //    Si algún batch revienta, el snapshot se revierte completo.
    if (nodes.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < nodes.length; i += BATCH) {
        const slice = nodes
          .slice(i, i + BATCH)
          .map((n) => ({ ...n, snapshotId }));
        await tx.insert(boardNodes).values(slice);
      }
    }

    // 3) Insertar todas las edges en lotes de 100. Sprint MEGA v4.0 / Tarea 2.
    //    Si algún batch revienta, snapshot + nodes + edges se revierten todos.
    if (edges.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < edges.length; i += BATCH) {
        const slice = edges
          .slice(i, i + BATCH)
          .map((e) => ({ ...e, snapshotId }));
        await tx.insert(boardEdges).values(slice);
      }
    }

    // 4) Truth Ledger: observations + node_states en la misma transacción.
    let observationsInserted = 0;
    let statesComputed = 0;
    if (truthLedger) {
      const { persistTruthLedgerForSnapshot } = await import("./lib/truthLedger");
      const result = await persistTruthLedgerForSnapshot({
        tx,
        snapshotId,
        captureRunId: truthLedger.captureRunId,
        observations: truthLedger.observations,
        nodeIds: nodes.map((n) => n.nodeId),
      });
      observationsInserted = result.observationsInserted;
      statesComputed = result.statesComputed;
    }

    return {
      snapshotId,
      nodesInserted: nodes.length,
      edgesInserted: edges.length,
      observationsInserted,
      statesComputed,
    };
  });
}

/**
 * Devuelve todas las aristas de un snapshot dado.
 * Útil para reconstruir el grafo del Tablero en cualquier punto histórico (T5).
 */
export async function getEdgesForSnapshot(snapshotId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(boardEdges)
    .where(eq(boardEdges.snapshotId, snapshotId));
}

/**
 * Devuelve el snapshot más reciente del Tablero, o null si no hay ninguno.
 * No incluye los nodos relacionales (esos viven dentro del payload JSON).
 */
export async function getCurrentBoardSnapshot() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot read current board snapshot: database not available");
    return null;
  }

  const rows = await db
    .select()
    .from(boardSnapshots)
    .orderBy(desc(boardSnapshots.capturedAt), desc(boardSnapshots.id))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Lista los últimos N snapshots ordenados de más reciente a más antiguo.
 * Devuelve solo metadata (sin payload completo) para listas de timeline.
 */
export async function listBoardSnapshots(limit = 30) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: boardSnapshots.id,
      capturedAt: boardSnapshots.capturedAt,
      sourceCommit: boardSnapshots.sourceCommit,
      sourceMode: boardSnapshots.sourceMode,
      totalNodes: boardSnapshots.totalNodes,
      systemHealth: boardSnapshots.systemHealth,
    })
    .from(boardSnapshots)
    .orderBy(desc(boardSnapshots.capturedAt), desc(boardSnapshots.id))
    .limit(limit);
}

/**
 * Recupera un snapshot específico por id, con su payload completo.
 * Útil para el TimelineSlider de T5.
 */
export async function getBoardSnapshotById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(boardSnapshots)
    .where(eq(boardSnapshots.id, id))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}



// ───────────────────────────────────────────────────────────────────
// BOARD INCIDENTS HELPERS — Sprint v3.0 / T6 Acciones desde ContextCard
// ───────────────────────────────────────────────────────────────────

/**
 * Inserta una nueva incidencia atada a un nodo del genoma.
 * El nodeId no está bajo FK (no se valida contra board_nodes) porque las
 * incidencias persisten más allá del snapshot vigente.
 */
export async function insertBoardIncident(incident: InsertBoardIncident) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot insert board incident: database not available");
    return null;
  }

  await db.insert(boardIncidents).values(incident);
  const [latest] = await db
    .select()
    .from(boardIncidents)
    .where(eq(boardIncidents.nodeId, incident.nodeId))
    .orderBy(desc(boardIncidents.id))
    .limit(1);
  return latest ?? null;
}

/**
 * Lista las incidencias de un nodo, ordenadas de más reciente a más antigua.
 * Default: limit 20, incluye resueltas y abiertas.
 */
export async function listBoardIncidentsForNode(nodeId: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(boardIncidents)
    .where(eq(boardIncidents.nodeId, nodeId))
    .orderBy(desc(boardIncidents.createdAt))
    .limit(limit);
}

/**
 * Cuenta las incidencias abiertas (sin resolver) de un nodo.
 * Útil para badges en el HUD.
 */
export async function countOpenIncidentsForNode(nodeId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db
    .select({ id: boardIncidents.id })
    .from(boardIncidents)
    .where(
      and(eq(boardIncidents.nodeId, nodeId), isNull(boardIncidents.resolvedAt))
    );
  return rows.length;
}

/**
 * Marca una incidencia como resuelta. Devuelve la fila actualizada o null.
 */
export async function resolveBoardIncident(id: number) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(boardIncidents)
    .set({ resolvedAt: new Date() })
    .where(eq(boardIncidents.id, id));

  const [row] = await db
    .select()
    .from(boardIncidents)
    .where(eq(boardIncidents.id, id))
    .limit(1);
  return row ?? null;
}

// ───────────────────────────────────────────────────────────────────
// BOARD OVERRIDES HELPERS — Sprint v3.0 / T6
// ───────────────────────────────────────────────────────────────────

/**
 * Inserta un nuevo override de status para un nodo.
 * No reemplaza overrides anteriores (queda historia); el más reciente vigente
 * se obtiene con getActiveOverrideForNode.
 */
export async function insertBoardOverride(override: InsertBoardOverride) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(boardOverrides).values(override);
  const [latest] = await db
    .select()
    .from(boardOverrides)
    .where(eq(boardOverrides.nodeId, override.nodeId))
    .orderBy(desc(boardOverrides.id))
    .limit(1);
  return latest ?? null;
}

/**
 * Devuelve el override vigente para un nodo: el más reciente con clearedAt
 * NULL y (expiresAt NULL o expiresAt > now). Si no hay ninguno, retorna null.
 */
export async function getActiveOverrideForNode(nodeId: string) {
  const db = await getDb();
  if (!db) return null;
  const now = new Date();

  const rows = await db
    .select()
    .from(boardOverrides)
    .where(
      and(
        eq(boardOverrides.nodeId, nodeId),
        isNull(boardOverrides.clearedAt),
        or(isNull(boardOverrides.expiresAt), gt(boardOverrides.expiresAt, now))
      )
    )
    .orderBy(desc(boardOverrides.createdAt), desc(boardOverrides.id))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Limpia un override (lo desactiva). Marca clearedAt = now.
 */
export async function clearBoardOverride(id: number) {
  const db = await getDb();
  if (!db) return null;

  await db
    .update(boardOverrides)
    .set({ clearedAt: new Date() })
    .where(eq(boardOverrides.id, id));

  const [row] = await db
    .select()
    .from(boardOverrides)
    .where(eq(boardOverrides.id, id))
    .limit(1);
  return row ?? null;
}


/**
 * Sprint v4.0 / T6 — Decision Rail.
 *
 * Inserta un evento administrativo en board_events. Append-only: los
 * eventos NO se borran ni mutan; se "supersedean" emitiendo otro evento
 * que apunta al anterior vía supersededByEventId.
 */
export async function insertBoardEvent(event: InsertBoardEvent) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(boardEvents).values(event);
  // En MySQL/TiDB no podemos confiar en RETURNING; consultamos el último
  // por createdAt + actorRole + nodeId para devolver el shape coherente.
  const inserted = await db
    .select()
    .from(boardEvents)
    .orderBy(desc(boardEvents.id))
    .limit(1);
  return inserted[0] ?? null;
}

/**
 * Lista los eventos administrativos asociados a un nodo (orden cronológico
 * descendente). Útil para la timeline del ContextCard en el UI.
 */
export async function listBoardEventsForNode(nodeId: string, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(boardEvents)
    .where(eq(boardEvents.nodeId, nodeId))
    .orderBy(desc(boardEvents.createdAt))
    .limit(limit);
}

/**
 * Cuenta los eventos abiertos (sin supersededByEventId) con un effectStatus
 * vigente para un nodo dado. Sirve al motor de cómputo de Truth Ledger
 * para resolver effectiveStatus.
 */
export async function countActiveEventsForNode(nodeId: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ id: boardEvents.id })
    .from(boardEvents)
    .where(
      and(
        eq(boardEvents.nodeId, nodeId),
        isNull(boardEvents.supersededByEventId),
      ),
    );
  return rows.length;
}


/**
 * Sprint v4.0 / T6B — Decision Rail expuesto al UI.
 *
 * Lee todos los board_node_states de un snapshot dado. El UI los usará
 * para distinguir entre `status` (lo que el compiler dijo) y
 * `effectiveStatus` (lo que aplica realmente, incluyendo override).
 *
 * Devuelve un array; si no hay registros (snapshot pre-T5 sin bootstrap),
 * el caller debe asumir effectiveStatus = status legacy.
 */
export async function listBoardNodeStatesForSnapshot(snapshotId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(boardNodeStates)
    .where(eq(boardNodeStates.snapshotId, snapshotId));
}


// ───────────────────────────────────────────────────────────────────
// SNAPSHOT DIFFS HELPERS — Sprint MEGA v4.0 / T8 Causal Timeline
// ───────────────────────────────────────────────────────────────────

import { boardSnapshotDiffs, type InsertBoardSnapshotDiff } from "../drizzle/schema";

/**
 * Busca un diff cacheado entre dos snapshots, o null si no existe.
 * Returns the most recent if for some reason hubiera duplicados.
 */
export async function getCachedBoardDiff(
  fromSnapshotId: number,
  toSnapshotId: number,
) {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(boardSnapshotDiffs)
    .where(
      and(
        eq(boardSnapshotDiffs.fromSnapshotId, fromSnapshotId),
        eq(boardSnapshotDiffs.toSnapshotId, toSnapshotId),
      ),
    )
    .orderBy(desc(boardSnapshotDiffs.id))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

/**
 * Inserta un diff materializado entre dos snapshots.
 * Idempotente desde el punto de vista del consumidor: si ya hay diff cacheado,
 * el caller debe haberlo verificado antes; este helper solo escribe.
 */
export async function insertBoardSnapshotDiff(
  diff: InsertBoardSnapshotDiff,
): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot insert board snapshot diff: database not available");
    return null;
  }

  const [result] = await db.insert(boardSnapshotDiffs).values(diff);
  const raw = (result as unknown as { insertId?: number | bigint }).insertId;
  if (raw === undefined || raw === null) return null;
  return typeof raw === "bigint" ? Number(raw) : raw;
}



// ───────────────────────────────────────────────────────────────────
// T7 Omnibox Grounded — cache + briefs helpers
// ───────────────────────────────────────────────────────────────────

import {
  boardNodeBriefs,
  omniboxCache,
  type BoardNodeBrief,
} from "../drizzle/schema";

/**
 * Lookup de respuesta cacheada por hash(query, snapshotId).
 * Devuelve null si no hay hit o si ya expiró.
 */
export async function getOmniboxCacheEntry(
  queryHash: string,
  snapshotId: number,
): Promise<{
  answer: string;
  citations: string[];
  intent: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select({
      answer: omniboxCache.answer,
      citations: omniboxCache.citations,
      intent: omniboxCache.intent,
      expiresAt: omniboxCache.expiresAt,
    })
    .from(omniboxCache)
    .where(
      and(
        eq(omniboxCache.queryHash, queryHash),
        eq(omniboxCache.snapshotId, snapshotId),
      ),
    )
    .orderBy(desc(omniboxCache.createdAt))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  const expiresAt =
    row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt);
  if (expiresAt.getTime() <= Date.now()) return null;

  return {
    answer: row.answer as unknown as string,
    citations: (row.citations as unknown as string[]) ?? [],
    intent: row.intent,
  };
}

/** Inserta una respuesta nueva en el cache. TTL = 24h por default. */
export async function insertOmniboxCacheEntry(params: {
  queryHash: string;
  snapshotId: number;
  answer: string;
  citations: string[];
  intent: string;
  ttlMs?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const ttl = params.ttlMs ?? 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttl);

  await db.insert(omniboxCache).values({
    queryHash: params.queryHash,
    snapshotId: params.snapshotId,
    answer: params.answer,
    citations: params.citations,
    intent: params.intent,
    expiresAt,
  });
}

/**
 * Devuelve briefs registrados para un snapshot dado, mapeados por nodeId.
 * Si no hay briefs para ese snapshot, devuelve un Map vacío. El caller
 * decide cómo construir un brief desde scratch (típicamente truncando la
 * description del nodo).
 */
export async function listBoardNodeBriefsForSnapshot(
  snapshotId: number,
): Promise<Map<string, BoardNodeBrief>> {
  const m = new Map<string, BoardNodeBrief>();
  const db = await getDb();
  if (!db) return m;

  const rows = await db
    .select()
    .from(boardNodeBriefs)
    .where(eq(boardNodeBriefs.snapshotId, snapshotId));

  for (const r of rows) {
    m.set(r.nodeId, r);
  }
  return m;
}

/** Inserta un brief (best-effort, no falla la query si la DB no responde). */
export async function insertBoardNodeBrief(params: {
  nodeId: string;
  snapshotId: number;
  brief: string;
  source?: "truncated" | "llm-summarized" | "manual";
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(boardNodeBriefs).values({
    nodeId: params.nodeId,
    snapshotId: params.snapshotId,
    brief: params.brief,
    source: params.source ?? "truncated",
  });
}


// ───────────────────────────────────────────────────────────────────
// SPRINTS HELPERS — Sprint Observatorio Vivo v1.1 / Hito B-lite
// ───────────────────────────────────────────────────────────────────

/**
 * UPSERT idempotente de un sprint canonizado del repo el-monstruo.
 *
 * Si el sprint_id ya existe, actualiza todos los campos. El hashCanonical
 * permite al ingestor detectar cambios sin re-escribir filas iguales.
 *
 * Doctrina v1.1 §5: el ingestor lee desde GitHub API (no desde mount FUSE).
 */
export async function upsertSprint(sprint: InsertSprint): Promise<void> {
  if (!sprint.sprintId) {
    throw new Error("upsertSprint: sprintId is required");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert sprint: database not available");
    return;
  }

  // Construir el set de actualización con todos los campos excepto la PK y
  // los timestamps inmutables. ingestedAt SÍ se actualiza para reflejar la
  // última vez que se vio este sprint en el ingestor.
  const updateSet: Record<string, unknown> = {
    sourceRepo: sprint.sourceRepo,
    sourcePath: sprint.sourcePath,
    title: sprint.title,
    descriptionMd: sprint.descriptionMd ?? null,
    status: sprint.status,
    signedBy: sprint.signedBy ?? null,
    signedAt: sprint.signedAt ?? null,
    startedAt: sprint.startedAt ?? null,
    completedAt: sprint.completedAt ?? null,
    affectedDistricts: sprint.affectedDistricts,
    affectedNodes: sprint.affectedNodes ?? null,
    affectedProjects: sprint.affectedProjects ?? null,
    dependencies: sprint.dependencies ?? null,
    estimatedDays: sprint.estimatedDays ?? null,
    actualDays: sprint.actualDays ?? null,
    prNumbers: sprint.prNumbers ?? null,
    metadata: sprint.metadata ?? null,
    ingestedAt: new Date(),
    ingestedFrom: sprint.ingestedFrom,
    hashCanonical: sprint.hashCanonical,
  };

  await db.insert(sprints).values(sprint).onDuplicateKeyUpdate({ set: updateSet });
}

/**
 * Lista sprints con filtros opcionales por status y/o por distrito.
 *
 * El filtro por distrito usa LIKE sobre el JSON serializado, lo cual es
 * suficientemente eficiente para la cardinalidad esperada (<1000 sprints).
 * Cuando crezca la tabla se puede migrar a un índice virtual JSON.
 */
export async function listSprints(opts?: {
  status?: string;
  district?: string;
  limit?: number;
}): Promise<SprintRow[]> {
  const db = await getDb();
  if (!db) return [];

  const limit = opts?.limit ?? 200;

  const conditions = [];
  if (opts?.status) {
    conditions.push(eq(sprints.status, opts.status));
  }

  let rows: SprintRow[];
  if (conditions.length === 1) {
    rows = await db
      .select()
      .from(sprints)
      .where(conditions[0])
      .orderBy(desc(sprints.ingestedAt))
      .limit(limit);
  } else {
    rows = await db
      .select()
      .from(sprints)
      .orderBy(desc(sprints.ingestedAt))
      .limit(limit);
  }

  // Filtro por distrito en aplicación (post-query) sobre el JSON ya
  // hidratado. Más portable que LIKE sobre JSON serializado.
  if (opts?.district) {
    const target = opts.district;
    rows = rows.filter((row) => {
      const districts = row.affectedDistricts as unknown;
      if (Array.isArray(districts)) {
        return districts.includes(target);
      }
      return false;
    });
  }

  return rows;
}

/** Devuelve un sprint por su ID o null. */
export async function getSprintById(sprintId: string): Promise<SprintRow | null> {
  const db = await getDb();
  if (!db) return null;

  const rows = await db
    .select()
    .from(sprints)
    .where(eq(sprints.sprintId, sprintId))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

/** Conteo total de sprints en la tabla. Útil para DoD de B-lite (≥20). */
export async function countSprints(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const rows = await db.select().from(sprints);
  return rows.length;
}
