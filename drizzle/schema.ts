import { bigint, boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar, index } from "drizzle-orm/mysql-core";

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


/**
 * board_edges — Aristas del grafo del Monstruo por snapshot.
 *
 * Sprint MEGA v4.0 / PR1 / Tarea 2 — Genome Graph Compiler.
 *
 * Cada arista declara una relación tipada entre dos nodos del Tablero,
 * extraída del genoma vivo (`MONSTRUO_GENOME.yaml > connections`) por
 * `scripts/build_board_data.py`. Las aristas se persisten ligadas al
 * snapshot que las observó (no son globales) para que la memoria histórica
 * pueda reconstruir cómo se veía el grafo del Monstruo en cualquier momento.
 *
 * Tipos de edge:
 *   - depends_on  → A no puede operar sin B (estructural)
 *   - feeds       → A envía datos o señales a B (flujo)
 *   - protects    → A custodia integridad/política de B (governance)
 *   - activates   → A despierta/orquesta a B (control)
 *
 * `evidence` guarda el texto literal del genoma que motivó esta arista
 * (p. ej. "messages trigger thinking"). Esto deja trazable POR QUÉ existe
 * la arista — DSC-G-008 (cero drift): si el genoma cambia, el evidence
 * cambia.
 *
 * `weight` (1..100) modula el grosor del trazo en la UI. Por defecto 50.
 */
export const boardEdges = mysqlTable(
  "board_edges",
  {
    id: int("id").autoincrement().primaryKey(),
    snapshotId: int("snapshotId")
      .notNull()
      .references(() => boardSnapshots.id, { onDelete: "cascade" }),
    /** Nodo origen (mismo ID que board_nodes.nodeId). */
    fromNodeId: varchar("fromNodeId", { length: 128 }).notNull(),
    /** Nodo destino (mismo ID que board_nodes.nodeId). */
    toNodeId: varchar("toNodeId", { length: 128 }).notNull(),
    /** Tipo de relación. */
    edgeType: mysqlEnum("edgeType", [
      "depends_on",
      "feeds",
      "protects",
      "activates",
    ]).notNull(),
    /** Texto literal del genoma que motivó la arista (trazabilidad). */
    evidence: text("evidence"),
    /** Peso 1..100 para modular grosor visual. Default 50. */
    weight: int("weight").notNull().default(50),
  },
  (table) => ({
    snapshotIdIdx: index("board_edges_snapshotId_idx").on(table.snapshotId),
    fromNodeIdIdx: index("board_edges_fromNodeId_idx").on(table.fromNodeId),
    toNodeIdIdx: index("board_edges_toNodeId_idx").on(table.toNodeId),
    edgeTypeIdx: index("board_edges_edgeType_idx").on(table.edgeType),
  }),
);

export type BoardEdge = typeof boardEdges.$inferSelect;
export type InsertBoardEdge = typeof boardEdges.$inferInsert;


/**
 * board_capture_runs — Ritos de captura forense del genoma.
 *
 * Sprint MEGA v4.0 / PR2 / Tarea 5 — Truth Ledger.
 *
 * Cada vez que el compiler corre, sea por trigger manual (board.refresh) o
 * por cron (heartbeat de refreshBoard), se asienta una fila aquí ANTES de
 * tocar nada más. Si el compiler falla a mitad, el run queda visible con
 * status='failed' + errorMessage, y el operador sabe exactamente cuándo y
 * por qué se cayó la captura.
 *
 * La separación frente a `board_snapshots` es intencional:
 *   - `board_capture_runs` = bitácora de la operación de captura (intento)
 *   - `board_snapshots`    = resultado materializado (cuando hay éxito)
 *
 * Un run exitoso tiene un snapshotId atado. Un run fallido no.
 *
 * Identidad de marca (Regla Dura #4): "capture run" es un rito, no un
 * "job"/"task" genérico. Todas las filas se preservan — nunca se purgan
 * porque la bitácora es la verdad histórica del Tablero.
 */
export const boardCaptureRuns = mysqlTable(
  "board_capture_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Cuándo arrancó la captura (UTC). */
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    /** Cuándo terminó (NULL si aún corre o si crasheó sin terminar). */
    finishedAt: timestamp("finishedAt"),
    /** Estado terminal del run. */
    status: mysqlEnum("status", ["running", "succeeded", "failed", "skipped"])
      .notNull()
      .default("running"),
    /** Modo de captura: 'canonical_mount' | 'local_snapshot_fallback'. */
    sourceMode: varchar("sourceMode", { length: 64 }).notNull(),
    /** Quien disparó la captura: 'cron' | 'manual' | openId del user. */
    triggeredBy: varchar("triggeredBy", { length: 128 })
      .notNull()
      .default("system"),
    /** Si terminó OK, el snapshot que produjo. NULL si falló. */
    snapshotId: int("snapshotId").references(() => boardSnapshots.id, {
      onDelete: "set null",
    }),
    /** Mensaje de error humano-legible cuando status='failed'. */
    errorMessage: text("errorMessage"),
    /**
     * Métricas del build_report.json embebidas para consultas rápidas
     * sin tener que leer el JSON completo.
     */
    totalNodes: int("totalNodes"),
    totalEdges: int("totalEdges"),
    nodesWithoutEdges: int("nodesWithoutEdges"),
    nodesWithoutRealDates: int("nodesWithoutRealDates"),
    /** Lista de warnings del compiler (texto libre, ej: "62/62 sin edges"). */
    warnings: json("warnings"),
  },
  (table) => ({
    startedAtIdx: index("board_capture_runs_startedAt_idx").on(table.startedAt),
    statusIdx: index("board_capture_runs_status_idx").on(table.status),
    snapshotIdIdx: index("board_capture_runs_snapshotId_idx").on(table.snapshotId),
  }),
);

