# Veredicto Sabio — Claude Cowork (Claude Opus 4.7)

**Fecha:** 26-may-2026
**Plan evaluado:** `docs/SPRINT_OBSERVATORIO_V1.md` (sha leído `6cf6d0d`, branch `design/forja-os-sovereign-agentic-fabric`)
**Modelo:** claude-opus-4-7 (con MCP GitHub habilitado, lectura real del documento)

---

## P1 — Orden de los hitos

**Veredicto:** B → A → C ✓ con **spike de A inyectado al día 0**

> "De acuerdo con el orden, en desacuerdo con arrancarlo en frío. La dependencia dura real es C reusa el bus de A (§3.4 project_heartbeats es el mismo mecanismo Realtime que §3.2), así que C-después-de-A es no-negociable. El error es agendar lo más riesgoso (A) en medio sin validar su supuesto central antes. Apuesta firme: B→A→C, pero gasta medio día *antes* de B empujando UN evento hardcodeado por el camino completo kernel Python → Supabase → Realtime → render. Si ese camino está roto lo sabes el día 0, no el día 8."

**Principio nuevo aportado:** ataca primero el supuesto más caro de revertir, no el más fácil de construir.

## P2 — Mecanismo del bus

**Veredicto:** Supabase Realtime ✓ con **refinamiento obligatorio de ventana React acotada**

> "El plan tiene razón y los contra-argumentos no aplican a este equipo. '200-800ms es demasiado' es falso para un humano mirando un dashboard: con pulsos de 2-4s y objetivo <2s, 500ms de ingestión es invisible. Redis Streams/NATS sólo ganan a 1000+ ev/s — estás a ~1.2 ev/s promedio con 100k/día, es premature optimization. WebSocket-directo lo descarto porque la doctrina §1 pide transparencia total con historia, y WS-directo pierde durabilidad/replay/ledger."

**Refinamiento obligatorio:** activar el purge por `expires_at` (ya está en §3.2 pero nadie dice que se aplique) y acotar la ventana en React, o el array crece sin límite y revienta la pestaña en sesión larga.

**Patrón citado:** "persist-then-fanout" de live dashboards de Supabase.

## P3 — Adapter Forja v4 ↔ kernel

**Veredicto:** Adapter cross-stack ✓ (NO portar) — **pero rediseñar gate síncrono antes de enforce_full**

> "De acuerdo en no portar, pero el diseño del enforce está mal. Reimplementar RFC 8785 + ed25519 en Python = dos implementaciones del canonical form = drift criptográfico garantizado, y tirarías 36 tests verdes. Para ESTE sprint (sólo shadow) el adapter cross-stack es inequívocamente correcto."

**Corrección crítica para enforce_full (futuro):**

> "El kernel cachea un *bundle de política firmado* (Forja TS lo firma, Python sólo verifica la firma sobre los bytes recibidos sin recanonicalizar → cero drift) y evalúa localmente en <5ms; el round-trip tRPC queda async para receipts y refresh periódico, fuera del hot path. Esto es exactamente el modelo de signed bundles de Open Policy Agent (openpolicyagent.org/docs)."

## P4 — Hito B (sprints fantasma)

**Veredicto:** Vale ~2-3 días ✓ — **rechazo la dicotomía 3D-vs-2D**

> "La parte 3D-fantasma sí es 70% vanidad, pero el ingestor (§5 ingest_sprints.py: repo MD → DB → UI) NO lo es: es la misma forma de pipeline que A y C necesitan (estado externo → DB → UI viva), y B es el lugar más barato de validarla sin kernel."

**Apuesta concreta:**
- Ingestor + DB + vista de cartas/lista en ~2 días (cumple "modo transparencia" doctrinalmente)
- 3D como +1 día *reusando* `Building.tsx` con material `SPRINT/FUTURE` que ya existe (no reconstruir)
- Aflojar criterio §8: el MUST es "vista poblada por ingestor", el 3D es SHOULD

## P5 — Riesgos no vistos

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| 1 | **Mismatch de dialecto cross-DB / topología de dos bases.** El DDL de §3.2 `kernel_events_stream` está escrito en MySQL/TiDB (`ENUM(...)` inline, `INDEX` dentro del CREATE TABLE), pero §4 dice que vive en **Supabase Postgres**, y su comentario usa `ALTER PUBLICATION supabase_realtime` (Postgres-only). PG no acepta INDEX inline ni ENUM inline. El plan nunca nombra que el sistema cruza dos bases con dos dialectos. | **ALTA** | Reescribir §3.2 en dialecto Postgres, ponerlo en migración del repo el-monstruo (no del Tablero). ADR de una línea: `kernel_events_stream` es Postgres-resident; `sprints/connected_projects/project_heartbeats` son TiDB-resident. |
| 2 | **Sin autenticación/integridad de eventos.** §3.2 no tiene campo que pruebe que un evento vino del kernel real. Cualquiera con INSERT (o anon key si RLS está floja) forja un `receipt.signed` y el Tablero lo pinta como verdad. Un ledger falsificable es peor que ninguno. | **ALTA** | Firmar cada evento con ed25519 (reusar la llave de Forja v4) sobre `(event_id, emitted_at, event_type, payload)`. Columnas `signature` + `signer_key_id` a §3.2. Cliente Realtime verifica antes de pintar. RLS de Supabase restringe INSERT al service-role del kernel. Patrón citado: firma de webhooks de Stripe. |
| 3 | **Drift del contrato de eventos cross-repo.** §3.2 `event_type` es `VARCHAR(64)` libre con strings de ejemplo; kernel y Tablero deben coincidir en vocabulario, pero no hay artefacto de contrato compartido. Cuando el kernel renombre un `event_type` o cambie la forma del `payload`, el mapeo del Tablero se rompe en silencio. | **MEDIA-ALTA** | Definir event_types + shapes de payload en UN archivo de contrato versionado (JSON Schema, o enum generado para TS+Py) commiteado en ambos repos desde la misma fuente. Test de contrato en CI de cada repo. Tablero warnea ante `event_type` desconocido. |

