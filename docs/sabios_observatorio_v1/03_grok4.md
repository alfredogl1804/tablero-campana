# Veredicto Sabio — Grok 4

**Fecha:** 26-may-2026
**Plan evaluado:** `docs/SPRINT_OBSERVATORIO_V1.md` (commit `35acc3a`, branch `design/forja-os-sovereign-agentic-fabric`)
**Modelo:** Grok 4 Heavy (Sabio #4 DSC-V-001)

---

## P1 — Orden de los hitos

**Veredicto:** B → A → C ✓ (acuerdo con el plan)

> "El orden del plan es correcto. Hito B es bajo riesgo, valida la pipeline visual y el lenguaje de 'sólido vs fantasma' que A y C reutilizan. Empezar por A sería más riesgoso (coordinación cross-repo sin haber validado la UI). Hacerlos en paralelo sería un error: el operador es uno solo y el contexto visual de B es necesario para que A y C tengan sentido."

## P2 — Mecanismo del bus

**Veredicto:** Supabase Realtime ✓ (acuerdo con el plan)

> "Es la mejor opción dada la realidad actual. El kernel ya usa Supabase, cero infra nueva, RLS y auth ya existen, y la latencia 200-800ms es aceptable para un observatorio (no es trading de alta frecuencia). Redis Streams o NATS añadirían complejidad y coste innecesario para un equipo de 1 operador + IAs. WebSocket directo desde Python al Tablero sería más frágil y más difícil de asegurar."

## P3 — Adapter Forja v4 ↔ kernel

**Veredicto:** Adapter cross-stack ✓ (acuerdo con el plan, **discrepa con Gemini**)

> "Mantener Forja en TypeScript es la decisión correcta. Ya hay 8 días invertidos y 36 tests verdes en TS (canonical RFC 8785, ed25519, sub-envelopes). Portarlo a Python sería tirar ese trabajo y añadir complejidad de tipos en Python. La latencia extra (~200ms) es aceptable para el camino crítico del observatorio. El adapter cliente Python → tRPC es limpio y mantiene separación de concerns."

## P4 — Hito B (sprints fantasma)

**Veredicto:** Vale 3-4 días ✓ (acuerdo con el plan, **discrepa con Gemini y matiza con Cowork**)

> "Vale la pena. 'Modo transparencia' no es vanidad; es doctrina explícita del operador. Un observatorio que solo muestra lo ejecutado es un mapa muerto. Los sprints fantasma dan contexto inmediato y validan la pipeline ingestor → DB → UI sin tocar el kernel. Un panel 2D plano ahorraría 2 días pero perdería el impacto visual y el valor de 'ver el futuro y el presente al mismo tiempo'."

## P5 — Riesgos no vistos

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| 1 | **Permisos de escritura del Tablero en Supabase del Monstruo (cross-repo).** El plan asume que el Tablero puede escribir en `kernel_events_stream` sin RLS restrictivo. | **ALTA** | Añadir policy estricta que solo permita inserts desde el kernel Python (verificar host o service key). |
| 2 | **Volumen de eventos saturando la pestaña del navegador.** 100k+ eventos/día sin agregación visual hará que el Tablero se vuelva lento o colapse. | **ALTA** | Implementar client-side throttling y agregación por distrito (ya existe en el plan pero sin detalle técnico). |
| 3 | **Coordinación de schema entre repos.** Cuando el kernel cambia el formato de evento, el Tablero rompe. | **MEDIA** | Añadir versionado explícito en el event schema + graceful degradation en el cliente. |

## Recomendación final

**APROBAR CON AJUSTES**

Los 3 cambios bloqueantes:

1. Policy RLS estricta en `kernel_events_stream` (solo kernel Python puede escribir).
2. Client-side throttling + agregación visual explícita en Hito A.
3. Versionado de schema de eventos + fallback en el Tablero.

---

## Análisis del hilo Manus sobre este veredicto

**Aporta sobre Gemini y Cowork:**

1. **Refuerza el orden B→A→C** con un argumento operativo nuevo: "el operador es uno solo y el contexto visual de B es necesario para que A y C tengan sentido". Visión humanocéntrica que ni Gemini ni Cowork enfatizaron.
2. **Confirma la posición de Cowork sobre P3** (no portar). Esto cierra el debate Gemini-vs-Cowork: 2 vs 1 a favor de mantener Forja en TS. Pero Grok no ofreció solución a la latencia (Cowork sí, con signed bundles).
3. **Defiende P4 con argumento doctrinal:** "un observatorio que solo muestra lo ejecutado es un mapa muerto". Frase potente alineada con la doctrina del operador.
4. **P5 #2 (volumen de eventos saturando navegador)** Cowork lo descartó como BAJA (1.2 ev/s con ventana acotada). Grok lo eleva a ALTA. **Discrepancia técnica:** Cowork tiene razón si el cap de ventana está bien implementado; Grok tiene razón si no se implementa la agregación por distrito explícitamente. Resolución: ambos son válidos en escenarios distintos. La mitigación de Grok es complementaria, no contradictoria.
5. **P5 #3 (versionado de schema)** Cowork ya lo cubrió con "artefacto de contrato versionado compartido". Grok lo formula más simple: "añadir versionado explícito + graceful degradation". Patrón complementario.

**Calidad del veredicto:**

- No cita el sha del documento leído (a diferencia de Cowork que sí citó `6cf6d0d`).
- No cita patrones técnicos con URL (a diferencia de Cowork que citó OPA y Stripe).
- Argumentos sólidos pero menos específicos que Cowork.
- Aporta perspectiva humanocéntrica única ("el operador es uno solo").

**Discrepancias acumuladas vs los 3 sabios:**

| Tema | Gemini | Cowork | Grok 4 | Consenso |
|---|---|---|---|---|
| P1 orden B→A→C | ✓ | ✓ + spike día 0 | ✓ | **B→A→C unánime, spike opcional** |
| P2 bus Supabase | ✓ | ✓ + cap ventana | ✓ | **Supabase Realtime unánime** |
| P3 adapter Forja | Portar Python | Cross-stack + signed bundles | Cross-stack | **Cross-stack 2-1, con signed bundles para latencia** |
| P4 Hito B | Simplificar 2D | 2-3d ingestor MUST + 3D SHOULD | 3-4d con fantasma 3D | **Mantener fantasma 3D 2-1, criterio MUST/SHOULD** |
| P5 riesgo crítico | Schema drift cross-repo | Bug dialecto cross-DB + spoofing eventos | RLS escritura + saturación navegador | **Convergen: integridad/auth, schema versionado, RLS** |

**Esperando ChatGPT y Perplexity** para cerrar la consulta de los 5 sabios.
