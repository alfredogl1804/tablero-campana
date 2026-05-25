# Forja OS — Sovereign Agentic Fabric

> Documento de diseño, versión **v2** (fusión de las tres posiciones de auditoría).
> Esta versión absorbe (a) la propuesta evolutiva de ChatGPT 5.5 Pro tras leer el veredicto de Perplexity, (b) el AUDIT MANUS — FORJA OS MAX CROSS-VALIDATION con verificación archivo:línea contra el commit `b52a688` del repo, (c) las siete absorciones de Perplexity que no estaban en v1, y (d) preserva literal la tesis ontológica de v1.
> Su único propósito es congelar la dirección aprobada para evolucionar `tablero-campana` desde un dashboard 3D hacia una **interfaz operativa soberana para construir El Monstruo**.
> No es código. No es deploy. No es promesa de producción. Es contrato de diseño.

**Cambios visibles respecto a v1:** secciones nuevas 11 a 26, expansión de §10 (núcleo construible) y §13 (checklist). Las secciones 1 a 9 y 12 (ejemplos sobre el repo) se preservan literal con retoques mínimos para mantener compatibilidad referencial. Se incorpora doctrina `Power vs Activation`, Power Lanes L0–L6, Capability States en cinco grados, vertical slice v0.1 MAX, Mission Capsule serializada con hash canónico, catálogo de claims permitidos, catálogo de evidence kinds, invariante "el World Model se invoca, no se modela", Reverse Op Catalog, Power Lane Engine como middleware tRPC, doctrina de seguridad con `credential_handle` y RLS, capabilities apagadas por default, riesgos P0/P1 con citas archivo:línea verificadas, primer sprint implementable y checklist v2.

---

## 1. Por qué existe

Hoy `tablero-campana` es un **tablero 3D vivo**: visualiza el genoma del Monstruo (62 nodos), narra su estado con un cerebro Gemini, permite viajar en el tiempo, conmutar lentes y anotar incidentes. Es excelente como **espejo de la realidad**, pero sigue siendo un observador.

**Forja OS** convierte ese espejo en una **ciudad operativa**: un sistema donde el usuario no solo mira el Monstruo, sino que lo construye, lo gobierna y lo audita desde la misma superficie. El tablero deja de ser un panel de lectura y pasa a ser el sistema operativo desde el cual se emiten intenciones, se compilan en misiones, se ejecutan contra el mundo modelado, se prueban con evidencia y se aprueban o se bloquean bajo reglas explícitas.

El cambio de naturaleza es el siguiente: **del dashboard al fabric**. De ver métricas a gobernar cambios verificables sobre una realidad operacional modelada.

---

## 2. Tesis central

**Forja OS no es un chat multi-agente. No es un dashboard mejor. No es una IDE con copilotos.**

Es un sistema que **gobierna cambios verificables sobre una realidad operativa modelada**. Los agentes existen, pero son ciudadanos del fabric, no protagonistas. El protagonista es la **misión**: una unidad atómica de intención que entra al sistema, atraviesa física, evidencia y corte, y solo entonces puede tocar el mundo.

La diferencia es ontológica:

- Un chat multi-agente **coordina conversaciones**.
- Un dashboard **muestra estado**.
- Forja OS **modela el mundo, compila intenciones, ejecuta bajo física, recolecta evidencia, juzga con soberanía y archiva memoria verificable**.

Si no hay cambio verificable sobre el mundo modelado, el sistema no hizo nada — aunque haya consumido tokens, generado prosa o pintado pixeles.

La consecuencia operacional inmediata, ratificada en v2 por el cruce de las tres auditorías, es que **el éxito del sistema no se mide por la cantidad de agentes que actúan, ni por la elegancia de la prosa que producen, ni por la riqueza visual de las lentes 3D, sino por la cantidad de Reality Diffs firmados, archivados y recuperables por hash canónico que el operador único acumula a lo largo del tiempo**. Todo lo demás es plumbing necesario para que esa métrica suba.

---

## 3. La fórmula

```
Forja OS  =  World Model
           + Intent Compiler
           + Mission Physics
           + Agent Market
           + Evidence VM
           + Sovereign Court
           + Execution Fabric  ── gobernado por ──>  Power Lane Engine (L0–L6)
           + Memory Evolution                                  │
           + Reality Diff                                       ├── Reverse Op Catalog
           + GitHub Connector (write limitado)                  │
           + Browser QA Evidence                                └── Kill-switch global por capability
```

Cada sumando es un plano independiente con contrato propio. Ninguno depende del estilo de prosa de un LLM. Todos producen artefactos tipados, versionados y diffables.

La diferencia esencial frente a v1: **Power Lane Engine, Reverse Op Catalog, GitHub Connector y Browser QA Evidence quedan declarados en la fórmula del fabric**, no como mejoras laterales. Esto materializa la convergencia entre *máximo poder diseñado* y *activación gradual disciplinada* — la tesis que sale del cruce de las tres posiciones.

---

## 4. Los siete planos canónicos más conectores externos

### 4.1 World Model

Representación tipada, viva y consultable del estado del Monstruo. No es un dump de métricas: es un grafo de entidades (nodos del genoma, distritos, dependencias, presupuestos, contratos, equipos) con invariantes y relaciones. El estado actual de `liveBoard` es el embrión; Forja OS lo extiende a un modelo formal con identidad estable, snapshots y diff nativo entre versiones.

