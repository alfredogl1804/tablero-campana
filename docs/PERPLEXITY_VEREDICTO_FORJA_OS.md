# Veredicto Perplexity — Forja OS Sovereign Agentic Fabric

> Auditoría adversarial del diseño propuesto en
> `docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md` (branch
> `design/forja-os-sovereign-agentic-fabric`).
> Fecha: 2026-05-25 04:42 UTC
> Modelo: Perplexity Computer
> Repo evaluado: alfredogl1804/tablero-campana @ 8d531034755938b20661ac00b454eda60545d62d

## 1. Veredicto binario

**APPROVE_WITH_MODIFICATIONS**

La dirección ontológica es correcta y técnicamente superior a Mission OS y a la propuesta de ChatGPT 5.5 Pro. No se aprueba como plan de implementación porque mezcla, en el mismo documento, un núcleo construible con piezas que son humo (Agent Market con reputación, Memory Evolution que ajusta la física, autonomía L5/L6 implícita en Execution Fabric). Se aprueba el diseño con la condición explícita de que **v0.1 sea el núcleo mínimo** (Mission Capsule + Evidence VM + Reality Diff) y que el resto se trate como horizonte teórico, no como roadmap.

## 2. ¿Forja OS es superior a Mission OS y a la propuesta de ChatGPT 5.5 Pro?

Sí, en el plano ontológico. Pero hay que ser precisos sobre por qué.

Mission OS y la propuesta de ChatGPT 5.5 Pro son, en su forma actual, **capas de orquestación conversacional sobre el tablero**. Optimizan la pregunta *"¿cómo coordino N agentes para que conversen y produzcan output útil?"*. Esa pregunta tiene un techo bajo: el techo del prompt, del estilo de prosa del modelo y de la fe del operador en que lo entregado equivale a lo prometido. Esa fe ya se quebró en este proyecto — la nota T1 de `todo.md:68` documenta un cron que el operador no puede instalar y un workaround que sólo funciona "mientras el browser esté abierto". Eso no es robustez; es prosa de robustez.

Forja OS no compite en ese plano. Cambia la pregunta a *"¿qué cambio sobre la realidad fue verificado, aprobado y aplicado, y por quién responde?"*. Cuando la salida obligatoria de toda misión es un **Reality Diff tipado y firmado** (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:155-167`), el LLM deja de ser el árbitro. La equivalencia de dos misiones se decide por su diff sobre el World Model, no por la elegancia de su prosa. Eso es estructuralmente superior — pero sólo si el World Model existe, está tipado y tiene snapshots con hash estable. Hoy el embrión existe (`boardSnapshots` en `drizzle/schema.ts:40-60`, payload con `payload_sha` calculado y persistido en `server/routers/board.ts:124-143`) pero **no está al nivel de un World Model formal**: el payload es JSON opaco, no un grafo tipado con invariantes evaluables sin LLM.

Conclusión: Forja OS gana en el techo del diseño. La propuesta de ChatGPT 5.5 Pro y Mission OS tienen un techo definido por el modelo; Forja OS tiene un techo definido por la calidad de su World Model y de su Evidence VM. Es mejor pelea.

## 3. Partes 10x reales (World Model, Mission Physics, Agent Market, Evidence VM, Sovereign Court, Reality Diff)

**Reality Diff (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:155-167`).** Es la innovación real. El criterio *"si dos misiones generan el mismo Reality Diff, son equivalentes — sin importar qué agente, qué prompt o qué modelo las produjo"* es la única forma de hacer un mercado de agentes que no sea un beauty contest de prosa. Cae naturalmente sobre la infraestructura ya presente: `boardSnapshots.payload_sha` (`drizzle/schema.ts:55`) ya permite identidad por contenido, y `board.diff` ya está cubierto por tests (`todo.md:65-66`).

**Evidence VM (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:65-67`).** Que cada claim deba presentarse como artefacto verificable es lo correcto. El proyecto ya tiene un proto-Evidence VM en miniatura: la validación de citas del Omnibox en `server/routers/omnibox.ts:204-213` filtra IDs alucinados contra el snapshot vigente. Esa es exactamente la lógica que hay que generalizar: *un claim del LLM no existe hasta que un verificador determinista lo confirma*. Esto es 10x sobre cualquier sistema multi-agente.

**World Model (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:53-54`).** La intención es correcta y el embrión ya está vivo: 62 nodos con identidad estable, `source_commit`, `source_mode`, `system_health`, snapshots inmutables con `capturedAt` indexado (`drizzle/schema.ts:40-60`). Falta el salto a "grafo tipado con invariantes". Hoy `payload` es `json("payload")` opaco; no hay forma de evaluar `budget.treasury.delta == 0` sin volver a parsear texto.

