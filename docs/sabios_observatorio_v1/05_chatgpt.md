# Veredicto Sabio — ChatGPT 5.5 Pro

**Fecha:** 26-may-2026
**Plan evaluado:** `docs/SPRINT_OBSERVATORIO_V1.md` (commit `35acc3a`, branch `design/forja-os-sovereign-agentic-fabric`)
**Modelo:** GPT-5.5 Pro (sabio con citas explícitas al documento)

---

## P1 — Orden de los hitos

**Veredicto:** **B-lite → A → C → B-polish** (rechaza el orden propuesto, ÚNICO sabio en discrepar)

> "B → A → C tal como está, no apruebo. Si B se come 3-4 días completos antes de que exista latido real del kernel, el Observatorio Vivo empieza como maqueta estática. El corazón del valor es A: eventos reales del kernel en menos de 2 segundos."

**Orden corregido propuesto:**
- **B-lite** (1-2 días): tabla `sprints` poblada + capa fantasma mínima + click a ContextCard o link GitHub.
- **A completo**: latido real del kernel.
- **C**: mapa estelar de proyectos.
- **B-polish**: estética 3D avanzada, escala log, líneas translúcidas, navegación fina (todo lo "rico" que se difiere).

> "Nada de perfeccionar 3D, alturas logarítmicas, líneas translúcidas o UX fina antes de A. Eso va después."

## P2 — Mecanismo del bus

**Veredicto:** Supabase Realtime ✓ pero **HÍBRIDO ledger+Broadcast**, no Postgres Changes puro

> "Apruebo Supabase Realtime con ajuste: usar tabla persistente + Broadcast privado para visualización."

**Razón:** Supabase oficialmente recomienda Broadcast por escalabilidad y seguridad sobre Postgres Changes. Implementación propuesta:
- **Source of truth:** `kernel_events_stream` en Postgres (ledger durable).
- **Visual bus:** Supabase Broadcast privado derivado del insert (canal de baja latencia).
- **Fallback:** polling paginado si WebSocket cae.

> "Cambia la frase canónica de 'PostgreSQL CHANGES via WebSocket' a: Supabase Realtime híbrido — Postgres como ledger persistente + Broadcast privado como canal visual de baja latencia."

**No introducir todavía:** Redis Streams, NATS JetStream. Ambos serían superiores a alto volumen pero "meter otra bestia operativa antes de validar el observatorio".

## P3 — Adapter Forja v4 ↔ kernel

**Veredicto:** Adapter cross-stack ✓ + **regla canónica de qué eventos pasan por Forja**

> "Adapter cross-stack, no portar Forja a Python. Portar Forja a Python ahora sería destruir capital ya construido. Cita los archivos reales del repo: `server/forja/canonical.ts`, `ed25519.ts`, `gateway.ts`, `router.ts`, `types.ts` con tests verdes."

**Ajuste obligatorio nuevo (único de ChatGPT):**

| Categoría de evento | Pasa por Forja |
|---|---|
| Kernel event telemetry (latidos visuales) | NO |
| Kernel material action (deploys, escrituras, ejecución de tools) | SÍ |
| Receipt / evidence | SÍ (se registra) |

> "No pongas Forja TS en el camino crítico de cada microevento observacional. Si haces que cada `telegram.message_in`, `langgraph.node.start` o `mem0.query` dependa de una llamada HTTP a Forja, vas a introducir fragilidad artificial."

## P4 — Hito B (sprints fantasma)

**Veredicto:** Vale, pero **B-lite (1-2d) NO B completo (3-4d)** — ÚNICO sabio en pedir reducción

> "Sprints fantasma no es vanidad. Para El Monstruo, ver lo canonizado-no-ejecutado junto a lo activo resuelve un problema real: evita que una IA vuelva a construir cosas ya planeadas, y convierte el roadmap en una superficie operativa visible."

> "Pero hacerlo primero como feature visual rica sí puede volverse teatro. El operador no necesita una catedral fantasma antes del primer latido vivo. Necesita una capa mínima que pruebe ingesta → DB → UI."

**Recorte:**
- B original (3-4 días) → **B-lite aprobado: 1-2 días**.
- Diferido: estética 3D avanzada, escala log, líneas translúcidas, navegación fina.

## P5 — Riesgos no vistos

