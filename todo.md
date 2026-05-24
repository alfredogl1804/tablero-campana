

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
- [ ] Crear cron POST-DEPLOY: manus-heartbeat create --name refresh-tablero --cron "0 */5 * * * *" --path /api/scheduled/refreshBoard


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