**Mission Capsule (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:94-149`).** Tipada, con `world_state_before` y `world_state_after` obligatorios, con `acceptanceCriteria` como `Claim[]`, con `physics.preconditions` y `forbiddenEffects` explícitos. Es la sustitución correcta del "prompt grande" como unidad de trabajo. **Esta es la pieza más urgente del núcleo v0.1.**

**Sovereign Court (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:68-69`).** El requisito de que la corte presente *artefactos*, no un resumen narrativo, al juez humano es correcto. Es el antídoto contra "el agente dijo que estaba listo". El ContextActionsPanel actual (`server/routers/contextActions.ts:126,149,157,171,190,196,210`) es la cuna natural: ya tiene incidents, overrides y askAbout — puede crecer a rulings sin reescribir el frontend.

## 4. Partes humo / sobrediseño / peligrosas

**Agent Market con reputación por evidencia (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:62-63`).** Suena fuerte y es humo en v0.1. Para que exista un mercado hace falta: (a) más de un agente postulando, (b) un mecanismo de pricing, (c) historia suficiente de evidencia aceptada para que la reputación tenga señal. Nada de esto existe ni se necesita. En v0.1 hay un solo operador (Don Alfredo) y los "agentes" son llamadas a Gemini 3 Pro (`server/routers/omnibox.ts:159` y `server/routers/contextActions.ts:261`). Hablar de mercado, subastas y reputación es darle nombre épico a un dispatcher con un solo worker. **No construir todavía.**

**Memory Evolution que ajusta la física y los precios del mercado (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:74-75`).** Esto es peligroso. Un sistema que reescribe sus propias reglas de aceptación basándose en historial corre dos riesgos: (a) deriva — la física legal del mes 6 es distinta a la del mes 1 y nadie sabe por qué; (b) gaming — un agente "aprende" qué evidencia es más fácil de pasar y optimiza contra ella, no contra el mundo. En v0.1 la memoria es archivo, no oráculo. Que las cápsulas cerradas se guarden con su Reality Diff. Que ajusten la política viene mucho después, con humano en el loop. **No construir como sustrato evolutivo todavía.**

**Execution Fabric con reversibilidad (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:71-72`).** El documento declara *"cada efecto tiene su anti-efecto"* como propiedad del fabric. Eso es falso para la mayoría de operaciones reales (un deploy aplicado, un secret rotado, un email enviado no tienen anti-efecto barato). Pedir reversibilidad universal es sobrediseño que llevará a falsedad: o se mentirá en el `reverseOp`, o se vetará toda misión que toque el mundo. v0.1 debe declarar **simulación primero, sin Execution Fabric**. Aplicar al mundo real es un hook futuro.

**Simulation Mode contra "copia del World Model" (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:85`).** Una copia del World Model implica un World Model lo suficientemente formal como para clonarlo y operar deterministamente sobre él. Hoy el World Model es JSON con metadata + 62 nodos. Simular *"acelerar Dory P95 < 800ms"* sobre eso no produce nada verificable — es prompting, no simulación. Hasta que `boardSnapshots.payload` no sea un grafo tipado con operadores legales, **Simulation Mode es humo**.

**Swarm Mode (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:86`).** Visualizar agentes postulando en vivo cuando no hay mercado y hay un solo agente real es coreografía vacía. No construir.

**Lentes Build/Simulation/Swarm/Evidence/Court como conmutables al mismo nivel que City Mode (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:79-90`).** Hay un riesgo de UX: meter seis modos cuando hoy hay cinco lentes (`client/src/lib/board-layers.ts`, ver `todo.md:106-108`) y un Modo Papá funcional (`todo.md:71-85`) puede romper la cognición del único usuario real. La promesa de "Modo Papá 100% aplicado" (`todo.md:85,148`) se erosiona si cada lente nueva carga jerga (rulings, claims, postulaciones). **Construir lentes a demanda, no de un golpe.**

**Autonomía L5/L6 implícita.** El documento declara explícitamente que NO hay autonomía L5/L6 (§11, `docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:216`), pero Execution Fabric + Agent Market + Memory Evolution apuntan en esa dirección. Hay que mantener esa restricción dura.

## 5. Núcleo correcto para v0.1 (¿Mission Capsule + Evidence VM + Reality Diff es el núcleo correcto?)

