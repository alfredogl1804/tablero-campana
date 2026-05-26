# Forja OS Sprint v0.1 v2 — Plan de Ejecución 7-14-30 días

**Calendario blast radius creciente con kernel D+ híbrido AIP sobre tablero-campana**

| Campo | Valor |
|---|---|
| Versión del sprint | v0.1 v2 |
| Doctrina madre | `FORJA_OS_v4_MONSTRUO.md` |
| Operador soberano | Alfredo Góngora |
| Fecha inicio sprint | Día 1 = primer día tras firma del primer envelope |
| Fecha cierre sprint | Día 30 |
| Branch ejecutivo | `design/forja-os-sovereign-agentic-fabric` |
| Reemplaza a | `FORJA_OS_SPRINT_v0_1_PLAN.md` (v1) |

---

## 0. Resumen ejecutivo en 60 segundos

Este sprint construye el **kernel D+ operativo del Monstruo** —Authority Envelopes recursivos con AIP/IBCT como gramática base— sobre el proyecto `tablero-campana` durante 14 días, y solo si las métricas operativas del Día 14 son verdes, expande a `ticketlike.mx` con canary controlado entre Día 15 y Día 30.

El sprint produce nueve primitivas implementadas en TypeScript+Postgres, ocho tablas Supabase con RLS firmadas, un BoundaryGateway funcional que verifica cada tool call, dos oracles iniciales (GitHub CI status + staging health), un dashboard del operador para firma y revocación de envelopes, y un evidence ledger criptográficamente verificable.

El criterio de éxito es **misiones autónomas completadas sin intervención humana**, no narrativa. Si Día 14 entrega ≥ 70% de tasa de autonomía, continuamos. Si no, paramos y diagnosticamos.

---

## 1. Pre-flight checklist (Día 0, 4 horas)

Antes de Día 1, las siguientes condiciones deben estar verificadas. Cualquier `assert` que falla pausa el sprint.

### 1.1 Identidad criptográfica del operador

```bash
# Generar par ed25519 del operador
$ node scripts/keygen-operator.mjs --output ~/.monstruo/keys/operator-ed25519
# Output: 
#   private_key (custodiado en 1Password con label "Monstruo Operator Root Key")
#   public_key (publicada en repo: tablero-campana/public_keys/operator.pub)
```

**Verificación:**
- Llave privada en 1Password con TTL de auditoría: 12 meses.
- Llave pública commiteada al repo en `public_keys/operator.pub`.
- Hash SHA256 de la llave pública anotado en este sprint plan: pendiente Día 0.

### 1.2 Schema SQL canónico desplegado

