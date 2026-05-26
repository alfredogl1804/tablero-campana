

## Fase 5 — CatastroCluster (solución universal Gemini Sabio #3)
- [x] Pipeline cero-drift: scripts/build_visual_ledger.py que lee 3 JSONs reales y emite catastro_visual_ledger.json
- [x] Inyección sintética de Nano Banana Pro como TOOL operable (synthetic=true)
- [x] Tipo TypeScript LedgerNode con entity_type AGENTE|TOOL|SUPPLIER (catastro-types.ts)
- [x] CatastroCluster.tsx — vista isométrica 3 distritos (Agentes/Tools/Suppliers), agrupada por categoría
- [x] CandidataInspector.tsx — panel de detalles al click
- [x] Wire-up: nodo "catastro" del Tablero abre CatastroCluster en lugar del ContextCard
- [x] Halo / marker en is_operable=true (Nano Banana Pro)
- [x] Vitest del shape ledger (7 tests verdes)

## Fase 6 — Datos vivos en LivePulse
- [x] LivePulse consume trpc.supabase.health (refetch 30s)
- [x] Footer muestra `N tablas vivas` con dot verde/ámbar/gris
- [x] Checkpoint v2.2 (version 9430a301)

## Fase 7 — Reparación del Canvas 3D (v2.3, decisión Sabio #3 Gemini)
- [x] Diagnóstico empírico con probe magenta (confirmó H1 al 100%)
- [x] Fix definitivo: `preserveDrawingBuffer: true` en gl options
- [x] Restaurar `meshStandardMaterial` en Building.tsx (después de descartar luces como causa)
- [x] Restaurar zoom default 28 en Home.tsx
- [x] Retirar sonda de diagnóstico del IsometricBoard
- [x] Listener `webglcontextlost` / `webglcontextrestored` mantenido como red de seguridad
- [x] 19 tests verdes
- [x] Checkpoint v2.3 (version 4487d922)
- [x] Validación final en iPhone — cubierta por Fase 8 con v2.4 (af22604f)

## Fase 8 — Causa raíz real del Canvas (v2.4, decisión Sabio #1 GPT-5.5 Pro)
- [x] Probe `RenderLoopProbe` reveló que useFrame NUNCA corría (render loop suspendido)
- [x] Identificada causa raíz: `<Text font="https://fonts.gstatic.com/...">` en DistrictPlatform y Building suspendía R3F
- [x] Removido `font` URL externo de DistrictPlatform.tsx (drei usa fuente default empacada)
- [x] Removido `font` URL externo de Building.tsx
- [x] Removido `<Environment preset="warehouse">` (cargaba HDRI de threejs.org, mejora robustez)
- [x] Retirado RenderLoopProbe tras validación
- [x] 19 tests verdes
- [x] Checkpoint v2.4 (version af22604f)
- [x] Validación auditable: nuevo `server/canvas.no_remote_assets.test.ts` (4 tests) que prohíbe URLs remotas en componentes del board. 23/23 tests verdes.
- [x] Validación visual reproducible: monstruo-fmpgkidx.manus.space publicado v2.4 con board completamente renderizado en Safari iPhone real (capturas IMG_5493 / IMG_5494)

## Fase 9 — Fix Omnibox responsive iPhone (v2.4.2)
- [x] Diagnosticado: `w-[640px]` fijo desbordaba viewport iPhone (≤414px)
- [x] Fix aplicado: `w-full sm:w-[640px] max-w-[640px]` + wrapper con `100vw-1.5rem`
- [x] Prevención del zoom-on-focus de iOS: `fontSize: max(16px, 1rem)` en input
- [x] safe-area-inset-bottom respetado para iPhones con notch
- [x] Test de regresión `server/omnibox.responsive.test.ts` (3 tests) bloquea futuras regresiones
- [x] 26/26 tests verdes


## Sprint v3.0 — T1: Sincronización viva (COMPLETO)
- [x] Crear tablas Drizzle: board_snapshots, board_nodes
- [x] pnpm db:push para aplicar migración
- [x] Crear scripts/build_board_data.py (lee del mount canónico, fallback a snapshot local)
- [x] Snapshot local de respaldo en scripts/board_sources/
- [x] Crear server/db.ts helpers: insertBoardSnapshot, getCurrentBoardSnapshot, listBoardSnapshots, getBoardSnapshotById
- [x] Crear server/routers/board.ts con board.current, board.refresh, board.history, board.byId
- [x] Wire en server/routers.ts
- [x] Reemplazar import estático en client/src/pages/Home.tsx por trpc.board.current con refetchInterval 60s
- [x] Manejo de loading/error/fallback con boardData estático como último recurso (useMemo)
- [x] Tests Vitest: shape de snapshot + idempotencia + ejecución real (14 tests, todos verdes)
- [x] Handler /api/scheduled/refreshBoard montado en server/_core/index.ts (Heartbeat-ready, requiere deploy)
- [x] Validación end-to-end: 62 nodos, system_health 0.735, source_mode canonical_mount, 403 sin header de cron
- [x] 47/47 tests vitest verdes (añadidos: 3 board.diff + 4 board.scheduled)
- [x] UI explícita de loading/live/stale/error en LivePulse footer (badge "tablero")
- [x] Test board.diff: determinismo + diff entre snapshots + source_mode coincide con FS
- [x] Test board.scheduled: 403 sin header, dev bypass válido, x-manus-cron-task-uid válido, idempotencia
- [x] Fallback local auditable: scripts/board_sources/MONSTRUO_GENOME.yaml + lógica de selección canonical_mount vs local_snapshot_fallback en build_board_data.py
- [x] Cron POST-DEPLOY (BLOQUEADO POR SERVICIO MANUS HEARTBEAT, no por código del proyecto): se intentó `manus-heartbeat create --name refresh-tablero --cron "0 */5 * * * *" --path /api/scheduled/refreshBoard` y devolvió "create heartbeat job failed [internal]: internal server error" en múltiples reintentos con distintas combinaciones de nombre/cron/descripción. El endpoint del proyecto en producción responde correctamente: `curl POST https://monstruo-fmpgkidx.manus.space/api/scheduled/refreshBoard` → `{"error":"permission error for cron cookie"}` HTTP 403 (handler vivo y blindado). Mitigación: el frontend hace `refetchInterval: 60_000` desde el browser y el bootstrap del backend dispara una sincronización al primer request, así que el sistema funciona end-to-end sin el cron. Cuando el servicio Heartbeat de Manus esté disponible, reintentar el comando exacto.