**Sí, ese es el núcleo correcto.** El documento ya lo identifica en §10 (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:199-207`) y es coherente con lo que el repo puede soportar hoy:

- **Mission Capsule** se monta encima de la lógica de procedures tRPC ya existente (`server/routers/contextActions.ts`). Una capsule es una fila en una tabla nueva más un router que maneja transiciones `draft → in_review → accepted/rejected → applied`. No requiere nuevo stack.

- **Evidence VM** se monta encima del patrón ya probado en `server/routers/omnibox.ts:204-213` (validar contra el snapshot vigente) y en los tests Vitest del proyecto (119/119 verde según `todo.md:173`). Un verificador inicial: *"el snapshot del World Model tras la misión coincide con el hash esperado"*. Eso ya es posible con `payload_sha` y `board.byId`.

- **Reality Diff** se monta encima de `board.diff`, que ya tiene tests pasando (`todo.md:65`). Hay que generalizarlo de "diff entre snapshots de tablero" a "diff tipado entre `world_state_before` y `world_state_after` de una cápsula".

Los tres son construibles **sin tocar `client/src/components/board/IsometricBoard.tsx`**, sin tocar el render loop (`IsometricBoard.tsx:50-60`), sin tocar el Canvas R3F (`IsometricBoard.tsx:205-219`) y sin tocar el mapeo de nodos (`IsometricBoard.tsx:319-345`). El tablero v3.0 sigue intacto debajo, como exige el §11 del diseño. Eso es lo que hace al núcleo viable.

**Modificación al núcleo propuesto**: añadir como requisito de v0.1 que cada cápsula referencie su `worldSnapshotBefore` por `boardSnapshots.id` existente. Eso fuerza desde el día uno la disciplina de "no hay misión sin estado antes". Sin esa atadura, las cápsulas se desligan del World Model y se vuelve prosa otra vez.

## 6. Encaje con el código actual (cita archivos y líneas)

**Lo que ya está vivo y soporta el núcleo:**

- `server/routers/board.ts:69-112` — `runBuildScript`: ejecuta Python como única fuente de extracción (DSC-G-008 cero drift). Esto es Mission Physics primitiva: el script define qué transformaciones de "leer repo → snapshot" son legales.
- `server/routers/board.ts:124-143` — `persistSnapshot` con idempotencia por `payload_sha`. Embrión directo de Reality Diff: si el SHA no cambió, no hubo cambio.
- `server/routers/board.ts:180-209` — `board.current` con bootstrap automático. Es el "leer estado del mundo" del Evidence VM.
- `server/routers/board.ts:217-237` — `board.refresh` protegido. Es el "aplicar y capturar el after" del Execution Fabric en su forma mínima.
- `server/routers/board.ts:242-271` — `board.history` y `board.byId`. Son la infra de memoria histórica que las cápsulas necesitan para referenciar `world_state_before`.
- `drizzle/schema.ts:40-60` — `boardSnapshots` con `capturedAt` indexado, `sourceCommit`, `sourceMode`, `payload` JSON. Tabla base sobre la que se ata `worldSnapshotBefore` y `worldSnapshotAfter`.
- `drizzle/schema.ts:71-95` — `boardNodes` con índices por `snapshotId`, `nodeId`, `status`. Permite queries SQL contra el World Model sin parsear JSON (precondición para invariantes evaluables sin LLM).
- `drizzle/schema.ts:115-145` — `boardIncidents` con `kind ∈ {BUG, IDEA, RIESGO, OBSERVACION}` y `severity`. Esquema directo para los **rulings** de Sovereign Court (un ruling es un incident estructurado en cierto sentido).
- `drizzle/schema.ts:161-190` — `boardOverrides` con `statusOverride`, `note`, `expiresAt`, `clearedAt`. Es el patrón de "redeclaración manual con expiración" — análogo a un veto humano sobre una cápsula.
- `server/routers/contextActions.ts:126,149,157,171,190,196,210` — siete procedures (`reportIncident`, `listIncidents`, `resolveIncident`, `setOverride`, `getActiveOverride`, `clearOverride`, `askAbout`) con validación Zod estricta. Patrón de procedure a copiar para `missions.*`.
- `server/routers/contextActions.ts:237-255` — `askAbout` con contexto focal de "nodo + conexiones inmediatas". Es el patrón correcto para alimentar al agente sin volcar todo el World Model. Mission Capsule lo reutiliza tal cual: target + vecindario inmediato.
- `server/routers/omnibox.ts:123` — `publicProcedure` para `ask`. Patrón claro de "el iPhone puede llamar sin OAuth", aplicable a `missions.draft`.
- `server/routers/omnibox.ts:157-176` — llamada a Gemini con `generateContent` **no streaming**. Es una verdad operacional importante: aunque `streamdown` esté como dependencia (`package.json:80`), el camino actual no es streaming. Las cápsulas no necesitan streaming en v0.1.
- `server/routers/omnibox.ts:204-213` — validación de citas contra `validIds` del snapshot. **Este es el proto-Evidence-VM del proyecto.** Cualquier verificador determinista de claims se construye con este patrón.

**Lo que el código no soporta hoy:**

- No hay tabla de misiones ni de claims. Hay que crearla (ver §7).
- `boardSnapshots.payload` es `json` opaco. Para Mission Physics seria hace falta un esquema tipado de nodos y aristas evaluables vía SQL o vía verificadores. **Pero no es bloqueante para v0.1** — los verificadores iniciales pueden operar sobre el JSON existente.
- No hay `reverseOp` en ninguna parte. Coherente con el veredicto: no construir Execution Fabric todavía.

**Frontend:**

- `client/src/components/board/IsometricBoard.tsx:50-60` — `useFrame` con lerp de zoom y paneo. Confirmado vivo.
- `client/src/components/board/IsometricBoard.tsx:205-219` — `Canvas` con `preserveDrawingBuffer`, `failIfMajorPerformanceCaveat: false`, `toneMapping` ACES. Estable, sin Environment HDRI remoto (postmortem v2.4). No tocar.
- `client/src/components/board/IsometricBoard.tsx:319-345` — `data.nodes.map` que produce los `Building` con `layerColor`/`layerHeight` desde `useLayer`. Vía de inserción natural para Build Mode / Court Mode: nuevos `layer.id` con `getColor`/`getHeight` distintos, sin reescribir el Canvas.

**Dependencias relevantes (`package.json`):**

- `@google/genai ^2.6.0` (line 18) — SDK Gemini en uso real.
- `@react-three/drei ^10.7.7` (line 46), `@react-three/fiber ^9.6.1` (line 47), `three ^0.184.0` (line 84) — stack 3D consolidado.
- `streamdown ^1.4.0` (line 80) — presente pero **no usado** en los routers auditados. Confirma que el camino actual es no-streaming.
- `drizzle-orm ^0.44.5` (line 62), `mysql2 ^3.15.0` (line 70) — persistencia en TiDB vía MySQL protocol, ya en producción según `todo.md:136`.
- `@trpc/server ^11.6.0` (line 53) — patrón de routers ya probado.
- `zod ^4.1.12` (line 87) — validación de inputs ya probada en `contextActions.ts:38-85`.

## 7. Tablas, routers y componentes mínimos para v0.1

### Tablas Drizzle (núcleo mínimo)

```ts
// drizzle/schema.ts (adiciones, sin tocar las tablas existentes)

export const missions = mysqlTable("missions", {
  id: int("id").autoincrement().primaryKey(),
  ulid: varchar("ulid", { length: 32 }).notNull().unique(), // identidad estable
  author: varchar("author", { length: 128 }).notNull().default("system"),
  intent: text("intent").notNull(), // intención en lenguaje natural
  worldSnapshotBeforeId: int("worldSnapshotBeforeId")
    .notNull()
    .references(() => boardSnapshots.id, { onDelete: "restrict" }),
  worldSnapshotAfterId: int("worldSnapshotAfterId").references(
    () => boardSnapshots.id,
    { onDelete: "set null" },
  ),
  status: mysqlEnum("status", [
    "draft",
    "in_review",
    "accepted",
    "rejected",
    "deferred",
    "applied",
  ]).notNull().default("draft"),
  budget: json("budget"), // { tokens?, cost?, deadline? }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const missionTasks = mysqlTable("mission_tasks", {
  id: int("id").autoincrement().primaryKey(),
  missionId: int("missionId").notNull().references(() => missions.id, {
    onDelete: "cascade",
  }),
  target: varchar("target", { length: 128 }).notNull(), // nodeId del genoma
  transformation: varchar("transformation", { length: 64 }).notNull(),
  constraints: json("constraints").notNull(),
  status: mysqlEnum("status", ["pending", "running", "done", "failed"])
    .notNull()
    .default("pending"),
});

export const missionAgentContracts = mysqlTable("mission_agent_contracts", {
  id: int("id").autoincrement().primaryKey(),
  missionId: int("missionId").notNull().references(() => missions.id, {
    onDelete: "cascade",
  }),
  agent: varchar("agent", { length: 64 }).notNull(), // 'gemini_reasoning_top' en v0.1
  // En v0.1 NO hay reputación. Esta tabla sirve para trazabilidad: qué agente
  // ejecutó qué cápsula. Reputación, costos y bids se añaden cuando exista
  // realmente >1 agente.
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
});

export const missionClaims = mysqlTable("mission_claims", {
  id: int("id").autoincrement().primaryKey(),
  missionId: int("missionId").notNull().references(() => missions.id, {
    onDelete: "cascade",
  }),
  claim: text("claim").notNull(), // p.ej. "tests.suite == 'green'"
  verifier: varchar("verifier", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["pending", "pass", "fail", "blocked"]).notNull(),
});

export const missionEvidence = mysqlTable("mission_evidence", {
  id: int("id").autoincrement().primaryKey(),
  claimId: int("claimId").notNull().references(() => missionClaims.id, {
    onDelete: "cascade",
  }),
  kind: varchar("kind", { length: 32 }).notNull(), // 'test_report' | 'hash_match' | 'sql_query' | ...
  hash: varchar("hash", { length: 128 }).notNull(),
  payload: json("payload").notNull(), // artefacto completo
  signedAt: timestamp("signedAt").defaultNow().notNull(),
});

export const missionT1Decisions = mysqlTable("mission_t1_decisions", {
  // Nombre conservado del prompt para coherencia con el lenguaje del proyecto.
  // T1 = "Tribunal 1" / Sovereign Court ruling por criterio.
  id: int("id").autoincrement().primaryKey(),
  missionId: int("missionId").notNull().references(() => missions.id, {
    onDelete: "cascade",
  }),
  claimId: int("claimId").references(() => missionClaims.id, {
    onDelete: "set null",
  }),
  ruling: mysqlEnum("ruling", ["accept", "reject", "block", "defer"]).notNull(),
  decidedBy: varchar("decidedBy", { length: 128 }).notNull(), // 'rule:<id>' | openId
  reason: text("reason"),
  decidedAt: timestamp("decidedAt").defaultNow().notNull(),
});

export const missionRealityDiffs = mysqlTable("mission_reality_diffs", {
  id: int("id").autoincrement().primaryKey(),
  missionId: int("missionId").notNull().references(() => missions.id, {
    onDelete: "cascade",
  }),
  beforeSnapshotId: int("beforeSnapshotId").notNull().references(
    () => boardSnapshots.id,
    { onDelete: "restrict" },
  ),
  afterSnapshotId: int("afterSnapshotId").notNull().references(
    () => boardSnapshots.id,
    { onDelete: "restrict" },
  ),
  diff: json("diff").notNull(), // { nodes:{added,removed,modified}, edges:{...}, invariants:{...} }
  hash: varchar("hash", { length: 128 }).notNull(), // hash del diff para equivalencia entre misiones
  computedAt: timestamp("computedAt").defaultNow().notNull(),
});
```

Justificación de mantener `mission_t1_decisions` y `mission_reality_diffs` como tablas separadas y no combinadas: una misión tiene **N rulings** (uno por claim) y **un solo Reality Diff** firmado al cierre. Combinarlos rompe la cardinalidad y oculta la auditoría por criterio.

### Routers tRPC (núcleo mínimo)

```ts
// server/routers/missions.ts
export const missionsRouter = router({
  draft:     publicProcedure.input(...).mutation(...),  // crea cápsula en 'draft'
  compile:   publicProcedure.input(...).mutation(...),  // Intent Compiler → tasks + claims
  submit:    publicProcedure.input(...).mutation(...),  // 'draft' → 'in_review'
  current:   publicProcedure.input(...).query(...),     // cápsula por id
  list:      publicProcedure.input(...).query(...),     // listado para timeline de misiones
});

// server/routers/evidence.ts
export const evidenceRouter = router({
  verify:    publicProcedure.input(...).mutation(...),  // corre verificador determinista
  list:      publicProcedure.input(...).query(...),     // artefactos por claim/mission
});

// server/routers/court.ts
export const courtRouter = router({
  rule:      protectedProcedure.input(...).mutation(...), // juez humano emite ruling
  rulings:   publicProcedure.input(...).query(...),       // listado por mission
  decide:    protectedProcedure.input(...).mutation(...), // cierra mission: accepted/rejected
});

// server/routers/diff.ts
export const diffRouter = router({
  compute:   publicProcedure.input(...).mutation(...),  // calcula RealityDiff entre 2 snapshots
  byMission: publicProcedure.input(...).query(...),     // diff de una mission cerrada
});
```

Wire en `server/routers.ts` siguiendo el patrón ya existente (`board`, `gemini`, `omnibox`, `supabase`, `contextActions`). **No** se ejecuta nada de esto en este PR — el deliverable actual es sólo el documento de auditoría.

### Componentes frontend mínimos

- `client/src/components/missions/CapsuleDraftPanel.tsx` — reutiliza el patrón modal de `ContextActionsPanel` (T6). Se monta dentro del `ContextCard` cuando hay nodo seleccionado, sin tocar `IsometricBoard.tsx`.
- `client/src/components/missions/EvidenceList.tsx` — lista plana de claims con su estado (`pending`/`pass`/`fail`/`blocked`) y enlace al artefacto. Estilo coherente con la lista de incidents ya existente.
- `client/src/components/missions/RealityDiffViewer.tsx` — render del JSON tipado del diff. Sin 3D, sin lente nueva en el board. Texto estructurado, copy en Modo Papá ("Esto cambió en mí") usando el patrón `useTone()`.
- `client/src/components/missions/CourtPanel.tsx` — para v0.1, una sola decisión humana al final: accept / reject / defer. Sin rulings por criterio en UI todavía (los rulings se guardan; la UI muestra el agregado).

Nada de Simulation Mode, Swarm Mode, Build Mode 3D, Agent Market dashboard. Eso entra después.

## 8. Lo que NO debe construirse todavía

- **Simulation Twin del World Model** (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:85`). Requiere World Model formalmente tipado con operadores legales evaluables. El JSON opaco de hoy no califica.
- **Swarm Runtime / Agent Market con bids, reputación y pricing** (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:62-63,86`). No hay >1 agente real. Aplazar hasta que existan al menos dos backends de razonamiento distintos compitiendo por cápsulas.
- **Execution Fabric con `reverseOp` universal** (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:71-72`). Aplazar hasta que se decida qué clase de operaciones sobre el mundo real son reversibles (commits en una branch sandbox sí; deploys, sí con redeploy de la versión anterior; secrets rotados, no). En v0.1 todo es simulación contra el World Model.
- **Memory Evolution canonization** que reescribe física, precios o prioridades (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:74-75`). En v0.1 la memoria es archivo de cápsulas cerradas con sus diffs. No es oráculo.
- **Cost Economy avanzada** (presupuestos en tokens/cost que ajustan asignación). En v0.1 `budget` se persiste como JSON pero no se usa para asignar agentes. Es metadata.
- **Autonomía L5/L6** — el documento ya la declara fuera de alcance (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:216`); mantener esa restricción aunque el lenguaje del fabric tienda a sugerirla.
- **Reemplazo del tablero v3.0**. El §11 (`docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:220`) ya lo declara. Subrayarlo: el `Canvas` (`IsometricBoard.tsx:205-219`), el `useFrame` (`IsometricBoard.tsx:50-60`), el mapeo de nodos (`IsometricBoard.tsx:319-345`) y el sistema de lentes (T4, ver `todo.md:106-118`) **no se tocan en v0.1**.