**Riesgos descartados/matizados explícitamente por Cowork:**

- Saturación de pestaña: ya mitigada en §4 (throttling >100 ev/s), salvo la ventana React sin tope.
- Coste Supabase 100k/día: BAJA, ~1.2 ev/s, trivial.
- Health checks de los 12 proyectos: MEDIA y *medio-vista*. Los `EMBRIONARIO` (WhatsApp, Watch, CIP) no tienen endpoint, criterio §8 "≥10 con health check funcional" es insatisfacible. Separar C en "proyectos reales con HTTP" vs "nodos doctrina/embrión con badge estático".
- Branch 8 días sin merge: MEDIA, mitiga con cadencia de rebase.
- Escritura futura Tablero→kernel: BAJA hoy, blinda con grant read-only a nivel DB para el rol Supabase del Tablero.

## Recomendación final

**APROBAR CON AJUSTES**

Los 3 cambios sin los cuales no apruebo:

1. **Corregir §3.2 a dialecto Postgres y declarar la topología de dos bases** (migración en el-monstruo, no en el Tablero). Es bug de corrección en schema canónico, no opinión.
2. **Firmar eventos con ed25519 (reusar Forja) + RLS INSERT-only-kernel + verificación en el Tablero antes de render.** No hay ledger de transparencia sin integridad.
3. **Artefacto de contrato de eventos versionado y compartido por ambos repos + warning ante event_type desconocido**, antes de cualquier paso hacia enforce.

**Ajustes recomendados no bloqueantes:**
- Spike de A al día 0 (P1)
- Cap de la ventana React (P2)
- Rediseñar gate síncrono a evaluación local cacheada antes de enforce_full (P3)
- Aflojar criterio §8 de B al ingestor y de C a proyectos-reales-vs-embrión (P4/P5)

---

## Análisis del hilo Manus sobre este veredicto

**Aporta sobre Gemini:**

1. **Detectó un bug de corrección real en §3.2** que ningún otro sabio (ni el plan, ni mi diseño) vio: el DDL está en dialecto MySQL/TiDB pero la tabla vive en Postgres del Monstruo. Esto NO se discute, se corrige. Cowork hizo lectura real del archivo.
2. **Concuerda con Gemini en firmar eventos con ed25519**, pero agrega el patrón concreto: columnas `signature` + `signer_key_id`, reusa la llave de Forja, RLS INSERT-only-kernel. Cita Stripe webhooks como patrón probado.
3. **Discrepa con Gemini en P3 (no portar a Python).** Argumenta que portar = drift criptográfico garantizado (dos implementaciones de canonical form). En su lugar propone **signed bundles de OPA**: el kernel verifica firma sobre bytes recibidos sin recanonicalizar, evaluación local <5ms. Esta solución elimina el problema de latencia que Gemini quería resolver, sin tirar los 36 tests TS.
4. **Aporta nuevo principio:** "ataca primero el supuesto más caro de revertir" — spike de A al día 0 (medio día) para validar que el camino kernel Python → Supabase → Realtime → render funciona, antes de invertir 8 días en B.
5. **Refina P4 con criterio quirúrgico:** ingestor (~2 días, alta utilidad), 3D fantasma como +1 día reusando Building.tsx existente. Doctrinalmente alineado y económico.

**Calidad del veredicto:**

- Cita el sha exacto del documento leído (`6cf6d0d`).
- Cita secciones específicas del plan (§1, §3.2, §3.4, §4, §5, §6, §8, §9, §10).
- Cita patrones técnicos con URL (OPA bundles, Stripe webhooks signatures).
- Distingue MUST vs SHOULD en criterios de cierre.
- Descarta explícitamente riesgos triviales con números (1.2 ev/s).

**Discrepancia consolidada vs Gemini:**

| Pregunta | Gemini | Cowork | Mi lectura |
|---|---|---|---|
| P3 adapter | Portar a Python | Adapter cross-stack + signed bundles OPA | **Cowork gana** — la solución signed bundles ataca el problema sin pagar el costo del port |
| P4 Hito B | Simplificar a panel 2D | Ingestor ~2d + 3D opcional reusando Building.tsx | **Cowork gana** — la doctrina exige fantasma, y reusar lo existente es gratis |
| P5 #1 riesgo crítico | Schema drift cross-repo | Mismatch de dialecto cross-DB Postgres vs TiDB | **Cowork aporta más** — encontró un bug real de corrección |

**Esperando los 3 sabios restantes** (ChatGPT, Perplexity, Grok 4) para sintetizar veredicto final.
