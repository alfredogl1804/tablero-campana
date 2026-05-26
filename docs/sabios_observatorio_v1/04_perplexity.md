# Veredicto Sabio — Perplexity (My Computer)

**Fecha:** 26-may-2026
**Plan evaluado:** `docs/SPRINT_OBSERVATORIO_V1.md` (commit `35acc3a`, branch `design/forja-os-sovereign-agentic-fabric`)
**Modelo:** Perplexity con búsqueda y lectura GitHub habilitada

> **Nota histórica:** la primera respuesta de Perplexity llegó en formato no-canónico (directiva operativa). Tras retroalimentación, devolvió el veredicto en formato sabio correcto. Este documento contiene el veredicto canónico final.

---

## P1 — Orden de los hitos

**Veredicto:** B → A → C ✓ (acuerdo con el plan)

> "Mantendría B → A → C. B es el hito de menor riesgo porque no requiere kernel vivo ni coordinación cross-repo; valida primero el lenguaje visual 'sólido vs fantasma' que luego reutilizan A y C. Empezar por A sería más valioso técnicamente, pero también más frágil porque mezcla bus, kernel Python, Supabase Realtime y Tablero en el primer movimiento."

## P2 — Mecanismo del bus

**Veredicto:** Supabase Realtime ✓ (acuerdo con el plan, **con backpressure y fallback polling como condición**)

> "Para 1 operador + IAs, Supabase Realtime es la mejor apuesta inicial. No es el bus perfecto, pero ya está dentro del ecosistema y evita operar Redis/NATS/Kafka desde el día uno. Redis Streams o NATS serían mejores a alto volumen, pero sobreoptimizan antes de tener eventos vivos reales; el plan debe añadir backpressure y fallback polling."

## P3 — Adapter Forja v4 ↔ kernel

**Veredicto:** Adapter cross-stack ✓ (acuerdo con el plan, **discrepa con Gemini**)

> "No portaría Forja a Python ahora. Ya hay inversión real en TypeScript: RFC 8785, ed25519, sub-envelopes, atenuación monotónica y tests verdes. Portar duplica lógica crítica y aumenta riesgo criptográfico. La latencia HTTP (~250ms) es aceptable en shadow/enforce_warn; si algún path crítico exige <50ms, se optimiza después con cache/local policy mirror, no con port prematuro."

## P4 — Hito B (sprints fantasma)

**Veredicto:** Vale 3-4 días ✓ (con criterio binario estricto)

> "Sí vale si se mantiene estrictamente acotado. No es 'vanidad 3D' si se usa para validar la pipeline ingestor → DB → UI y el lenguaje de transparencia 'sprint real vs sprint fantasma'. Pero debe cerrarse con criterio binario y no convertirse en rediseño visual: mínimo 20 sprints fantasma, filtro/leyenda clara, cero kernel."

## P5 — Riesgos no vistos

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| 1 | **Contrato kernel inventado o drift cross-repo.** El plan menciona `ActionEnvelope.evaluate()` y `kernel/engine.py` que pueden no existir en el repo real (que usa `contracts/event_envelope.py`, `contracts/policy_hook.py` u otros). | **ALTA** | Antes de implementar el adapter, **congelar en un ADR cross-repo los contratos reales del kernel Python**. No usar nombres supuestos. |
| 2 | **Ambigüedad de motor de datos TiDB vs Supabase.** Las tablas nuevas no declaran motor explícito. | **ALTA** | Declarar por tabla el motor destino. Todo lo que necesite Realtime vive en Supabase Postgres; estado interno de Forja/Tablero vive en TiDB/MySQL. **No aprobar el plan si las 4 tablas nuevas no tienen motor explícito.** |
| 3 | **Realtime sin backpressure ni fallback.** El plan promete <2s pero no define qué pasa al saturar. | **MEDIA-ALTA** | Definir presupuesto de eventos/minuto, coalescing visual, throttle/buffer en frontend, fallback polling cada 5s si WebSocket cae, y métrica mínima de saturación. |
| 4 | **Autenticidad de eventos del kernel.** El plan no define cómo se prueba que un evento viene del kernel real. | **ALTA** | Cada evento debe incluir firma/HMAC o envelope verificable, `source_id`, secuencia monotónica y timestamp. El Tablero NO debe aceptar eventos anónimos como verdad operacional. |
| 5 | **Drift de rama de diseño contra main.** La rama `design/forja-os-sovereign-agentic-fabric` lleva 8 días sin merge. | **MEDIA** | Antes de sprint largo, rebase/merge desde main y correr validación de schemas + tests; no construir sobre rama de diseño vieja sin refresh. |

