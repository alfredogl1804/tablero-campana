# Forja OS — Sovereign Agentic Fabric

> Documento de diseño. No es código, no es deploy, no es promesa de producción.
> Su único propósito es congelar la dirección aprobada para evolucionar `tablero-campana` desde un dashboard 3D hacia una interfaz operativa soberana para construir **El Monstruo**.

---

## 1. Por qué existe

Hoy `tablero-campana` es un **tablero 3D vivo**: visualiza el genoma del Monstruo (62 nodos), narra su estado con un cerebro Gemini, permite viajar en el tiempo, conmutar lentes y anotar incidentes. Es excelente como **espejo de la realidad**, pero sigue siendo un observador.

**Forja OS** convierte ese espejo en una **ciudad operativa**: un sistema donde el usuario no solo *mira* el Monstruo, sino que **lo construye, lo gobierna y lo audita** desde la misma superficie. El tablero deja de ser un panel de lectura y pasa a ser el sistema operativo desde el cual se emiten intenciones, se compilan en misiones, se ejecutan contra el mundo modelado, se prueban con evidencia y se aprueban (o se bloquean) bajo reglas explícitas.

El cambio de naturaleza es el siguiente: **del dashboard al fabric**. De *ver métricas* a *gobernar cambios verificables sobre una realidad operacional modelada*.

---

## 2. Tesis central

**Forja OS no es un chat multi-agente. No es un dashboard mejor. No es una IDE con copilotos.**

Es un sistema que **gobierna cambios verificables sobre una realidad operativa modelada**. Los agentes existen, pero son ciudadanos del fabric, no protagonistas. El protagonista es la **misión**: una unidad atómica de intención que entra al sistema, atraviesa física, evidencia y corte, y solo entonces puede tocar el mundo.

La diferencia es ontológica:

- Un chat multi-agente **coordina conversaciones**.
- Un dashboard **muestra estado**.
- Forja OS **modela el mundo, compila intenciones, ejecuta bajo física, recolecta evidencia, juzga con soberanía y archiva memoria verificable**.

Si no hay cambio verificable sobre el mundo modelado, el sistema no hizo nada — aunque haya consumido tokens, generado prosa o pintado pixeles.

---

## 3. La fórmula

```
Forja OS  =  World Model
           + Intent Compiler
           + Mission Physics
           + Agent Market
           + Evidence VM
           + Sovereign Court
           + Execution Fabric
           + Memory Evolution
```

Cada sumando es un plano independiente con contrato propio. Ninguno depende del estilo de prosa de un LLM. Todos producen artefactos tipados, versionados y diffables.

---

## 4. Los siete planos

### 4.1 World Model
Representación tipada, viva y consultable del estado del Monstruo. No es un dump de métricas: es un grafo de entidades (nodos del genoma, distritos, dependencias, presupuestos, contratos, equipos) con invariantes y relaciones. El estado actual de `liveBoard` es el embrión; Forja OS lo extiende a un modelo formal con identidad estable, snapshots y diff nativo entre versiones.

### 4.2 Intent Compiler
Convierte una intención en lenguaje natural (ej. *"acelerar Dory en distrito 3 sin tocar tesorería"*) en una **Mission Capsule** tipada: objetivo, alcance, restricciones, criterios de aceptación, presupuesto, ventana temporal. El compilador rechaza intenciones ambiguas o no aterrizables sobre el World Model.

### 4.3 Mission Physics
Reglas del universo. Define qué transformaciones son legales sobre el World Model: conservación de invariantes (presupuesto, deuda técnica, capacidad), precondiciones, efectos esperados, costos. Es a Forja OS lo que la física es a un motor de juegos: nada se ejecuta si viola las leyes.

### 4.4 Agent Market
Mercado abierto de agentes especialistas (cada uno con capacidades, costo, latencia, historial de evidencia aceptada). Las misiones se subastan o se asignan según política. Los agentes no conversan: **postulan, ejecutan y entregan evidencia**. Su reputación es función de evidencia validada, no de prosa generada.