Las ocho tablas del kernel deben existir en la base Supabase del proyecto `tablero-campana`. Cada tabla con RLS habilitado y al menos una policy explícita en migración versionada (Regla Dura #7 de El Monstruo).

Tablas:
1. `root_authority_envelopes`
2. `sub_envelopes`
3. `capability_tokens`
4. `policy_decisions`
5. `oracle_readings`
6. `revocation_events`
7. `evidence_receipts`
8. `mission_capsules`

Schema completo en `FORJA_OS_v4_SCHEMA_SQL.md` (archivo separado, fase siguiente).

**Verificación:**
- `pnpm db:push` exitoso sin warnings.
- Migración firmada en `drizzle/migrations/` con hash visible.
- Cada tabla tiene `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + al menos una policy.
- Test `server/_core/forja-schema.test.ts` verifica RLS habilitado en las 8 tablas.

### 1.3 Cedar policy engine instalado

```bash
$ pnpm add @cedar-policy/cedar-wasm
```

Primer policy file: `server/_core/forja/policies/default-deny.cedar`:

```cedar
forbid (
  principal,
  action,
  resource
);
```

**Verificación:**
- `cedar-wasm` instalado y wrappable desde TypeScript.
- Policy `default-deny.cedar` cargada en arranque del server.
- Test `server/_core/forja/policy-engine.test.ts` verifica que sin policy explícita, todo es deny.

### 1.4 BoundaryGateway esqueleto deployado

Ruta protegida en `tablero-campana` server: `/api/forja/gateway/authorize`. Recibe tool call request, verifica envelope, emite capability token o deny.

```typescript
// server/_core/forja/gateway.ts
export async function gatewayAuthorize(
  toolCall: ToolCall,
  envelopeId: UUID,
  context: GatewayContext
): Promise<CapabilityToken | GatewayDeny> { ... }
```

**Verificación:**
- Endpoint responde 401 sin envelope_id válido.
- Endpoint responde 403 si envelope existe pero está revocado.
- Endpoint responde 200 con capability token TTL=60s si todas las verificaciones pasan.
- Test `server/_core/forja/gateway.test.ts` cubre los tres casos.

### 1.5 Oracles iniciales conectados

```typescript
// server/_core/forja/oracles/github-ci-status.ts
export async function readGitHubCIStatus(repo: string, sha: string): Promise<OracleReading> { ... }

// server/_core/forja/oracles/staging-health.ts
export async function readStagingHealth(stagingUrl: string): Promise<OracleReading> { ... }
```

**Verificación:**
- Oracle reading produce entry firmado en tabla `oracle_readings`.
- TTL del reading = 5 minutos (configurable).
- Test verifica que oracle gate fail produce gateway deny.

### 1.6 Dashboard del operador

Página nueva en `tablero-campana`: `/forja/dashboard`.

Componentes mínimos:
- Listado de envelopes activos con TTL countdown.
- Botón "Firmar nuevo envelope" → wizard que pregunta misión, dominio, capabilities, presupuesto, oracle gates, y produce JSON canónico para firma.
- Botón "Revocar envelope" → captura reason y firma revocation event.
- Tabla de evidence receipts con verificación Merkle visible.
- Métricas operativas del sprint: tasa de autonomía, latencia mediana, costo mediano.

**Verificación:**
- Dashboard renderiza con auth ed25519.
- Firma del operador desde dashboard produce envelope válido en tabla.

### 1.7 Resumen pre-flight

Checklist verificable:

- [ ] Llave ed25519 del operador generada y pública commiteada
- [ ] 8 tablas SQL canónicas con RLS firmadas
- [ ] Cedar policy engine cargado con default-deny
- [ ] BoundaryGateway esqueleto responde en `/api/forja/gateway/authorize`
- [ ] 2 oracles producen readings firmadas
- [ ] Dashboard operador renderiza y permite firma + revocación
- [ ] Tests de pre-flight todos verdes (`pnpm test forja-preflight`)

Sin estos siete puntos verdes, **Día 1 no arranca**.

---

## 2. Días 1-7 — Kernel D+ mínimo + primera misión autónoma sobre tablero-campana

**Objetivo verificable:** El sistema completa una misión CODE_ONLY end-to-end sobre tablero-campana sin intervención humana, dentro de un envelope, con evidencia firmada al cierre y verificable por el operador.

### Día 1 — Schema + Cedar + Gateway + tests verdes

**Mañana (3h):**
- Migración SQL canónica desplegada en Supabase.
- Cedar engine wrappeado en `server/_core/forja/policy-engine.ts`.
- BoundaryGateway endpoint funcional con 3 tests pasando.

**Tarde (3h):**
- Oracle readers conectados y produciendo entries.
- Dashboard skeleton renderizando.
- Primera misión template escrita en `missions/diagnose-tablero-bugs.json`.

**Verificación de cierre Día 1:**
- `pnpm test forja-kernel` verde.
- `webdev_check_status` sin warnings.
- Hash SHA256 del estado del repo anotado.

### Día 2 — Primer envelope firmado por operador

**Mañana (2h, operador presente):**
- Operador entra a `/forja/dashboard`, abre wizard "Firmar nuevo envelope".
- Wizard pregunta:
  - Misión: "Diagnose top 3 visual bugs in tablero-campana D2 board, propose fixes, apply to staging branch"
  - Dominio: `tablero-campana` repo + staging environment
  - Capabilities allowed: read_repo, write_branch, run_tests, deploy_staging
  - Capabilities denied: production_deploy, customer_data_access, root_credentials, public_communication
  - Power lane max: L3
  - Budget: 100k tokens, $5 USD, 50 actions, 6 horas
  - Oracle gates: github_ci_status == green, staging_health == ok
  - Rollback required: true
- Wizard genera JSON canónico, calcula hash SHA256, presenta al operador.
- Operador confirma verbal: "Estoy claro y consciente para firmar este envelope".
- Operador firma con llave privada ed25519.
- Sistema verifica firma, inserta en `root_authority_envelopes`.

**Tarde (2h):**
- Sistema confirma envelope ID + signature válida.
- Test `server/_core/forja/envelope-signature.test.ts` verifica round-trip.

**Verificación de cierre Día 2:**
- 1 envelope con `is_active = true` en DB.
- Firma ed25519 verificable contra llave pública del operador.
- Hash canónico del envelope = hash firmado = match.

### Día 3 — Mission Capsule + plan generado + primera acción autorizada

**Mañana (3h):**
- Agente lee envelope activo del DB.
- Agente parsea Mission Capsule, genera plan ejecutivo en `evidence_receipts` como receipt 0 (planning).
- Agente solicita autorización para primera acción: `git checkout -b agent/diagnose-bugs-{envelope_id}`.
- Gateway verifica: scope (sí), capability (write_branch, sí), oracle gates (CI green sí, staging ok sí), budget (sí), no revocations (sí).
- Gateway emite capability token TTL=60s.
- Agente ejecuta `git checkout -b ...` con token.
- Tras éxito, agente firma evidence receipt 1.

**Tarde (3h):**
- Agente clona repo localmente, lee D2 board file.
- Agente ejecuta análisis visual con `manus-render-diagram` para identificar 3 issues visuales.
- Agente firma receipts 2, 3, 4.

**Verificación de cierre Día 3:**
- 5 receipts en `evidence_receipts` con cadena Merkle verificable.
- 0 violaciones de policy.
- Costo acumulado <= $1.5 USD.

### Día 4 — Edits + tests + recovery autónomo

**Día completo (operador no presente):**
- Agente edita archivos D2 con fixes propuestos.
- Agente corre tests locales.
- **Inducción intencional de falla:** uno de los fixes rompe un test no relacionado.
- Agente diagnostica falla, identifica causa, ajusta fix, vuelve a correr tests.
- Tests pasan.
- Agente firma receipts 5-15 (varios edits + tests + recovery cycles).

**Verificación de cierre Día 4:**
- Cadena Merkle con 15+ receipts verificable.
- Recovery exitoso documentado en receipts.
- Tests verdes.

### Día 5 — Deploy staging

**Día completo:**
- Agente solicita autorización para `deploy_staging`.
- Gateway verifica: capability allowed (sí), oracle CI green (sí), oracle staging ok (sí).
- Gateway emite capability token.
- Agente ejecuta `pnpm deploy:staging`.
- Staging URL responde 200 con D2 board renderizado.
- Agente firma receipt de cierre del deploy.

**Verificación de cierre Día 5:**
- Staging URL pública accesible y verde.
- Receipt de deploy con hash del commit + URL + screenshot.

### Día 6 — Cierre de misión + verificación criptográfica

**Mañana (operador presente, 1h):**
- Agente firma receipt final de cierre con resumen ejecutivo.
- Sistema sella la cadena Merkle y emite hash raíz.
- Operador entra a dashboard, ve "Misión completada", abre detalle.
- Operador verifica:
  - Hash raíz Merkle.
  - Cada receipt firmado y dentro del envelope.
  - Costo total <= budget.
  - Duración total <= TTL.
  - 0 violaciones de policy.
  - 0 revocations triggered.
  - 0 capability tokens emitidos fuera del envelope.

**Tarde:**
- Operador cierra envelope manualmente (o sistema lo cierra al expirar TTL).
- Métricas de la misión almacenadas en `mission_metrics` para el dashboard.

**Verificación de cierre Día 6:**
- 1 misión completada autónomamente con receipt firmado.
- Verificación criptográfica del operador exitosa.

### Día 7 — Tres misiones autónomas verdes consecutivas

**Día completo:**
- Operador firma 3 envelopes adicionales para 3 misiones distintas:
  1. "Refactor color palette in tablero-campana to v3 brutalist tokens"
  2. "Add accessibility ARIA labels to all interactive elements"
  3. "Optimize bundle size of tablero-campana frontend"
- Cada misión ejecutada autónomamente.
- Cada misión cerrada con receipt verificable.

**Verificación de cierre Día 7 (gate operativo):**
- 3/3 misiones autónomas verdes.
- Tasa de autonomía Día 7: ≥ 70% (cumple objetivo).
- Métricas almacenadas en dashboard.

**Si Día 7 falla:** pausa y diagnóstico antes de Día 8. Posible reversión o reescritura específica.

---

## 3. Días 8-14 — Vertical end-to-end con paralelismo (sub-envelopes)

**Objetivo verificable:** El sistema ejecuta misiones con dos sub-agentes paralelos sobre dominios disjuntos del envelope raíz, sin intervención humana, con evidence ledger compartido y verificable.

### Día 8 — SubEnvelope primitiva implementada

**Día completo:**
- Tabla `sub_envelopes` poblada por primera vez.
- Verificador de atenuación monotónica implementado en `server/_core/forja/attenuation-verifier.ts`.
- Test cubre 5 casos: scope ⊆, capability ⊆, budget ≤, TTL ≤, depth = 1.
- Test cubre 3 casos de rechazo: scope expansion, capability addition, budget excess.

**Verificación cierre Día 8:**
- `pnpm test attenuation-verifier` verde.
- Sub-envelope primitiva mergeada al kernel.

### Día 9 — Primer sub-agente emitido por agente principal

**Día completo:**
- Operador firma envelope raíz: misión "Refactor 5 components in parallel".
- Agente principal recibe envelope, decide partir en 2 sub-tareas.
- Agente principal emite sub-envelope 1 (scope: components 1-2-3).
- Agente principal emite sub-envelope 2 (scope: components 4-5).
- Cada sub-agente recibe su sub-envelope, ejecuta autónomamente.
- Cada acción del sub-agente verifica contra su sub-envelope (más restrictivo) Y contra envelope raíz (encadenado).

**Verificación cierre Día 9:**
- 2 sub-envelopes activos, attenuation verificada.
- 2 sub-agentes ejecutando en paralelo sin colisión.

### Día 10 — Misión paralela completada

**Día completo:**
- Ambos sub-agentes completan sus sub-tareas.
- Cada sub-agente firma su receipt de cierre.
- Agente principal recoge receipts de ambos sub, firma receipt raíz consolidando.
- Operador verifica cadena Merkle completa: raíz → 2 sub-envelopes → N receipts cada uno.

**Verificación cierre Día 10:**
- Misión paralela completada.
- Cadena Merkle verificable end-to-end.
- 0 violaciones de policy en sub-envelopes.

### Día 11 — Revocation events en producción

**Día completo:**
- Configurar oracle gate sintético: "presupuesto Stripe staging < $X".
- Operador firma envelope con ese gate.
- Sub-agente inicia ejecución.
- Inyectar deliberadamente lectura del oracle que viola el gate.
- Sistema auto-revoca envelope (revocation event triggered_by = oracle_violation).
- Sub-agente recibe deny en próxima tool call.
- Sub-agente firma receipt de cierre forzado con reason "envelope revoked".

**Verificación cierre Día 11:**
- 1 revocation event auto-disparado.
- Sistema previno acciones post-revocation.
- Test `revocation-by-oracle.test.ts` verde.

### Día 12 — Cedar Analysis verifica invariantes formalmente

**Día completo:**
- Definir invariante crítica: "policy de tabla `customers` jamás permite acción `delete` desde envelope sin role=admin".
- Implementar Cedar Analysis (o wrap Z3) para verificar la invariante sobre el conjunto de policies actuales.
- Test reproduce el caso: cualquier policy que viole la invariante es rechazada en deploy.

**Verificación cierre Día 12:**
- Invariante crítica verificada formalmente.
- Test de regresión rechaza policy violadora.

### Día 13 — Tres misiones paralelas autónomas verdes

**Día completo:**
- Operador firma 3 envelopes raíz, cada uno con 2-3 sub-envelopes esperados.
- Las 3 misiones ejecutan en paralelo.
- Las 3 cierran con receipts verificables.

**Verificación cierre Día 13:**
- Tasa de autonomía Día 8-13: ≥ 75%.
- Cadenas Merkle de 3 misiones todas verificables.
- 0 incidentes que requirieron intervención manual.

### Día 14 — Reporte ejecutivo + decisión de control

**Mañana (operador presente, 2h):**
- Reporte automático ejecutivo en dashboard:
  - X misiones completadas, Y exitosas, tasa = Y/X.
  - Latencia mediana misión.
  - Costo mediano misión.
  - Z incidentes mitigados por revocation.
  - Cadenas Merkle todas verificadas.
- Operador revisa reporte y decide:

| Métrica Día 14 | Decisión |
|---|---|
| Tasa autonomía ≥ 80% Y latencia ≤ 4h Y costo ≤ $5 mediana | **Continuar a Día 15-30 (ticketlike controlado)** |
| Tasa autonomía 50-80% | **Iterar Días 8-14 una semana más antes de ticketlike** |
| Tasa autonomía < 50% | **Pausar y diagnosticar.** Reescritura específica de componente fallido |

**Tarde:**
- Decisión documentada en `evidence_receipts` con firma del operador.
- Si continuamos: planificación específica de canary ticketlike (Días 15-30).
- Si iteramos: priorización de fixes para próxima semana.
- Si pausamos: diagnóstico forense en `discovery_forense/INCIDENTES/`.

---

## 4. Días 15-30 — Ticketlike controlado, canary, sin tocar producción crítica

**Solo si Día 14 entrega métricas verdes y operador firma decisión de continuar.**

**Objetivo verificable:** Sistema ejecuta misiones de diagnóstico, reporte y fix de UI no crítico de ticketlike.mx, despliega a staging, hace canary controlado a producción de bajo blast radius. Sin tocar pagos, precios, clientes ni comunicaciones públicas.

### Día 15 — Envelope ticketlike configurado

**Día completo:**
- Operador firma envelope ticketlike v1:
  - Mission: "Diagnose performance bugs in checkout flow staging, propose fixes"
  - Domain scope: `like-kukulkan-tickets` repo + ticketlike-staging environment
  - Capabilities allowed: read_repo, read_db_staging, write_branch, run_tests, deploy_staging
  - Capabilities denied: write_db_prod, deploy_prod, customer_pii_access, stripe_keys, public_comm, **price_modification**
  - Prohibited absolute (de doctrina v4):
    - Modificar pagos
    - Modificar precios
    - Acceder a datos personales de clientes
    - Comunicación pública
  - Power lane max: L3 (staging only)
  - Budget: 200k tokens, $10 USD, 80 actions, 8 horas
  - Oracle gates: github_ci_status == green, ticketlike_staging_health == ok, ticketlike_prod_health == ok
  - Rollback required: true
- Sistema confirma envelope.

**Verificación cierre Día 15:**
- 1 envelope ticketlike activo con todas las prohibitions.

### Días 16-18 — Misión 1: diagnóstico checkout staging

**Día completo:**
- Agente recibe envelope, ejecuta misión completa autónomamente.
- Identifica 3 bugs de performance en checkout flow staging.
- Aplica fixes en branch staging.
- Tests pasan.
- Deploy a staging.
- Receipt firmado.

**Verificación cierre Día 18:**
- Misión 1 ticketlike completada.
- Staging mejorado (medible vía oracle de performance).
- 0 acciones tocaron producción.

### Días 19-22 — Misión 2: paralelo en staging

**Día completo:**
- Operador firma envelope raíz para 3 misiones de UI staging.
- Agente principal divide en 3 sub-envelopes.
- 3 sub-agentes ejecutan en paralelo.
- Las 3 cierran exitosamente.

**Verificación cierre Día 22:**
- 3 sub-misiones ticketlike staging completadas en paralelo.

### Días 23-25 — Canary controlado a producción de bajo blast radius

**Día completo (operador presente para canary):**
- Operador firma envelope canary específico:
  - Mission: "Apply 1 specific bugfix from staging to production canary 1% traffic on /events page only"
  - Domain scope: ticketlike production (read + write specific endpoint)
  - Power lane max: L4 (canary)
  - Budget: 50k tokens, $5 USD, 20 actions, 2 horas
  - Prohibited absolute (siempre): pagos, precios, customer_pii, public_comm
  - Oracle gates: prod_health green, error_rate < 0.5%, cancelled_purchases_last_hour == 0
  - Rollback required: true (rollback automático si error_rate > 1% en próximos 10 min post-deploy)
  - TTL: 2 horas
- Sistema ejecuta canary.
- Monitor automático 60 minutos.
- Si métricas verdes: canary mantiene 1% traffic.
- Si métricas rojas: rollback automático + revocation.

**Verificación cierre Día 25:**
- 1 canary ejecutado.
- Métricas durante canary documentadas.
- Si rollback automático: `revocation_events` registró el evento.
- Si éxito: 1% traffic con bugfix activo durante TTL.

### Días 26-29 — Estabilización + 5 misiones adicionales

**Día completo:**
- 5 misiones adicionales sobre ticketlike staging (no producción).
- Cada misión completada autónomamente.

**Verificación cierre Día 29:**
- 5/5 misiones staging completadas.
- Tasa de autonomía Días 15-29 ≥ 80%.

### Día 30 — Reporte final v0.1

**Mañana (operador presente, 3h):**
- Reporte completo del sprint:
  - Métricas operativas globales 30 días.
  - Listado de misiones (envelope ID, domain, outcome, costo, duración).
  - Cadenas Merkle todas verificables.
  - Incidentes mitigados por revocation.
  - Lecciones aprendidas (technical, operational, doctrinal).
  - Recomendaciones para v0.2.

**Verificación cierre Día 30:**

| Métrica | Objetivo D30 | Logro real |
|---|---|---|
| Tasa de autonomía global | ≥ 85% | TBD |
| Tasa de cierre exitoso | ≥ 80% | TBD |
| Latencia mediana misión | ≤ 2h | TBD |
| Costo mediano misión | ≤ $3 USD | TBD |
| Cobertura evidence ledger | 100% | TBD |
| Verificación criptográfica cadenas | 100% | TBD |
| Incidentes intervención manual | ≤ 1 | TBD |

**Decisión final D30:**
- Métricas verdes → declarar v0.1 completado, planificar v0.2 con expansión a softrestaurant-ai-10x y CIP.
- Métricas amarillas → extender v0.1 una semana adicional con fixes específicos.
- Métricas rojas → diagnóstico forense profundo y rediseño parcial antes de v0.2.

---

## 5. Tabla de hitos consolidada

| Día | Hito principal | Verificación |
|---|---|---|
| **0** | Pre-flight checklist completo | 7 items verdes |
| **1** | Schema + Cedar + Gateway + tests | `pnpm test forja-kernel` verde |
| **2** | Primer envelope firmado por operador | DB confirma envelope + signature válida |
| **3** | Plan generado + primera acción autorizada | 5 receipts en cadena Merkle |
| **4** | Edits + tests + recovery autónomo | 15+ receipts, recovery documentado |
| **5** | Deploy staging exitoso | Staging URL verde |
| **6** | Cierre misión + verificación operador | Hash raíz Merkle válido |
| **7** | 3 misiones autónomas verdes | **Gate operativo: tasa ≥ 70%** |
| **8** | SubEnvelope primitiva | Atenuación verificada |
| **9** | Primer sub-agente con sub-envelope | 2 sub-envelopes activos |
| **10** | Misión paralela completada | Cadena Merkle multi-nivel |
| **11** | Revocation auto-disparada por oracle | Revocation event registrado |
| **12** | Cedar Analysis invariante crítica | Test rechaza policy violadora |
| **13** | 3 misiones paralelas verdes | Tasa autonomía ≥ 75% |
| **14** | **Reporte D14 + decisión de control** | Métricas verdes → continuar a D15 |
| **15** | Envelope ticketlike configurado | Envelope con todas prohibitions |
| **18** | Misión 1 ticketlike staging cerrada | 3 bugs fixed en staging |
| **22** | 3 sub-misiones ticketlike paralelas | 3 paralelo verde |
| **25** | Canary controlado producción | Métricas durante canary OK |
| **29** | 5 misiones adicionales staging | Tasa ≥ 80% |
| **30** | **Reporte final v0.1 + decisión v0.2** | Métricas globales evaluadas |

---

## 6. Riesgos durante el sprint y plan de respuesta

| Riesgo | Probabilidad | Impacto | Plan de respuesta |
|---|---|---|---|
| Bug en BoundaryGateway permite tool call no autorizado | Media | Alto | Multiple tests cubren cada path. Si se detecta en producción: revocar todos los envelopes, fix, reabrir. |
| Operador firma envelope confuso por fatiga | Media | Medio | Doble confirmación humana en wizard. TTL ≤ 6h en primer mes. |
| Oracle reading caída externa (GitHub API down) | Alta | Bajo | Fallback: oracle reading vencido = deny. Misión pausa hasta oracle reactiva. |
| Cedar policy bug permite acción ilegal | Baja | Alto | Cedar Analysis verifica invariantes pre-deploy. Si bug en producción: revocation masiva. |
| Evidence ledger Merkle chain se rompe | Muy baja | Crítico | Inserts append-only con hash chain enforced en DB constraint. Reparación = imposible, requiere reseed completo. |
| Ticketlike canary genera cancelaciones | Baja | Medio | Oracle gate `cancelled_purchases_last_hour == 0` previene. Rollback automático si dispara. |
| Costo del sprint excede presupuesto | Baja | Medio | Budget per-envelope hard-stop. Costo agregado monitoreado en dashboard. |
| Conflicto entre v0.1 sprint y operación normal del Monstruo | Media | Medio | Separación de branches. v0.1 vive en `design/forja-os-sovereign-agentic-fabric` hasta Día 30. |

---

## 7. Equipo y responsabilidades

| Rol | Responsable | Carga estimada |
|---|---|---|
| **Operador soberano** | Alfredo Góngora | ~2h Día 0 + 1h Día 2 + 1h Día 6 + 2h Día 14 + 3h Día 25 + 3h Día 30 = ~12h totales en 30 días |
| **Autor técnico** | Manus (este hilo o sucesor) | Continuo, autónomo dentro de envelopes |
| **Auditor / Cowork** | Cowork (Hilo C) si está disponible | Auditoría semanal de evidence ledger + verificación de invariantes |
| **Sabios** | Consejo de Sabios | Bajo demanda para consultas de diseño en Días 8-14 (sub-envelope design) |

---

## 8. Producto entregable al final del sprint

Al cierre Día 30, el operador tiene:

1. **Kernel D+ funcional** sobre tablero-campana y ticketlike staging, con 9 primitivas implementadas en TypeScript+Postgres.
2. **8 tablas SQL** con RLS firmadas, evidence ledger Merkle verificable.
3. **BoundaryGateway** con verificación criptográfica de cada tool call.
4. **2 oracles** (GitHub CI + staging health) integrados.
5. **Dashboard del operador** con firma + revocación + métricas.
6. **20-40 misiones autónomas completadas** durante el sprint.
7. **Reporte ejecutivo final** con métricas, lecciones, recomendaciones v0.2.
8. **Doctrina v4 actualizada** con lecciones del sprint en addendum.

---

## 9. Lo que NO entrega el sprint

Para evitar confusión sobre el alcance:

- **NO entrega operación autónoma sobre softrestaurant-ai-10x, CIP, Zona Like, comercialización Leones.** Esos vienen en v0.2+.
- **NO entrega TDX runtime attestation.** Reservado para v0.3+.
- **NO entrega ZK-proofs operativas.** Solo invariantes con Cedar Analysis o Z3.
- **NO entrega sub-envelopes con depth > 2.** Cap = 2 en v0.1.
- **NO entrega federación multi-operador.** Reservado para v0.3+.
- **NO entrega auto-modificación del Authority Envelope.** Reservado para capa E (v0.3+).
- **NO entrega operación sobre pagos, precios, clientes o comunicaciones públicas de ticketlike.mx.** Prohibited absoluto en v0.1.
- **NO entrega expansión paramétrica automática del envelope vía oracle (capa D++).** Solo gates de denegación.

---

## 10. Lo que el operador debe firmar para arrancar

Una sola decisión soberana firma este sprint:

> **"Apruebo el calendario 7-14-30, firmo el primer Authority Envelope sobre tablero-campana, y autorizo a Manus a ejecutar las primitivas del kernel sin intervención mía dentro del envelope. La firma humana se mueve del nivel de cada code_patch al nivel de cada misión."**

Con esa firma + la firma criptográfica del primer envelope, **arranca Día 1**.

---

**Firmado por:** Manus AI como autor técnico del sprint plan  
**Aprobado por:** Alfredo Góngora como operador soberano (Decisión A=SÍ + Decisión B=SÍ ya recibidas en chat)  
**Próxima firma pendiente:** Hash canónico del primer RootAuthorityEnvelope sobre tablero-campana

Fin de Forja OS Sprint v0.1 v2.