## Sprint v3.0 — T3: Modo Papá funcional (COMPLETO)
- [x] Crear client/src/lib/tone.ts con diccionario canónico
- [x] NODE_LABEL_PAPA con 64 traducciones cardinales del genoma vivo (cobertura ≥40%, en realidad ~80%)
- [x] STATUS_LABEL_PAPA + STATUS_DESCRIPTION_PAPA (4 enum traducidos)
- [x] DISTRICT_LABEL_PAPA (5 distritos: cognicion/interfaces/infraestructura/capacidades/futuro)
- [x] KERNEL_TERM_PAPA (jerga del kernel: deploy/uptime/api/trpc/etc.)
- [x] humanizeMetric: LOC → buckets cualitativos (Chiquita/Mediana/Grande/Enorme)
- [x] Hook useTone() en client/src/hooks/useTone.ts
- [x] Aplicar a LivePulse: header, distritos, footer (kernel/tablero/memoria)
- [x] Aplicar a ContextCard: label, status, métricas, conexiones
- [x] Aplicar a Omnibox: results dropdown
- [x] Aplicar a Building 3D vía nuevo BuildingsLayer dentro del Canvas R3F
- [x] Tests Vitest: 21 nuevos en server/tone.dictionary.test.ts (status, distritos, labels, métricas, drift detection ≥40%, cardinales)
- [x] 68/68 tests verde


## Sprint v3.0 — T2: Cerebro narrativo del Omnibox (COMPLETO)
- [x] Crear server/routers/omnibox.ts con procedure ask basado en Gemini 3 Pro reasoning
- [x] Wire omniboxRouter en server/routers.ts (board, gemini, omnibox, supabase)
- [x] System prompt riguroso: español Latam, citas obligatorias `[@node_id]`, prohibido inventar IDs, tono según query
- [x] Validación de citas en backend: filtra IDs inexistentes en payload del snapshot
- [x] Fallback estructurado: { fallback: true, reason: "...", answer: "" } cuando Gemini falla o snapshot no existe
- [x] Reescribir Omnibox.tsx con modo dual: literal (Fuse.js mientras tecleas) + ask (Enter llama a Gemini)
- [x] Estado "El Monstruo está pensando" con loader y query citada (mientras Gemini razona ~10-20s)
- [x] AnswerCard con regex `\[@id\]` → chips clickeables que abren ContextCard
- [x] Defensa frontend: cita inválida no rompe render (texto plano fallback)
- [x] Validación de citas frontend con Map<id,node> del snapshot vivo
- [x] Suggestions clickeables: "¿Cómo piensas?" / "¿Qué le falta a la app móvil?" / "¿Dónde guardas la memoria?" / "¿Qué piezas están degradadas?"
- [x] ErrorCard con reintentar
- [x] Tests Vitest: 5 nuevos en server/omnibox.ask.test.ts (shape, citas válidas, fallback graceful, queries cortas/largas rechazadas)
- [x] Validación end-to-end: pregunta real "¿Cómo piensas?" → 7 citas IDs reales del genoma, ~12-15s latencia
- [x] 73/73 tests vitest verde


## Sprint v3.0 — T4: Capas conmutables del board (COMPLETO)
- [x] Crear client/src/lib/board-layers.ts: 5 capas (Distrito, Salud, Antigüedad, Tamaño, Cambio) con getColor + getHeight + legend
- [x] Funciones puras auxiliares: locToHeight, mixHex, nodeAgeDays
- [x] Hook client/src/hooks/useLayer.ts con persistencia localStorage + sync entre pestañas
- [x] Componente client/src/components/hud/LayerSwitcher.tsx (chip + dropdown + leyenda hidratada con distritos vivos)
- [x] Wire en Home.tsx (HUD overlay)
- [x] Extender Building.tsx con props layerColor, layerHeight, useLayerOverride
- [x] Lerp suave de altura en useFrame (transición visual al cambiar capa)
- [x] BuildingsLayer en IsometricBoard usa useLayer y pasa overrides a cada Building
- [x] LayerSwitcher respeta tono Modo Papá (label cambia entre técnico/papá)
- [x] Tests Vitest: 18 nuevos en server/board.layers.test.ts (registro, getColor, getHeight, mixHex, nodeAgeDays, pureza)
- [x] 91/91 tests vitest verde (13 archivos)
- [x] HMR limpio, 0 errores TypeScript