export type BoardCaptureRun = typeof boardCaptureRuns.$inferSelect;
export type InsertBoardCaptureRun = typeof boardCaptureRuns.$inferInsert;

/**
 * board_observations — Hechos atómicos observados sobre nodos.
 *
 * Sprint MEGA v4.0 / PR2 / Tarea 5 — Truth Ledger.
 *
 * Cada observación es un hecho de nivel-átomo:
 *   "el nodo `embrion_loop` tenía 1834 LOC el 2026-05-24T08:00:00Z,
 *    observado por el collector `collect_genome` con confidence 0.95,
 *    derivado de MONSTRUO_GENOME.yaml líneas 142-178".
 *
 * El motor de cómputo de estado consume las observaciones para producir
 * `board_node_states.computedStatus`. Esto rompe el acoplamiento que tenía
 * antes: `board_nodes.status` mezclaba "lo observado" con "lo proyectado".
 *
 * Identidad de marca: "observation" es un acto forense con cadena de
 * custodia (computedFrom). NO es `metric`, `data_point`, `signal`.
 */
export const boardObservations = mysqlTable(
  "board_observations",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    /** Run de captura que produjo esta observación. */
    captureRunId: int("captureRunId")
      .notNull()
      .references(() => boardCaptureRuns.id, { onDelete: "cascade" }),
    /** Nodo observado. NULL si la observación es del sistema completo. */
    nodeId: varchar("nodeId", { length: 128 }),
    /**
     * Campo observado:
     *   - 'loc' / 'last_updated' / 'status_signal' / 'edges_count'
     *   - 'system_health' / 'snapshot_total_nodes' / etc.
     */
    field: varchar("field", { length: 64 }).notNull(),
    /** Valor del campo. JSON para soportar números, strings, listas, objetos. */
    value: json("value").notNull(),
    /**
     * Confianza de la observación 0..1000 (milésimas). 1000 = certeza
     * total (lectura directa del genoma), 500 = inferencia heurística,
     * 100 = adivinanza.
     */
    confidence: int("confidence").notNull().default(1000),
    /** Texto humano que justifica la observación. */
    evidence: text("evidence"),
    /**
     * Lista de fuentes de las que proviene la observación, p.ej.
     * ["MONSTRUO_GENOME.yaml", "git mtime", "router introspection"].
     */
    computedFrom: json("computedFrom"),
    /** Collector que la emitió: 'collect_genome' | 'collect_git_metrics' | etc. */
    collector: varchar("collector", { length: 64 }).notNull(),
    observedAt: timestamp("observedAt").defaultNow().notNull(),
  },
  (table) => ({
    captureRunIdIdx: index("board_observations_captureRunId_idx").on(
      table.captureRunId,
    ),
    nodeIdIdx: index("board_observations_nodeId_idx").on(table.nodeId),
    fieldIdx: index("board_observations_field_idx").on(table.field),
    collectorIdx: index("board_observations_collector_idx").on(table.collector),
  }),
);

export type BoardObservation = typeof boardObservations.$inferSelect;
export type InsertBoardObservation = typeof boardObservations.$inferInsert;

/**
 * board_node_states — Estado computado y proyectado de cada nodo por snapshot.
 *
 * Sprint MEGA v4.0 / PR2 / Tarea 5 — Truth Ledger.
 *
 * Mientras `board_nodes.status` es la lectura cruda del genoma vivo,
 * `board_node_states` es el resultado de FUSIONAR observaciones + overrides
 * humanos + reglas de proyección. Es la "verdad operativa final".
 *
 * Cuatro estados:
 *   - computedStatus   = lo que el motor calcula a partir de observations
 *   - projectedStatus  = lo que el motor proyecta para el próximo snapshot
 *                        (si no se interviene; es predicción honesta)
 *   - overrideStatus   = lo que un operador humano declaró (gana sobre
 *                        computed/projected mientras el override esté vivo)
 *   - effectiveStatus  = el ganador final (override > computed)
 *
 * El front consume `effectiveStatus` para colorear el nodo. El operador
 * puede ver los 4 valores en la ContextCard para entender disonancias.
 */