**6 riesgos** (más que cualquier otro sabio), todos con citas al documento:

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| 1 | **Dialecto SQL mezclado.** Plan mezcla MySQL/TiDB (`ENUM(...)` inline, `ON UPDATE CURRENT_TIMESTAMP`, índices `affected_districts(50)`) con Postgres/Supabase. Romperá migraciones si no se separa. | **ALTA** | Crear dos archivos de migración separados: `001_observatorio_tidb.sql` y `001_observatorio_supabase_postgres.sql`. Exigir `drizzle migration generate` + test en DB real. **No aprobar SQL canónico escrito a mano sin prueba.** |
| 2 | **Autenticidad de eventos.** Plan define `kernel_version`, `source_component`, `trace_id`, `parent_event_id` pero eso es metadata, no autenticidad criptográfica. | **ALTA** | Agregar campos `event_signature_ed25519`, `event_hash_canonical`, `agent_key_id`, `prev_event_hash` (opcional por trace). El Tablero debe renderizar como "untrusted" cualquier evento sin firma válida. |
| 3 | **Observatorio que se convierte en transport por accidente.** Doctrina dice La Forma es read-only. Pero plan introduce ContextCards, links, receipts, proyectos. Inevitablemente alguien querrá "aprobar desde el Tablero", "pausar kernel", "reintentar acción", "firmar T1 aquí". | **ALTA** | **Regla canónica: READ-ONLY hasta nuevo DSC.** No buttons with side effects. No write path from Tablero to kernel. Cualquier acción desde Tablero requiere sprint separado: `TRANSPORT_LA_FORMA_001`. |
| 4 | **Backpressure visual subestimado.** Plan dice que >100 eventos/s agregará visualmente pero falta política de sampling/aggregation por `event_type`, `trace_id` y `district`. | **MEDIA** | Visual window: últimos 250 eventos. Aggregation: por district + event_type + trace_id cada 1s. Timeline completo: paginado desde DB. **Drop visual, never drop ledger.** |
| 5 | **Coste/cuotas Supabase.** Pro: 500 msg/s. Pro sin spend cap/Team: 2,500 msg/s. Supabase desconecta clientes si exceden. | **MEDIA** | Métrica obligatoria desde día 1: `events_per_minute`, `payload_p50/p95`, `websocket_disconnects`, `broadcast_lag_ms`, `postgres_insert_lag_ms`. |
| 6 | **Health checks de los 12 proyectos.** Hito C asume health checks reales pero varios proyectos son embrión o "NO existe" según el propio doc. C no es solo renderizar mapa: es crear taxonomía. | **MEDIA** | Definir `health_check_method`: `http \| db \| github_commit \| manual \| doctrine_only \| none`. **No pintar "ACTIVE" si solo existe doctrina.** |

## Recomendación final

**APROBAR CON AJUSTES**

Los 3 ajustes bloqueantes (de los 6 riesgos detectados, los 3 más críticos):

1. Cambiar orden a **B-lite → A → C → B-polish**.
2. Cambiar bus a **Supabase híbrido: Postgres ledger + Broadcast privado visual**, no Postgres Changes puro como dogma.
3. Agregar **autenticidad criptográfica de eventos**: `event_signature_ed25519` + canonical hash + `agent_key_id`.

**Línea corta para Manus** (citada literal):

> "Manus: aprobar Observatorio Vivo v1 solo con ajuste B-lite→A→C, Supabase híbrido ledger+Broadcast, eventos firmados ed25519, SQL separado TiDB/Postgres y La Forma estrictamente read-only hasta nuevo DSC."

---

## Análisis del hilo Manus sobre este veredicto

**ChatGPT 5.5 Pro es el sabio MÁS técnicamente denso de los 5.** Aporta:

1. **Discrepancia única en P1:** ningún otro sabio cuestionó el orden B→A→C. ChatGPT lo hace con argumento técnico fuerte: "el Observatorio Vivo empieza como maqueta estática si B se come 3-4 días antes del primer latido real". Propone subdivisión B-lite/B-polish.

2. **Refinamiento profesional en P2:** identifica que la propia documentación oficial de Supabase recomienda Broadcast sobre Postgres Changes para casos como el nuestro. Aporta arquitectura híbrida concreta. Cita límites de planes Supabase con números (500/2500 msg/s).

3. **Ajuste único en P3:** **separación entre eventos observacionales y acciones materiales**. Forja TS valida acciones materiales (deploys, escrituras, tool exec), NO cada microevento. Esto resuelve el dilema de latencia que motivaba a Gemini a portar Forja a Python, sin necesidad de signed bundles (Cowork) ni cache local mirror (Perplexity).

4. **Disciplina arquitectónica en P4:** B-lite explícito de 1-2 días, no 3-4. Diferir estética 3D al final cuando ya hay latido real.

