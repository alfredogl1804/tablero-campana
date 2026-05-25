READY_TO_COMMIT: docs/CLAUDE_OPUS_VEREDICTO_FORJA_OS_v2.md

# Veredicto Adversarial — Forja OS v2
**Auditor:** Claude Opus 4 (Sabio #2 — Metodología, Regla de Tres)
**Fecha:** 2026-05-25
**Documentos auditados:**
- `FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md` (v1, 326 líneas, ChatGPT 5.5 Pro)
- `PERPLEXITY_VEREDICTO_FORJA_OS.md` (344 líneas, Perplexity Sonar Pro)
- `FORJA_OS_SOVEREIGN_AGENTIC_FABRIC_v2.md` (1058 líneas, fusión cuatro fuentes)
**Auditorías previas recibidas:** Grok 4 Heavy → REQUEST_CHANGES / Gemini 3 Pro → REJECT
**Rol declarado:** filósofo técnico + auditor ontológico. No duplico las observaciones de Grok y Gemini. Mi ángulo es la coherencia ontológica entre las cuatro fuentes fusionadas.

---

## Tarea 1 — Coherencia interna de la tesis ontológica

La tesis central de Forja OS es válida y no la cuestiono: "gobernar cambios verificables sobre una realidad operativa modelada" es una pregunta genuinamente distinta a "coordinar agentes" o "mostrar un dashboard." El cambio de pregunta es real.

El problema es que el documento tiene dos naturalezas simultáneas e incompatibles:

- **Como contrato de diseño**: opera al nivel de invariante filosófica ("si no hay cambio verificable, el sistema no hizo nada").
- **Como spec técnico**: especifica 13 tablas Drizzle con schemas completos, pseudocódigo tRPC con tipos exactos, criterios de aceptación binarios como "20/20 capabilities responden 200 con datos reales."

Estas dos naturalezas coexisten sin marcador de transición. El resultado es un documento que razona filosóficamente sobre por qué *existe* un sistema que todavía no existe, y al mismo tiempo promete entregables de sprint con criterios verificables. La fusión de las cuatro fuentes no resolvió esta tensión; la acentuó. ChatGPT Pro opera en el nivel del contrato. Perplexity opera en el nivel del spec. El documento v2 intenta ser los dos al mismo tiempo y no declara cuándo está siendo cada uno.

Esto no es un defecto fatal. Es un defecto de gobernanza documental: hay dos documentos aquí comprimidos en uno. El corrector mínimo es un separador explícito entre §1-§10 (doctrina, contrato de diseño) y §11-§26 (spec técnico del sprint v0.1). Mientras no exista ese separador, cualquier lector puede citarte la tesis filosófica para justificar una implementación incompleta ("el sistema governa cambios verificables" → [señala la tabla `missions` vacía]).

---

## Tarea 2 — Power vs Activation: ¿doctrina real o naming sobre MVP básico?

La doctrina es **real**, pero con una condición crítica que no se declara explícitamente.

Power vs Activation es genuinamente distinto de "feature flags en un MVP." La diferencia está en el enforcer: el **Power Lane Engine** (§19). Si ese middleware existe y está instalado en todas las routers nuevas de Forja, entonces sí — una capability en estado `DESIGNED` produce `CAPABILITY_NOT_ENABLED` en runtime, y eso es poder *diseñado pero no activado*. Si el middleware no existe o está sólo parcialmente instalado, entonces `capability_switches` es sólo una tabla de configuración sin efecto operacional — y ahí sí colapsa a naming creativo.

**El problema**: el documento presenta el Power Lane Engine como pseudocódigo (§19.1), no como código existente. La nota de procedencia en el Anexo A confirma que viene del AUDIT MANUS, que a su vez verificó contra commit `b52a688`, pero no verifica que el Engine *exista*, sino que el *patrón* es coherente con el código base actual.

La doctrina Power vs Activation es válida. El criterio de salida del sprint v0.1 (§24.2, punto 5: "Kill-switch ejercitado en sesión real") es el verificador correcto. Si ese criterio se cierra con evidencia determinista, la doctrina se materializa. Si no, es naming.

---

## Tarea 3 — Tres contradicciones profundas entre las cuatro fuentes fusionadas

### Contradicción 1: El World Model que se declara versus el World Model que existe

v1 declara: "El World Model es una representación tipada, viva y consultable del estado del Monstruo — un grafo de entidades con invariantes y relaciones."

v2 §4.3 admite: "mientras `boardSnapshots.payload` siga siendo `json("payload").notNull()` opaco, Mission Physics opera con verificadores que parsean el JSON, no con invariantes formales sobre tipos del World Model."

La contradicción es ésta: **la tesis ontológica entera descansa sobre gobernar una realidad modelada, pero la realidad modelada en v0.1 es un blob JSON opaco.** No es un grafo consultable. No tiene tipos. Mission Physics no puede evaluar invariantes formales sobre él; parsea JSON y hace `if (payload.budget.delta === 0)`. Eso no es física del sistema — es un test de campo sobre texto no tipado.

v2 defiere el World Model tipado a v0.2. El problema filosófico es que la promesa "no somos un dashboard, somos un sistema que gobierna una realidad modelada" no se puede honrar mientras la realidad modelada sea un blob. En v0.1, Forja OS es un sistema que gobierna cambios verificables sobre *texto JSON*. Eso sigue siendo valioso, pero es un nivel ontológico inferior al prometido.

### Contradicción 2: Reality Diff tipado vs. Reality Diff como diff de git

§7 declara que el Reality Diff expresa la diferencia entre `world_state_before` y `world_state_after` "en términos del World Model: nodos creados/eliminados/modificados, aristas del grafo, métricas con delta firmado."

§13.1, paso 8, dice: "en v0.1 toda ejecución sobre el mundo es vía Lane L3 — sandbox branch — no sobre el genoma directamente."

**Consecuencia**: en v0.1, la Execution Fabric ejecuta sobre una branch de git, no sobre el genoma. El Reality Diff en `mission_reality_diffs.diff` no va a contener "dory.core: latency_p95_ms 920 → 760." Va a contener un diff de archivos TypeScript o un listado de commits. El ejemplo en §22.5 (nodos modificados, métricas con delta, invariantes verificadas) es el Reality Diff de v0.2+, no de v0.1.

Esto no está declarado explícitamente. El lector puede llegar al sprint v0.1 creyendo que va a producir Reality Diffs con semántica del World Model, y se encontrará con que el campo `diff` en la tabla `mission_reality_diffs` contiene un git diff. Ambos son legítimos y valiosos. Pero son objetos distintos con propiedades distintas.

### Contradicción 3: La equivalencia por hash como propiedad 10x vs. su imposibilidad en v0.1

§9 declara: "La propiedad 10x específica que v2 desbloquea... es la recuperación por equivalencia: dos cápsulas que producen el mismo Reality Diff son intercambiables. El operador puede preguntar '¿he hecho algo equivalente antes?' y recibir respuesta determinista por hash."

Para que esta propiedad sea verdadera, el `output_hash` del Reality Diff debe ser computacionalmente estable: la misma intervención sobre el mismo estado inicial debe producir el mismo hash. Eso requiere (a) un World Model tipado con serialización determinista, (b) un Reality Diff que capture sólo cambios semánticos, no artefactos de ejecución (timestamps, IDs generados, ruido de red).

En v0.1, el Reality Diff es un git diff. Dos cápsulas que "hacen lo mismo" sobre el repo van a producir commits con SHAs distintos, timestamps distintos, branch names distintos. Los `output_hash` van a ser distintos. La recuperación por equivalencia no funciona sobre git diffs.

La Perplexity absorption #3 (`canonical_hash`) aborda la equivalencia en el lado del *input* (dos cápsulas con la misma intención producen el mismo `canonical_hash`). Eso sí funciona en v0.1. Pero la equivalencia del *output* requiere Reality Diffs sobre el World Model, y eso está en v0.2.

El documento presenta las dos equivalencias como si fueran la misma propiedad. No lo son.

---

## Tarea 4 — Catálogos cerrados: ¿cerrados de verdad?

El catálogo de evidence kinds (10 kinds, §16) es **genuinamente cerrado** y bien construido. La constraint a nivel DB que rechaza `kind` fuera del enum es la materialización correcta del cierre. No tengo objecciones sobre este catálogo.

El catálogo de claims (14 predicados, §15) tiene un problema estructural: **los predicados `node_metric_below` y `node_metric_above` asumen que las métricas están en `boardNodes.metadata.metrics[metric]`, pero el World Model es un blob JSON opaco.** Parsear el blob en runtime para buscar `payload.metadata.metrics.latency_p95_ms` no es evaluación de un predicado sobre un World Model tipado — es un JSONPath assertion. Si el campo no está en el JSON (porque el buildScript no lo incluyó, o cambió su nombre), el predicado falla silenciosamente sin que el Intent Compiler lo detecte al compilar.

El catálogo está cerrado en su dimensión horizontal (no se pueden agregar predicados en runtime) pero no en su dimensión vertical (los predicados que referencian el World Model no tienen garantía de ser evaluables hasta la hora de ejecución). Eso no es un catálogo cerrado — es un catálogo con contratos implícitos sobre la estructura del blob.

El corrector es declarar en §15 qué campos del `boardSnapshots.payload` son garantizados por `runBuildScript` y cuáles son opcionales. Los predicados del catálogo sólo pueden operar sobre campos garantizados.

---

## Tarea 5 — El gate anti-LLM-only-verification

El gate ("al menos un claim debe tener verificador determinista") cierra el caso patológico extremo donde el 100% de la evidencia es `llm_proposal`. Eso es correcto y necesario.

**Lo que no cierra**: una cápsula con 1 claim determinista y 19 claims con `kind: "llm_proposal"` pasa el gate y puede ser marcada como `accepted` por la Sovereign Court. El documento dice "esto cierra el vector de 'el mismo LLM propone y verifica'" — pero ese vector permanece abierto para el 95% de los claims de esa cápsula.

El gate opera a nivel de cápsula. Los rulings de la Court operan a nivel de claim. No hay regla que diga que un claim cuya única evidencia es `llm_proposal` debe recibir ruling `block` o `reject`. El Court puede aceptar ese claim. Si el operador único firma sin revisar la evidencia de cada claim, la auto-verificación LLM se coló por la puerta lateral.

El corrector mínimo no es cambiar el gate de cápsula, sino añadir una regla de la Court: "un ruling `accept` sobre un claim cuya única evidencia es `kind: 'llm_proposal'` requiere anotación explícita del operador único declarando que acepta evidencia no determinista para ese claim." Eso hace el coste de la auto-verificación visible y deliberado, no invisible.

---

## Tarea 6 — `memory.evolve_policy` como AUTONOMOUS_ZONE: ¿decisión técnica o postergamiento disfrazado?

La decisión de prohibir `memory.evolve_policy` en v0.1 es **técnicamente correcta**. Sin un World Model tipado, sin ≥2 agentes ENABLED, sin suficientes Reality Diffs archivados, no hay sustrato sobre el que una política de evolución pueda operar con sentido.

**El problema no es la decisión. Es la consecuencia no declarada.**

El sumando `Memory Evolution` en la fórmula de §3 implica un sistema que se adapta. Sin `memory.evolve_policy`, la Memory Evolution del v0.1 es `memory.archive`: una tabla de lectura donde las cápsulas cerradas se archivan. Un archivo no es un fabric que evoluciona. La diferencia entre archivar Reality Diffs y evolucionar a partir de ellos es la diferencia entre un log y un cerebro.

v0.1 es, ontológicamente hablando, un **Sistema de Archivo de Reality Diffs con Gobierno Soberano**. Eso es valioso. Pero no es "Sovereign Agentic Fabric" en el sentido completo de la fórmula. El documento debería declarar explícitamente: "Forja OS v0.1 es la capa de archivo y gobierno. El fabric con memoria adaptativa emerge en v0.2 cuando se desbloquee `memory.evolve_policy`." Sin esa declaración, el nombre "Sovereign Agentic Fabric" promete más de lo que v0.1 puede entregar.

---

## Tarea 7 — Suposiciones ocultas del vertical slice

El vertical slice de 11 pasos (§13.1) tiene cinco suposiciones no declaradas:

**1. Latencia de `runBuildScript` es aceptable en context síncrono.** El paso 2 invoca `world.snapshot.refresh` síncronamente dentro de `mission.submit`. Si `runBuildScript` tarda 15-30 segundos (plausible para un script que construye 62 nodos), la petición tRPC excede cualquier timeout razonable del frontend. El documento no define un SLA de latencia para `runBuildScript`.

**2. El output de Gemini es parseable como claims del catálogo cerrado.** El paso 5 dice "El Intent Compiler relee el output y extrae claims del catálogo cerrado." Esto presupone que Gemini produce output estructurado que el extractor puede mapear a predicados del catálogo. El extractor de claims no está definido en ninguna parte del documento. Si Gemini devuelve prosa libre, el extractor necesita un segundo LLM o un parser heurístico — ninguno de los dos es determinista.

**3. El snapshot referenciado por `world_state_before` permanece estable durante los 11 pasos.** Los pasos 3-8 pueden tomar minutos. Si durante ese tiempo alguien dispara `world.snapshot.refresh` (por otra cápsula o por el cron cuando se desbloquee), `boardSnapshots[latest]` cambia. Las validaciones `target ⊆ validIds` del paso 5 pueden operar sobre un `latest` diferente al que usó el paso 2. No hay lock sobre el snapshot `world_state_before`.

**4. La branch `mission/<ulid>` parte de un estado limpio de `main`.** Si `main` tiene un merge pendiente o una branch anterior `mission/<ulid-prev>` sin cerrar que modificó los mismos archivos, el diff del paso 10 es ambiguo.

**5. Reality Diff del paso 8 produce semántica del World Model.** Como establece la Contradicción 2: no la produce. Produce semántica de git. El vertical slice debería declarar esto explícitamente para que el implementador sepa qué poner en `mission_reality_diffs.diff`.

---

## Tarea 8 — Cambio estructural mínimo para coherencia ontológica

El cambio mínimo que cierra las tres contradicciones simultáneamente:

**Dividir Reality Diff en dos artefactos con ciclos de vida distintos:**

- `CodeDiff` — artefacto de v0.1. Producido por Execution Fabric vía L3 (git diff en branch). Contiene: commits, archivos modificados, resultado de Vitest, artefacto de GitHub. Hasheable y recuperable. Es lo que v0.1 produce realmente.

- `WorldModelDiff` — artefacto de v0.2+. Producido cuando el World Model sea tipado y consultable. Contiene: nodos modificados, métricas con deltas firmados, invariantes verificadas formalmente. Es lo que la tesis ontológica describe en §7.

**Por qué este cambio cierra las tres contradicciones:**

- C1 (World Model opaco): `CodeDiff` no promete semántica del World Model — es honesto sobre su naturaleza.
- C2 (Reality Diff de git vs. de World Model): el implementador sabe que en v0.1 produce `CodeDiff`, no `WorldModelDiff`. No hay confusión.
- C3 (equivalencia por hash en v0.1): la equivalencia por hash sobre `CodeDiff` es posible en una clase de operaciones (mismos archivos modificados de la misma manera). La equivalencia por hash sobre `WorldModelDiff` llega en v0.2. El documento puede declarar ambas sin confundirlas.

**Cambio en la tabla de schema**: `mission_reality_diffs` agrega un campo `diff_kind: mysqlEnum(['code_diff', 'world_model_diff'])` con default `'code_diff'`. Las rutas de query y las propiedades de equivalencia cambian según el `diff_kind`.

Este cambio es quirúrgico: no toca la tesis ontológica, no toca Power vs Activation, no toca los catálogos. Solo hace que la promesa del Reality Diff sea honesta en cada etapa del ciclo de vida del sistema.

---

## Tarea 9 — Veredicto binario

**APPROVE_WITH_MODIFICATIONS**

Fundamento: las tres contradicciones identificadas son **correcciones de especificación**, no fallas de arquitectura. La tesis ontológica es coherente y valiosa. La doctrina Power vs Activation es real y bien construida. Los catálogos cerrados son una contribución genuina. El sistema que v2 describe — si se implementa con el cambio mínimo de la Tarea 8 — es materialmente superior al tablero-campana actual y materialmente superior a cualquier solución de coordinación multi-agente que haya visto en el ecosistema.

Las modificaciones requeridas antes de implementar:

**M1** (bloqueante): Declarar en §7 y §13.1 que el Reality Diff en v0.1 es un `CodeDiff` (semántica git), no un `WorldModelDiff` (semántica del World Model). Actualizar el schema con el campo `diff_kind`. Actualizar el ejemplo §22.5 para reflejar el CodeDiff real que producirá v0.1.

**M2** (bloqueante): Añadir en §5 (Evidence VM) la regla de Court: "un ruling `accept` sobre un claim con única evidencia `llm_proposal` requiere anotación explícita del operador declarando que acepta evidencia no determinista para ese claim específico." Sin esto, el anti-LLM gate tiene un bypass lateral no declarado.

**M3** (no bloqueante, antes de v0.2): Definir el extractor de claims del paso 5 del vertical slice. O bien es determinista (output estructurado de Gemini con schema tipado), o bien pasa por un segundo LLM con schema enforcement — en cuyo caso ese paso también produce evidencia `llm_proposal` y las reglas del gate aplican.

**M4** (no bloqueante): Añadir en §13 (vertical slice) o §27 (cierre) una declaración explícita: "Forja OS v0.1 es un Sistema de Archivo de Reality Diffs con Gobierno Soberano. El fabric con memoria adaptativa emerge cuando `memory.evolve_policy` se desbloquee en una versión futura." Esto no cambia nada técnico pero cierra la brecha entre el nombre del documento y lo que el sprint v0.1 entrega.

**Posición respecto a Grok y Gemini**: Mi veredicto es complementario, no redundante. Grok y Gemini probablemente detectaron los mismos síntomas desde ángulos distintos (Grok desde coherencia de los riesgos P0/P1; Gemini desde ejecutabilidad del sprint). Yo identifico la causa raíz ontológica: la confusión entre `CodeDiff` y `WorldModelDiff` propaga inconsistencias hacia arriba (tesis sobre Reality Diffs como métrica de éxito) y hacia abajo (catálogo de claims, vertical slice, equivalencia por hash). Las modificaciones M1 y M2 resuelven el 80% de lo que probablemente motivó los REQUEST_CHANGES y REJECT previos.

El sistema merece ser construido. Merece ser construido con las modificaciones declaradas.

---

*Fin del veredicto. Sin halagos, sin rubber-stamping. Cada observación tiene cita de archivo o número de sección verificable en v2.*

END_OF_FILE