export const boardNodeStates = mysqlTable(
  "board_node_states",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Snapshot al que pertenece este estado. */
    snapshotId: int("snapshotId")
      .notNull()
      .references(() => boardSnapshots.id, { onDelete: "cascade" }),
    /** Nodo evaluado. */
    nodeId: varchar("nodeId", { length: 128 }).notNull(),
    /**
     * Última observación que entró al cómputo. Usar para auditoría:
     * "el motor decidió DEGRADED porque la observación 4587 dijo
     *  loc=0 con confidence=950".
     */
    lastObservationId: bigint("lastObservationId", { mode: "number" }).references(
      () => boardObservations.id,
      { onDelete: "set null" },
    ),
    /** Estado calculado a partir de observations. */
    computedStatus: mysqlEnum("computedStatus", [
      "ACTIVE",
      "DEGRADED",
      "SPRINT",
      "FUTURE",
      "UNKNOWN",
    ])
      .notNull()
      .default("UNKNOWN"),
    /** Estado proyectado para el próximo snapshot. */
    projectedStatus: mysqlEnum("projectedStatus", [
      "ACTIVE",
      "DEGRADED",
      "SPRINT",
      "FUTURE",
      "UNKNOWN",
    ])
      .notNull()
      .default("UNKNOWN"),
    /** Override activo en este snapshot, si existe. */
    overrideStatus: mysqlEnum("overrideStatus", [
      "ACTIVE",
      "DEGRADED",
      "SPRINT",
      "FUTURE",
    ]),
    /**
     * Estado ganador final. Lo que el front pinta.
     * Calculado: override ?? computed.
     */
    effectiveStatus: mysqlEnum("effectiveStatus", [
      "ACTIVE",
      "DEGRADED",
      "SPRINT",
      "FUTURE",
      "UNKNOWN",
    ])
      .notNull()
      .default("UNKNOWN"),
    /** Confianza agregada del cómputo 0..1000. */
    confidence: int("confidence").notNull().default(0),
    /** Razón humana del estado computado ("loc=0 + last_updated=null"). */
    rationale: text("rationale"),
    computedAt: timestamp("computedAt").defaultNow().notNull(),
  },
  (table) => ({
    snapshotIdIdx: index("board_node_states_snapshotId_idx").on(
      table.snapshotId,
    ),
    nodeIdIdx: index("board_node_states_nodeId_idx").on(table.nodeId),
    effectiveStatusIdx: index("board_node_states_effectiveStatus_idx").on(
      table.effectiveStatus,
    ),
  }),
);

export type BoardNodeState = typeof boardNodeStates.$inferSelect;
export type InsertBoardNodeState = typeof boardNodeStates.$inferInsert;


/**
 * board_events — Decision Rail (Sprint v4.0 / Tarea 6)
 *
 * Bitácora unificada de eventos administrativos del Tablero. Reemplaza
 * gradualmente las tablas legacy `board_incidents` y `board_overrides`,
 * que coexisten en compat layer durante la migración.
 *
 * Cada fila es un evento inmutable (append-only) con autoría y propósito.
 * El motor de cómputo de Truth Ledger consume esta tabla para resolver
 * `effectiveStatus` (override > computed > UNKNOWN).
 *
 * Tipos canónicos del Monstruo (Brand Engine):
 *   - "incident_declared"      → Papá declara que algo está roto
 *   - "incident_resolved"      → Papá marca como resuelto
 *   - "status_override_set"    → Papá fuerza un estado manualmente
 *   - "status_override_cleared"→ Papá retira el override
 *   - "node_annotation"        → Papá deja una nota sin cambiar estado
 *   - "system_audit"           → Bitácora forense automática
 *
 * Naming canónico v4.0: identidad de marca explícita (no `events` genérico).
 */
export const boardEvents = mysqlTable(
  "board_events",
  {
    id: int("id").autoincrement().primaryKey(),
    /**
     * Tipo del evento. Determina qué hacer con effectiveStatus en el motor
     * de cómputo. Los 6 tipos canónicos están enumerados en el JSDoc.
     */
    eventType: varchar("eventType", { length: 64 }).notNull(),
    /**
     * Nodo afectado. NULL cuando el evento es global (system_audit).
     */
    nodeId: varchar("nodeId", { length: 128 }),
    /**
     * Snapshot vigente cuando se emitió el evento. NULL si no había snapshot
     * aún (debería ser raro en operación normal).
     */
    snapshotId: int("snapshotId"),
    /**
     * Identidad del actor. `actorOpenId` es el openId de Manus OAuth cuando
     * existe; `actorRole` es 'owner' | 'system' | 'unknown'.
     */
    actorOpenId: varchar("actorOpenId", { length: 64 }),
    actorRole: varchar("actorRole", { length: 32 }).notNull(),
    /**
     * Status que el evento impone al nodo (si aplica). NULL para eventos
     * que no tocan estado (annotations, audits).
     */
    effectStatus: varchar("effectStatus", { length: 32 }),
    /**
     * Justificación textual obligatoria para todos los eventos. El UI la
     * muestra en la timeline del nodo.
     */
    rationale: text("rationale").notNull(),
    /**
     * Payload extendido del evento (severidad, metadatos del incidente,
     * datos del override, etc.). Shape varía por eventType.
     */
    payload: json("payload"),
    /**
     * Cuando el override expira automáticamente. NULL = sin expiración.
     */
    expiresAt: timestamp("expiresAt"),
    /**
     * Eventos no se borran; se "cierran" emitiendo otro evento que los
     * supersede. Este campo apunta al evento que neutraliza este (si aplica).
     */
    supersededByEventId: int("supersededByEventId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    eventTypeIdx: index("board_events_event_type_idx").on(table.eventType),
    nodeIdIdx: index("board_events_node_id_idx").on(table.nodeId),
    snapshotIdIdx: index("board_events_snapshot_id_idx").on(table.snapshotId),
    actorRoleIdx: index("board_events_actor_role_idx").on(table.actorRole),
    createdAtIdx: index("board_events_created_at_idx").on(table.createdAt),
  }),
);

export type BoardEvent = typeof boardEvents.$inferSelect;
export type InsertBoardEvent = typeof boardEvents.$inferInsert;