### 4.5 Evidence VM
Máquina virtual de evidencia. Cada *claim* ("los tests pasan", "el nodo X bajó su latencia", "el presupuesto se respetó") debe presentarse como artefacto verificable: log, hash, traza, snapshot, output reproducible. La VM ejecuta verificaciones deterministas. **Sin evidencia ejecutable, el claim no existe.**

### 4.6 Sovereign Court
Capa de gobierno. Aplica reglas explícitas para aceptar o rechazar el cambio de estado propuesto por una misión: ¿la evidencia cubre todos los criterios?, ¿la física fue respetada?, ¿el costo encaja en presupuesto?, ¿hay conflicto con misiones en vuelo? El usuario es juez supremo; la corte le presenta el caso con todos los artefactos, no con un resumen narrativo.

### 4.7 Execution Fabric
Tejido de ejecución. Toma misiones aprobadas y las aplica al mundo real (repo, infra, contratos, presupuestos) bajo idempotencia, reversibilidad y trazabilidad. Cada efecto tiene su anti-efecto. Cada ejecución produce un `world_state_after` firmado.

### Memory Evolution (transversal)
Toda misión cerrada — aceptada o rechazada — alimenta la memoria del sistema: patrones, anti-patrones, costos reales vs estimados, agentes confiables, decisiones de la corte. La memoria no es un log; es un sustrato que ajusta la física, los precios del mercado y la prioridad de las lentes.

---

## 5. Modos / lentes de la UI

Forja OS reutiliza el sistema de lentes ya presente en el tablero (T4 del Sprint v3.0) y lo expande:

1. **City Mode** — vista panorámica del Monstruo como ciudad operativa. Distritos, flujos, semáforos. Default para el Modo Papá.
2. **Build Mode** — composición de misiones. El usuario selecciona un nodo y declara intención; el compilador pinta la cápsula tipada en tiempo real.
3. **Simulation Mode** — la misión se ejecuta contra una copia del World Model bajo Mission Physics. Se ve el `world_state_after` proyectado antes de tocar la realidad.
4. **Swarm Mode** — visualiza al Agent Market: quién postula, quién ejecuta, evidencia entrante en vivo.
5. **Evidence Mode** — lectura forense. Cada claim de una misión expandido en sus artefactos verificables.
6. **Court Mode** — sala de la Sovereign Court. La misión presentada con criterios, evidencia, voto recomendado por reglas y decisión final del usuario.

Las lentes son conmutables con la animación lerp ya implementada; no son pantallas distintas, son **proyecciones** sobre el mismo World Model.

---

## 6. Objeto central: Mission Capsule

La Mission Capsule es el átomo del sistema. Todo lo demás existe para producir, evaluar, ejecutar o archivar cápsulas.

```ts
type MissionCapsule = {
  id: string;                       // ULID estable
  createdAt: string;                // ISO
  author: { kind: "human" | "agent"; id: string };

  intent: string;                   // intención original en lenguaje natural
  compiledGoal: {                   // salida del Intent Compiler
    target: NodeRef[];              // nodos del genoma afectados
    transformation: string;         // verbo legal según Mission Physics
    constraints: Constraint[];      // invariantes a respetar
    acceptanceCriteria: Claim[];    // qué hay que probar para aceptar
    budget: { tokens?: number; cost?: number; deadline?: string };
  };

  world_state_before: WorldSnapshotRef;  // hash + puntero al snapshot
  world_state_after?: WorldSnapshotRef;  // poblado tras ejecución/simulación

  physics: {
    preconditions: Check[];         // evaluadas por Mission Physics
    expectedEffects: Effect[];
    forbiddenEffects: Effect[];
  };

  market: {
    assignedAgent?: AgentRef;
    bids?: AgentBid[];
    history: AgentStep[];
  };

  evidence: EvidenceArtifact[];     // alimentada por Evidence VM
  court: {
    status: "draft" | "in_review" | "accepted" | "rejected" | "deferred";
    rulings: Ruling[];              // por criterio
    decidedBy?: { kind: "rule" | "human"; id: string };
    decidedAt?: string;
  };

  execution?: {
    applied: boolean;
    appliedAt?: string;
    reversible: boolean;
    reverseOp?: OpRef;
    realityDiff: RealityDiff;       // ver §7
  };

  memory: {
    tags: string[];
    learnings: string[];            // alimenta Memory Evolution
  };
};
```