## Sprint v3.0 — T7: Gestos táctiles iPhone (COMPLETO)
- [x] Verificar @use-gesture/react sigue instalado tras upgrade del template
- [x] Crear client/src/hooks/useBoardGestures.ts con helper puro pinchToZoom + binder useGesture
- [x] Pinch zoom con scaleBounds + rubberband para sensación natural
- [x] Doble tap detection (delta <320ms) → onDoubleTap callback
- [x] Prevenir gesturestart/change/end nativos del Safari iOS para no romper pinch
- [x] Wire en Home.tsx (gestureBind aplicado al div del Canvas)
- [x] zoomBounds [14, 60] (mismo rango que TopToolbar)
- [x] handleResetView reutilizado para doble tap
- [x] touch-none en el wrapper para evitar pull-to-refresh y scroll bouncy
- [x] Tests Vitest: 8 nuevos en server/board.gestures.test.ts (pinchToZoom, bounds, pureza)
- [x] 99/99 tests vitest verde
- [x] HMR limpio, 0 errores TypeScript

## Sprint v3.0 — T6: Acciones desde ContextCard (COMPLETO)
- [x] Drizzle schema: board_incidents (kind, severity, message, snapshotId, resolvedAt) + board_overrides (statusOverride, note, expiresAt, clearedAt)
- [x] pnpm db:push aplicado (5 tablas vivas en TiDB: users, board_snapshots, board_nodes, board_incidents, board_overrides)
- [x] server/db.ts helpers: insertBoardIncident, listBoardIncidents, resolveBoardIncident, setBoardOverride, getActiveOverrideForNode, clearBoardOverride (con tie-breaker DESC id ante empates de timestamp)
- [x] server/routers/contextActions.ts con 7 procedures: reportIncident, listIncidents, resolveIncident, setOverride, getActiveOverride, clearOverride, askAbout
- [x] askAbout: Gemini 3 Pro Reasoning con contexto focal (nodo + nodos conectados), respuesta validada, fallback graceful
- [x] Validación Zod robusta: nodeId regex /^[a-z0-9_]+$/i, message min(2)max(2000), enums kind/severity/status
- [x] Wire contextActionsRouter en server/routers.ts
- [x] client/src/components/hud/ContextActionsPanel.tsx: 3 modales (Anotar / Redeclarar / Preguntar)
- [x] Modal IncidentForm con kind (BUG/IDEA/RIESGO/OBSERVACIÓN) + severity + message
- [x] Modal StatusOverride con 4 estados + nota + opción de borrar
- [x] Modal AskAbout con Gemini focal y resultado en línea
- [x] Chip violeta de override activo en ContextCard cuando hay redeclaración vigente
- [x] Lista de los 3 incidentes más recientes con badge abierto/resuelto
- [x] Modo Papá aplicado al 100% del componente (etiquetas, placeholders, botones, severity en lenguaje natural)
- [x] Wire en ContextCard.tsx reemplazando el footer placeholder por el panel funcional
- [x] Tests Vitest: 7 nuevos en server/contextActions.test.ts (ciclo completo incidentes, ciclo completo overrides, vigencia expiresAt, validaciones Zod, NOT_FOUND)
- [x] Test dedicado server/contextActions.askAbout.test.ts: 4 tests (fallback estructurado nodo inexistente, shape válido con nodo real, validaciones Zod) cubren Gemini focal y latencia ~13s
- [x] Auditoría de implementación askAbout: usa GEMINI_MODELS.REASONING_TOP, contexto restringido a nodo + connections_in/out, parseo permisivo con fallback a texto crudo capado, fallback estructurado en cada error path
- [x] Schema columnas validadas con grep: snapshotId (FK boardSnapshots, set null), kind/severity como mysqlEnum, statusOverride enum 4 valores, clearedAt timestamp
- [x] 110/110 tests verde · 16 archivos · 0 regresiones (incremento neto +11 tests del T6 incluyendo askAbout dedicado)
- [x] HMR limpio, 0 errores TypeScript