/**
 * board_snapshot_diffs — Causal Timeline (T8 del Sprint MEGA v4.0 / PR2).
 *
 * Cada fila es el diff materializado entre dos snapshots del Tablero.
 * El cliente lo consume para animar el board cuando el usuario viaja en el
 * tiempo: nodos añadidos aparecen con scale 0→1, nodos removidos quedan en
 * ghost (opacidad reducida), nodos con status diferente pulsan, nodos con
 * métricas cambiadas reciben halo punteado.
 *
 * Determinismo: los snapshots son inmutables (append-only), así que un diff
 * (fromId, toId) calcula siempre el mismo payload. Cacheamos el resultado en
 * esta tabla para no recomputar.
 *
 * Identidad de marca: "snapshot_diff" es un objeto narrativo del Tablero (no
 * "delta" genérico). Sirve a la narrativa causal del Monstruo: "esto fue lo
 * que cambió entre estos dos instantes".
 *
 * Shape de los JSON:
 *   - addedNodes:    string[]  (nodeIds que existen en `to` y no en `from`)
 *   - removedNodes:  string[]  (nodeIds que existen en `from` y no en `to`)
 *   - changedNodes:  string[]  (nodeIds presentes en ambos con algún diff)
 *   - statusChanges: Array<{ nodeId, fromStatus, toStatus }>
 *   - metricChanges: Array<{ nodeId, field, fromValue, toValue }>
 *   - edgeChanges:   { added: Array<{from,to,edgeType}>,
 *                      removed: Array<{from,to,edgeType}> }
 */
export const boardSnapshotDiffs = mysqlTable(
  "board_snapshot_diffs",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Snapshot punto de partida ("antes"). */
    fromSnapshotId: int("fromSnapshotId")
      .notNull()
      .references(() => boardSnapshots.id, { onDelete: "cascade" }),
    /** Snapshot punto de llegada ("después"). */
    toSnapshotId: int("toSnapshotId")
      .notNull()
      .references(() => boardSnapshots.id, { onDelete: "cascade" }),
    /** nodeIds presentes en `to` pero no en `from`. JSON array de strings. */
    addedNodes: json("addedNodes").notNull(),
    /** nodeIds presentes en `from` pero no en `to`. JSON array de strings. */
    removedNodes: json("removedNodes").notNull(),
    /** nodeIds presentes en ambos snapshots con algún cambio. JSON array de strings. */
    changedNodes: json("changedNodes").notNull(),
    /** Cambios de status detallados por nodo. JSON array de objetos. */
    statusChanges: json("statusChanges").notNull(),
    /** Cambios de métricas (loc, lastUpdated). JSON array de objetos. */
    metricChanges: json("metricChanges").notNull(),
    /** Cambios en aristas (añadidas / removidas). JSON objeto con dos arrays. */
    edgeChanges: json("edgeChanges").notNull(),
    /**
     * Counts denormalizados para queries rápidas y badges de UI sin
     * tener que parsear el JSON.
     */
    addedCount: int("addedCount").notNull().default(0),
    removedCount: int("removedCount").notNull().default(0),
    changedCount: int("changedCount").notNull().default(0),
    computedAt: timestamp("computedAt").defaultNow().notNull(),
  },
  (table) => ({
    fromSnapshotIdIdx: index("board_snapshot_diffs_from_idx").on(
      table.fromSnapshotId,
    ),
    toSnapshotIdIdx: index("board_snapshot_diffs_to_idx").on(table.toSnapshotId),
    // Index para acelerar el cache lookup por par (from, to)
    fromToIdx: index("board_snapshot_diffs_from_to_idx").on(
      table.fromSnapshotId,
      table.toSnapshotId,
    ),
  }),
);

export type BoardSnapshotDiff = typeof boardSnapshotDiffs.$inferSelect;
export type InsertBoardSnapshotDiff = typeof boardSnapshotDiffs.$inferInsert;


// ──────────────────────────────────────────────────────────────────────
// T7 Omnibox Grounded — node briefs + answer cache
// ──────────────────────────────────────────────────────────────────────

/**
 * board_node_briefs — Brief corto pre-computado por (nodeId, snapshotId).
 *
 * Sirve como "tarjeta resumen" que el Omnibox inyecta al LLM en vez de la
 * description completa del nodo. Mantiene la inyección de contexto barata
 * (12 briefs cortos vs 60+ descriptions largas) y reduce dilución de atención.
 *
 * Estrategia de population:
 *  - Cuando un snapshot se construye, se generan briefs vacíos para sus
 *    nodos (brief = truncate(description, 240)).
 *  - Un job futuro puede regenerar briefs con un LLM-summarizer (Gemini Flash)
 *    para que sean más narrativos sin tocar el camino crítico del Omnibox.
 *  - El Omnibox consulta `board_node_briefs WHERE snapshotId = current` y
 *    cae a truncate(description) si no hay brief registrado.
 */
export const boardNodeBriefs = mysqlTable(
  "board_node_briefs",
  {
    id: int("id").autoincrement().primaryKey(),
    nodeId: varchar("nodeId", { length: 100 }).notNull(),
    snapshotId: int("snapshotId").notNull(),
    brief: text("brief").notNull(),
    /** "truncated" | "llm-summarized" | "manual" — origen del brief. */
    source: varchar("source", { length: 32 }).notNull().default("truncated"),
    computedAt: timestamp("computedAt").defaultNow().notNull(),
  },
  (table) => ({
    snapshotIdx: index("board_node_briefs_snapshot_idx").on(table.snapshotId),
    nodeSnapshotIdx: index("board_node_briefs_node_snapshot_idx").on(
      table.nodeId,
      table.snapshotId,
    ),
  }),
);

export type BoardNodeBrief = typeof boardNodeBriefs.$inferSelect;
export type InsertBoardNodeBrief = typeof boardNodeBriefs.$inferInsert;

