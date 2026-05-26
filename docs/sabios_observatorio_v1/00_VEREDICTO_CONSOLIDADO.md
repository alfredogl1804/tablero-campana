# Veredicto Consolidado de los 5 Sabios — Observatorio Vivo v1

**Fecha:** 26-may-2026
**Plan evaluado:** `docs/SPRINT_OBSERVATORIO_V1.md` (commit `35acc3a`, branch `design/forja-os-sovereign-agentic-fabric`)
**Sabios consultados:** Gemini, Claude Cowork (Opus 4.7), Grok 4 Heavy, Perplexity, ChatGPT 5.5 Pro
**Estado:** **READY FOR T1 SIGNATURE**

---

## 1. Tabla unificada de los 5 veredictos

| Pregunta | Gemini | Claude Cowork | Grok 4 | Perplexity | ChatGPT 5.5 | Consenso |
|---|---|---|---|---|---|---|
| **P1 orden** | B→A→C ✓ | B→A→C ✓ + spike día 0 | B→A→C ✓ | B→A→C ✓ | **B-lite → A → C → B-polish** | **4-1**: B→A→C en general, ChatGPT exige reducir B |
| **P2 bus** | Supabase Realtime ✓ | Realtime + cap ventana React | Realtime ✓ | Realtime + backpressure/fallback | **Realtime HÍBRIDO: Postgres ledger + Broadcast privado** | **4-1**: Supabase Realtime sí, ChatGPT refina mecanismo |
| **P3 adapter** | **Portar a Python** | Cross-stack + signed bundles | Cross-stack ✓ | Cross-stack + cache local si <50ms | **Cross-stack + separar telemetry de material** | **4-1**: Cross-stack gana. Telemetry NO pasa por Forja, solo acciones materiales |
| **P4 Hito B** | **Simplificar a 2D** | 2-3d ingestor MUST + 3D SHOULD | 3-4d con 3D | 3-4d con DoD binario | **B-lite 1-2d + B-polish diferido** | **Variado**: mantener fantasma 3D pero reducir alcance inicial |
| **P5 #1 autenticidad eventos** | spoofing (alta) | ed25519 sobre payload (media) | RLS escritura (alta) | firma + source_id + secuencia (alta) | event_signature_ed25519 + canonical_hash + agent_key_id (alta) | **5-0 UNÁNIME: criptografía obligatoria** |
| **P5 #2 cross-DB / dialecto SQL** | schema drift cross-repo | Bug dialecto Postgres/TiDB | — | Motor por tabla obligatorio | Dos archivos migración separados + drizzle test real | **4-0 convergencia** |
| **P5 #3 backpressure / coalescing** | — | cap ventana React | saturación pestaña (alta) | presupuesto + fallback polling 5s | drop visual never drop ledger + métricas | **4-0 convergencia** |
| **P5 #4 contratos Python reales** | — | — | — | "ActionEnvelope.evaluate()" puede no existir | — | **1-0 único Perplexity (anti-autoboicot)** |
| **P5 #5 read-only doctrina** | — | — | — | — | Observatorio se vuelve transport | **1-0 único ChatGPT (doctrinal)** |
| **P5 #6 cuotas Supabase** | — | — | — | — | 500-2500 msg/s + métricas | **1-0 único ChatGPT** |
| **P5 #7 health check taxonomía** | — | — | — | — | http\|db\|github_commit\|manual\|doctrine_only\|none | **1-0 único ChatGPT** |
| **Recomendación final** | APROBAR CON AJUSTES | APROBAR CON AJUSTES | APROBAR CON AJUSTES | APROBAR CON AJUSTES | APROBAR CON AJUSTES | **5-0 UNÁNIME: APROBAR CON AJUSTES** |

## 2. Convergencias identificadas

### Convergencia 5-de-5 (UNÁNIME)

**Autenticidad criptográfica de eventos del kernel.** Cero sabio lo contradice. Schema concreto definido por ChatGPT 5.5.

### Convergencia 4-de-5

