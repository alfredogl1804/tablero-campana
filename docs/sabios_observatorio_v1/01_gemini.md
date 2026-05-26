# Veredicto Sabio — Gemini

**Fecha:** 26-may-2026
**Plan evaluado:** `docs/SPRINT_OBSERVATORIO_V1.md` (commit `35acc3a` en branch `design/forja-os-sovereign-agentic-fabric`)
**Modelo:** Gemini (asumido 3 Pro Reasoning vía interfaz de Alfredo)

---

## P1 — Orden de los hitos

**Veredicto:** B → A → C ✓ (acuerdo con el plan)

> "B→A→C es el orden correcto porque minimiza el riesgo técnico al aislar la visualización inicial de la complejidad del kernel activo. Iniciar con B valida la pipeline de ingestión y renderizado 3D (IsometricBoard.tsx) de forma segura, estableciendo el 'lenguaje visual' necesario antes de inyectar la carga cognitiva y de latencia del bus en tiempo real de A."

## P2 — Mecanismo del bus

**Veredicto:** Supabase Realtime ✓ (acuerdo con el plan)

> "Con un equipo de 1 operador + IAs, maximizar el leverage de la infraestructura existente es imperativo. Los 200-800ms de latencia de Supabase Realtime son insignificantes para la percepción visual de un tablero estratégico y evitan la pesadilla de mantener un broker NATS o Redis dedicado con presupuesto limitado."

## P3 — Adapter Forja v4 ↔ kernel

**Veredicto:** Portar a Python (DESACUERDO con el plan, que proponía adapter cross-stack)

> "La soberanía criptográfica no debe depender de llamadas de red en el critical path. Introducir ~200ms de latencia extra por HTTP + tRPC desde el kernel (Python) hacia el tablero (TS) para cada validación canónica de action_envelope (§14) asfixiará el loop de LangGraph. El costo hundido de 8 días en TS no justifica un SPOF de latencia; porta la validación criptográfica clave (ed25519 y envelopes) a core/policy_engine.py de Python."

## P4 — Hito B (sprints fantasma)

**Veredicto:** Simplificar a panel 2D (DESACUERDO con el plan, que proponía renderizado 3D fantasma)

> "Renderizar sprints no ejecutados en 3D es over-engineering visual en esta etapa, desviando atención del valor real (la actividad del kernel). Un panel 2D o un HUD sobre el tablero es suficiente para cumplir la doctrina de 'Modo transparencia', ahorrando 2 días críticos que deberían invertirse en asegurar el bus de eventos de A."

## P5 — Riesgos no vistos

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| 1 | **Coordinación de schema entre repos (cross-repo schema drift):** Python emite evento con estructura mutada, TS espera Zod schema estricto, Tablero falla silenciosamente o crashea. | **ALTA** | Extraer schemas de eventos a sub-módulo git independiente o usar Protocol Buffers compartidos. |
| 2 | **Auth/identidad (spoofing de eventos):** Supabase Realtime abierto permite a cualquiera publicar eventos falsos que el Tablero renderizará. | **ALTA** | El kernel firma cada payload con ed25519; el Tablero verifica la firma antes de renderizar (reusa lógica Forja v4 TS). |
| 3 | **Branch drift:** `design/forja-os-sovereign-agentic-fabric` lleva 8 días sin merge — bomba de tiempo de conflictos. | **MEDIA** | Ejecutar squash and merge a `main` del trabajo TS antes de iniciar Sprint Observatorio. |

## Recomendación final

**APROBAR CON AJUSTES**

Ajustes obligatorios:

1. Simplificar Hito B a 2D y usar los días ahorrados para portar la validación Forja al kernel Python.
2. Implementar firma ed25519 por evento emitido desde Python hacia Supabase, y validación en TS.
3. Consolidar el branch actual a `main` antes de iniciar el Sprint Observatorio v1.

---

## Análisis del hilo Manus sobre este veredicto

**Puntos fuertes del aporte de Gemini:**

- **P3 ataca el critical path correctamente.** Si cada acción del kernel debe pasar por HTTP a Forja TS antes de ejecutarse, eso introduce latencia sistémica en cada tool call del agente. Es un argumento técnicamente correcto.
- **P5 #1 (schema drift) es el riesgo más invisible.** El plan canónico no menciona cómo se versionan los schemas cross-repo, y eso es un foot-gun real.
- **P5 #2 (spoofing) es importante.** El plan asumía Supabase Realtime sin discutir cómo se autentica el productor.
- **P5 #3 (branch drift) es operativo.** Los 8 días sin merge son verdad.

**Puntos donde discrepo o matizo:**

- **P3 — portar a Python tiene un costo no reconocido.** Forja v4 TS tiene 36 tests verde, RFC 8785 canonical, sub-envelopes con atenuación monotónica, y fue auditado contra el envelope piloto firmado en Mac. Portar a Python implica:
  - Reescribir canonical RFC 8785 (Python no tiene libs maduras, hay que portar la subset)
  - Reescribir verifyEd25519 (Python tiene `cryptography` lib, factible)
  - Reescribir verifyAttenuation (lógica pura, fácil)
  - Reescribir BoundaryGateway 10-step (medio)
  - Re-testear todo (8 tests E2E + 11 unit + 15 atenuación + 5 sub E2E = 36 tests)
  - **Estimación:** 5-8 días de port + validación cruzada.
  - **Ganancia real:** -200ms por acción del kernel.
  - **Trade-off:** ¿Vale 5-8 días para ahorrar 200ms por tool call cuando el kernel hace ~100 tool calls/día actualmente?
  - **Alternativa híbrida:** mantener Forja TS como **gateway de auditoría asíncrono**, no en critical path. El kernel ejecuta acciones contra `policy_engine.py` Python (rápido), y emite el receipt al Tablero TS de forma asíncrona post-ejecución. Forja registra todo y puede revocar capability tokens hacia adelante, pero NO bloquea cada acción individual sincrónicamente.
- **P4 — simplificar B a 2D pierde la doctrina de "transparencia total" del operador.** El operador explícitamente dijo: "lo ejecutado y lo planeado conviven en el mismo mapa". Un panel 2D plano es menos doctrinalmente alineado. Pero Gemini tiene razón en que 3D fantasma puro vale ~3-4 días extra. **Compromiso posible:** Hito B con renderizado fantasma sí, pero con `Building.tsx` material `SPRINT/FUTURE` que YA EXISTE en el código (cero costo nuevo de rendering 3D); la pipeline ingestor + DB + endpoint es la pieza de trabajo real (~2 días, no 3-4).

**Esperando los otros 4 sabios para sintetizar.**