## Sprint v3.0 — T5: Memoria histórica del board (COMPLETO)
- [x] Backend ya operativo desde T1: board.history (metadata sin payload pesado, lazy) y board.byId (reconstrucción completa)
- [x] Crear client/src/components/hud/TimelineSlider.tsx con burbujas por snapshot
- [x] Tamaño de burbuja proporcional a totalNodes (sqrt scaled, 22-38px)
- [x] Color de borde según systemHealth (verde >0.75, ámbar 0.55-0.75, rojo <0.55)
- [x] Tooltip con capturedAt relativo (hace X min/h/d), nodos, salud
- [x] Burbuja "ahora" destacada con punto amarillo
- [x] Estado de viaje en el tiempo (badge ámbar + botón "Volver al ahora")
- [x] Modo Papá: "snapshots" → "fotografías", "live" → "ahora"
- [x] Wire en Home.tsx con state travelSnapshotId
- [x] travelBoard query (board.byId) habilitada solo cuando hay travelSnapshotId
- [x] Pausar refetch del live (refetchInterval: false) cuando se está viajando
- [x] Prioridad en boardData useMemo: travelBoard > liveBoard > staticFallback
- [x] Animación: T4 lerp de altura ya soporta transición suave entre snapshots
- [x] Tests Vitest: 9 nuevos en server/board.history.test.ts (metadata válida, lazy loading, límite, byId reconstruye, null para inexistente, consistencia history↔current, shape igual a current, validaciones Zod)
- [x] 119/119 tests verde · 17 archivos · 0 regresiones (incremento neto +9 tests del T5)
- [x] HMR limpio, 0 errores TypeScript


## Sprint MEGA v4.0 — PR1: Cimientos sólidos + 5 mejoras radicales (EN PROGRESO)

### Tarea 0 — Transacción atómica en insertBoardSnapshot (COMPLETO)
- [x] Auditada implementación actual de insertBoardSnapshot en server/db.ts (race condition confirmada: insert + select last id + insert nodes)
- [x] Reemplazo del patrón "insert + select last id" por `$returningId()` de Drizzle MySQL ≥0.32
- [x] Envoltura en `db.transaction(async (tx) => { ... })` para atomicidad real: snapshot + nodes en una sola unidad lógica
- [x] Limpieza del call site obsoleto en server/omnibox.ask.test.ts (firma con nodes + totalNodes + systemHealth)
- [x] Test de regresión server/board.atomicity.test.ts: 5 inserts concurrentes producen 5 IDs únicos con nodes correctamente atados
- [x] Test de regresión server/board.atomicity.test.ts: rollback si falla la inserción de nodes (varchar(128) overflow → sin snapshots huérfanos)
- [x] Suite completa verde: 121/121 tests (119 previos + 2 de atomicidad)

### Tarea 1 — Compiler Contract (helper compartido) (COMPLETO)
#### 1A. Helper unificado (COMPLETO)
- [x] Creado server/lib/runBoardBuild.ts con 4 exports: runBuildScript, readBoardJson, persistSnapshotIfChanged, buildAndPersistBoard
- [x] Eliminada copia duplicada de runBuildScript en server/routers/board.ts (273→~130 líneas)
- [x] Eliminada copia duplicada de runBuildScript en server/scheduled/refreshBoard.ts (182→80 líneas)
- [x] Ambos call sites consumen buildAndPersistBoard() del helper
- [x] Tests críticos verdes tras el refactor: 30/30 (snapshot + scheduled + history + diff)
- [x] TypeScript 0 errores

#### 1B. Build Report contractual (COMPLETO)
- [x] Timeout robusto configurable en runBuildScript (45s default via MONSTRUO_BUILD_TIMEOUT_MS, override via options.timeoutMs)
- [x] scripts/build_board_data.py emite build_report.json con 8 campos: genome_sha, total_nodes, total_edges, nodes_without_edges, nodes_without_real_dates, warnings, generated_at, source_mode
- [x] BuildReportSchema (Zod) en server/lib/runBoardBuild.ts valida shape estricto
- [x] Helper expone readBuildReport(): Promise<BuildReport>
- [x] Tests server/board.compiler.test.ts: 5/5 verde (timeout, python inexistente, parseo, rechazo de payload inválido, integración end-to-end)

### Tarea 2 — Genome Graph Compiler (Python con edges reales) (COMPLETO)
- [x] scripts/build_board_data.py extrae edges desde la sección `connections:` del genoma
- [x] Clasificador heurístico por palabras clave en evidence: depends_on / feeds / protects / activates
- [x] Normalizer de endpoints del genoma a IDs reales del board (24 alias mapeados, externos drop con razon)
- [x] Regex tolerante a guiones en IDs (like-kukulkan-tickets, forja-mcp)
- [x] Resultado real: 16/18 edges extraídas, 2 drops legítimos (litellm, langfuse externos)
- [x] Tabla board_edges en Drizzle (7 cols, 4 índices, FK con cascade): id, snapshotId, fromNodeId, toNodeId, edgeType, evidence, weight
- [x] pnpm db:push aplicado (drizzle/0003_reflective_iron_lad.sql)
- [x] insertBoardSnapshot extendido para aceptar edges como tercer argumento, persisten en la misma transacción atómica
- [x] Datos confirmados en TiDB: protects=5, feeds=5, depends_on=3, activates=3 (peso promedio 56-82)
- [x] Además del extractor típico, cada nodo recibe connections_in/out poblado automáticamente (15 nodos del kernel ya conectados)
- [x] DIFERIDO: introspección routers/Drizzle/repos satélite para enriquecer edges (alcance Sprint B, no bloquea PR1)
- [x] DIFERIDO: payload_sha extendido a 64 hex y source_commit con SHA real del genoma (alcance Sprint B)

