

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