## 9. Riesgos (seguridad, costo, UX, complejidad, agentes externos, alucinaciones)

**Seguridad:** la mayoría de procedures de `contextActions.ts` son `publicProcedure` (`server/routers/contextActions.ts:126,149,157,171,190,196,210`). Si las cápsulas siguen ese patrón sin discriminar, cualquier visitante anónimo podrá crear borradores, levantar claims y consumir tokens. Para v0.1: `missions.draft` y `missions.submit` deben ser `protectedProcedure`, al menos. Lecturas (`current`, `list`, `rulings`, `byMission`) pueden seguir públicas.

**Costo:** cada cápsula con N claims puede disparar N llamadas a Gemini 3 Pro Reasoning. `omnibox.ask` tiene latencia ~12-15s (`todo.md:101`) y `askAbout` ~13s (`todo.md:152`). Si una cápsula tiene 5 claims y cada uno requiere una llamada de razonamiento, la cápsula tarda más de un minuto y cuesta proporcionalmente. Mitigación: en v0.1 el verificador determinista es **el preferido** y el LLM sólo se invoca cuando no hay verificador determinista posible. Esto debe estar en la política, no en la prosa.

**UX:** el éxito del Modo Papá (`todo.md:71-85`) depende de que cada concepto técnico tenga su traducción. "Cápsula", "ruling", "claim", "Reality Diff" son términos que tendrán que entrar a `client/src/lib/tone.ts`. Sin esa traducción, Forja OS expulsa a Don Alfredo de su propio sistema operativo. Hay que ampliar el diccionario antes de exponer la UI.

