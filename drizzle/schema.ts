import { bigint, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * board_snapshots — Memoria histórica del Tablero del Monstruo.
 *
 * Cada vez que el script `build_board_data.py` corre (manual o por cron),
 * se inserta una fila aquí con el payload completo del estado del tablero
 * en ese momento. Esto permite:
 *   - Reflejar el estado vivo del repo del Monstruo en el frontend
 *   - Reconstruir cómo se veía el Monstruo en cualquier punto del pasado (T5)
 *   - Calcular diffs entre snapshots para narrar cambios al usuario
 *
 * Naming canónico: tabla con identidad de marca (board_*, no generic dashboard_*)
 */
export const boardSnapshots = mysqlTable(
  "board_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Timestamp en que se capturó el snapshot (UTC, ms epoch). */
    capturedAt: timestamp("capturedAt").defaultNow().notNull(),
    /** SHA del commit del repo del Monstruo en ese momento, si está disponible. */
    sourceCommit: varchar("sourceCommit", { length: 64 }),
    /** Modo de captura: 'canonical_mount' | 'local_snapshot_fallback'. */
    sourceMode: varchar("sourceMode", { length: 64 }).notNull(),
    /** Total de nodos en este snapshot (denormalizado para consultas rápidas). */
    totalNodes: int("totalNodes").notNull(),
    /** Salud agregada del sistema 0..1 (denormalizado). */
    systemHealth: int("systemHealth").notNull(), // entero entre 0 y 1000 (milésimas)
    /** Payload completo del BoardData (districts + nodes + meta). JSON. */
    payload: json("payload").notNull(),
  },
  (table) => ({
    capturedAtIdx: index("board_snapshots_capturedAt_idx").on(table.capturedAt),
  })
);

export type BoardSnapshot = typeof boardSnapshots.$inferSelect;
export type InsertBoardSnapshot = typeof boardSnapshots.$inferInsert;

/**
 * board_nodes — Vista relacional plana de los nodos del último snapshot.
 *
 * Permite consultas SQL rápidas ("¿qué nodos están degradados?") sin parsear el JSON.
 * Se reescribe completa en cada `board.refresh` (truncate + bulk insert).
 */
export const boardNodes = mysqlTable(
  "board_nodes",
  {
    id: int("id").autoincrement().primaryKey(),
    snapshotId: int("snapshotId")
      .notNull()
      .references(() => boardSnapshots.id, { onDelete: "cascade" }),
    nodeId: varchar("nodeId", { length: 128 }).notNull(),
    district: varchar("district", { length: 64 }).notNull(),
    label: text("label").notNull(),
    /** Estado del nodo: ACTIVE | DEGRADED | SPRINT | FUTURE. */
    status: varchar("status", { length: 32 }).notNull(),
    /** Líneas de código (proxy de tamaño). */
    loc: int("loc").notNull().default(0),
    /** Última modificación detectada en el repo, formato YYYY-MM-DD. */
    lastUpdated: varchar("lastUpdated", { length: 32 }),
    /** Fila del nodo dentro del payload original (para reconstruir orden). */
    raw: json("raw").notNull(),
  },
  (table) => ({
    snapshotIdIdx: index("board_nodes_snapshotId_idx").on(table.snapshotId),
    nodeIdIdx: index("board_nodes_nodeId_idx").on(table.nodeId),
    statusIdx: index("board_nodes_status_idx").on(table.status),
  })
);

export type BoardNodeRow = typeof boardNodes.$inferSelect;
export type InsertBoardNode = typeof boardNodes.$inferInsert;


