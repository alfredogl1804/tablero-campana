import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  boardIncidents,
  boardNodes,
  boardOverrides,
  boardSnapshots,
  InsertBoardIncident,
  InsertBoardNode,
  InsertBoardOverride,
  InsertBoardSnapshot,
  InsertUser,
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
 * Usa transacción para garantizar atomicidad: si falla la inserción de nodos,
 * el snapshot también se revierte.
 */
export async function insertBoardSnapshot(
  snapshot: InsertBoardSnapshot,
  nodes: Omit<InsertBoardNode, "snapshotId">[],
): Promise<{ snapshotId: number; nodesInserted: number } | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot insert board snapshot: database not available");
    return null;
  }

  // mysql2/drizzle no soporta returning() en MySQL/TiDB.
  // Hacemos insert simple y luego leemos el último id.
  await db.insert(boardSnapshots).values(snapshot);
  const [latest] = await db
    .select({ id: boardSnapshots.id })
    .from(boardSnapshots)
    .orderBy(desc(boardSnapshots.id))
    .limit(1);

  if (!latest) {
    throw new Error("insertBoardSnapshot: no se pudo recuperar el id del snapshot recién insertado");
  }

  const snapshotId = latest.id;

  if (nodes.length > 0) {
    // Bulk insert en lotes de 100 para evitar payloads excesivos
    const BATCH = 100;
    for (let i = 0; i < nodes.length; i += BATCH) {
      const slice = nodes.slice(i, i + BATCH).map(n => ({ ...n, snapshotId }));
      await db.insert(boardNodes).values(slice);
    }
  }

  return { snapshotId, nodesInserted: nodes.length };
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
