

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
- [ ] Checkpoint v2.2