/**
 * omnibox_cache — Cache de respuestas del Omnibox por hash(query, snapshotId).
 *
 * El hash se computa como SHA-256(`${snapshotId}:${normalizedQuery}`) donde
 * `normalizedQuery = query.trim().toLowerCase()`. La normalización es agresiva
 * a propósito para maximizar hits ("¿Qué es Yuna?" === "que es yuna?").
 *
 * TTL: 24 horas. Después se considera expirado y se re-genera. Esto evita que
 * un cambio narrativo (rebriefing manual) se vea bloqueado por cache rancio.
 *
 * Tamaño esperado: <10k filas, queremos lookup O(log n) por queryHash.
 */
export const omniboxCache = mysqlTable(
  "omnibox_cache",
  {
    id: int("id").autoincrement().primaryKey(),
    queryHash: varchar("queryHash", { length: 64 }).notNull(),
    snapshotId: int("snapshotId").notNull(),
    answer: json("answer").$type<string>().notNull(),
    citations: json("citations").$type<string[]>().notNull(),
    intent: varchar("intent", { length: 32 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
  },
  (table) => ({
    queryHashIdx: index("omnibox_cache_query_hash_idx").on(table.queryHash),
    expiresAtIdx: index("omnibox_cache_expires_idx").on(table.expiresAt),
  }),
);

export type OmniboxCacheRow = typeof omniboxCache.$inferSelect;
export type InsertOmniboxCacheRow = typeof omniboxCache.$inferInsert;

// ============================================================================
// FORJA OS v4 MONSTRUO — Authority Envelopes Kernel
// ============================================================================
// Doctrina: docs/FORJA_OS_v4_MONSTRUO.md
// Sprint:   docs/FORJA_OS_SPRINT_v0_1_v2.md
// Schema:   docs/FORJA_OS_v4_SCHEMA.md
// Engine:   TiDB / MySQL-compatible
// ----------------------------------------------------------------------------

/**
 * Tabla 1 — root_authority_envelopes
 * Authority Envelopes raíz firmados por el operador soberano con su llave ed25519.
 * Append-only crítico. UPDATE solo permitido en isActive, revokedAt, revokedReason.
 */
export const rootAuthorityEnvelopes = mysqlTable(
  "root_authority_envelopes",
  {
    envelopeId: varchar("envelopeId", { length: 36 }).primaryKey(),
    operatorOpenId: varchar("operatorOpenId", { length: 64 }).notNull(),
    operatorPublicKey: varchar("operatorPublicKey", { length: 128 }).notNull(),
    missionCapsuleId: varchar("missionCapsuleId", { length: 36 }).notNull(),
    domainScope: json("domainScope").$type<{ repos: string[]; envs: string[]; resources: string[] }>().notNull(),
    powerLaneMax: int("powerLaneMax").notNull(),
    capabilitiesAllowed: json("capabilitiesAllowed").$type<string[]>().notNull(),
    capabilitiesDenied: json("capabilitiesDenied").$type<string[]>().notNull(),
    prohibited: json("prohibited").$type<{ category: string; description: string }[]>().notNull(),
    budgetMaxTokens: bigint("budgetMaxTokens", { mode: "number" }).notNull(),
    budgetMaxCostUsdCents: int("budgetMaxCostUsdCents").notNull(),
    budgetMaxActions: int("budgetMaxActions").notNull(),
    budgetMaxDurationSeconds: int("budgetMaxDurationSeconds").notNull(),
    oracleGates: json("oracleGates").$type<{ oracleId: string; condition: string }[]>().notNull(),
    rollbackRequired: boolean("rollbackRequired").notNull().default(true),
    issuedAt: timestamp("issuedAt").notNull().defaultNow(),
    ttlSeconds: int("ttlSeconds").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    isActive: boolean("isActive").notNull().default(true),
    revokedAt: timestamp("revokedAt"),
    revokedReason: text("revokedReason"),
    canonicalHash: varchar("canonicalHash", { length: 64 }).notNull(),
    signature: varchar("signature", { length: 128 }).notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    operatorIdx: index("forja_envelope_operator_idx").on(table.operatorOpenId),
    activeExpiresIdx: index("forja_envelope_active_expires_idx").on(table.isActive, table.expiresAt),
    missionIdx: index("forja_envelope_mission_idx").on(table.missionCapsuleId),
  }),
);
export type RootAuthorityEnvelopeRow = typeof rootAuthorityEnvelopes.$inferSelect;
export type InsertRootAuthorityEnvelope = typeof rootAuthorityEnvelopes.$inferInsert;

/**
 * Tabla 2 — sub_envelopes
 * Sub-envelopes derivados emitidos por agentes con scope estrictamente atenuado.
 * Atenuación monotónica obligatoria: domain ⊆ parent, capabilities ⊆ parent, budget ≤ parent.
 */
export const subEnvelopes = mysqlTable(
  "sub_envelopes",
  {
    subEnvelopeId: varchar("subEnvelopeId", { length: 36 }).primaryKey(),
    rootEnvelopeId: varchar("rootEnvelopeId", { length: 36 }).notNull(),
    parentEnvelopeId: varchar("parentEnvelopeId", { length: 36 }).notNull(),
    parentHash: varchar("parentHash", { length: 64 }).notNull(),
    domainScope: json("domainScope").$type<{ repos: string[]; envs: string[]; resources: string[] }>().notNull(),
    capabilitiesAllowed: json("capabilitiesAllowed").$type<string[]>().notNull(),
    budgetMaxTokens: bigint("budgetMaxTokens", { mode: "number" }).notNull(),
    budgetMaxCostUsdCents: int("budgetMaxCostUsdCents").notNull(),
    budgetMaxActions: int("budgetMaxActions").notNull(),
    budgetMaxDurationSeconds: int("budgetMaxDurationSeconds").notNull(),
    ttlSeconds: int("ttlSeconds").notNull(),
    taskDescription: text("taskDescription").notNull(),
    issuedByAgentId: varchar("issuedByAgentId", { length: 64 }).notNull(),
    issuedByPublicKey: varchar("issuedByPublicKey", { length: 128 }).notNull(),
    issuedAt: timestamp("issuedAt").notNull().defaultNow(),
    expiresAt: timestamp("expiresAt").notNull(),
    isActive: boolean("isActive").notNull().default(true),
    revokedAt: timestamp("revokedAt"),
    canonicalHash: varchar("canonicalHash", { length: 64 }).notNull(),
    signature: varchar("signature", { length: 128 }).notNull(),
    depth: int("depth").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => ({
    rootIdx: index("forja_sub_envelope_root_idx").on(table.rootEnvelopeId),
    parentIdx: index("forja_sub_envelope_parent_idx").on(table.parentEnvelopeId),
    activeExpiresIdx: index("forja_sub_envelope_active_expires_idx").on(table.isActive, table.expiresAt),
  }),
);
export type SubEnvelopeRow = typeof subEnvelopes.$inferSelect;
export type InsertSubEnvelope = typeof subEnvelopes.$inferInsert;

/**
 * Tabla 3 — mission_capsules
 * Misiones estructuradas que el operador autoriza vía envelope.
 */
export const missionCapsules = mysqlTable(
  "mission_capsules",
  {
    missionId: varchar("missionId", { length: 36 }).primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    acceptanceCriteria: json("acceptanceCriteria").$type<string[]>().notNull(),
    domain: varchar("domain", { length: 100 }).notNull(),
    initiatedBy: varchar("initiatedBy", { length: 64 }).notNull(),
    outcome: mysqlEnum("outcome", ["in_progress", "success", "failure", "revoked", "timeout"]),
    outcomeReason: text("outcomeReason"),
    outcomeReceiptHash: varchar("outcomeReceiptHash", { length: 64 }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    closedAt: timestamp("closedAt"),
  },
  (table) => ({
    domainIdx: index("forja_mission_domain_idx").on(table.domain),
    outcomeIdx: index("forja_mission_outcome_idx").on(table.outcome),
  }),
);
export type MissionCapsuleRow = typeof missionCapsules.$inferSelect;
export type InsertMissionCapsule = typeof missionCapsules.$inferInsert;

/**
 * Tabla 4 — capability_tokens
 * Tokens corto-vivos (típicamente 60s TTL) emitidos por el gateway por cada tool call autorizado.
 * Se consumen una sola vez (consumedAt). Append-only.
 */
export const capabilityTokens = mysqlTable(
  "capability_tokens",
  {
    tokenId: varchar("tokenId", { length: 36 }).primaryKey(),
    envelopeId: varchar("envelopeId", { length: 36 }).notNull(),
    envelopeType: mysqlEnum("envelopeType", ["root", "sub"]).notNull(),
    capability: varchar("capability", { length: 100 }).notNull(),
    resource: varchar("resource", { length: 200 }).notNull(),
    issuedAt: timestamp("issuedAt").notNull().defaultNow(),
    expiresAt: timestamp("expiresAt").notNull(),
    consumedAt: timestamp("consumedAt"),
    consumedByActionHash: varchar("consumedByActionHash", { length: 64 }),
    signature: varchar("signature", { length: 128 }).notNull(),
  },
  (table) => ({
    envelopeIdx: index("forja_token_envelope_idx").on(table.envelopeId),
    consumedIdx: index("forja_token_consumed_idx").on(table.consumedAt),
    expiresIdx: index("forja_token_expires_idx").on(table.expiresAt),
  }),
);
export type CapabilityTokenRow = typeof capabilityTokens.$inferSelect;
export type InsertCapabilityToken = typeof capabilityTokens.$inferInsert;

/**
 * Tabla 5 — policy_decisions
 * Cada decisión del policy engine (allow/deny) queda registrada para auditoría.
 * Append-only. Inmutable después de INSERT.
 */
export const policyDecisions = mysqlTable(
  "policy_decisions",
  {
    decisionId: varchar("decisionId", { length: 36 }).primaryKey(),
    envelopeId: varchar("envelopeId", { length: 36 }).notNull(),
    envelopeType: mysqlEnum("envelopeType", ["root", "sub"]).notNull(),
    toolCallInputHash: varchar("toolCallInputHash", { length: 64 }).notNull(),
    capability: varchar("capability", { length: 100 }).notNull(),
    resource: varchar("resource", { length: 200 }).notNull(),
    decision: mysqlEnum("decision", ["allow", "deny"]).notNull(),
    reasonChain: json("reasonChain").$type<string[]>().notNull(),
    oracleReadingsConsulted: json("oracleReadingsConsulted").$type<string[]>(),
    decidedAt: timestamp("decidedAt").notNull().defaultNow(),
    decidedByEngineVersion: varchar("decidedByEngineVersion", { length: 20 }).notNull(),
  },
  (table) => ({
    envelopeIdx: index("forja_decision_envelope_idx").on(table.envelopeId),
    decisionIdx: index("forja_decision_outcome_idx").on(table.decision),
    decidedAtIdx: index("forja_decision_decided_at_idx").on(table.decidedAt),
  }),
);
export type PolicyDecisionRow = typeof policyDecisions.$inferSelect;
export type InsertPolicyDecision = typeof policyDecisions.$inferInsert;

/**
 * Tabla 6 — oracle_readings
 * Lecturas firmadas de oracles externos verificables (CI status, health, deploy state).
 * Append-only.
 */
export const oracleReadings = mysqlTable(
  "oracle_readings",
  {
    readingId: varchar("readingId", { length: 36 }).primaryKey(),
    oracleId: varchar("oracleId", { length: 100 }).notNull(),
    value: json("value").notNull(),
    signedBy: varchar("signedBy", { length: 128 }).notNull(),
    signedAt: timestamp("signedAt").notNull().defaultNow(),
    validUntil: timestamp("validUntil").notNull(),
    hash: varchar("hash", { length: 64 }).notNull(),
    signature: varchar("signature", { length: 128 }).notNull(),
  },
  (table) => ({
    oracleIdx: index("forja_oracle_id_idx").on(table.oracleId),
    validUntilIdx: index("forja_oracle_valid_until_idx").on(table.validUntil),
  }),
);
export type OracleReadingRow = typeof oracleReadings.$inferSelect;
export type InsertOracleReading = typeof oracleReadings.$inferInsert;

/**
 * Tabla 7 — revocation_events
 * Eventos de revocación firmados (operador, oracle violation, auto budget/ttl, admin).
 * Append-only.
 */
export const revocationEvents = mysqlTable(
  "revocation_events",
  {
    eventId: varchar("eventId", { length: 36 }).primaryKey(),
    envelopeId: varchar("envelopeId", { length: 36 }).notNull(),
    envelopeType: mysqlEnum("envelopeType", ["root", "sub"]).notNull(),
    revokedAt: timestamp("revokedAt").notNull().defaultNow(),
    reason: text("reason").notNull(),
    triggeredBy: mysqlEnum("triggeredBy", ["operator", "oracle_violation", "auto_budget", "auto_ttl", "manual_admin"]).notNull(),
    triggeredByPublicKey: varchar("triggeredByPublicKey", { length: 128 }).notNull(),
    signature: varchar("signature", { length: 128 }).notNull(),
  },
  (table) => ({
    envelopeIdx: index("forja_revocation_envelope_idx").on(table.envelopeId),
    triggeredByIdx: index("forja_revocation_triggered_by_idx").on(table.triggeredBy),
  }),
);
export type RevocationEventRow = typeof revocationEvents.$inferSelect;
export type InsertRevocationEvent = typeof revocationEvents.$inferInsert;

/**
 * Tabla 8 — evidence_receipts
 * Cadena Merkle append-only de receipts firmados por el agente tras cada acción.
 * Trigger pre-insert verifica parentReceiptHash === sha256(canonical_json(parent)).
 */
export const evidenceReceipts = mysqlTable(
  "evidence_receipts",
  {
    receiptId: varchar("receiptId", { length: 36 }).primaryKey(),
    envelopeId: varchar("envelopeId", { length: 36 }).notNull(),
    subEnvelopeId: varchar("subEnvelopeId", { length: 36 }),
    capabilityTokenId: varchar("capabilityTokenId", { length: 36 }).notNull(),
    parentReceiptHash: varchar("parentReceiptHash", { length: 64 }),
    merkleHash: varchar("merkleHash", { length: 64 }).notNull(),
    actionType: varchar("actionType", { length: 50 }).notNull(),
    inputHash: varchar("inputHash", { length: 64 }).notNull(),
    outputHash: varchar("outputHash", { length: 64 }),
    outcome: mysqlEnum("outcome", ["success", "failure", "partial"]).notNull(),
    tokensConsumed: int("tokensConsumed").default(0),
    costUsdCents: int("costUsdCents").default(0),
    durationMs: int("durationMs").default(0),
    startedAt: timestamp("startedAt").notNull(),
    completedAt: timestamp("completedAt").notNull().defaultNow(),
    signedByAgentId: varchar("signedByAgentId", { length: 64 }).notNull(),
    signedByPublicKey: varchar("signedByPublicKey", { length: 128 }).notNull(),
    signature: varchar("signature", { length: 128 }).notNull(),
  },
  (table) => ({
    envelopeIdx: index("forja_receipt_envelope_idx").on(table.envelopeId),
    parentHashIdx: index("forja_receipt_parent_hash_idx").on(table.parentReceiptHash),
    merkleHashIdx: index("forja_receipt_merkle_hash_idx").on(table.merkleHash),
    completedAtIdx: index("forja_receipt_completed_at_idx").on(table.completedAt),
  }),
);
export type EvidenceReceiptRow = typeof evidenceReceipts.$inferSelect;
export type InsertEvidenceReceipt = typeof evidenceReceipts.$inferInsert;


/**
 * sprints — Hito B-lite del Sprint Observatorio Vivo v1.1.
 *
 * Cada fila representa un sprint canonizado del repo `el-monstruo` (carpeta
 * `bridge/sprints_propuestos/`, `bridge/sprints_completados/`, etc).
 * El ingestor (`scripts/ingest_sprints.ts`) lee desde GitHub API y hace UPSERT.
 *
 * Status válidos (validados por aplicación con zod, NO por mysqlEnum para
 * portabilidad): draft | signed | executing | completed | rejected | obsolete.
 *
 * La Forma renderiza "edificios fantasma" sobre los distritos afectados,
 * usando el material `SPRINT/FUTURE` ya existente en `Building.tsx`.
 *
 * Doctrina v1.1 §3.1: motor TiDB / MySQL dialect. Sin ENUM nativo.
 */
export const sprints = mysqlTable(
  "sprints",
  {
    sprintId: varchar("sprint_id", { length: 64 }).primaryKey(),
    sourceRepo: varchar("source_repo", { length: 128 }).notNull(),
    sourcePath: varchar("source_path", { length: 512 }).notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    descriptionMd: text("description_md"),
    status: varchar("status", { length: 32 }).notNull(),
    signedBy: varchar("signed_by", { length: 64 }),
    signedAt: timestamp("signed_at"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    /** Lista de distritos afectados, ej. ["cognicion","interfaces"]. */
    affectedDistricts: json("affected_districts").notNull(),
    /** IDs de nodos del genoma que toca el sprint, opcional. */
    affectedNodes: json("affected_nodes"),
    /** IDs de proyectos del universo afectados, opcional. */
    affectedProjects: json("affected_projects"),
    /** Otros sprint_ids bloqueantes. */
    dependencies: json("dependencies"),
    estimatedDays: int("estimated_days"),
    actualDays: int("actual_days"),
    /** Números de PR de GitHub asociados, ej. [188,189]. */
    prNumbers: json("pr_numbers"),
    /** Metadata libre para extensiones futuras. */
    metadata: json("metadata"),
    ingestedAt: timestamp("ingested_at").defaultNow().notNull(),
    /** Fuente de la última ingestión: "ingestor_v1" | "manual". */
    ingestedFrom: varchar("ingested_from", { length: 64 }).notNull(),
    /** sha256 hex del MD canónico para detectar cambios. */
    hashCanonical: varchar("hash_canonical", { length: 64 }).notNull(),
  },
  (table) => ({
    statusIdx: index("sprints_status_idx").on(table.status),
    sourceIdx: index("sprints_source_idx").on(table.sourceRepo, table.sourcePath),
    ingestedAtIdx: index("sprints_ingested_at_idx").on(table.ingestedAt),
  }),
);

export type SprintRow = typeof sprints.$inferSelect;
export type InsertSprint = typeof sprints.$inferInsert;


// ============================================================================
// Sprint Observatorio Vivo v1.1 — Hito C: Mapa estelar de proyectos conectados
// ============================================================================

export const connectedProjects = mysqlTable(
  "connected_projects",
  {
    projectId: varchar("project_id", { length: 100 }).primaryKey(),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 32 }).notNull(),
    district: varchar("district", { length: 50 }),
    githubOwner: varchar("github_owner", { length: 100 }),
    githubRepo: varchar("github_repo", { length: 200 }),
    githubVisibility: varchar("github_visibility", { length: 16 }),
    deployTarget: varchar("deploy_target", { length: 32 }),
    deployUrl: varchar("deploy_url", { length: 500 }),
    stackTags: text("stack_tags"),
    status: varchar("status", { length: 32 }).notNull().default("unknown"),
    lastEventBusId: bigint("last_event_bus_id", { mode: "number" }),
    starX: int("star_x"),
    starY: int("star_y"),
    lastSeenAt: timestamp("last_seen_at"),
    lastPushedAt: timestamp("last_pushed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    categoryIdx: index("connected_projects_category_idx").on(table.category),
    statusIdx: index("connected_projects_status_idx").on(table.status),
  }),
);
export type ConnectedProject = typeof connectedProjects.$inferSelect;
export type InsertConnectedProject = typeof connectedProjects.$inferInsert;

export const projectHealthPings = mysqlTable(
  "project_health_pings",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    projectId: varchar("project_id", { length: 100 }).notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    latencyMs: int("latency_ms"),
    httpStatus: int("http_status"),
    source: varchar("source", { length: 32 }).notNull(),
    notes: text("notes"),
    busEventId: bigint("bus_event_id", { mode: "number" }),
    pingedAt: timestamp("pinged_at").defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index("project_health_pings_project_idx").on(table.projectId),
    pingedAtIdx: index("project_health_pings_pinged_at_idx").on(table.pingedAt),
  }),
);
export type ProjectHealthPing = typeof projectHealthPings.$inferSelect;
export type InsertProjectHealthPing = typeof projectHealthPings.$inferInsert;