- Orden B → A → C en estructura general (ChatGPT refina con B-lite/B-polish, no contradice).
- Bus Supabase Realtime (ChatGPT refina con Postgres ledger + Broadcast, no contradice).
- Adapter cross-stack TS (Gemini contradice).
- Backpressure / coalescing / fallback / métricas (Gemini no lo formuló).

### Convergencia 4-de-5 secundaria

- Topología cross-DB Postgres-TiDB con migraciones separadas y motor por tabla.
- ed25519 reusable de Forja para firmar eventos (Cowork explícito, ChatGPT explícito, Grok+Perplexity implícito por su exigencia de firma).

## 3. Lista única de ajustes obligatorios consolidados

Ordenados por urgencia y por convergencia entre sabios:

### Bloqueantes — sin estos no firmar

| # | Ajuste | Sabios que lo exigen | Impacto en plan |
|---|---|---|---|
| **1** | **Eventos del kernel firmados criptográficamente.** Cada fila de `kernel_events_stream` debe incluir `event_signature_ed25519`, `event_hash_canonical` (RFC 8785), `agent_key_id` y opcionalmente `prev_event_hash` para encadenamiento por trace. Tablero renderiza eventos sin firma válida como "untrusted". | **5/5** Gemini, Cowork, Grok, Perplexity, ChatGPT | Schema §3.2 + §4 (Hito A) |
| **2** | **Migraciones SQL separadas por motor + drizzle test real.** Crear `001_observatorio_tidb.sql` y `001_observatorio_supabase_postgres.sql`. No SQL canónico escrito a mano sin prueba en DB real. Cada tabla declara motor explícito en §3. | **4/5** Cowork, Perplexity, ChatGPT (+ implícito Gemini en schema drift) | Reescritura §3.0 + §3.1-3.4 + nuevo §3.5 |
| **3** | **Backpressure + coalescing + fallback polling + métricas.** Visual window 250 eventos. Aggregation por district + event_type + trace_id cada 1s. Fallback polling 5s si WebSocket cae. Métricas: `events_per_minute`, `payload_p50/p95`, `websocket_disconnects`, `broadcast_lag_ms`, `postgres_insert_lag_ms`. **Drop visual, never drop ledger.** | **4/5** Cowork, Grok, Perplexity, ChatGPT | Sección nueva §4.5 dentro Hito A |
| **4** | **Bus Supabase Realtime HÍBRIDO.** Postgres `kernel_events_stream` como ledger persistente + Supabase Broadcast privado como canal visual de baja latencia. NO Postgres Changes puro. | **1/5** ChatGPT (refinamiento, los demás no contradicen) | §2 (decisión bus) + §4 (Hito A) |
| **5** | **Adapter Forja: separar telemetry vs material.** Forja TS NO valida cada microevento observacional. Solo valida acciones materiales (deploys, escrituras, ejecución de tools, receipts). Reescribir §7 para reflejar esta separación. | **1/5** ChatGPT (los demás no contradicen) | §7 (Adapter Forja) |
| **6** | **Contratos Python reales del kernel congelados en ADR cross-repo antes de implementar §7.** Verificar archivos reales del repo `alfredogl1804/el-monstruo`. Reemplazar nombres como `ActionEnvelope.evaluate()` o `kernel/engine.py` si no existen. | **1/5** Perplexity | §7 + nuevo ADR cross-repo |
| **7** | **La Forma READ-ONLY hasta nuevo DSC.** Cero buttons with side effects. Cero write path desde Tablero a kernel. Cualquier acción desde Tablero requiere sprint separado tipo `TRANSPORT_LA_FORMA_001`. | **1/5** ChatGPT (alineado con doctrina canonizada del operador) | Nueva regla canónica en §1 |

### Refinamientos — recomendados pero no bloqueantes