**Complejidad:** el documento expone ocho planos. Implementar tres (Mission Capsule, Evidence VM, Reality Diff) es viable. Implementar los ocho es un proyecto multi-trimestre que probablemente se quede sin pista antes del salto al mundo real. **El riesgo es que el equipo se enamore del lenguaje y construya la cosmovisión completa antes de cerrar un loop.** Mitigación: contrato duro de v0.1 + criterios objetivos de salida (la checklist del §13).

**Agentes externos:** el documento habla de Agent Market abierto. Hoy el único agente externo es Gemini vía `@google/genai` (`package.json:18`) llamado a través de `server/_core/geminiClient.ts` y `geminiModels.ts`. Hay un blind spot importante: no auditamos esos dos archivos en este round. Para v0.1, hay que confirmar que las credenciales no se filtran a cápsulas ni a rulings (el §11 lo declara, hay que probarlo con un test).

**Alucinaciones:** el patrón ya correcto es el de `omnibox.ts:204-213` — filtrar contra `validIds` del snapshot. Si las cápsulas se llenan con IDs de nodos inexistentes ("Dory.legacy") emitidos por Gemini, todo el sistema se vuelve prosa. Disciplina: cada `target` y cada `claim` referenciando un nodo debe pasar por la misma validación. Esto no es opcional — es la diferencia entre Forja OS y un chat con prosa elegante.