/**
 * board_incidents — Anotaciones operativas que el usuario adjunta a un nodo.
 *
 * Don Alfredo (o cualquier operador del Monstruo) puede levantar incidencias
 * desde el ContextCard cuando ve algo raro en una pieza. Las anotaciones
 * persisten más allá del snapshot vivo: aunque el nodo cambie en el genoma,
 * la conversación queda atada al `nodeId` (no al `snapshotId`).
 *
 * Tipos de anotación:
 *   - BUG          → algo está roto y necesita arreglarse
 *   - IDEA         → propuesta de evolución para esta pieza
 *   - RIESGO       → algo puede reventar si no se atiende
 *   - OBSERVACION  → comentario informativo sin acción inmediata
 */
export const boardIncidents = mysqlTable(
  "board_incidents",
  {
    id: int("id").autoincrement().primaryKey(),
    /** ID del nodo en el genoma (string canónico, p.ej. 'embrion_loop'). */
    nodeId: varchar("nodeId", { length: 128 }).notNull(),
    /** Snapshot bajo el cual se levantó la incidencia (trazabilidad histórica). */
    snapshotId: int("snapshotId").references(() => boardSnapshots.id, {
      onDelete: "set null",
    }),
    /** Quién la levantó: 'system' | openId del user. Para MVP se acepta 'system'. */
    reporter: varchar("reporter", { length: 128 }).notNull().default("system"),
    /** Categoría de la anotación. */
    kind: mysqlEnum("kind", ["BUG", "IDEA", "RIESGO", "OBSERVACION"]).notNull(),
    /** Severidad: 'low' | 'med' | 'high' (3 niveles, sencillo). */
    severity: mysqlEnum("severity", ["low", "med", "high"])
      .notNull()
      .default("med"),
    /** Texto libre del incidente (markdown sencillo permitido). */
    message: text("message").notNull(),
    /** Si fue resuelto, cuándo. NULL = sigue abierto. */
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    nodeIdIdx: index("board_incidents_nodeId_idx").on(table.nodeId),
    createdAtIdx: index("board_incidents_createdAt_idx").on(table.createdAt),
    kindIdx: index("board_incidents_kind_idx").on(table.kind),
  })
);

export type BoardIncident = typeof boardIncidents.$inferSelect;
export type InsertBoardIncident = typeof boardIncidents.$inferInsert;

/**
 * board_overrides — Re-declaración manual de estado para un nodo.
 *
 * El genoma vivo dice que un nodo está ACTIVE pero Don Alfredo sabe que ya
 * no funciona en producción. O al revés: un nodo marcado FUTURE ya está
 * empezando a operar. Este override pisa el status calculado por el extractor
 * hasta que expire o se limpie manualmente.
 *
 * Sólo el override más reciente (ORDER BY createdAt DESC) por `nodeId` está
 * activo. Los anteriores quedan como historia.
 */
export const boardOverrides = mysqlTable(
  "board_overrides",
  {
    id: int("id").autoincrement().primaryKey(),
    nodeId: varchar("nodeId", { length: 128 }).notNull(),
    /** Status declarado manualmente (ACTIVE/DEGRADED/SPRINT/FUTURE). */
    statusOverride: mysqlEnum("statusOverride", [
      "ACTIVE",
      "DEGRADED",
      "SPRINT",
      "FUTURE",
    ]).notNull(),
    /** Razón humana de por qué se sobrescribió. */
    note: text("note"),
    /** Quién lo sobrescribió: 'system' | openId del user. */
    reporter: varchar("reporter", { length: 128 }).notNull().default("system"),
    /**
     * Cuándo expira el override. NULL = permanente hasta limpiarlo manualmente.
     * Cuando expira, vuelve a vigencia el status del genoma vivo.
     */
    expiresAt: timestamp("expiresAt"),
    /** Si fue limpiado manualmente, cuándo. NULL = sigue activo. */
    clearedAt: timestamp("clearedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    nodeIdIdx: index("board_overrides_nodeId_idx").on(table.nodeId),
    createdAtIdx: index("board_overrides_createdAt_idx").on(table.createdAt),
  })
);

export type BoardOverride = typeof boardOverrides.$inferSelect;
export type InsertBoardOverride = typeof boardOverrides.$inferInsert;
