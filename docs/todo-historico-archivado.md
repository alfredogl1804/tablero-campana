# Backlog histórico archivado — pre Sprint Observatorio Vivo v1.1

Estos sprints fueron iniciados antes del Sprint Observatorio Vivo v1.1 (firmado 26-may-2026 por Alfredo)
y nunca fueron cerrados ni descartados explícitamente. Se archivan aquí para preservar trazabilidad sin
contaminar el contador de pendientes vivos del proyecto.

Si se decide retomar alguno, mover de vuelta a `todo.md` y marcar como sprint vigente.

---

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