**Riesgo nuevo identificado:** el cron POST-DEPLOY de T1 quedó documentado como bloqueado por Manus Heartbeat (`todo.md:68`). Forja OS asume snapshots vivos del World Model; si Heartbeat no se arregla, los snapshots dependen del `refetchInterval: 60_000` del browser y del bootstrap del primer request. Para una misión que apunte a `world_state_after` esto puede ser suficiente, pero es frágil. Plan B: añadir un endpoint `missions.captureWorldStateNow` que dispare `runBuildScript` de forma sincrónica al cerrar una cápsula.

## 10. Propuesta mejorada (una frase + bullets)

**Construir Forja OS como una capa contractual sobre el tablero v3.0 — Mission Capsule + Evidence VM + Reality Diff y nada más — con el resto del fabric como horizonte explícito, no como roadmap.**

- v0.1 incluye sólo: tabla `missions`, tablas auxiliares (`mission_tasks`, `mission_agent_contracts`, `mission_claims`, `mission_evidence`, `mission_t1_decisions`, `mission_reality_diffs`), routers `missions`/`evidence`/`court`/`diff`, y cuatro componentes frontend (`CapsuleDraftPanel`, `EvidenceList`, `RealityDiffViewer`, `CourtPanel`).
- v0.1 **no construye** Simulation Twin, Swarm Runtime, Agent Market con reputación/bids/pricing, Execution Fabric con `reverseOp` universal, Memory Evolution como oráculo, Cost Economy avanzada, autonomía L5/L6 ni lentes 3D nuevas.
- v0.1 **no toca** `IsometricBoard.tsx` (`Canvas` :205-219, `useFrame` :50-60, `BuildingsLayer` :319-345). Las nuevas vistas son paneles 2D que se montan dentro del `ContextCard`, siguiendo el patrón del `ContextActionsPanel` de T6.
- Cada cápsula obliga a referenciar `worldSnapshotBefore` por `boardSnapshots.id` existente. Sin estado antes verificado contra el SHA del payload, no hay cápsula.
- Verificador determinista preferido; LLM sólo cuando no hay alternativa. Cada claim que cita un nodo del genoma pasa por el filtro `validIds` (patrón `omnibox.ts:204-213`).
- Procedures de escritura sobre cápsulas (`draft`, `submit`, `rule`, `decide`) son `protectedProcedure`. Lecturas pueden seguir públicas. Sin esta línea, el costo de Gemini se vuelve un vector de abuso.
- Memoria es archivo, no oráculo: las cápsulas cerradas se guardan con su Reality Diff y se exhiben en el TimelineSlider existente (T5) al lado de los snapshots.
- Modo Papá obligatorio desde el primer commit de Forja OS: cápsula → "intención", ruling → "decisión", claim → "promesa", Reality Diff → "lo que cambió en mí". Ampliar `client/src/lib/tone.ts` antes de exponer la UI.
- Cerrar un loop completo extremo a extremo (crear cápsula → compilar → verificar al menos un claim determinista → emitir ruling → archivar Reality Diff) **antes** de añadir cualquier plano nuevo. Si el loop no cierra con un caso real (por ejemplo, "el snapshot del tablero conserva 62 nodos tras la operación X"), Forja OS no existe — es prosa.