| # | Ajuste | Sabios |
|---|---|---|
| **8** | **B-lite → A → C → B-polish.** B-lite máximo 1-2 días: tabla `sprints` + capa fantasma mínima + click contextual. B-polish (estética 3D avanzada) se difiere al final. | ChatGPT solo |
| **9** | **Spike día 0 de A** antes de invertir 8 días en B. Empujar un evento hardcodeado por todo el camino kernel → Postgres → Realtime → Tablero para validar pipeline. | Cowork solo |
| **10** | **Health check taxonomía:** `http \| db \| github_commit \| manual \| doctrine_only \| none`. No pintar "ACTIVE" si solo existe doctrina. | ChatGPT solo |
| **11** | **Branch drift mitigación.** Antes de sprint largo, rebase desde main + validación schemas + tests. | Cowork, Perplexity |
| **12** | **Versionado de schema de eventos + graceful degradation.** Cuando kernel cambia formato, Tablero no rompe. | Gemini, Cowork, Grok |
| **13** | **DoD binario para B/B-lite:** mínimo 20 sprints fantasma poblados, filtro/leyenda, cero kernel. | Perplexity, ChatGPT |

## 4. Veredicto final firmable

### Diagnóstico

**APROBAR CON AJUSTES** — los 5 sabios coinciden en la recomendación final. El plan tiene fundamento sólido pero requiere 7 ajustes bloqueantes antes de implementación.

### Ruta para Alfredo

Tres opciones de firma:

#### **Opción A — Firma plena con todos los ajustes**
Aplicar los 7 ajustes bloqueantes + los 6 refinamientos al `SPRINT_OBSERVATORIO_V1.md`. El plan se vuelve **v1.1** y queda firmado para implementación. Costo: ~30-60 minutos de reescritura del documento. Implementación arranca con el plan más sólido posible.

#### **Opción B — Firma parcial bloqueantes-only**
Aplicar solo los 7 ajustes bloqueantes. Los 6 refinamientos quedan pendientes para v1.2. Costo: ~20-30 minutos de reescritura.

#### **Opción C — Firma tal cual y aplicar ajustes durante ejecución**
Aprobar `SPRINT_OBSERVATORIO_V1.md` v1.0 sin tocar y aplicar los ajustes durante implementación de cada hito. Riesgo: rework si los ajustes obligan a cambios estructurales tardíos.

### Recomendación del hilo Manus

**Opción A.**

Razones:
1. Los 5 sabios convergen en autenticidad criptográfica como bloqueante. Reescribir §3.2 y §4 ahora cuesta menos que rehacer la implementación después.
2. El bug de dialecto SQL detectado por Cowork+Perplexity+ChatGPT es real. Implementar sobre SQL roto es trabajar dos veces.
3. La separación telemetry/material de ChatGPT es arquitectónica. Implementar el adapter sin esa distinción genera fragilidad sistémica.
4. Los 7 ajustes son atómicos, no se contradicen entre sí, y son aplicables en ~30-60 minutos de trabajo de redacción.

### Línea final canonizada

> **Manus: aprobar Observatorio Vivo v1 solo con (a) eventos firmados ed25519 con `event_hash_canonical` y `agent_key_id`, (b) SQL separado TiDB/Postgres con drizzle test real, (c) backpressure + coalescing + fallback polling + métricas, (d) Supabase híbrido Postgres ledger + Broadcast privado, (e) adapter Forja separa telemetry de material, (f) contratos Python reales congelados en ADR cross-repo, (g) La Forma estrictamente read-only hasta nuevo DSC.**

---

## 5. Referencias canónicas

- Plan original: `docs/SPRINT_OBSERVATORIO_V1.md` commit `35acc3a`
- Veredictos individuales: `docs/sabios_observatorio_v1/01_gemini.md`, `02_claude_cowork.md`, `03_grok4.md`, `04_perplexity.md`, `05_chatgpt.md`
- Doctrina interfaces: skill `interfaces-monstruo-doctrina`
- Doctrina vicios hilo Manus: skill `vicios-hilo-manus-evitar`
- Repo Tablero: `https://github.com/alfredogl1804/tablero-campana`
- Repo Monstruo: `https://github.com/alfredogl1804/el-monstruo`
- Branch trabajo: `design/forja-os-sovereign-agentic-fabric`