Los campos críticos son **`world_state_before`** y **`world_state_after`**: sin ellos no hay misión, hay narrativa.

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

---

## 8. Diferencia con la propuesta de ChatGPT 5.5 Pro

La propuesta previa de ChatGPT 5.5 Pro orbitaba alrededor de un **orquestador multi-agente conversacional** sobre el tablero. Forja OS conserva la noción de pluralidad de agentes pero **añade los planos que esa propuesta no tenía**:

| Plano                 | ChatGPT 5.5 Pro | Forja OS |
|-----------------------|-----------------|----------|
| World Model formal    | implícito       | **tipado, versionado, diffable** |
| Mission Physics       | ausente         | **reglas de transformación legales** |
| Agent Market          | chat coordinado | **mercado con reputación por evidencia** |
| Evidence VM           | ausente         | **verificación determinista de claims** |
| Sovereign Court       | aprobación informal | **gobierno explícito con rulings** |
| Reality Diff          | ausente         | **artefacto obligatorio de ejecución** |

La propuesta anterior optimiza **conversación entre agentes**. Forja OS optimiza **cambio verificable sobre el mundo**.

---

## 9. Por qué esto es 10x

No porque tenga más agentes, más modelos o más UI. Es 10x porque cambia la pregunta:

- Multi-agente clásico pregunta: *"¿cómo coordino N agentes para que colaboren?"*
- Forja OS pregunta: *"¿qué cambio sobre la realidad fue verificado, aprobado y aplicado, y por quién responde?"*

Coordinar agentes es un problema de prompt y plumbing. **Gobernar cambios verificados** es un problema de sistema. El primero produce demos; el segundo produce infraestructura sobre la que se puede construir El Monstruo sin que cada paso dependa del estilo de prosa de un LLM ni de la fe del operador.

---

## 10. Núcleo construible primero

Cuando se decida arrancar implementación (fuera del alcance de este documento), el **núcleo mínimo viable** son tres piezas, en este orden:

1. **Mission Capsule** — el esquema, su persistencia, su ciclo `draft → in_review → accepted/rejected → applied`. Sin UI lujosa: solo el objeto y sus transiciones.
2. **Evidence VM** — runner determinista para un conjunto inicial de verificadores (tests verde, lint verde, snapshot del World Model coincide con hash esperado, presupuesto respetado).
3. **Reality Diff** — comparador entre dos snapshots del World Model que produce el diff tipado y firmado.

Con esos tres componentes ya hay sistema: se puede declarar una misión, ejecutarla en simulación, recolectar evidencia, generar Reality Diff y archivarla. Todo lo demás (Agent Market, Sovereign Court con rulings ricos, Execution Fabric con reversibilidad, Memory Evolution) se construye encima sin reescribir el núcleo.

---

## 11. No-objetivos explícitos para v0

Para evitar que este diseño se confunda con un plan de producción, se declaran como **fuera de alcance**:

- **No** acciones autónomas en producción. Ninguna misión toca infra real sin juez humano.
- **No** autonomía L5 / L6. Forja OS opera como copiloto soberano, no como piloto sin supervisión.
- **No** deploy desde el sistema. La capa de aplicación al mundo real queda como hook futuro, no como capacidad inicial.
- **No** secretos en el repo ni en cápsulas. Las cápsulas referencian credenciales por handle, nunca por valor.
- **No** declaraciones finales sobre Dory. Cualquier claim ("Dory se aceleró", "Dory quedó listo") debe pasar por Evidence VM y Sovereign Court; sin eso, es prosa.
- **No** reemplazo del tablero actual. Forja OS se construye **encima** de la base v3.0; las lentes existentes siguen vivas.

---

## 12. Ejemplos sobre `tablero-campana`

Casos concretos para aterrizar el diseño sobre el repo actual.