/**
 * forja_shadow_calls — Hito 8 v1.1.
 * Registro de intenciones (shadow) que el Tablero querría invocar sobre el
 * kernel vía la puerta canónica `invokeKernelMonstruo` (apps/la-forja/api/src/puertas/kernel_monstruo.ts).
 * En modo shadow estricto ninguna llamada se ejecuta — solo se registra para auditoría.
 * El paso a modo enforce requiere DSC firmado.
 */
export const forjaShadowCalls = mysqlTable("forja_shadow_calls", {
  id: int("id").autoincrement().primaryKey(),
  callId: varchar("callId", { length: 64 }).notNull().unique(),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  bodyHash: varchar("bodyHash", { length: 64 }).notNull(),
  bodyPreview: text("bodyPreview"),
  actorOpenId: varchar("actorOpenId", { length: 64 }),
  actorRole: varchar("actorRole", { length: 32 }),
  intent: varchar("intent", { length: 32 }).notNull().default("shadow"),
  // shadow|enforce_blocked|enforce_allowed (futuro)
  status: varchar("status", { length: 32 }).notNull().default("recorded"),
  reasonNote: text("reasonNote"),
  wouldCallAt: timestamp("wouldCallAt").defaultNow().notNull(),
});

export type ForjaShadowCall = typeof forjaShadowCalls.$inferSelect;
export type InsertForjaShadowCall = typeof forjaShadowCalls.$inferInsert;