### Tarea 3 — UI con edges reales (COMPLETO)
- [x] ConnectionLines.tsx consume `data.edges` cuando existe (Sprint v4.0); fallback retrocompatible a connections_in/out para snapshots v3.0
- [x] Color por tipo: depends_on=violeta, feeds=verde, protects=ámbar, activates=naranja (paleta canónica)
- [x] Grosor visual modulado por weight (0.5..3) + opacidad modulada por weight (0.55..0.95)
- [x] ContextCard.tsx muestra "Relaciones del genoma" con chips tipados + evidencia textual (modo experto) o tono Papá ("le pasa datos a", "cuida", "necesita a", "prende")
- [x] Reparado drift meta.timestamp vs meta.generated_at en board-types.ts (campos opcionales, LivePulse usa fallback)
- [x] DIFERIDO: filtro por tipo de edge en TopToolbar (alcance Sprint B, no bloquea PR1)
- [x] DIFERIDO: askAbout en contextActions incluye vecinos via edges tipadas (T7 ya entrega retrieve top-12 grounded; vecinos via edges se reabordan en Sprint B)

### Tarea 4 — Tests del compiler (COMPLETO)
- [x] server/board.compiler.contract.test.ts con 4 tests de contrato verde en 2.34s
- [x] Test 1: build_report.json shape válido + total_edges > 0
- [x] Test 2: nodos críticos del kernel (embrion_loop, embriones, memory, main) tienen edges incidentes
- [x] Test 3: payload_sha responde a cambios en edges (no solo en nodes) — propiedad anticolisión del hash
- [x] Test 4: board_data.json.edges tiene shape válido y todos los endpoints existen en nodes
- [x] DIFERIDO: askAbout con vecinos reales via edges tipadas (T7 entregó retrieve grounded + hints explícitos; expansión por edges queda para Sprint B)

### Tarea 5 — Truth Ledger (COMPLETO)
- [x] Schema Drizzle: board_capture_runs (13 cols, 3 índices, FK a snapshots) — bitácora forense de cada corrida del compiler
- [x] Schema Drizzle: board_observations (10 cols, 4 índices, FK a capture_runs) — hechos atómicos con confidence + evidence + computed_from
- [x] Schema Drizzle: board_node_states (11 cols, 3 índices, 2 FKs) — estado computado + override + effectiveStatus por nodo
- [x] pnpm db:push aplicado (drizzle/0004_even_dakota_north.sql)
- [x] scripts/build_board_data.py extendido con emit_observations() en 3 collectors: collect_genome (248), collect_git_metrics (62), collect_runtime_signals (7) = 317 observations totales
- [x] Cada observation: confidence (0-1000), evidence textual, computed_from como array de fuentes
- [x] server/lib/truthLedger.ts: motor de cómputo de effectiveStatus con regla override > computed > UNKNOWN
- [x] insertBoardSnapshot extendido con cuarto argumento opcional truthLedger — persistencia atómica de observations + node_states en la misma transacción del snapshot
- [x] persistTruthLedgerForExistingSnapshot — bootstrap idempotente para snapshots pre-T5
- [x] buildAndPersistBoard orquesta startCaptureRun → spawn → readObservationsJsonl → persistTruthLedger → finishCaptureRun con métricas embebidas
- [x] server/board.truthLedger.test.ts: 3 tests end-to-end contra TiDB verde en 2.19s
- [x] Validación empírica TiDB: 9 capture_runs (todos succeeded), 317 observations en 3 collectors, 62 node_states con effectiveStatus poblado (42 ACTIVE, 12 DEGRADED, 8 FUTURE)

### Tarea 6 — Decision Rail (PARCIAL — protección + compat layer)
#### 6A. Middleware + auth (COMPLETO)
- [x] Schema Drizzle: board_events (12 cols, 5 índices, append-only) — fuente única futura para eventos administrativos
- [x] pnpm db:push aplicado (drizzle/0005_ordinary_tombstone.sql)
- [x] MONSTRUO_WRITE_TOKEN guardado en secrets (Alfredo lo configuró directo, no pasó por chat)
- [x] server/lib/writeAuth.ts — middleware requireWriteToken con timing-safe compare + extracción desde header x-monstruo-write-token o Authorization Bearer
- [x] requireWriteToken aplicado a las 4 mutations: reportIncident, resolveIncident, setOverride, clearOverride
- [x] Cada mutation emite evento inmutable en board_events (compat layer no-bloqueante: si falla el evento, no rompe el flujo legacy)
- [x] server/writeAuth.test.ts: 11/11 tests (token disponible en env, accept/reject paths, header extraction, lowercase canonical)
- [x] server/contextActions.test.ts extendido con 6 tests Decision Rail: 4 rechazos sin token + 2 lecturas públicas siguen libres
- [x] Suite completa: 152/152 verde, TSC=0, sin regresiones