### 12.1 Seleccionar un nodo del genoma
El usuario hace tap sobre el nodo `dory.core` en City Mode. La selección no abre un panel de lectura: abre el **Intent Compiler** prefiltrado con `target = [dory.core]`. La ContextCard ya existente se transforma en el encabezado de una posible Mission Capsule en estado `draft`.

### 12.2 Crear una misión
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
    - claim: "metrics.dory.latency_p95_ms < 800"
    - claim: "tests.suite == 'green'"
    - claim: "budget.treasury.delta == 0"
  budget:
    deadline: "2026-06-01T00:00:00Z"
```

La cápsula entra en `in_review` sin haber tocado nada.

### 12.3 Evaluar el claim "tests pasan"
La Evidence VM toma el criterio `tests.suite == 'green'` y ejecuta un verificador determinista contra el snapshot `world_state_after` (en este momento, simulado). El verificador produce un artefacto:

```json
{
  "claim": "tests.suite == 'green'",
  "verifier": "vitest-runner@1",
  "result": "pass",
  "evidence": {
    "kind": "test_report",
    "hash": "sha256:…",
    "summary": "119/119 passed",
    "duration_ms": 14213
  },
  "signedAt": "2026-05-25T14:02:11Z"
}
```

Solo entonces ese criterio queda marcado como satisfecho en la cápsula.

### 12.4 Bloquear por evidencia faltante
La misma misión declara `metrics.dory.latency_p95_ms < 800` pero la Evidence VM no recibe ningún artefacto que mida latencia en el `world_state_after`. La Sovereign Court entra en Court Mode y muestra:

```
Criterio:    metrics.dory.latency_p95_ms < 800
Evidencia:   ninguna
Ruling:      BLOCKED — evidencia faltante
```

La misión **no puede pasar a `accepted`**, sin importar cuán convincente sea la prosa del agente que la ejecutó. La corte ofrece dos rutas: aportar evidencia o reducir el alcance del criterio.

### 12.5 Mostrar el Reality Diff
Si más tarde se aporta evidencia y la corte acepta, Execution Fabric aplica la misión. El Reality Diff resultante se presenta así en Evidence Mode:

```
Reality Diff  ·  mission #01HXY…
─────────────────────────────────
nodes.modified:
  - dory.core
      metrics.latency_p95_ms:  920  →  760   (−160, −17%)
      version:                 1.4.2 →  1.4.3
edges.added:        []
edges.removed:      []
budget.treasury.delta:  0   (invariante respetada)
tests.suite:        green → green
side_effects:       none on missions in flight
```

Ese Reality Diff es lo que se archiva en Memory Evolution, no la conversación que lo produjo.

---

## 13. Checklist de validación para Manus / ChatGPT

Antes de que cualquier implementación arranque, este diseño debe poder responder **sí** a cada punto:

- [ ] ¿El World Model está formalmente tipado y tiene snapshots con hash estable?
- [ ] ¿Toda misión tiene `world_state_before` y `world_state_after` obligatorios?
- [ ] ¿El Intent Compiler rechaza intenciones que no aterrizan sobre el World Model?
- [ ] ¿Mission Physics define invariantes y precondiciones evaluables sin LLM?
- [ ] ¿Cada claim de la cápsula tiene un verificador determinista en Evidence VM?
- [ ] ¿La Sovereign Court emite rulings por criterio, no por misión global?
- [ ] ¿Existe Reality Diff tipado y firmado para toda ejecución?
- [ ] ¿Los agentes ganan reputación por evidencia aceptada, no por prosa?
- [ ] ¿Hay reverseOp definido para toda misión aplicada al mundo real?
- [ ] ¿La memoria archiva cápsulas cerradas con sus diffs, no solo logs?
- [ ] ¿Ningún secreto vive dentro de una cápsula?
- [ ] ¿v0 está libre de acciones autónomas en producción?
- [ ] ¿El tablero v3.0 actual sigue funcionando intacto debajo del fabric?

Si algún punto queda en gris, no se construye todavía: se vuelve a este documento y se cierra.

---

*Fin del documento. Este archivo es diseño, no implementación.*