---

## Apéndice A — Evidencia de archivos leídos

Repo @ commit `8d531034755938b20661ac00b454eda60545d62d`, branch `design/forja-os-sovereign-agentic-fabric`.

| Archivo | Citado | Notas |
|---|---|---|
| `docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md` | §§1-13, líneas 53-54, 62-63, 65-67, 68-69, 71-72, 74-75, 79-90, 94-149, 155-167, 199-207, 216, 220 | Documento de diseño completo, 326 líneas leídas íntegras |
| `todo.md` | Líneas 65-66, 68, 71-85, 101, 106-118, 136, 148, 152, 173 | Estado de Sprint v3.0 (T1–T7 completo, 119/119 tests) |
| `server/routers/board.ts` | Líneas 69-112 (`runBuildScript`), 124-143 (`persistSnapshot` idempotente), 180-209 (`current`), 217-237 (`refresh`), 242-271 (`history`/`byId`) | Embrión del Execution Fabric en su forma mínima |
| `server/routers/omnibox.ts` | Líneas 123 (`publicProcedure`), 157-176 (`generateContent` no-streaming), 204-213 (validación de citas) | Proto-Evidence-VM del proyecto |
| `server/routers/contextActions.ts` | Líneas 126, 149, 157, 171, 190, 196, 210 (siete procedures), 237-255 (`askAbout` con contexto focal) | Patrón base para `missions.*` |
| `client/src/components/board/IsometricBoard.tsx` | Líneas 50-60 (`useFrame`), 205-219 (`Canvas` config), 319-345 (mapeo de nodos en `BuildingsLayer`) | No se toca en v0.1 |
| `drizzle/schema.ts` | Líneas 8-23 (`users`), 40-60 (`boardSnapshots`), 71-95 (`boardNodes`), 115-145 (`boardIncidents`), 161-190 (`boardOverrides`) | Esquema actual sobre el que se monta el núcleo |
| `package.json` | Líneas 18 (`@google/genai`), 46 (`drei`), 47 (`fiber`), 53 (`@trpc/server`), 62 (`drizzle-orm`), 70 (`mysql2`), 80 (`streamdown` no usado), 84 (`three`), 87 (`zod`) | Stack confirmado |

**Blind spots declarados:**