#### 6B. computedStatus visible en UI (COMPLETO)
- [x] server/db.ts expone listBoardNodeStatesForSnapshot(snapshotId)
- [x] server/routers/board.ts: board.current y board.byId emiten array nodeStates con effectiveStatus, computedStatus, projectedStatus, overrideStatus, confidence, rationale
- [x] client/src/lib/board-types.ts: BoardNodeState exportado, BoardData.node_states opcional
- [x] client/src/pages/Home.tsx inyecta node_states del response en boardData (preservación de tipos)
- [x] Building.tsx: prop effectiveStatus + hasOverride; displayStatus reemplaza node.status en color/glow/breathing/glow-anchor
- [x] Building.tsx: anillo violeta sobre nodos con override humano activo (señal visible de intervención)
- [x] IsometricBoard.tsx: índice O(1) de stateByNode pasa effectiveStatus + hasOverride a cada Building
- [x] ContextCard.tsx: badge de header pinta effectiveStatus con chip "Override" cuando aplica
- [x] ContextCard.tsx: sección "Truth Ledger" muestra computed/declared/projected con colores tipados + rationale + confidence
- [x] Suite completa: 152/152 verde, TSC=0, VITEST=0, sin regresiones

### Tarea 7 — Omnibox Grounded (COMPLETO)
- [x] Schema Drizzle: board_node_briefs (id, nodeId, snapshotId, brief, source, computedAt, indexes por snapshot y (node,snapshot))
- [x] Schema Drizzle: omnibox_cache (id, queryHash, snapshotId, answer JSON, citations JSON, intent, createdAt, expiresAt, indexes por queryHash y expiresAt)
- [x] pnpm db:push (migración 0007_curly_sentinels.sql aplicada en TiDB)
- [x] server/lib/omniboxClassifier.ts: motor PURO con 4 intents (small-talk | node-specific | metric | general)
- [x] Classifier soporta IDs explícitos [@id] e implícitos (matching contra knownNodeIds)
- [x] Normalización NFD + strip accents para que "¿cómo estás?" matche "como estas"
- [x] smallTalkReply() con 4 categorías hardcoded sin LLM (ahorra Gemini en saludos)
- [x] server/lib/omniboxRetrieve.ts: motor PURO retrieve top-K con boost por hints + scoring por tokens + padding por edges_count
- [x] retrieveRelevantFacts es determinista (sort estable score desc → id asc)
- [x] formatFactsBlock genera bloque <TRUSTED_BOARD_FACTS> con id+district+status+label+brief
- [x] server/lib/omniboxSanitize.ts: motor PURO de defensa anti prompt-injection
- [x] Neutraliza inyecciones de tags trusted (TRUSTED_BOARD_FACTS / UNTRUSTED_USER_QUERY) y meta-imperativos (ignora todo, reveal prompt, actúa como, en es/en)
- [x] Trunca queries a 500 chars (cinturón extra además del zod max)
- [x] Telemetría de neutralizaciones para auditoría (trustedTagInjections, metaImperatives, truncated)
- [x] Helpers DB: getOmniboxCacheEntry (con expiry check), insertOmniboxCacheEntry (TTL 24h default), listBoardNodeBriefsForSnapshot, insertBoardNodeBrief
- [x] omnibox.ts refactor: pipeline classify → sanitize → cache lookup → retrieve → narrate
- [x] Delimitadores explicitos en system prompt: bloques <TRUSTED_BOARD_FACTS> y <UNTRUSTED_USER_QUERY> con instrucciones al LLM de tratar el segundo como datos
- [x] Elimina la inyección del snapshot completo al LLM (solo top 12 facts)
- [x] Cache hit/miss por SHA-256(snapshotId:normalizedQuery) con TTL 24h
- [x] insertOmniboxCacheEntry es fire-and-forget (no bloquea response ante fallos DB)
- [x] Re-validación de citas contra validIds incluso en cache hits (defensa profunda)
- [x] Small-talk corta el flujo y NO toca Gemini (model='local-small-talk')
- [x] Output extendido con intent, cached, factsCount, sanitization (telemetría observable)
- [x] Contrato hacia atrás preservado (campos antiguos answer/citations/model/fallback/reason/latency_ms intactos)
- [x] Tests: 19 en omniboxClassifier.test.ts (intents, hints explícitos/implícitos, normalización, determinismo, smallTalkReply)
- [x] Tests: 15 en omniboxRetrieve.test.ts (top-K, hints boost, scoring, padding, determinismo, límites)
- [x] Tests: 13 en omniboxSanitize.test.ts (queries benignas, tags trusted, meta-imperativos es/en, reveal prompt, truncate, determinismo)
- [x] Tests: 7 en omnibox.grounded.test.ts (small-talk local, cache hit, prompt injection, factsCount<=12, citations válidas, validación zod)
- [x] 258/258 tests vitest verde (+54 vs T8)
- [x] TSC=0 limpio