5. **Riesgos P5 más densos de los 5 sabios:**
   - **Dialecto SQL mezclado** convergente con Cowork y Perplexity, formulado a nivel de migraciones (#1).
   - **Autenticidad de eventos** convergente con los 4 sabios anteriores, **pero ChatGPT define el schema concreto** de campos criptográficos (#2).
   - **Observatorio se vuelve transport por accidente** ÚNICO de ChatGPT — riesgo doctrinal real, alineado con doctrina canonizada del operador. Solución read-only + sprint separado para escritura (#3).
   - **Backpressure con drop visual nunca drop ledger** — aporte único, principio limpio (#4).
   - **Cuotas Supabase con números** ÚNICO de ChatGPT (#5).
   - **Taxonomía de health_check_method** ÚNICO de ChatGPT — `doctrine_only` como categoría explícita (#6).

6. **Calidad del veredicto:**
   - Cita el documento del plan repetidamente con referencias precisas.
   - Cita los archivos del repo (`server/forja/canonical.ts`, etc.).
   - Cita documentación oficial de Supabase, NATS JetStream, Redis Streams.
   - Citas con notación `￼` indican que ChatGPT realmente accedió y consumió las URLs.
   - Aporta principios canónicos formulables ("Drop visual, never drop ledger", "READ-ONLY hasta nuevo DSC", "kernel event telemetry no pasa por Forja").

## Discrepancias acumuladas vs los 5 sabios

| Tema | Gemini | Cowork | Grok 4 | Perplexity | ChatGPT 5.5 | Consenso |
|---|---|---|---|---|---|---|
| P1 orden | ✓ B→A→C | ✓ + spike día 0 | ✓ B→A→C | ✓ B→A→C | **B-lite→A→C→B-polish** | **4-1: B→A→C aprobado pero B reducido** |
| P2 bus | ✓ Realtime | ✓ + cap ventana | ✓ Realtime | ✓ + backpressure | **Híbrido Postgres ledger + Broadcast** | **4-1: Realtime, ChatGPT refina arquitectura** |
| P3 adapter | Portar Python | Cross-stack + signed bundles | Cross-stack | Cross-stack + cache | **Cross-stack + separar telemetry vs material** | **4-1 cross-stack, ChatGPT refina alcance** |
| P4 Hito B | Simplificar 2D | 2-3d ingestor + 3D opcional | 3-4d con 3D | 3-4d con DoD binario | **B-lite 1-2d + B-polish diferido** | **3-2 mantener fantasma 3D, ChatGPT propone B-lite** |
| P5 riesgo crítico autenticidad | spoofing | ed25519 sobre payload | RLS escritura | firma + source_id + secuencia | **event_signature_ed25519 + event_hash_canonical + agent_key_id** | **5-0 unánime: criptografía obligatoria, ChatGPT define schema** |
| P5 riesgo SQL/migraciones | — | Bug dialecto Postgres/TiDB | — | Motor por tabla | **Dos archivos migración separados + drizzle test real** | **3-0 convergencia, ChatGPT define mecanismo** |
| P5 riesgo doctrinal único | — | — | — | — | **Observatorio se vuelve transport** | **1-0 ÚNICO ChatGPT — riesgo doctrinal alto** |

## Convergencia 5-de-5 final identificada

**Autenticidad criptográfica de eventos del kernel** es el único punto donde los 5 sabios coinciden, formulado en sus términos distintos:

- Gemini: "spoofing"
- Cowork: "ledger falsificable" + ed25519 sobre payload
- Grok 4: "RLS escritura cross-repo"
- Perplexity: "autenticidad de eventos" + firma + source_id + secuencia monotónica + timestamp
- ChatGPT 5.5: "event_signature_ed25519 + event_hash_canonical + agent_key_id + prev_event_hash"

**Es el ajuste obligatorio MÁS sólido del consenso.** Cero sabio lo contradice. ChatGPT lo formula con schema concreto.

## Convergencia 3-de-5 secundaria

**Topología cross-DB Postgres-TiDB y migraciones separadas:**
- Cowork detectó bug dialecto en §3.2.
- Perplexity exigió motor declarado por tabla.
- ChatGPT define mecanismo: dos archivos `001_observatorio_tidb.sql` y `001_observatorio_supabase_postgres.sql` + `drizzle migration generate` + test en DB real.

## Conclusión

Los 5 sabios han respondido. Procede sintetizar veredicto consolidado y aplicar los ajustes obligatorios al plan canónico.