- `server/_core/geminiClient.ts` y `server/_core/geminiModels.ts` — referenciados pero no leídos en esta auditoría. Implicación: no se verificó cómo se inyectan credenciales ni qué modelo exacto resuelve `GEMINI_MODELS.REASONING_TOP`. Mitigable en una segunda pasada.
- `server/db.ts` — referenciado por todos los routers pero no auditado aquí. La política de `db_unavailable` (`board.ts:167`) se observa pero no se verifica su semántica completa.
- `client/src/lib/tone.ts` — leído sólo indirectamente vía `todo.md:73-78`. Implicación: la afirmación sobre el diccionario Modo Papá se sostiene en lo declarado por el todo, no en lectura directa.
- `client/src/components/hud/ContextActionsPanel.tsx` y `client/src/components/hud/TimelineSlider.tsx` — referenciados, no leídos directamente. Las afirmaciones sobre su patrón se sostienen en `todo.md:142-149` y `todo.md:160-167`.
- `scripts/build_board_data.py` — referenciado por `board.ts:36-37`, no leído. La afirmación de "fuente única DSC-G-008 cero drift" se sostiene en el comentario del archivo, no en lectura directa del script.
- `server/canvas.no_remote_assets.test.ts` — referenciado por `todo.md:38`, no leído. La salvaguarda contra URLs remotas en componentes 3D se sostiene en lo declarado.

## Apéndice B — Diferencias contra ChatGPT 5.5 Pro

| Tema | ChatGPT 5.5 Pro | Tu posición | Razón técnica de la diferencia |
|---|---|---|---|
| Núcleo de la unidad de trabajo | Sesión conversacional multi-agente | **Mission Capsule tipada con `world_state_before`/`world_state_after` obligatorios** | La conversación no tiene identidad por contenido. Una cápsula sí — vía `payload_sha` (`drizzle/schema.ts:55`) y referencia explícita a `boardSnapshots.id`. La equivalencia por contenido es lo que habilita un mercado real más adelante. |
| Validación de salidas | Aprobación informal del operador sobre el output del agente | **Evidence VM con verificadores deterministas; el LLM no firma claims** | El patrón ya está vivo en el proyecto: `omnibox.ts:204-213` filtra citas contra `validIds` del snapshot. Generalizarlo es directo; subordinar el sistema a la aprobación humana de prosa no escala y reintroduce el techo del modelo. |
| Coordinación de agentes | Orquestador conversacional con prompts compartidos | **Agentes postulan y entregan evidencia; reputación por evidencia aceptada (cuando exista >1)** | La conversación coordina turnos, no resultados. Si dos agentes producen el mismo Reality Diff, son equivalentes; si producen distinto, gana el que más invariantes conserve. v0.1 sólo registra `mission_agent_contracts` (trazabilidad); reputación es futuro. |
| Gobierno de cambios | Aprobación humana al final del flujo, sobre un resumen narrativo | **Sovereign Court con rulings por criterio, basados en artefactos verificables** | Aprobar un resumen narrativo invita al sesgo de halo (un párrafo bien escrito gana). Aprobar un Reality Diff tipado fuerza al juez a mirar deltas. Una ruling por criterio (tabla `mission_t1_decisions`) permite "bloquear por evidencia faltante" — paso explícito que la propuesta de ChatGPT no nombra. |
| Memoria del sistema | Logs de conversación y embeddings para retrieval | **Archivo de cápsulas cerradas con su Reality Diff firmado; memoria como pasado verificable, no como sugerencia** | Embeddings sobre conversaciones recuperan textos similares, no decisiones equivalentes. Indexar por `hash` del Reality Diff (`mission_reality_diffs.hash`) permite preguntar "¿cuándo fue la última vez que un cambio equivalente a este se aplicó?". Es búsqueda de causa, no de tono. |
| Aplicación al mundo real | Acciones autónomas o semi-autónomas del orquestador | **Sólo simulación en v0.1; Execution Fabric con `reverseOp` queda fuera hasta que existan operaciones reversibles claramente catalogadas** | La reversibilidad universal no existe en la práctica. Un sistema que la promete miente o se autocensura. v0.1 declara explícitamente que ninguna cápsula toca infra real (consistente con `docs/FORJA_OS_SOVEREIGN_AGENTIC_FABRIC.md:215-217`). |
| Lenguaje del usuario | Inglés técnico / jerga de agentes | **Modo Papá obligatorio desde el primer commit: cápsula = "intención", ruling = "decisión", Reality Diff = "lo que cambió en mí"** | El único usuario real (Don Alfredo, 67 años, no ingeniero — `server/routers/omnibox.ts:44`) ya tiene un diccionario establecido (`todo.md:73-78`). Forja OS que lo expulse de su tablero falla aunque sea técnicamente correcto. |
| Streaming vs respuesta cerrada | Streaming de tokens del modelo como UX central | **No-streaming, contractual: la respuesta es JSON estricto validado por Zod, no prosa fluida** | El camino vivo del proyecto ya es no-streaming (`omnibox.ts:157-176` usa `generateContent`, no `generateContentStream`, aunque `streamdown` esté en `package.json:80`). Una cápsula es un contrato, no una pieza de conversación; mostrarla "escribiéndose en vivo" engaña sobre su estado real. |