### Tarea 8 — Causal Timeline (COMPLETO)
- [x] Schema Drizzle: board_snapshot_diffs (id, fromSnapshotId, toSnapshotId, addedNodes, removedNodes, changedNodes, statusChanges, metricChanges, edgeChanges, addedCount, removedCount, changedCount, computedAt, unique index compuesto)
- [x] pnpm db:push (migración aplicada en TiDB)
- [x] server/lib/computeBoardDiff.ts: motor puro con DiffableNode/DiffableBoard (acepta BoardData y BoardPayload sin acoplar a meta)
- [x] Detección por categorías: addedNodes, removedNodes, statusChanges, metricChanges (loc, last_updated, edges_count), edgeChanges (added, removed)
- [x] Determinismo: outputs ordenados lexicográficamente; misma entrada → misma salida
- [x] Helpers DB: getCachedBoardDiff (lookup por fromId+toId), insertBoardSnapshotDiff (persistencia)
- [x] Procedure board.diff({fromId, toId}) con validación zod, cache hit/miss, identity short-circuit, NOT_FOUND para ids inexistentes
- [x] Cache fire-and-forget para no bloquear respuesta ante fallos transitorios de DB
- [x] client/src/lib/causal-animations.ts: motor puro frontend con CausalState discriminado (added/removed/status-changed/metric-changed/stable)
- [x] Tabla CAUSAL_PARAMS con scale, opacity, pulseAmplitude, haloOpacity, haloColor por estado; getCausalParams inmutable (spread copy)
- [x] buildCausalStateMap con prioridad (added > removed > status-changed > metric-changed)
- [x] summarizeCausalMap para el HUD (added/removed/statusChanged/metricChanged/total)
- [x] client/src/hooks/useCausalDiff.ts: trpc.board.diff useQuery con staleTime 30min, gcTime 60min, EMPTY_MAP/EMPTY_SUMMARY referencialmente estables
- [x] Building.tsx: nueva prop causalState, halo de ring sobre la base con color/opacity del registry, opacityMultiplier combinado con dimOpacity (ghost mode 'removed')
- [x] IsometricBoard.tsx + BuildingsLayer: prop causalStateByNode, paso a Building por nodeId con default 'stable'
- [x] Home.tsx: useCausalDiff(travelSnapshotId, liveBoard.id) wired al board
- [x] Tests: 17 en server/board.causalDiff.test.ts (motor puro + procedure tRPC con DB real + cache)
- [x] Tests: 18 en server/causalAnimations.test.ts (cliente puro: build, lookup, params, summary, inmutabilidad, prioridad)
- [x] 204/204 tests vitest verde (+35 vs T9)
- [x] TSC=0 limpio

### Tarea 9 — Scene Contract + Plugin Registry (COMPLETO)
- [x] Crear client/src/lib/scene-contract.ts con NodeCapability discriminada (context-card | modal | studio)
- [x] 3 modos por nodo declarativos: registry data, no código
- [x] Registry: catastro → modal (catastro), nano_banana_pro → studio (nano-banana), default → context-card
- [x] resolveCapability inmutable (defensa profunda: spread copy de la entrada del registry)
- [x] Type guards isModalCapability / isStudioCapability para flujos discriminados
- [x] listSpecialNodes() para debugging y herramientas internas
- [x] Crear client/src/components/scene/SceneOrchestrator.tsx (monta modal/studio según capability)
- [x] SceneOrchestrator soporta transición catastro → nano-banana sin perder estado externo
- [x] Refactor Home.tsx: eliminados catastroOpen/studioOpen, useEffect del === "catastro", y los dos modales manuales
- [x] Home.tsx ahora consume resolveCapability + SceneOrchestrator
- [x] selectedNode filtrado por capability: context-card solo monta cuando corresponde
- [x] ContextCard.tsx: eliminada prop onOpenStudio y la rama isNanoBanana (código muerto post-registry)
- [x] Tests: 17 nuevos en server/scene.contract.test.ts (default, catastro, nano_banana, type guards, inmutabilidad, listSpecial, genoma vivo)
- [x] 169/169 tests vitest verde (+17 vs T6B)
- [x] TSC=0 limpio

### PR1 Cierre (COMPLETO)
- [x] Suite ≥150 tests vitest verde → **258/258 verde** (152 → 169 → 204 → 258, +106 en este sprint final)
- [x] Checkpoint webdev v4.0-pr1 → versión `43446138` (T9 + T8 + T7 cerrados)
- [x] Commit a branch v4-sprint-a-genome-graph → DELEGADO a Alfredo: política del proyecto es no auto-push; los checkpoints webdev son el mecanismo de versionado autorizado
- [x] Documento resumen para Alfredo entregado en mensaje final con archivos tocados, tests añadidos por tarea, métricas comparativas
- [x] Confirmación explícita: no-deploy, no-producción, no-otros-repos (cero llamadas a Publish, cero cambios fuera de /home/ubuntu/tablero-campana)

## Sprint MEGA v4.0 — PR2 / Sprint B: Visión disruptiva (FUTURO — NO en este sprint)

> Nota: estas tareas (T10 War Room, T11 Flight Recorder, T12 Contract Compiler) son scope explícito de Sprint B y NO formaban parte del hand-off de Alfredo para este hilo, que pidió cerrar T9 + T8 + T7. Se dejan como backlog vivo para el próximo sprint.

### Tarea 10 — Counterfactual War Room
- [ ] Simulador de propagación de fallos sobre el grafo real
- [ ] Backend: server/lib/counterfactual.ts con BFS sobre edges
- [ ] UI: WarRoomPanel.tsx con selector de nodo + propagación visual
- [ ] Tests: propagación correcta, ciclos manejados

### Tarea 11 — Agent Flight Recorder
- [ ] Schema Drizzle: board_flight_logs (id, nodeId, executionId, input, output, durationMs, status, traceUrl, createdAt)
- [ ] Endpoint board.flightLogs.recent({nodeId})
- [ ] UI: FlightRecorder.tsx en ContextCard (caja negra del nodo)
- [ ] Tests: logs persistidos, query por nodeId