## Recomendación final

**APROBAR CON AJUSTES**

Los 3 cambios bloqueantes:

1. Corregir en `SPRINT_OBSERVATORIO_V1.md` los nombres del contrato real del kernel Python y exigir ADR cross-repo antes del adapter.
2. Añadir tabla explícita de motor destino por cada tabla nueva: TiDB/MySQL vs Supabase Postgres.
3. Añadir presupuesto Realtime, backpressure, coalescing y fallback polling como criterio de cierre del Hito A.

---

## Análisis del hilo Manus sobre este veredicto

**Aporta sobre Gemini, Cowork y Grok 4:**

1. **P1 con argumento técnico nuevo** — "empezar por A es más valioso pero más frágil porque mezcla bus + kernel + Supabase Realtime + Tablero en el primer movimiento". Reconoce el costo de complejidad acoplada en el primer hito.

2. **P3 con principio de optimización diferida** — "si algún path crítico exige <50ms, se optimiza después con cache/local policy mirror, no con port prematuro". Esto coincide con los signed bundles de Cowork pero formulado como principio general.

3. **P4 con criterio binario explícito** — "mínimo 20 sprints fantasma, filtro/leyenda clara, cero kernel". Es la formulación más concreta del Definition of Done para Hito B.

4. **P5 — 5 riesgos vs 3 de los demás sabios**. Los 5 son legítimos:
   - **Contratos Python ficticios** (único de Perplexity): aplica patrón anti-autoboicot a la arquitectura.
   - **Motor de datos por tabla** (refuerza Cowork): formulado a nivel sistémico.
   - **Backpressure/fallback** (único de Perplexity): añade `source_id` + secuencia monotónica + timestamp, aporte técnico real.
   - **Autenticidad de eventos** (coincide con Gemini, Cowork, Grok): convergencia 4-de-4 ahora.
   - **Branch drift** (coincide con Cowork): convergencia 2-de-4.

**Calidad del veredicto:**

- Formato canónico correcto (después de la corrección).
- 5 riesgos explícitos con severidad y mitigación.
- Criterio binario para P4.
- Principio de optimización diferida explícito.
- No cita sha del documento ni archivos del repo el-monstruo.
- No cita patrones técnicos con URL (a diferencia de Cowork).

**Discrepancias acumuladas vs los 4 sabios:**

| Tema | Gemini | Cowork | Grok 4 | Perplexity | Consenso |
|---|---|---|---|---|---|
| P1 orden | ✓ | ✓ + spike día 0 | ✓ | ✓ | **B→A→C unánime, spike opcional** |
| P2 bus | ✓ | ✓ + cap ventana | ✓ | ✓ + backpressure/fallback | **Supabase Realtime unánime con refinamientos** |
| P3 adapter | Portar Python | Cross-stack + signed bundles | Cross-stack | Cross-stack + cache si <50ms | **3-1: Cross-stack gana, opt diferida** |
| P4 Hito B | Simplificar 2D | 2-3d ingestor + 3D opcional | 3-4d con 3D | 3-4d con criterio binario estricto | **3-1: Mantener fantasma 3D con DoD claro** |
| P5 riesgos críticos | Schema drift | Bug dialecto + spoofing eventos | RLS escritura + saturación | Contratos ficticios + motor por tabla + backpressure + autenticidad + branch drift | **Convergencia masiva en: integridad/auth + topología cross-DB + degradación** |

**Convergencia identificada en P5 (4 de 4 sabios):** integridad/autenticidad criptográfica de eventos del kernel. Esto es el ÚNICO punto donde los 4 sabios coinciden formulado en sus términos distintos. Es el ajuste obligatorio más sólido.

**Esperando solo a ChatGPT** para cerrar la consulta de los 5 sabios.
