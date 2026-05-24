

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
- [ ] Checkpoint v2.3
- [ ] Validación final en iPhone (después de publicar)