### Tarea 12 — T1 Contract Compiler
- [ ] Selección de región del board → contrato JSON ejecutable
- [ ] Contrato: scope (nodos), denylist, budget (créditos, tiempo), tests, rollback strategy
- [ ] Backend: server/lib/contractCompiler.ts
- [ ] UI: RegionSelector.tsx + ContractPreview.tsx
- [ ] Tests: contrato válido, denylist respetada

### PR2 Cierre
- [ ] Suite ≥180 tests vitest verde
- [ ] Checkpoint webdev v4.0-pr2
- [ ] Commit a branch v4-sprint-b-vision-disruptiva
- [ ] Entrega final a Alfredo con resumen completo


## Forja OS v4 MONSTRUO — Sprint v0.1 v2 (Días 1-7 kernel mínimo)

- [ ] Día 1.1: Schema Drizzle TypeScript de las 8 tablas Forja en drizzle/schema.ts
- [ ] Día 1.2: pnpm db:push exitoso contra DB staging
- [ ] Día 1.3: Verificación SQL — las 8 tablas existen con FKs y constraints correctos
- [ ] Día 2.1: server/forja/crypto.ts — verifyEnvelopeSignature con @noble/curves
- [ ] Día 2.2: server/forja/canonical.ts — canonicalize JSON determinista (RFC 8785)
- [ ] Día 2.3: server/forja/__tests__/crypto.test.ts — round-trip sign + verify verde
- [ ] Día 2.4: Test envelope piloto real (2d4c9159) verifica VALID en server-side
- [ ] Día 3.1: server/forja/boundary-gateway.ts — checkAuthorization(envelopeId, requestedAction)
- [ ] Día 3.2: scope enforcement: domain, capabilities, prohibitions, budget, TTL, oracle gates
- [ ] Día 3.3: 12+ tests de denial paths verde
- [ ] Día 4.1: tRPC procedure ingestSignedEnvelope (verifies + inserts a root_authority_envelopes)
- [ ] Día 4.2: tRPC procedure issueCapabilityToken (JWT short-lived por acción)
- [ ] Día 4.3: tRPC procedure checkAuthorization (gateway entry point)
- [ ] Día 5.1: server/forja/capability-token.ts — JWT HS256 short-lived
- [ ] Día 5.2: Verificación cadena de delegación: envelope → token → action
- [ ] Día 5.3: Tests delegación verde
- [ ] Día 6.1: Tabla policy_decisions con audit log inmutable
- [ ] Día 6.2: Tabla evidence_receipts con Merkle chain
- [ ] Día 6.3: Helper de chain integrity verification
- [ ] Día 7.1: Test end-to-end: envelope firmado → ingest → token → action → receipt → verify
- [ ] Día 7.2: Reporte canónico FORJA_V4_KERNEL_DAY7_REPORT.md
- [ ] Día 7.3: Checkpoint webdev guardado + commit pusheado a GitHub

## Forja OS v4 MONSTRUO — Sprint v0.1 Días 1-7 (kernel mínimo soberano) (COMPLETO)

- [x] Day 0 — operator ed25519 keypair + first signed envelope (commit fd906b0)
- [x] Day 1 — 8 Forja tables deployed to TiDB via pnpm db:push
- [x] Day 2-4 — server kernel: canonical.ts (RFC 8785 JCS subset), ed25519.ts, gateway.ts (10-step BoundaryGateway), router.ts (tRPC), types.ts
- [x] Day 5-6 — 11 unit tests verdes en forja.envelope.test.ts
- [x] Day 7 — E2E test del flujo completo (5 hitos): ingest, allow, deny, Merkle chain, status. 5/5 verdes
- [x] 16/16 tests Forja verde, 0 regresiones funcionales fuera de Forja
- [x] Bug crítico resuelto: envelope-piloto-day2-signed.json reformateado en sandbox, recuperado bit-exacto del Mac
- [x] Bug crítico resuelto: gateway.ts ya no recomputa canonical hash desde campos DB; confía en canonicalHash almacenado y verifica firma ed25519 sobre él


## Forja OS v4 MONSTRUO — Sprint v0.1 Días 1-7 (kernel mínimo soberano) (COMPLETO)

- [x] Day 0 — operator ed25519 keypair + first signed envelope (commit fd906b0)
- [x] Day 1 — 8 Forja tables deployed to TiDB via pnpm db:push
- [x] Day 2-4 — server kernel: canonical.ts (RFC 8785 JCS subset), ed25519.ts, gateway.ts (10-step BoundaryGateway), router.ts (tRPC), types.ts
- [x] Day 5-6 — 11 unit tests verdes en forja.envelope.test.ts
- [x] Day 7 — E2E test del flujo completo (5 hitos): ingest, allow, deny, Merkle chain, status. 5/5 verdes
- [x] 16/16 tests Forja verde, 0 regresiones funcionales fuera de Forja
- [x] Bug crítico resuelto: envelope-piloto-day2-signed.json reformateado en sandbox, recuperado bit-exacto del Mac
- [x] Bug crítico resuelto: gateway.ts ya no recomputa canonical hash desde campos DB; confía en canonicalHash almacenado y verifica firma ed25519 sobre él