**Invariante v2 (absorción Perplexity #4):** el World Model **no se modela, se invoca**. Cualquier cápsula que pretenda razonar sobre el genoma sin pasar por `runBuildScript` (`server/routers/board.ts:69-112`) está alucinando. La fuente única de verdad del estado del Monstruo es la salida idempotente de ese script, persistida vía `persistSnapshot` con `payload_sha` (`server/routers/board.ts:124-143`). Mission Physics, Intent Compiler y Evidence VM **operan sobre snapshots del World Model, jamás sobre representaciones inventadas o sintetizadas por LLM**.

### 4.2 Intent Compiler

Convierte una intención en lenguaje natural (ejemplo: *"acelerar Dory en distrito 3 sin tocar tesorería"*) en una **Mission Capsule** tipada: objetivo, alcance, restricciones, criterios de aceptación, presupuesto, ventana temporal. El compilador rechaza intenciones ambiguas o no aterrizables sobre el World Model.

**Middleware obligatorio v2 (absorción Perplexity #5 y #6):** el Intent Compiler valida `compiledGoal.target ⊆ validIds` reutilizando el patrón ya existente en `server/routers/omnibox.ts:202-213`, donde la regex `/\[@([a-z0-9_]+)\]/gi` filtra contra el conjunto `validIds.has(id)` derivado de `boardSnapshots` actual. Toda referencia a un nodo no presente en el snapshot vigente se rechaza con `INVALID_TARGET_REFERENCE`. La compilación nunca ocurre sin un `worldSnapshotBeforeId` referenciable.

### 4.3 Mission Physics

Reglas del universo. Define qué transformaciones son legales sobre el World Model: conservación de invariantes (presupuesto, deuda técnica, capacidad), precondiciones, efectos esperados, costos. Es a Forja OS lo que la física es a un motor de juegos: nada se ejecuta si viola las leyes.

**Restricción v2 (absorción Perplexity #1 y #4):** mientras `boardSnapshots.payload` siga siendo `json("payload").notNull()` opaco (`drizzle/schema.ts:55`), Mission Physics opera con verificadores que parsean el JSON, no con invariantes formales sobre tipos del World Model. Declarar transformaciones del estilo `optimize_latency` con invariantes formales evaluables sin LLM **es objetivo de v0.2 cuando exista un World Model tipado consultable vía SQL**, no de v0.1.

### 4.4 Agent Market

Mercado abierto de agentes especialistas (cada uno con capacidades, costo, latencia, historial de evidencia aceptada). Las misiones se subastan o se asignan según política. Los agentes no conversan: postulan, ejecutan y entregan evidencia. Su reputación es función de evidencia validada, no de prosa generada.

**Estado en v0.1 (capability states §13):** Agent Registry queda `ENABLED` con una sola fila — `agent_id = "gemini_reasoning_top"` — apuntando al backend que ya usa `omnibox.ts:159` y `contextActions.ts:261` vía `@google/genai^2.6.0` (`package.json:18`). Agent bidding, reputación y pricing quedan `DESIGNED` (schema y router presentes) pero no `ENABLED` hasta que exista un segundo backend de razonamiento real.

### 4.5 Evidence VM

Máquina virtual de evidencia. Cada *claim* (los tests pasan, el nodo X bajó su latencia, el presupuesto se respetó) debe presentarse como artefacto verificable: log, hash, traza, snapshot, output reproducible. La VM ejecuta verificaciones deterministas. **Sin evidencia ejecutable, el claim no existe.**

**Catálogo cerrado v2 (absorción Perplexity #2 y #5):** `evidence.kind ∈ { "url", "screenshot", "file", "log", "sql_result", "llm_proposal", "deterministic_check", "test_report", "screenshot_diff", "github_artifact" }`. Cualquier evidencia con `kind` fuera de este enum es rechazada al insertarse. Los claims se construyen con `predicate ∈ { "exists_node", "node_status_eq", "file_exists", "test_passes", "commit_sha_present", "screenshot_diff_below", "metric_below", "metric_above", "invariant_holds" }`. Extender el catálogo requiere PR de diseño, no se hace en runtime.

**Gate v2:** una cápsula no puede pasar a `accepted` si todos sus claims están verificados únicamente por evidencia con `kind: "llm_proposal"`. Al menos un claim debe tener verificador determinista (`deterministic_check`, `test_report`, `screenshot_diff`, `github_artifact`, `sql_result`). Esto cierra el vector de "el mismo LLM propone y verifica".

### 4.6 Sovereign Court

Capa de gobierno. Aplica reglas explícitas para aceptar o rechazar el cambio de estado propuesto por una misión: ¿la evidencia cubre todos los criterios?, ¿la física fue respetada?, ¿el costo encaja en presupuesto?, ¿hay conflicto con misiones en vuelo? El usuario es juez supremo; la corte le presenta el caso con todos los artefactos, no con un resumen narrativo.

**Patrón v2:** la Court emite **un ruling por criterio**, no por misión global. La decisión final de la cápsula es función pura de los rulings y se persiste en `missions.status`. El operador único firma la cápsula completa, salvo en lanes L4 y L5 donde firma cápsula más cada ruling con `risk = P0`.

### 4.7 Execution Fabric

Tejido de ejecución. Toma misiones aprobadas y las aplica al mundo real (repo, infra, contratos, presupuestos) bajo idempotencia, reversibilidad y trazabilidad. Cada ejecución produce un `world_state_after` firmado.

**Cambio doctrinal v2:** la propiedad universal *"cada efecto tiene su anti-efecto"* presente en v1 se reemplaza por **Reverse Op Catalog** (§20). Sólo las operaciones presentes en `reverse_op_catalog` con `enabled = true` pueden ejecutarse en lane L4. El resto requiere lane L5 con checklist explícito de irreversibilidad firmado por el operador único. Esta corrección viene de la auditoría Perplexity, que demostró que la propiedad universal es falsa para deploys de producción, rotación de secretos, envío de correos y pagos.

### 4.8 Memory Evolution (transversal)

Toda misión cerrada — aceptada o rechazada — alimenta la memoria del sistema: patrones, anti-patrones, costos reales vs estimados, agentes confiables, decisiones de la corte. La memoria no es un log; es un sustrato que ajusta la física, los precios del mercado y la prioridad de las lentes.

**Restricción v0.1 (absorción Perplexity y discrepancia controlada con ChatGPT #30):** `memory.archive` queda `ENABLED` desde v0.1 — toda cápsula cerrada deja Reality Diff con hash. `memory.evolve_policy` (la versión oráculo que reescribe Mission Physics o el pricing del mercado) queda `AUTONOMOUS_ZONE`, prohibida en v0.1, requiere DSC firmado del Soberano y lane L6 explícita.

### 4.9 Conectores externos (nuevos en la fórmula v2)

#### 4.9.1 GitHub Connector — write limitado

Cliente Octokit instanciado server-side con PAT scoped a `tablero-campana` y los scopes mínimos `contents:write`, `pull-requests:write`, `issues:write`. El PAT vive en Manus secrets vía `webdev_request_secrets`, jamás en `.env` plano, jamás dentro de cápsulas. Las operaciones soportadas son `gh.readRepo` (sin gate), `gh.createIssue`, `gh.createBranch` no `main`, `gh.commitToBranch`, `gh.openPRDraft` (todas con T1 gate humano y lane mínima L3), y `gh.mergePR` (lane L4, `DESIGNED` pero `DISABLED` por default en v0.1). Branch protection sobre `main` es prerequisito de activación.

#### 4.9.2 Browser QA Evidence

Servicio interno que expone `qa.captureScreenshot` y `qa.diffScreenshot`. La condición técnica habilitante ya existe en el repo: `client/src/components/board/IsometricBoard.tsx:206` declara `preserveDrawingBuffer: true` precisamente para que screenshots reproducibles del Canvas sean posibles, propiedad ya validada empíricamente en v2.3 según el comentario explicativo de la línea 204. v0.1 limita su scope a el propio frontend del tablero — auto-QA — y a páginas estáticas de Manus referenciadas por las cápsulas. Diff por píxeles con `pixelmatch`, threshold declarado por el verificador, mascarillas sobre regiones animadas (`useFrame` con lerp en `IsometricBoard.tsx:50-60`) para suprimir false-positives.

---

## 5. Modos / lentes de la UI

Forja OS reutiliza el sistema de lentes ya presente en el tablero (T4 del Sprint v3.0) y lo expande:

1. **City Mode** — vista panorámica del Monstruo como ciudad operativa. Distritos, flujos, semáforos. Default para el Modo Papá.
2. **Build Mode** — composición de misiones. El usuario selecciona un nodo y declara intención; el compilador pinta la cápsula tipada en tiempo real.
3. **Simulation Mode** — la misión se ejecuta contra una copia del World Model bajo Mission Physics. Se ve el `world_state_after` proyectado antes de tocar la realidad. **Estado v0.1: `WIRED` no `ENABLED`** — requiere World Model tipado para ser realmente simulación, no animación cosmética.
4. **Swarm Mode** — visualiza al Agent Market: quién postula, quién ejecuta, evidencia entrante en vivo. **Estado v0.1: `WIRED` no `ENABLED`** — requiere ≥2 agentes reales, hoy hay uno.
5. **Evidence Mode** — lectura forense. Cada claim de una misión expandido en sus artefactos verificables. **Estado v0.1: `ENABLED`**.
6. **Court Mode 2D** — sala de la Sovereign Court versión panel. La misión presentada con criterios, evidencia, voto recomendado por reglas y decisión final del usuario. **Estado v0.1: `ENABLED`**, vive como panel dentro de `ContextCard` siguiendo el patrón ya probado de `ContextActionsPanel` (T6, `todo.md:142-149`).
7. **Court Mode 3D** — versión inmersiva con lente 3D dedicada. **Estado v0.1: `WIRED` no `ENABLED`** hasta cerrar al menos diez cápsulas en Court Mode 2D y validar que Modo Papá sobrevive. Activación bajo decisión binaria del operador.

Las lentes son conmutables con la animación lerp ya implementada (`IsometricBoard.tsx:50-60`); no son pantallas distintas, son **proyecciones** sobre el mismo World Model. v0.1 no añade lentes 3D nuevas; el Canvas R3F no se toca.

---

## 6. Objeto central: Mission Capsule

La Mission Capsule es el átomo del sistema. Todo lo demás existe para producir, evaluar, ejecutar o archivar cápsulas.

```ts
type MissionCapsule = {
  id: string;                       // ULID estable
  createdAt: string;                // ISO
  submittedAt?: string;             // primera transición a in_review
  decidedAt?: string;               // ruling final del Court
  appliedAt?: string;               // post Execution Fabric
  rejectedAt?: string;
  author: { kind: "human" | "agent"; id: string };

  intent: string;                   // intención original en lenguaje natural
  compiledGoal: {                   // salida del Intent Compiler
    target: NodeRef[];              // nodos del genoma afectados — validados contra validIds
    transformation: string;         // verbo legal según Mission Physics
    constraints: Constraint[];      // invariantes a respetar
    acceptanceCriteria: Claim[];    // qué hay que probar para aceptar
    budget: { tokens?: number; cost?: number; deadline?: string };
  };

  // Lane y permisos — middleware Power Lane Engine los consume.
  powerLane: "L0" | "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

  // Anclaje al World Model — referencias FK con onDelete: 'restrict' en ambos lados.
  world_state_before: WorldSnapshotRef;  // boardSnapshots.id, FK restrict
  world_state_after?: WorldSnapshotRef;  // boardSnapshots.id, FK restrict

  physics: {
    preconditions: Check[];         // evaluadas por Mission Physics
    expectedEffects: Effect[];
    forbiddenEffects: Effect[];
  };

  market: {
    assignedAgent?: AgentRef;       // FK a agent_registry.agentId
    bids?: AgentBid[];              // DESIGNED, no ENABLED en v0.1
    history: AgentStep[];
  };

  evidence: EvidenceArtifact[];     // alimentada por Evidence VM, kind ∈ enum cerrado
  court: {
    status: "draft" | "in_review" | "accepted" | "rejected" | "deferred" | "applied";
    rulings: Ruling[];              // por criterio, no por cápsula
    decidedBy?: { kind: "rule" | "human"; id: string };
  };

  execution?: {
    applied: boolean;
    appliedAt?: string;
    reversible: boolean;
    reverseOpRef?: string;          // FK a reverse_op_catalog.opName
    realityDiffId: string;          // FK a mission_reality_diffs.id
  };

  memory: {
    tags: string[];
    learnings: string[];            // alimenta Memory Evolution
  };

  // Credenciales referenciadas, jamás embebidas — absorción Perplexity #7.
  credentialHandles?: string[];     // FK a credential_handles.handle
};
```

Los campos críticos siguen siendo **`world_state_before`** y **`world_state_after`**: sin ellos no hay misión, hay narrativa. La FK con `onDelete: 'restrict'` en ambos lados (corrección v2 absorbida de Perplexity #6) garantiza que las cadenas de Reality Diff sobreviven a cualquier garbage collection futura del histórico de snapshots: una cápsula aplicada hace meses mantiene su `after` referenciable y por tanto su Reality Diff es decidible para siempre.

### 6.1 Mission Capsule serializada y hash canónico

La cápsula tiene **dos representaciones**: la fila Drizzle (mutable, indexable, cambia conforme avanza el ciclo de vida) y un `mission.canonical_json` (inmutable, hasheable, firmable). El `canonical_json` se calcula por serialización determinista de los campos `intent`, `compiledGoal`, `powerLane`, `world_state_before` (con su hash de payload), `physics.preconditions` y `physics.expectedEffects`. Excluye explícitamente `evidence`, `court`, `execution` y `memory` para que el hash sea estable a lo largo del ciclo. Su SHA-256 se persiste como `mission.canonical_hash` y se duplica en `mission_reality_diffs.input_hash` cuando la cápsula entra a Execution Fabric.

**Por qué importa:** dos cápsulas con el mismo `canonical_hash` son **equivalentes en intención** sin importar quién las redactó ni qué LLM las compiló. El sistema puede detectar duplicados, recuperar precedentes, calcular precios de mercado por equivalencia y archivar memoria por hash en lugar de por texto. Esto es la base técnica de la propiedad 10x (§9): no comparamos prosa, comparamos contratos firmados.

---

## 7. Innovación central: Reality Diff

**Reality Diff** es la salida obligatoria de toda misión que llega a Execution Fabric. Es la diferencia tipada entre `world_state_before` y `world_state_after`, expresada en términos del World Model:

- nodos creados / eliminados / modificados,
- aristas del grafo añadidas / removidas,
- métricas que cambiaron (con delta firmado),
- invariantes que se conservaron o se violaron,
- efectos colaterales sobre misiones en vuelo.

El Reality Diff es lo que la Sovereign Court aprueba o rechaza, no la prosa del agente. Es lo que la memoria archiva. Es lo que el usuario revisa en Court Mode.

**Si dos misiones generan el mismo Reality Diff, son equivalentes — sin importar qué agente, qué prompt o qué modelo las produjo.** Esa equivalencia es la base del mercado y de la memoria.

### 7.1 Hash determinista y recuperación por equivalencia

Cada Reality Diff persiste en `mission_reality_diffs` con tres hashes: `input_hash` (igual al `canonical_hash` de la cápsula), `output_hash` (hash determinista del diff resultante) y `delta_hash` (`input_hash || output_hash`). El índice sobre `output_hash` permite recuperación por equivalencia en O(1): "muéstrame todas las cápsulas pasadas cuyo Reality Diff fue equivalente a este". Esto es lo que convierte la memoria en oráculo recuperable, no en log narrativo.

---

## 8. Diferencia con la propuesta previa de ChatGPT 5.5 Pro

La propuesta previa de ChatGPT 5.5 Pro (anterior a Forja OS v1) orbitaba alrededor de un **orquestador multi-agente conversacional** sobre el tablero. Forja OS conserva la noción de pluralidad de agentes pero **añade los planos que esa propuesta no tenía**:

| Plano                    | ChatGPT 5.5 Pro pre-Forja | Forja OS v2 |
|---|---|---|
| World Model formal       | implícito                  | **tipado, versionado, diffable, anclado a `runBuildScript`** |
| Mission Physics          | ausente                    | **reglas de transformación legales con fallback a verificadores que parsean JSON** |
| Agent Market             | chat coordinado            | **mercado con reputación por evidencia, designed pero ENABLED parcial en v0.1** |
| Evidence VM              | ausente                    | **verificación determinista de claims con `kind` enum cerrado** |
| Sovereign Court          | aprobación informal        | **gobierno explícito con rulings por criterio** |
| Reality Diff             | ausente                    | **artefacto obligatorio con hash canónico, recuperable por equivalencia** |
| Power Lanes L0–L6        | ausente                    | **doctrina explícita con kill-switch global por capability** |
| GitHub write             | ausente                    | **conector limitado y auditado, ENABLED desde v0.1 con T1 gates** |
| Browser QA Evidence      | ausente                    | **servicio mínimo aprovechando `preserveDrawingBuffer:true` ya presente** |
| Reverse Op Catalog       | ausente                    | **catálogo cerrado, sustituye la propiedad universal falsa "cada efecto tiene su anti-efecto"** |
| Capability States        | ausente                    | **5 estados (DESIGNED/WIRED/ENABLED/T1_ONLY/AUTONOMOUS_ZONE) por capability** |
| `credential_handle`      | ausente                    | **doctrina obligatoria — secretos jamás embebidos en cápsulas** |

La propuesta anterior optimiza **conversación entre agentes**. Forja OS v2 optimiza **cambio verificable sobre el mundo, con poder máximo diseñado y activación gradual disciplinada**.

---

## 9. Por qué esto es 10x

No porque tenga más agentes, más modelos o más UI. Es 10x porque cambia la pregunta:

- Multi-agente clásico pregunta: *"¿cómo coordino N agentes para que colaboren?"*
- Forja OS pregunta: *"¿qué cambio sobre la realidad fue verificado, aprobado y aplicado, y por quién responde?"*

Coordinar agentes es un problema de prompt y plumbing. **Gobernar cambios verificados** es un problema de sistema. El primero produce demos; el segundo produce infraestructura sobre la que se puede construir El Monstruo sin que cada paso dependa del estilo de prosa de un LLM ni de la fe del operador.

La propiedad **10x específica** que v2 desbloquea sobre v1 es la **recuperación por equivalencia**: dos cápsulas que producen el mismo Reality Diff son intercambiables. El operador puede preguntar al sistema "¿he hecho algo equivalente antes?" y recibir respuesta determinista por hash, no aproximada por similitud textual. Esa propiedad sólo es posible cuando (a) la cápsula está serializada canónicamente, (b) el Reality Diff tiene hash determinista, (c) el World Model es invocado y no inventado, y (d) los claims viven en un catálogo cerrado. Las tres absorciones Perplexity más relevantes (`canonical_hash`, `evidence.kind` enum, claim catalog) son las que materializan ese 10x.

---

## 10. Doctrina: Power vs Activation

> Forja OS does not remove power to reduce risk.
> Forja OS separates **designed power** from **activated power**.
> Every capability has two independent states:
> - **designed**: exists in the architecture and data model
> - **enabled**: allowed to act under a Power Lane
>
> A capability may be designed in v0.1 but enabled only after evidence gates, T1 approval, rollback path, budget cap and kill-switch exist.

Esta es la doctrina central de v2. Reemplaza la falsa dicotomía entre **versión MVP prudente** (que castra capacidad) y **versión MAX cruda** (que se autoboicotea). La síntesis es: **diseñar todo el fabric desde v0.1 y activar progresivamente por lanes**, con kill-switch global por capability operativo desde el primer commit.

Cada capability del sistema declara dos campos ortogonales:

- **State** — uno de cinco estados discretos (§12).
- **Lane** — la lane mínima requerida para que una cápsula la invoque.

El motor (§21) consulta ambos antes de invocar cualquier handler. Si el state es `DESIGNED` o `WIRED`, el handler responde con `CAPABILITY_NOT_ENABLED`. Si el state es `ENABLED` pero la lane de la cápsula es inferior a la mínima requerida, el handler responde con `LANE_INSUFFICIENT`. Si el state es `T1_ONLY` y no hay ruling firmado por el operador único para esa cápsula específica, el handler responde con `T1_GATE_REQUIRED`. Si el state es `AUTONOMOUS_ZONE` y la cápsula no fue emitida por una zona autorizada, el handler responde con `OUTSIDE_AUTHORIZED_ZONE`.

El kill-switch global vive en `capability_switches` y permite forzar cualquier capability a `state = DESIGNED` en runtime sin redeploy, vía mutación `protectedProcedure` firmada por el operador único.

---

## 11. Power Lanes L0–L6

Cada lane tiene un dominio de efectos, un gate de activación y un conjunto de evidencias mínimas exigidas. El motor las aplica como capa transversal a TODA capability del sistema.

| Lane | Nombre | Dominio de efectos | Gate de activación | Evidencia mínima | Reversibilidad |
|---|---|---|---|---|---|
| **L0** | Observe | Sólo lectura del World Model y del repo | Ninguno | Ninguna | N/A — sin efectos |
| **L1** | Plan | Cápsula en estado `draft`, compilación de intención, simulación contra snapshot existente | `protectedProcedure` | `compiledGoal` válido (no vacío, target ⊆ validIds) | N/A — sólo en memoria + tabla |
| **L2** | Swarm | Asignación a agentes, llamadas LLM, generación de propuestas, votación interna entre agentes (cuando exista >1) | `protectedProcedure` + `mission.budget.tokens` declarado | Trazabilidad por `mission_agent_contracts`; cada llamada LLM produce artefacto en `mission_evidence` con `kind: "llm_proposal"` | Reversible por default — la propuesta no toca nada |
| **L3** | Draft Execution | Sandbox: branch nuevo no `main`, commits a esa branch, PR draft, screenshot diff sobre preview interno | T1 gate humano por cápsula + PAT scoped + branch protection en `main` activa | Diff de archivos firmado, hash del PR draft, screenshot Browser QA diff, Vitest verde sobre la branch | Reversible: cerrar PR draft, borrar branch |
| **L4** | Controlled Execution | Mundo real catalogado como reversible: merge a `main`, escritura a tabla específica con backup previo, deploy preview con redeploy de versión anterior preconfigurado | T1 gate humano por cápsula + lane explícitamente activada por env (`FORJA_LANE_L4=on`) + `reverseOp` validado contra Reverse Op Catalog | Toda evidencia de L3 + snapshot de DB pre-write + redeploy plan documentado | Reversible vía `reverseOp` declarado y testeado |
| **L5** | Production Action | Mundo real **no reversible**: deploy producción, secret rotation, email enviado, pago | T1 gate humano por capability **individual** dentro de la cápsula, no por cápsula completa; firma textual del operador único en cliente; lane apagada por default y se enciende por sesión | Toda evidencia de L4 + checklist de irreversibilidad firmada + kill-switch armado | Irreversible — el `reverseOp` es "rollback parcial documentado", no anti-efecto real |
| **L6** | Autonomous Operating Zone | Cápsulas que se autosometen, agentes que escogen lane, política que ajusta presupuestos | **PROHIBIDA en v0.1**; activación requiere DSC firmado del Soberano y rediseño formal del sistema | N/A | N/A |

**Regla de monotonía:** una cápsula sólo puede ejecutar capabilities cuya lane mínima sea menor o igual a `mission.powerLane`. Subir lane requiere endpoint `protectedProcedure` con confirmación textual del operador único en el cliente. Bajar lane es libre. Una vez subida, la lane no puede revisarse hacia abajo dentro del mismo ciclo de cápsula sin reiniciar el ciclo.

---

## 12. Capability States — los cinco grados

Cada capability declara su estado actual. El motor consulta este estado antes de cualquier ejecución.

| Estado | Significado | Quién lo cambia | Persistencia |
|---|---|---|---|
| `DESIGNED` | Existe en schema y router, handler responde con `CAPABILITY_NOT_ENABLED` | Default al crear capability | `capability_switches.state = 'DESIGNED'` |
| `WIRED` | Schema, router y dependencias presentes; handler responde a peticiones de prueba pero rechaza efectos reales | Operador único vía `kill_switch.toggleState` | `capability_switches.state = 'WIRED'` |
| `ENABLED` | Operativa para cápsulas con lane suficiente; sin gate adicional | Operador único + `capability_switches.gate_passed = true` | `capability_switches.state = 'ENABLED'` |
| `T1_ONLY` | Operativa sólo cuando hay ruling firmado por operador único para la cápsula específica | Doctrina por capability — algunas son T1_ONLY por design (ejemplo: `gh.mergePR`) | `capability_switches.state = 'T1_ONLY'` |
| `AUTONOMOUS_ZONE` | Operativa sólo dentro de zonas autorizadas explícitamente — para v0.1 esto significa **prohibida** | DSC firmado del Soberano | `capability_switches.state = 'AUTONOMOUS_ZONE'` |

**Transiciones legales:**

```
DESIGNED ──▶ WIRED ──▶ ENABLED ──▶ T1_ONLY ──▶ AUTONOMOUS_ZONE
   ▲           │          │            │              │
   │           │          │            │              │
   └───────────┴──────────┴────────────┴──────────────┘
              kill-switch puede regresar a DESIGNED desde cualquier estado
```

Toda transición se persiste en `capability_state_log` con autor, timestamp, justificación y hash del DSC asociado cuando aplica. Esto produce un audit trail completo de decisiones de activación, recuperable por capability o por sesión.

---

## 13. v0.1 MAX Vertical Slice

> v0.1 is not a passive ledger.
> v0.1 must prove the full fabric in **one controlled path**:
>
> Intent → Mission Capsule → Agent Contract → Output Ingestion → Claim Extraction → Evidence VM → Ruling → Reality Diff → T1 Decision → GitHub artifact / issue / PR draft → Memory Lesson
>
> No production deploy.
> No merge without T1.
> No DB write outside Forja tables.
> No secrets in capsules.

Esta es la condición binaria de salida del sprint v0.1. **Si una sola cápsula real recorre los 11 pasos, Forja OS existe. Si no, ningún plano adicional se construye hasta que el ciclo cierre.**

### 13.1 Los 11 pasos en detalle

1. **Intent.** El operador único hace tap sobre un nodo del genoma en City Mode (ejemplo: `dory.core`). La selección abre `CapsuleDraftPanel` dentro de `ContextCard`, prefiltrado con `target = [dory.core]`.

2. **Mission Capsule.** El operador escribe la intención en lenguaje natural. El Intent Compiler produce `compiledGoal` con `target ⊆ validIds`, `transformation` legal, `acceptanceCriteria` con al menos un claim del catálogo cerrado. La cápsula se persiste en `missions` con `status = 'draft'`, `powerLane = 'L1'`. El `canonical_hash` se calcula y se persiste.

3. **Agent Contract.** El motor asigna `agent_id = "gemini_reasoning_top"` desde `agent_registry` (única fila ENABLED en v0.1). Se crea fila en `mission_agent_contracts` con `prompt`, `budget.tokens`, `started_at`. La cápsula sube a `powerLane = 'L2'`.

4. **Output Ingestion.** El agente Gemini produce respuesta vía `@google/genai^2.6.0` (mismo cliente que `omnibox.ts:159`). El output se persiste en `mission_evidence` con `kind: "llm_proposal"`, `mission_agent_contracts.completed_at` se firma, `mission_agent_contracts.tokens_used` se acumula contra el presupuesto.

5. **Claim Extraction.** El Intent Compiler relee el output y extrae claims del catálogo cerrado (§17). Cada claim se persiste en `mission_claims` con `predicate`, `target`, `expected_value`. Claims que no encajan en el catálogo son rechazados con `INVALID_PREDICATE`.

6. **Evidence VM.** Para cada claim, la VM ejecuta el verificador determinista correspondiente (§18). Cada verificación produce `mission_evidence` con `kind ∈ enum` y `signed_at`. Cápsulas con todos sus claims en `kind: "llm_proposal"` no pueden avanzar — al menos uno debe ser determinista.

7. **Ruling.** La Sovereign Court emite un `mission_t1_decisions` por cada claim (`accept`/`reject`/`block`/`defer`). El conjunto determina `missions.status` por regla pura.

8. **Reality Diff.** Si todos los rulings son `accept`, Execution Fabric calcula el diff entre `world_state_before` y un `world_state_after` simulado (en v0.1 toda ejecución sobre el mundo es vía Lane L3 — sandbox branch — no sobre el genoma directamente). El diff se persiste en `mission_reality_diffs` con `input_hash`, `output_hash`, `delta_hash`.

9. **T1 Decision.** El operador único revisa la cápsula completa en Court Mode 2D — claims, evidencia, rulings, Reality Diff, costos reales — y firma. La firma se persiste en `missions.decided_by` y `missions.decided_at`.

10. **GitHub artifact / issue / PR draft.** Si la cápsula firmada en L3 incluye una capability `gh.*`, el conector ejecuta. Para v0.1 el alcance es: crear issue documentando la cápsula, crear branch con prefijo `mission/<ulid>`, abrir PR draft con el diff. Cada operación se persiste en `gh_operations` con `lane_at_execution`, `payload`, `result_ref`, `succeeded`.

11. **Memory Lesson.** La cápsula cerrada (aceptada o rechazada) deja `learnings: string[]` que se archiva en `memory.archive`. La fila en `mission_reality_diffs` queda recuperable por `output_hash` para futuras consultas de equivalencia.

### 13.2 Criterio de salida del sprint v0.1

Una cápsula cuyo `acceptanceCriteria` incluya al menos un claim verificable determinístico (ejemplo: `boardSnapshots.payload_sha permanece estable tras la operación O`, o `tests.suite == 'green'`), recorre los 11 pasos, produce `mission_reality_diffs` con `output_hash` calculado, y el operador único firma `court.decide` desde la UI Modo Papá. Si ese caso real cierra, Forja OS existe. Si no, ningún plano adicional se construye hasta que el ciclo cierre.

### 13.3 Lo que el sprint v0.1 NO incluye

- Simulation Mode operativa (requiere World Model tipado).
- Swarm Mode operativa (requiere ≥2 agentes reales).
- Build Mode 3D inmersivo (lente nueva).
- Court Mode 3D inmersivo (lente nueva).
- Agent Market con bids, reputación y pricing.
- Deploy preview operativo (`railway.deployPreview` queda DESIGNED).
- Deploy producción (`railway.deployProduction` queda DESIGNED).
- Scheduler autónomo de cápsulas (requiere cron Heartbeat operativo, hoy bloqueado per `todo.md:68`).
- Memory Evolution oracle (`memory.evolve_policy` queda AUTONOMOUS_ZONE).
- Lentes 3D nuevas — el Canvas R3F (`IsometricBoard.tsx:205-219`) no se toca.

Todo lo anterior existe en el repo desde v0.1 como filas en `capability_switches` con `state ∈ {DESIGNED, WIRED, AUTONOMOUS_ZONE}` y router que rechaza con error tipado correspondiente. **Esto es lo que diferencia diseño completo de promesa vacía.**

---

## 14. Matriz Power Lane × Capability

Las **27 capabilities** del sistema, su lane mínima, su estado en v0.1, su gate y su evidencia mínima. La columna *Cita* referencia archivo:línea del repo `tablero-campana @ b52a688` cuando la capability ya existe en el código actual.

### 14.1 Capabilities ENABLED en v0.1 (vertical slice mínimo)

| # | Capability | Lane mín | State v0.1 | Gate | Evidence mín | Cita |
|---|---|---|---|---|---|---|
| 1 | `world.snapshot.read` | L0 | ENABLED | `protectedProcedure` | Ninguna | `board.ts:30-50` |
| 2 | `world.snapshot.refresh` | L1 | ENABLED | `protectedProcedure` + idempotencia por `payload_sha` | Hash del snapshot | `board.ts:69-143` |
| 3 | `mission.draft` | L1 | ENABLED | `protectedProcedure` | Validación target⊆validIds | nuevo |
| 4 | `mission.compile` | L1 | ENABLED | `protectedProcedure` + middleware de validación | `compiledGoal` no vacío | nuevo (patrón `omnibox.ts:202-213`) |
| 5 | `mission.submit` | L2 | ENABLED | `protectedProcedure` + budget declarado | Fila en `mission_agent_contracts` | nuevo |
| 6 | `agent.invoke.gemini_top` | L2 | ENABLED | budget.tokens ≤ cap por sesión | Artefacto `llm_proposal` con tokens_used | `omnibox.ts:157-176` |
| 7 | `claim.extract` | L2 | ENABLED | predicate ∈ catálogo | Filas en `mission_claims` | nuevo |
| 8 | `evidence.verify.deterministic` | L2 | ENABLED | verifier ∈ enum | `mission_evidence.kind = 'deterministic_check'` | nuevo |
| 9 | `court.rule_per_claim` | L2 | ENABLED | `protectedProcedure` | Fila en `mission_t1_decisions` por claim | nuevo |
| 10 | `court.decide` | L2 | ENABLED | T1 firma operador único | `missions.decided_by` + `decided_at` | nuevo |
| 11 | `reality_diff.compute` | L2 | ENABLED | input_hash y output_hash calculados | Fila en `mission_reality_diffs` | nuevo |
| 12 | `memory.archive` | L2 | ENABLED | Cápsula en estado terminal | `mission.memory.tags` no vacío | nuevo |
| 13 | `qa.captureScreenshot` | L1 | ENABLED | scope ⊆ {`tablero-campana frontend`, `manus-static`} | Artefacto con hash | nuevo (habilitado por `IsometricBoard.tsx:206`) |
| 14 | `qa.diffScreenshot` | L2 | ENABLED | threshold declarado | `mission_evidence.kind = 'screenshot_diff'` | nuevo |
| 15 | `gh.readRepo` | L0 | ENABLED | PAT scoped + `protectedProcedure` | Ninguna | nuevo |
| 16 | `gh.createIssue` | L3 | ENABLED | T1 gate por cápsula + cita de cápsula en body | `gh_operations.result_ref = issue_url` | nuevo |
| 17 | `gh.createBranch` | L3 | ENABLED | nombre con prefijo `mission/<ulid>` | `gh_operations.result_ref = branch_ref` | nuevo |
| 18 | `gh.commitToBranch` | L3 | ENABLED | branch ≠ `main` + diff firmado en cápsula | `gh_operations.result_ref = commit_sha` | nuevo |
| 19 | `gh.openPRDraft` | L3 | ENABLED | base = `main`, head = `mission/<ulid>`, draft = true | `gh_operations.result_ref = pr_url` | nuevo |
| 20 | `kill_switch.toggleState` | L1 | ENABLED | `protectedProcedure` + firma textual | `capability_state_log` | nuevo |

### 14.2 Capabilities DISEÑADAS en v0.1 pero NO ENABLED

| # | Capability | Lane mín | State v0.1 | Razón de no activación |
|---|---|---|---|---|
| 21 | `agent.invoke.alt_model` | L2 | DESIGNED | Falta segundo backend de razonamiento real |
| 22 | `agent.bidding` | L2 | DESIGNED | Requiere ≥2 agentes ENABLED |
| 23 | `gh.mergePR` | L4 | DESIGNED + T1_ONLY | Requiere `FORJA_LANE_L4=on` + Reverse Op Catalog completo + branch protection sobre `main` |
| 24 | `railway.deployPreview` | L4 | DESIGNED | Requiere Reverse Op Catalog + redeploy plan |
| 25 | `railway.deployProduction` | L5 | DESIGNED | Requiere `FORJA_LANE_L5=on` + checklist firmado de irreversibilidad |
| 26 | `secrets.rotate` | L5 | DESIGNED | Requiere lane L5 explícitamente activada por sesión |
| 27 | `memory.evolve_policy` | L6 | AUTONOMOUS_ZONE | PROHIBIDA en v0.1 — requiere DSC firmado del Soberano |

**Lectura binaria de la matriz:** v0.1 activa **20 de 27 capabilities** (74% del fabric operativo) y **diseña las 27** (100% del fabric existe en schema/router con kill-switch global). Eso es la diferencia entre Conservative Core (Perplexity sólo: 12 capabilities ENABLED, fabric incompleto) y MAX-con-lanes (la posición de v2: fabric completo, activación gradual con kill-switch global).

---

## 15. Catálogo cerrado de claims

> Un claim no listado en este catálogo no puede entrar a una cápsula.
> Extender el catálogo requiere PR de diseño con DSC firmado, no se hace en runtime.

### 15.1 Predicados estructurales (sobre el World Model)

- `exists_node(target: NodeRef)` — verifica que el nodo existe en `boardSnapshots[latest].payload`.
- `node_status_eq(target: NodeRef, expected: NodeStatus)` — verifica `boardNodes.status` para `snapshotId = latest`.
- `node_district_eq(target: NodeRef, expected: District)` — verifica `boardNodes.districtId`.
- `node_metric_below(target: NodeRef, metric: string, threshold: number)` — verifica métrica en `boardNodes.metadata.metrics[metric]`.
- `node_metric_above(target: NodeRef, metric: string, threshold: number)` — opuesto.
- `edge_exists(from: NodeRef, to: NodeRef)` — verifica `boardSnapshots[latest].payload.edges`.
- `invariant_holds(invariantName: string)` — invocador genérico de Mission Physics, lista de invariantes en §19.2.

### 15.2 Predicados de tooling (sobre el repo y CI)

- `commit_sha_present(branch: string, expected_sha: string)` — verifica vía GitHub API que un commit existe en branch.
- `file_exists(path: string, branch: string)` — verifica vía GitHub API.
- `file_contains(path: string, branch: string, regex: string)` — verifica vía GitHub API + regex test.
- `tests_pass(branch: string, suite: "vitest")` — verifica vía artifact de GitHub Actions o ejecución determinista en sandbox.
- `pr_state_eq(pr_number: number, expected: "draft" | "open" | "merged" | "closed")` — verifica vía GitHub API.

### 15.3 Predicados de Browser QA

- `screenshot_diff_below(target_url: string, baseline_hash: string, threshold_pct: number)` — compara screenshot actual contra baseline con `pixelmatch`.

### 15.4 Predicado de equivalencia (10x core)

- `reality_diff_equivalent_to(prior_diff_id: string)` — verifica que `mission_reality_diffs.output_hash` actual es igual al de un diff previo.

**Total v0.1: 14 predicados.** Cualquier intención del operador que no se pueda expresar en términos de combinaciones de estos predicados se rechaza por el Intent Compiler con `INVALID_PREDICATE_COMBINATION` y se ofrece como sugerencia al operador "abre PR de diseño para añadir predicado X". Esto evita que la prosa de la cápsula aparente verificar lo que en realidad no es verificable.

---

## 16. Catálogo cerrado de evidence kinds

`mission_evidence.kind` es un enum cerrado. Cualquier evidencia con `kind` fuera de este enum es rechazada al insertarse vía constraint a nivel DB.

| Kind | Descripción | Quién la produce | Hash del payload |
|---|---|---|---|
| `url` | Referencia a recurso externo verificable | Agente | SHA-256 del response body al momento de la verificación |
| `screenshot` | Imagen capturada con `qa.captureScreenshot` | Browser QA | SHA-256 del PNG |
| `file` | Archivo ya en el repo o en S3 manus-storage | Agente o Execution Fabric | SHA-256 del contenido |
| `log` | Output textual de proceso reproducible | Verificador | SHA-256 del log normalizado |
| `sql_result` | Resultado de query determinista contra DB de Forja | Verificador | SHA-256 del JSON serializado canónico |
| `llm_proposal` | Output puro de LLM, sin verificación | Agente | SHA-256 del response.text |
| `deterministic_check` | Resultado de verificador determinista del catálogo §15 | Verificador | SHA-256 de `{predicate, target, expected, actual, result}` canónico |
| `test_report` | Output de Vitest u otro runner de tests | Verificador | SHA-256 del reporte JSON |
| `screenshot_diff` | Resultado numérico + imagen diff de `qa.diffScreenshot` | Browser QA | SHA-256 de `{baseline_hash, current_hash, diff_pct, diff_image_hash}` |
| `github_artifact` | Referencia a artefacto en GitHub (commit, PR, issue, action artifact) | GitHub Connector | SHA-256 de `{repo, ref, ref_type, content_hash_at_time}` |

**Regla de gate v2:** una cápsula no puede pasar a `accepted` si todos sus claims están verificados únicamente por evidencia con `kind: "llm_proposal"`. Al menos un claim debe tener verificador determinista (`deterministic_check`, `test_report`, `screenshot_diff`, `github_artifact`, `sql_result`). Esto cierra el vector de "el mismo LLM propone y verifica".

---

## 17. World Model: invariante "se invoca, no se modela"

> Cualquier cápsula que pretenda razonar sobre el genoma del Monstruo sin pasar por `runBuildScript` está alucinando.

Esta es la invariante crítica que cierra el vector de "el sistema cree saber el estado del Monstruo cuando en realidad lo está inventando". v2 absorbe la doctrina de Perplexity #4 y la promueve a regla operacional con tres consecuencias técnicas:

### 17.1 Fuente única de verdad

El estado del Monstruo no se mantiene como tabla relacional en Forja. Se invoca on-demand vía `runBuildScript` (`server/routers/board.ts:69-112`), se persiste como snapshot inmutable con `payload_sha` idempotente (`server/routers/board.ts:124-143`) y se referencia desde las cápsulas vía FK con `onDelete: 'restrict'`. El `payload` queda como `json("payload").notNull()` (`drizzle/schema.ts:55`), opaco para Forja pero hasheable. Mission Physics, Intent Compiler y Evidence VM **operan sobre snapshots, jamás sobre representaciones inventadas**.

### 17.2 Captura síncrona en submisión

Como `todo.md:68` declara que el cron T1 está bloqueado por la ausencia de Manus Heartbeat, la mitigación operativa es: **`mission.submit` invoca `world.snapshot.refresh` síncronamente antes de transicionar a `in_review`**. Esto garantiza que el `world_state_before` referenciado por la cápsula refleja el estado del Monstruo **al momento de la decisión**, no a la última vez que el operador miró el tablero. Cuando Manus Heartbeat se desbloquee, este patrón se complementa con refresh periódico, no se reemplaza.

### 17.3 No se construye sobre `liveBoard`

`liveBoard` es la representación cliente-side del snapshot vigente. Forja **no lee `liveBoard`**. Forja lee `boardSnapshots` server-side y deriva el `validIds` desde ahí (mismo patrón que `omnibox.ts:202-213`). Esto evita un vector clásico de race condition: el cliente tiene snapshot A, el servidor tiene snapshot B, la cápsula referencia A pero ejecuta sobre B.

### 17.4 Lista de invariantes formales en v0.1

Mission Physics evalúa estos invariantes parseando el JSON opaco. La lista crece via PR de diseño:

- `BUDGET_CONSERVATION` — `payload.budget.delta == 0` cuando la cápsula declara `constraints.preserve_budget`.
- `TESTS_GREEN` — última corrida de Vitest en `main` resultó verde.
- `NO_NEW_PUBLIC_PROCEDURE` — diff del repo no introduce nuevos `publicProcedure` en `server/routers/`.
- `RLS_INTACT` — diff del repo no remueve `enable row level security` de ninguna tabla nueva.
- `NODE_GRAPH_CONNECTED` — `payload.edges` mantiene grafo conectado para los nodos de cada distrito.

**Total v0.1: 5 invariantes formales.** Mission Physics rechaza cápsulas cuyas `expectedEffects` violen cualquier invariante declarada en `constraints`.

---

## 18. Reverse Op Catalog

> Sólo las operaciones presentes en `reverse_op_catalog` con `enabled = true` pueden ejecutarse en lane L4.
> El resto requiere lane L5 con checklist explícito de irreversibilidad firmado por el operador único.

Esta sección sustituye la propiedad universal *"cada efecto tiene su anti-efecto"* de v1, falsa para deploys de producción, rotación de secretos, envío de correos y pagos. v2 adopta el patrón **catálogo cerrado de operaciones reversibles**, ratificado por la auditoría Perplexity.

### 18.1 Operaciones catalogadas en v0.1

| Op name | Forward action | Reverse action | Enabled v0.1 | Lane requerida |
|---|---|---|---|---|
| `gh.commit_to_branch` | Push commit a branch ≠ main | `git revert` + push del revert | true | L3 |
| `gh.create_branch` | Crear branch nueva | Borrar branch (DELETE ref) | true | L3 |
| `gh.create_issue` | Crear issue | Cerrar issue + comentar reversal | true | L3 |
| `gh.open_pr_draft` | Abrir PR draft | Cerrar PR sin merge | true | L3 |
| `gh.merge_pr` | Merge a main | `git revert` del merge commit + nuevo PR | false (DESIGNED, T1_ONLY) | L4 |
| `forja.db.write_table` | Insert/update en tabla específica | Restore desde snapshot pre-write | false (DESIGNED) | L4 |
| `railway.deploy_preview` | Deploy preview env | Redeploy versión anterior | false (DESIGNED) | L4 |
| `railway.deploy_production` | Deploy producción | "Rollback parcial documentado" — irreversible real | false (DESIGNED) | L5 |
| `secrets.rotate` | Rotar secret en provider | Restaurar valor anterior cuando provider lo permita | false (DESIGNED) | L5 |
| `email.send` | Enviar correo transaccional | "Rectificación" — irreversible real | false (DESIGNED) | L5 |
| `payment.execute` | Ejecutar pago | "Refund issued" — irreversible real | false (DESIGNED) | L5 |

### 18.2 Política de extensión

Añadir una operación al catálogo requiere PR de diseño con (a) descripción técnica del forward, (b) descripción técnica del reverse incluyendo casos donde el reverse sea parcial o irreversible real, (c) prueba de la operación reverse en sandbox, (d) firma del operador único. Sin esos cuatro elementos la operación queda fuera del catálogo y por tanto en lane L5 mínimo.

---

## 19. Power Lane Engine — middleware tRPC

El motor que aplica Power vs Activation a cada llamada del sistema. Vive como middleware tRPC entre `protectedProcedure` y los handlers de las routers de Forja.

### 19.1 Pseudo-código del middleware

```ts
const powerLaneMiddleware = t.middleware(async ({ ctx, input, next, path }) => {
  const capability = inferCapabilityFromPath(path);
  const switchRow = await db.query.capabilitySwitches.findFirst({
    where: eq(capabilitySwitches.capability, capability),
  });
  if (!switchRow || switchRow.state === 'DESIGNED') {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'CAPABILITY_NOT_ENABLED' });
  }
  const missionId = (input as any)?.missionId;
  const mission = missionId
    ? await db.query.missions.findFirst({ where: eq(missions.id, missionId) })
    : null;
  if (!mission) {
    return next({ ctx: { ...ctx, capability, switchRow } });
  }
  if (laneLevel(mission.powerLane) < laneLevel(capability.minLane)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'LANE_INSUFFICIENT' });
  }
  if (switchRow.state === 'T1_ONLY') {
    const ruling = await db.query.missionT1Decisions.findFirst({
      where: and(eq(missionT1Decisions.missionId, missionId), eq(missionT1Decisions.capability, capability), eq(missionT1Decisions.signed, true)),
    });
    if (!ruling) throw new TRPCError({ code: 'FORBIDDEN', message: 'T1_GATE_REQUIRED' });
  }
  if (switchRow.state === 'AUTONOMOUS_ZONE') {
    if (!ctx.session?.zoneAuthorization) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'OUTSIDE_AUTHORIZED_ZONE' });
    }
  }
  return next({ ctx: { ...ctx, capability, switchRow, mission } });
});
```

### 19.2 Errores tipados que el motor emite

- `CAPABILITY_NOT_ENABLED` — state es DESIGNED o WIRED.
- `LANE_INSUFFICIENT` — la cápsula tiene lane menor a la mínima requerida por la capability.
- `T1_GATE_REQUIRED` — capability T1_ONLY sin ruling firmado para esta cápsula.
- `OUTSIDE_AUTHORIZED_ZONE` — capability AUTONOMOUS_ZONE invocada fuera de zona autorizada.
- `INVALID_TARGET_REFERENCE` — `compiledGoal.target` referencia un nodo no presente en `boardSnapshots[latest]`.
- `INVALID_PREDICATE` — claim usa predicado fuera del catálogo §15.
- `EVIDENCE_KIND_NOT_ALLOWED` — evidencia con `kind` fuera del enum §16.
- `LLM_ONLY_VERIFICATION_FORBIDDEN` — todos los claims de la cápsula están verificados sólo por `llm_proposal`.
- `IRREVERSIBLE_OP_REQUIRES_L5` — operación no presente en `reverse_op_catalog` con `enabled=true` y la cápsula tiene `powerLane < L5`.

Cada error se persiste en `mission_engine_log` con `mission_id`, `capability`, `error_code`, `timestamp`, para audit forense.

---

## 20. Schema Drizzle — 13 tablas mínimas

> Schema completo de v0.1 fusionando Perplexity (7 tablas) + Manus (6 tablas adicionales) + extensiones por absorción Perplexity.

### 20.1 Las 13 tablas

```ts
// drizzle/schema.ts (extensión)

export const missions = mysqlTable('missions', {
  id: varchar('id', { length: 26 }).primaryKey(), // ULID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
  decidedAt: timestamp('decided_at'),
  appliedAt: timestamp('applied_at'),
  rejectedAt: timestamp('rejected_at'),
  authorKind: mysqlEnum('author_kind', ['human', 'agent']).notNull(),
  authorId: varchar('author_id', { length: 64 }).notNull(),
  intent: text('intent').notNull(),
  compiledGoal: json('compiled_goal').notNull(),
  canonicalJson: text('canonical_json').notNull(),
  canonicalHash: varchar('canonical_hash', { length: 64 }).notNull(),
  powerLane: mysqlEnum('power_lane', ['L0','L1','L2','L3','L4','L5','L6']).notNull().default('L1'),
  worldStateBeforeId: int('world_state_before_id').notNull().references(() => boardSnapshots.id, { onDelete: 'restrict' }),
  worldStateAfterId: int('world_state_after_id').references(() => boardSnapshots.id, { onDelete: 'restrict' }),
  status: mysqlEnum('status', ['draft','in_review','accepted','rejected','deferred','applied']).notNull().default('draft'),
  decidedBy: varchar('decided_by', { length: 64 }),
  budgetTokens: int('budget_tokens'),
  budgetCost: decimal('budget_cost', { precision: 10, scale: 4 }),
  budgetDeadline: timestamp('budget_deadline'),
  realityDiffId: varchar('reality_diff_id', { length: 26 }).references(() => missionRealityDiffs.id, { onDelete: 'restrict' }),
}, (t) => ({
  canonicalHashIdx: uniqueIndex('canonical_hash_idx').on(t.canonicalHash),
  statusIdx: index('status_idx').on(t.status),
  authorIdx: index('author_idx').on(t.authorKind, t.authorId),
}));

export const missionTasks = mysqlTable('mission_tasks', {
  id: varchar('id', { length: 26 }).primaryKey(),
  missionId: varchar('mission_id', { length: 26 }).notNull().references(() => missions.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  assignedAgentId: varchar('assigned_agent_id', { length: 64 }).references(() => agentRegistry.agentId),
  status: mysqlEnum('status', ['pending','running','done','failed']).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const missionAgentContracts = mysqlTable('mission_agent_contracts', {
  id: varchar('id', { length: 26 }).primaryKey(),
  missionId: varchar('mission_id', { length: 26 }).notNull().references(() => missions.id, { onDelete: 'cascade' }),
  agentId: varchar('agent_id', { length: 64 }).notNull().references(() => agentRegistry.agentId),
  prompt: text('prompt').notNull(),
  budgetTokens: int('budget_tokens').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  tokensUsed: int('tokens_used'),
  costUsd: decimal('cost_usd', { precision: 10, scale: 6 }),
});

export const missionClaims = mysqlTable('mission_claims', {
  id: varchar('id', { length: 26 }).primaryKey(),
  missionId: varchar('mission_id', { length: 26 }).notNull().references(() => missions.id, { onDelete: 'cascade' }),
  predicate: varchar('predicate', { length: 64 }).notNull(),
  target: json('target').notNull(),
  expectedValue: json('expected_value'),
  status: mysqlEnum('status', ['pending','satisfied','failed','blocked']).notNull().default('pending'),
});

export const missionEvidence = mysqlTable('mission_evidence', {
  id: varchar('id', { length: 26 }).primaryKey(),
  missionId: varchar('mission_id', { length: 26 }).notNull().references(() => missions.id, { onDelete: 'cascade' }),
  claimId: varchar('claim_id', { length: 26 }).references(() => missionClaims.id, { onDelete: 'cascade' }),
  kind: mysqlEnum('kind', ['url','screenshot','file','log','sql_result','llm_proposal','deterministic_check','test_report','screenshot_diff','github_artifact']).notNull(),
  payload: json('payload').notNull(),
  payloadHash: varchar('payload_hash', { length: 64 }).notNull(),
  signedAt: timestamp('signed_at').defaultNow().notNull(),
}, (t) => ({
  payloadHashIdx: index('evidence_payload_hash_idx').on(t.payloadHash),
}));

export const missionT1Decisions = mysqlTable('mission_t1_decisions', {
  id: varchar('id', { length: 26 }).primaryKey(),
  missionId: varchar('mission_id', { length: 26 }).notNull().references(() => missions.id, { onDelete: 'cascade' }),
  claimId: varchar('claim_id', { length: 26 }).references(() => missionClaims.id, { onDelete: 'cascade' }),
  capability: varchar('capability', { length: 64 }),
  ruling: mysqlEnum('ruling', ['accept','reject','block','defer']).notNull(),
  signed: boolean('signed').notNull().default(false),
  signedBy: varchar('signed_by', { length: 64 }),
  signedAt: timestamp('signed_at'),
  reasoning: text('reasoning'),
});

export const missionRealityDiffs = mysqlTable('mission_reality_diffs', {
  id: varchar('id', { length: 26 }).primaryKey(),
  missionId: varchar('mission_id', { length: 26 }).notNull().references(() => missions.id, { onDelete: 'cascade' }),
  inputHash: varchar('input_hash', { length: 64 }).notNull(),
  outputHash: varchar('output_hash', { length: 64 }).notNull(),
  deltaHash: varchar('delta_hash', { length: 64 }).notNull(),
  diff: json('diff').notNull(),
  computedAt: timestamp('computed_at').defaultNow().notNull(),
}, (t) => ({
  outputHashIdx: index('reality_diff_output_hash_idx').on(t.outputHash),
  deltaHashIdx: index('reality_diff_delta_hash_idx').on(t.deltaHash),
}));

export const reverseOpCatalog = mysqlTable('reverse_op_catalog', {
  opName: varchar('op_name', { length: 64 }).primaryKey(),
  forwardDescription: text('forward_description').notNull(),
  reverseDescription: text('reverse_description').notNull(),
  laneRequired: mysqlEnum('lane_required', ['L0','L1','L2','L3','L4','L5','L6']).notNull(),
  enabled: boolean('enabled').notNull().default(false),
  reversibilityClass: mysqlEnum('reversibility_class', ['full','partial','documented_only']).notNull(),
  signedBy: varchar('signed_by', { length: 64 }),
  signedAt: timestamp('signed_at'),
});

export const agentRegistry = mysqlTable('agent_registry', {
  agentId: varchar('agent_id', { length: 64 }).primaryKey(),
  displayName: varchar('display_name', { length: 128 }).notNull(),
  backend: varchar('backend', { length: 64 }).notNull(),
  costPer1kTokens: decimal('cost_per_1k_tokens', { precision: 10, scale: 6 }).notNull(),
  enabled: boolean('enabled').notNull().default(false),
  reputation: decimal('reputation', { precision: 5, scale: 2 }).notNull().default('0.00'),
});

export const browserQaArtifacts = mysqlTable('browser_qa_artifacts', {
  id: varchar('id', { length: 26 }).primaryKey(),
  missionId: varchar('mission_id', { length: 26 }).references(() => missions.id, { onDelete: 'cascade' }),
  targetUrl: varchar('target_url', { length: 512 }).notNull(),
  screenshotKey: varchar('screenshot_key', { length: 256 }).notNull(),
  screenshotHash: varchar('screenshot_hash', { length: 64 }).notNull(),
  baselineHash: varchar('baseline_hash', { length: 64 }),
  diffPct: decimal('diff_pct', { precision: 5, scale: 2 }),
  capturedAt: timestamp('captured_at').defaultNow().notNull(),
});

export const ghOperations = mysqlTable('gh_operations', {
  id: varchar('id', { length: 26 }).primaryKey(),
  missionId: varchar('mission_id', { length: 26 }).references(() => missions.id, { onDelete: 'cascade' }),
  opName: varchar('op_name', { length: 64 }).notNull().references(() => reverseOpCatalog.opName),
  laneAtExecution: mysqlEnum('lane_at_execution', ['L0','L1','L2','L3','L4','L5','L6']).notNull(),
  payload: json('payload').notNull(),
  resultRef: varchar('result_ref', { length: 256 }),
  succeeded: boolean('succeeded').notNull(),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
});

export const capabilitySwitches = mysqlTable('capability_switches', {
  capability: varchar('capability', { length: 64 }).primaryKey(),
  state: mysqlEnum('state', ['DESIGNED','WIRED','ENABLED','T1_ONLY','AUTONOMOUS_ZONE']).notNull().default('DESIGNED'),
  minLane: mysqlEnum('min_lane', ['L0','L1','L2','L3','L4','L5','L6']).notNull(),
  gatePassed: boolean('gate_passed').notNull().default(false),
  toggledBy: varchar('toggled_by', { length: 64 }),
  toggledAt: timestamp('toggled_at'),
  reverseOpName: varchar('reverse_op_name', { length: 64 }).references(() => reverseOpCatalog.opName),
});

export const credentialHandles = mysqlTable('credential_handles', {
  handle: varchar('handle', { length: 64 }).primaryKey(),
  description: text('description').notNull(),
  provider: varchar('provider', { length: 64 }).notNull(),
  envVarName: varchar('env_var_name', { length: 128 }).notNull(),
  scope: text('scope'),
  rotatedAt: timestamp('rotated_at'),
});
```

### 20.2 RLS y policies

Toda tabla nueva en este schema **nace con RLS habilitado y al menos una policy explícita**, conforme a la Regla Dura #7 del proyecto (Plano de Datos Cerrado por Defecto). Las migraciones del v0.1 incluyen `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` y al menos una `CREATE POLICY` por tabla. Las 13 tablas listadas se cierran a `auth.role() = 'service_role'` por default; relajamientos requieren PR de diseño.

---

## 21. Seguridad — `credential_handle`, RLS, public→protected

### 21.1 Patrón `credential_handle` (absorción Perplexity #7)

> Ningún secreto vive dentro de una cápsula.

Las cápsulas que requieran credenciales (PAT de GitHub, API keys de Gemini, tokens de Manus, claves de Stripe futuras) referencian `credential_handles.handle`, jamás el valor del secreto. El motor resuelve `handle → env_var_name` server-side al momento de invocar la capability, lee el valor desde `process.env[env_var_name]`, y lo usa en la llamada al provider. El valor jamás aparece en logs, jamás se persiste en `mission_evidence.payload`, jamás se incluye en `mission.canonical_json`.

Si una cápsula intenta ejecutarse y referencia un `handle` que no existe en `credential_handles`, el motor responde con `CREDENTIAL_HANDLE_NOT_FOUND` y no ejecuta. Esto evita el anti-patrón de `os.environ.get("KEY", "valor_hardcoded_default")`.

### 21.2 Riesgo P0 confirmado: las 7 procedures `publicProcedure` en `contextActions.ts`

`server/routers/contextActions.ts` contiene **7 procedures que son TODAS `publicProcedure`** en las líneas `126, 149, 157, 171, 190, 196, 210` (verificado contra el commit `b52a688`). Si Forja OS hereda ese patrón sin cambio, cualquier visitante anónimo del frontend puede crear cápsulas, invocar agentes y consumir tokens del proyecto.

**Mitigación obligatoria v2:** las routers nuevas de Forja (`missions.draft`, `missions.compile`, `missions.submit`, `missions.decide`, `gh.*`, `qa.*`, `kill_switch.*`) son **TODAS `protectedProcedure`** desde la primera línea de código. El AUDIT MANUS dejó esto como riesgo P0; la versión v2 lo eleva a doctrina explícita.

### 21.3 Política de PATs

El PAT de GitHub Connector se gestiona vía `webdev_request_secrets` con scope `repo` mínimo (`contents:write`, `pull-requests:write`, `issues:write`), TTL de 12 meses, rotación inmediata al detectar exposure. Branch protection sobre `main` es prerequisito de activación de cualquier capability `gh.*`. El PAT vive en `credential_handles.handle = "github_forja_pat"`.

---

## 22. Ejemplos sobre `tablero-campana` (preservados de v1)

Casos concretos para aterrizar el diseño sobre el repo actual. Esta sección se preserva literal de v1 con anotación de capability invocada por paso.

### 22.1 Seleccionar un nodo del genoma

El usuario hace tap sobre el nodo `dory.core` en City Mode. La selección no abre un panel de lectura: abre el **Intent Compiler** prefiltrado con `target = [dory.core]`. La ContextCard ya existente se transforma en el encabezado de una posible Mission Capsule en estado `draft`. **Capability invocada:** `mission.draft` (lane L1).

### 22.2 Crear una misión

El usuario escribe: *"reducir latencia P95 de Dory por debajo de 800ms sin tocar tesorería ni romper tests."*

El Intent Compiler produce:

```yaml
compiledGoal:
  target: [dory.core]
  transformation: optimize_latency
  constraints:
    - budget.treasury.delta == 0
    - tests.suite == "green"
  acceptanceCriteria:
    - claim:
        predicate: node_metric_below
        target: dory.core
        metric: latency_p95_ms
        threshold: 800
    - claim:
        predicate: tests_pass
        branch: main
        suite: vitest
    - claim:
        predicate: invariant_holds
        invariantName: BUDGET_CONSERVATION
  budget:
    deadline: "2026-06-01T00:00:00Z"
```

La cápsula entra en `in_review` sin haber tocado nada. **Capability invocada:** `mission.compile` (lane L1) y luego `mission.submit` (lane L2).

### 22.3 Evaluar el claim "tests pasan"

La Evidence VM toma el criterio `tests_pass(branch=main, suite=vitest)` y ejecuta un verificador determinista contra el último artifact de GitHub Actions:

```json
{
  "claim_id": "01HXY...",
  "predicate": "tests_pass",
  "verifier": "github-actions-artifact-reader@1",
  "result": "pass",
  "evidence": {
    "kind": "test_report",
    "payload_hash": "sha256:...",
    "summary": "119/119 passed",
    "duration_ms": 14213,
    "artifact_url": "https://github.com/alfredogl1804/tablero-campana/actions/runs/.../artifacts/..."
  },
  "signed_at": "2026-05-25T14:02:11Z"
}
```

Solo entonces ese criterio queda marcado como satisfecho en la cápsula. **Capabilities invocadas:** `evidence.verify.deterministic` (lane L2) y `gh.readRepo` (lane L0).

### 22.4 Bloquear por evidencia faltante

La misma misión declara `node_metric_below(dory.core, latency_p95_ms, 800)` pero la Evidence VM no recibe ningún artefacto que mida latencia en el `world_state_after`. La Sovereign Court entra en Court Mode y muestra:

```
Criterio:    node_metric_below(dory.core, latency_p95_ms, 800)
Evidencia:   ninguna
Ruling:      BLOCKED — evidencia faltante
```

La misión **no puede pasar a `accepted`**, sin importar cuán convincente sea la prosa del agente. **Capability invocada:** `court.rule_per_claim` con ruling `block`.

### 22.5 Mostrar el Reality Diff

Si más tarde se aporta evidencia y la corte acepta, Execution Fabric calcula el diff y lo presenta así en Evidence Mode:

```
Reality Diff  ·  mission #01HXY...  ·  output_hash: sha256:abc...
─────────────────────────────────────
input_hash:        sha256:def...
nodes.modified:
  - dory.core
      metrics.latency_p95_ms:  920  →  760   (−160, −17%)
      version:                 1.4.2 →  1.4.3
edges.added:        []
edges.removed:      []
budget.treasury.delta:  0   (invariante BUDGET_CONSERVATION respetada)
tests.suite:        green → green   (invariante TESTS_GREEN respetada)
side_effects:       none on missions in flight
```

Ese Reality Diff es lo que se archiva en Memory Evolution. Su `output_hash` queda recuperable: una cápsula futura que produzca el mismo `output_hash` se reconoce como equivalente sin re-ejecutar. **Capability invocada:** `reality_diff.compute` (lane L2).

---

## 23. Riesgos P0 y P1 con cita archivo:línea

### 23.1 Riesgos P0 (bloqueantes para v0.1)

| # | Riesgo | Cita | Mitigación obligatoria |
|---|---|---|---|
| **P0-1** | Routers nuevas de Forja heredan patrón `publicProcedure` y permiten DDoS de cápsulas anónimas | `contextActions.ts:126,149,157,171,190,196,210` | TODAS las routers nuevas son `protectedProcedure` desde la primera línea |
| **P0-2** | Cápsulas embeben PATs o API keys en `intent` o `compiledGoal` y los exponen vía `mission_evidence.payload` o GitHub commits | doctrina | `credential_handle` obligatorio §21.1, sanitizer en `mission.canonical_json` que elimina cualquier string que matchee patrón de secreto |
| **P0-3** | Mission Physics evalúa invariantes con LLM en lugar de verificadores deterministas | doctrina | `evidence.kind = 'llm_proposal'` no satisface por sí solo ningún claim §16; al menos un claim debe tener verificador determinista |
| **P0-4** | Capability `gh.mergePR` se activa accidentalmente y mergea PR draft sin T1 | `reverse_op_catalog.gh.merge_pr.enabled = false` | State `T1_ONLY` por design + lane L4 + env var `FORJA_LANE_L4=on` + branch protection sobre `main` |

### 23.2 Riesgos P1 (mitigables en v0.1, observables en v0.2)

| # | Riesgo | Cita | Mitigación |
|---|---|---|---|
| **P1-1** | Race condition: cliente tiene snapshot A, server tiene snapshot B, cápsula referencia A pero ejecuta sobre B | `omnibox.ts:202-213` | `mission.submit` invoca `world.snapshot.refresh` síncronamente; toda referencia se valida contra `boardSnapshots[latest]` server-side |
| **P1-2** | Cron Heartbeat bloqueado impide refresh periódico del World Model | `todo.md:68` | Refresh síncrono en `mission.submit`; cuando Heartbeat se desbloquee, se complementa, no se reemplaza |
| **P1-3** | `boardSnapshots.payload` opaco impide invariantes formales tipados | `drizzle/schema.ts:55` | Mission Physics parsea el JSON; v0.2 introduce schema tipado paralelo a `payload` |
| **P1-4** | Browser QA produce false-positives en regiones animadas del Canvas | `IsometricBoard.tsx:50-60` (lerp en `useFrame`) | Mascarillas declaradas por verificador, threshold ajustable |
| **P1-5** | Costo runaway de tokens si el operador somete cápsulas masivas | doctrina | `mission.budgetTokens` obligatorio en `mission.submit`, kill-switch global por capability `agent.invoke.gemini_top` |
| **P1-6** | Memoria del fabric crece sin podar y degrada queries | doctrina | Índices sobre `canonical_hash` y `output_hash`; v0.2 introduce particionamiento por mes |

---

## 24. Primer sprint implementable (v0.1)

### 24.1 Alcance

- 13 tablas Drizzle (§20) con migraciones idempotentes y RLS habilitado.
- 20 capabilities ENABLED, 7 capabilities DESIGNED (§14).
- Power Lane Engine (§19) como middleware aplicado a todas las routers nuevas.
- Vertical slice de 11 pasos (§13.1) operativo para una cápsula real.
- UI Forja: `CapsuleDraftPanel` dentro de `ContextCard`, `CapsuleListPanel`, `RealityDiffPanel`, `CapabilitySwitchesPanel`. Reutilizan los componentes shadcn/ui existentes en `client/src/components/ui/`.
- GitHub Connector con PAT scoped, branch protection sobre `main`, capabilities L3 habilitadas.
- Browser QA con `qa.captureScreenshot` operativa sobre frontend del propio tablero.

### 24.2 Entregables verificables

1. Una cápsula real cierra los 11 pasos del vertical slice (§13.1) con T1 firmado por el operador único.
2. `mission_reality_diffs.output_hash` calculado y persistido para esa cápsula.
3. Una segunda cápsula con misma `compiledGoal` produce mismo `canonical_hash` (deduplicación funcional).
4. Vitest verde sobre las routers nuevas con tests específicos de `LANE_INSUFFICIENT`, `T1_GATE_REQUIRED`, `EVIDENCE_KIND_NOT_ALLOWED`, `LLM_ONLY_VERIFICATION_FORBIDDEN`.
5. Kill-switch global ejecutado en sesión real: capability `agent.invoke.gemini_top` se mueve a `WIRED`, próximas cápsulas reciben `CAPABILITY_NOT_ENABLED`.
6. PR draft creado por cápsula L3 visible en repo, vinculado a issue, mergeable manualmente por el operador.

### 24.3 Criterios de aceptación binarios

- [ ] 13/13 tablas migradas y RLS habilitado
- [ ] 20/20 capabilities ENABLED responden 200 con datos reales
- [ ] 7/7 capabilities DESIGNED responden con error tipado correcto
- [ ] Vertical slice cerrado con cápsula real
- [ ] Reality Diff con `output_hash` recuperable
- [ ] Tests del Power Lane Engine en verde
- [ ] PAT GitHub funcional con scope mínimo + branch protection activa
- [ ] Browser QA captura screenshot del Canvas con `preserveDrawingBuffer`
- [ ] Kill-switch ejercitado en sesión real
- [ ] Modo Papá sobrevive: City Mode default sin elementos nuevos visibles cuando no hay cápsulas activas

### 24.4 Lo que NO entra en v0.1 (recordatorio)

Ya enumerado en §13.3. La activación de cualquiera de esos elementos requiere PR de diseño explícito, no decisión de runtime.

---

## 25. No-objetivos explícitos para v0.1

Para evitar que este diseño se confunda con un plan de producción, se declaran como **fuera de alcance**:

- **No** acciones autónomas en producción. Ninguna misión toca infra real sin juez humano.
- **No** autonomía L5 / L6. Forja OS opera como copiloto soberano, no como piloto sin supervisión.
- **No** deploy desde el sistema. La capa de aplicación al mundo real para deploys queda como capability `DESIGNED` no `ENABLED`.
- **No** declaraciones finales sobre Dory ni sobre ningún nodo. Cualquier claim ("Dory se aceleró", "Dory quedó listo") debe pasar por Evidence VM y Sovereign Court con verificador determinista; sin eso, es prosa.
- **No** reemplazo del tablero actual. Forja OS se construye **encima** de la base v3.0; las lentes existentes siguen vivas; el Canvas R3F no se toca.
- **No** introducción de Memory Evolution oracle. Esa capability vive como `AUTONOMOUS_ZONE` y requiere DSC firmado del Soberano para considerarse.
- **No** Agent Market con bidding real. Hasta que existan ≥2 backends de razonamiento ENABLED, esa capability vive como `DESIGNED`.
- **No** lentes 3D nuevas. Build Mode 3D y Court Mode 3D viven como `WIRED` sin Canvas hasta que cierre el primer caso real con la versión 2D.

---

## 26. Checklist de validación para implementación (v2)

> Antes de que cualquier implementación arranque, este diseño debe poder responder **sí** a cada punto.

### 26.1 Checklist canónico v1 (preservado)

- [ ] El World Model está formalmente tipado y tiene snapshots con hash estable
- [ ] Toda misión tiene `world_state_before` y `world_state_after` obligatorios
- [ ] El Intent Compiler rechaza intenciones que no aterrizan sobre el World Model
- [ ] Mission Physics define invariantes y precondiciones evaluables sin LLM
- [ ] Cada claim de la cápsula tiene un verificador determinista en Evidence VM
- [ ] La Sovereign Court emite rulings por criterio, no por misión global
- [ ] Existe Reality Diff tipado y firmado para toda ejecución
- [ ] Los agentes ganan reputación por evidencia aceptada, no por prosa
- [ ] Hay reverseOp definido para toda misión aplicada en lane L4
- [ ] La memoria archiva cápsulas cerradas con sus diffs, no solo logs
- [ ] Ningún secreto vive dentro de una cápsula
- [ ] v0.1 está libre de acciones autónomas en producción
- [ ] El tablero v3.0 actual sigue funcionando intacto debajo del fabric

### 26.2 Checklist nuevo v2

- [ ] Doctrina **Power vs Activation** aplicada — cada capability declara `state` y `lane`
- [ ] **Power Lane Engine** instanciado como middleware tRPC sobre todas las routers nuevas
- [ ] **Capability States** persistidos en `capability_switches` con kill-switch global operativo
- [ ] **Vertical slice de 11 pasos** validado con cápsula real cerrada por el operador único
- [ ] **`canonical_hash` y `output_hash`** calculados y consultables por equivalencia
- [ ] **Catálogo cerrado de claims** (§15, 14 predicados) implementado en Intent Compiler
- [ ] **Catálogo cerrado de evidence kinds** (§16, 10 kinds) constraint en DB
- [ ] Regla anti-LLM-only-verification activa: al menos un claim por cápsula con verificador determinista
- [ ] **Reverse Op Catalog** poblado con las 11 entradas iniciales y `enabled` correctamente configurado
- [ ] **`credential_handle`** patrón obligatorio en todas las cápsulas que requieran credenciales
- [ ] Las routers nuevas son **TODAS `protectedProcedure`** (riesgo P0-1 mitigado)
- [ ] **`mission.submit` invoca `world.snapshot.refresh` síncronamente** (riesgo P1-1 mitigado)
- [ ] **GitHub Connector** instanciado server-side con PAT scoped mínimo y branch protection sobre `main` activa
- [ ] **Browser QA** opera sobre frontend del tablero aprovechando `preserveDrawingBuffer:true` ya presente
- [ ] **RLS habilitado** en las 13 tablas nuevas con al menos una policy explícita por tabla
- [ ] Kill-switch global por capability **ejercitado en sesión real** durante el sprint v0.1

Si algún punto queda en gris, no se construye todavía: se vuelve a este documento y se cierra.

---

## 27. Cierre

> Forja OS v2 conserva la tesis ontológica de v1 — gobernar cambios verificables sobre una realidad operativa modelada — y la materializa con disciplina de activación gradual.
>
> No hay versión MVP castrada. Hay fabric completo, diseñado desde el primer commit, con kill-switch global por capability operativo en runtime y lanes L0–L6 que el operador único puede subir o bajar sin redeploy.
>
> El éxito del sprint v0.1 se mide por una sola cosa: una cápsula real recorre los 11 pasos del vertical slice, deja `mission_reality_diffs.output_hash` recuperable, y el operador firma. Si eso pasa, Forja OS existe. Si no, este documento se vuelve a abrir.

*Fin del documento. Este archivo es diseño, no implementación.*

---

## Anexo A — Procedencia de cada elemento de v2

| Elemento | Fuente |
|---|---|
| Tesis ontológica, fórmula, planos canónicos, lentes, Mission Capsule v1, Reality Diff, comparativa con propuesta previa, justificación 10x v1, ejemplos, no-objetivos v1, checklist v1 | **Forja OS v1** (preservado literal con anotaciones mínimas) |
| Doctrina Power vs Activation, frase canónica de la doctrina, vertical slice de 11 pasos, los 5 estados de capability, separación binaria designed/enabled como doctrina enseñable | **ChatGPT 5.5 Pro propuesta evolutiva post-Perplexity** |
| Power Lanes L0–L6 con dominio operativo y gates, matriz Power Lane × Capability con 27 capabilities, Power Lane Engine como middleware tRPC, Reverse Op Catalog como sustituto de la propiedad universal, riesgo P0-1 publicProcedure con cita archivo:línea, GitHub Connector con scope, Browser QA aprovechando `preserveDrawingBuffer:true` | **AUDIT MANUS — FORJA OS MAX CROSS-VALIDATION** |
| Mission Capsule serializada con `canonical_hash`, ciclo `OPEN/IN_REVIEW/ACCEPTED/APPLIED` con timestamps, catálogo cerrado de claims, catálogo cerrado de evidence kinds, invariante "World Model se invoca, no se modela", FK con `onDelete: 'restrict'` en ambos lados, patrón `credential_handle`, `mission.submit` invoca `world.snapshot.refresh` síncronamente | **Veredicto Perplexity** (las 7 absorciones que faltaban en v1) |
| Verificación archivo:línea contra commit `b52a688`, riesgos P1 con citas, criterios de aceptación binarios, RLS doctrina, Vitest tests específicos del Engine | **Cruce Manus + Perplexity validado contra repo real** |

---

*Documento generado por fusión disciplinada de cuatro fuentes. Sin halagos, sin rubber-stamping, sin invenciones. Cada decisión técnica del v2 tiene autor identificable y verificable.*
