# Sprint v3.0 — Tablero de Campaña Radical
## El Tablero deja de ser un visor pasivo y se convierte en el panel de mando vivo del Monstruo

> **Tesis del sprint:** El v2.4.2 entrega un tablero que **se ve hermoso** (hexágonos isométricos, distritos, modo papá), pero **no piensa, no habla, no actúa, no recuerda y no se sincroniza con el repo del Monstruo**. Este sprint convierte el tablero en lo que su nombre promete: un **panel de mando** que ve, dice, decide y memoriza, no un dashboard estático con ornamento 3D.

---

## 1. Auditoría honesta del v2.4.2

Antes de proponer la reinvención, fijo el estado real basado en lectura del código:

| Capa | Lo que existe | Lo que falta |
|---|---|---|
| **Datos** | `board_data.json` estático con 66 nodos en `client/src/data/`. `catastro_visual_ledger.json` con 82 entradas, regenerado por `build_visual_ledger.py` desde el mount del repo del Monstruo. | El JSON estático **drifta** del estado real: cuando agregas, refactorizas o degradas un componente del Monstruo, el tablero no se entera hasta que un humano regenera el JSON. No hay flujo automático mount → DB → board. |
| **Visualización** | `IsometricBoard` (R3F + drei) con 5 distritos, 66 edificios, fog forja, lighting industrial. Funciona en Safari iPhone real (validado v2.4 + v2.4.2). | Sin pinch-to-zoom táctil, sin pan con dos dedos. En iPhone solo hay toolbar. La altura de los edificios mapea a `loc` (líneas de código), no a métricas relevantes. No hay modo de capas (timeline, salud, dependencias). |
| **HUD** | LivePulse, ContextCard, Omnibox, TopToolbar, ModoPapaToggle, TutorialOverlay. CatastroCluster + CandidataInspector. | El Omnibox usa Fuse.js (búsqueda fuzzy literal). El placeholder dice "ej: ¿qué le falta a la app móvil?" pero la app **no responde** esa pregunta — solo busca matches por nombre. Modo Papá toggle existe pero **no transforma nada** todavía. |
| **Backend** | tRPC con `gemini.health`, `gemini.listModels`, `gemini.generateImage` (Nano Banana Pro), `gemini.reason`, `supabase.health`, `auth.*`. | Sin tablas de dominio en Drizzle (solo `users`). Sin persistencia del estado del tablero, sin historial de cambios, sin eventos. Catastro/board viven 100% en client-side JSON. |
| **Inteligencia** | Gemini 3 Pro disponible vía router. Suite de tests live (Gemini health, Supabase health). | El Gemini está conectado pero **no se invoca desde la UI**. El tablero no genera narrativa, no responde preguntas, no detecta anomalías, no propone acciones. Es un cerebro dormido. |
| **Sincronización con el Monstruo real** | `build_visual_ledger.py` lee del mount canónico `/mnt/desktop/el-monstruo/kernel/catastro/data/`. | No hay agente que monitoree cambios en el repo del Monstruo. No hay webhook ni cron. El tablero es una foto, no un video. |
| **Memoria** | Cero. Cada carga es un origen-cero. | No hay historial de qué piezas estuvieron degradadas la semana pasada. No hay diff entre snapshots. No hay "estado del Monstruo el 1 de mayo vs hoy". |
| **Acciones** | Cero. ContextCard es solo lectura. | No puedes redeclarar el estado de una pieza desde el tablero. No puedes anotar incidentes. No puedes disparar un sprint desde un nodo degradado. |

**Diagnóstico estratégico:** el v2.4.2 es un **artefacto bello pero pasivo**. Es Tableau con piel forja. Para ser radicalmente útil, el tablero debe ser **el ojo, la voz y la mano** del Monstruo en una sola interfaz. Las 7 transformaciones de abajo apuntan exactamente a eso.

---

## 2. Las 7 transformaciones radicales (priorizadas por ROI x dificultad)

### T1 — Sincronización viva: el tablero respira con el repo del Monstruo

**Problema actual:** `board_data.json` y `catastro_visual_ledger.json` son estáticos. Cuando Alfredo cambia un componente en el Monstruo, el tablero queda obsoleto hasta que alguien corre `build_visual_ledger.py` a mano.

**Visión radical:** El tablero detecta cambios en el repo del Monstruo (vía mount + watcher + Drizzle) y refleja el nuevo estado en menos de 60 segundos sin redeploy.

**Arquitectura:**

1. Crear tabla `board_snapshots` en Drizzle (id, captured_at, source_commit, payload_json).
2. Crear tabla `board_nodes` (snapshot_id, node_id, district, status, loc, last_modified, raw).
3. Endpoint tRPC `board.refresh` que ejecuta `build_visual_ledger.py` (vía child_process) y `build_board_data.py` (nuevo, lee el `kernel/` del mount), inserta nuevo snapshot, retorna diff vs snapshot anterior.
4. Cron cada 5 minutos en producción (Manus Heartbeat) que llama `board.refresh`. En desarrollo, botón "Refrescar" en TopToolbar.
5. Frontend reemplaza el import estático por `trpc.board.current.useQuery({ refetchInterval: 60_000 })`.

**Criterios de aceptación:**
- Al agregar un archivo nuevo al `kernel/` del mount, en menos de 5 minutos aparece un edificio nuevo en el distrito correcto del tablero, sin redeploy ni acción humana.
- El timestamp del LivePulse muestra "actualizado hace X minutos" basado en el snapshot real, no en una constante hardcodeada.
- Hay 1 test de regresión que verifica que `board.refresh` produce un snapshot bien formado y otro test que verifica el diff entre 2 snapshots.

---

### T2 — Cerebro narrativo: el Omnibox responde, no solo busca

**Problema actual:** El Omnibox usa Fuse.js para búsqueda fuzzy. Si escribes "¿qué piezas están degradadas?", solo busca matches literales por nombre, no responde la pregunta.

**Visión radical:** El Omnibox es un agente conversacional anclado al estado vivo del tablero. Habla del Monstruo en lenguaje humano, cita nodos específicos, propone acciones.

**Arquitectura:**

1. Endpoint tRPC `omnibox.ask` (publicProcedure) que toma `query: string` + `context: BoardSnapshot` y retorna `{ answer, citedNodes, suggestedActions }`.
2. El backend serializa los 66 nodos del snapshot actual a un prompt compacto (no más de 8KB), inyecta system prompt con el lenguaje canónico del Monstruo (Modo Papá / Modo Técnico según `useAccessibility`), invoca `gemini.reason` con tier=top.
3. La respuesta usa `<Streamdown>` para renderizar markdown con highlights y citas como `<CitedNode id="catastro" />` que al hacer click selecciona el nodo en el board.
4. El Omnibox preserva las últimas 5 conversaciones en `localStorage` (memoria de sesión).

**Criterios de aceptación:**
- "¿qué piezas están degradadas?" devuelve una respuesta narrativa que enumera las 5 piezas con `status="degraded"` del snapshot actual y propone una acción por pieza.
- "¿cuál es la pieza más vieja que sigue activa?" devuelve el nodo correcto con su `last_modified` real.
- Las citas son interactivas: tocar `[catastro]` en la respuesta selecciona ese nodo en el Canvas y abre su ContextCard.
- Test live que verifica que `omnibox.ask("¿qué piezas están en construcción?")` retorna al menos 1 cita y la cita coincide con un nodo `status="building"` real del snapshot.

---

### T3 — Modo Papá funcional: doctrina aplicada, no toggle vacío

**Problema actual:** El toggle Modo Papá existe y se ve bonito, pero no cambia ni un solo píxel del tablero.

**Visión radical:** Modo Papá es una proyección humanista del Monstruo. Cuando está activado, el tablero deja de ser un panel técnico y se convierte en una explicación digerible para alguien no-técnico (Don Alfredo padre, presidentes, inversionistas).

**Reglas operativas (canónicas para v3.0):**

1. **IDs ocultos.** Cada nodo deja de mostrar su `id` técnico (`tool_nano_banana_pro`) y solo muestra su `name` humano ("Nano Banana Pro").
2. **LOC reemplazada.** "300 líneas" → "tamaño relativo: mediano" / "pequeño" / "grande".
3. **Status traducido.** `degraded` → "está fallando", `building` → "en construcción", `future` → "se construirá pronto".
4. **Distritos con narrativa.** En vez de "Cognición 97%" → "El Monstruo piensa bien (97% de cabeza activa)".
5. **LivePulse en lenguaje humano.** "53 piezas activas" → "Hoy El Monstruo está respirando con 53 órganos despiertos. Dos están en construcción y cinco necesitan atención."
6. **Omnibox cambia placeholder y prompts.** En modo papá: "Pregúntame en español sencillo. Ej: ¿cómo está hoy el Monstruo?"

**Arquitectura:**
- `AccessibilityContext` ya existe. Agregar campo `mode: "tecnico" | "papa"`.
- Crear hook `useTone()` que devuelve función `toneText(technical, papa)` según el modo.
- Aplicar `useTone()` en LivePulse, ContextCard, Omnibox, CatastroCluster.
- El system prompt del Omnibox cambia según el modo: en papá, prohíbe siglas y exige analogías cotidianas.

**Criterios de aceptación:**
- Activar Modo Papá NO requiere recarga, todos los textos cambian instantáneamente.
- Capturas lado a lado de ContextCard de un nodo en modo técnico vs papá muestran diferencias claras en al menos 5 strings.
- 1 test de regresión que valida que `useTone({tecnico: "300 líneas", papa: "mediano"})` devuelve el string correcto según el modo activo.

---

### T4 — Capas conmutables: el tablero es un atlas, no un mapa

**Problema actual:** El Canvas siempre muestra la misma vista: edificios coloreados por distrito, alturas por LOC. No puedes cambiar la métrica que el tablero proyecta.

**Visión radical:** El tablero soporta **5 capas visualizables** que el usuario alterna desde el toolbar superior:

| Capa | Color de edificios | Altura | Caso de uso |
|---|---|---|---|
| **Distrito (default)** | Color del distrito | LOC normalizada | Mapa estructural |
| **Salud** | Verde/ámbar/rojo según status | LOC | Diagnóstico operativo |
| **Antigüedad** | Gradiente azul→rojo según `last_modified` | LOC | Identificar deuda |
| **Tamaño** | Color del distrito | LOC absoluta sin clamp | Ver gigantes vs enanos |
| **Cambio** | Verde si modificado en últimos 7 días, gris si no | LOC | Ver "qué se ha movido" |

**Arquitectura:**
- Componente `LayerSwitcher` en `TopToolbar` (5 botones con icono).
- Estado global `activeLayer` en Home.tsx, prop drill al `IsometricBoard` y `Building`.
- `Building.tsx` usa función `getColor(node, layer)` y `getHeight(node, layer)` que centraliza la lógica.
- Tooltip con explicación de cada capa al hover sobre el botón.

**Criterios de aceptación:**
- Cambiar de capa transiciona suavemente con `framer-motion` (color y altura) en menos de 400ms.
- Las 5 capas funcionan en iPhone (probado en `monstruo-fmpgkidx.manus.space`).
- 1 test de regresión que valida `getColor(node, "salud")` devuelve verde cuando `node.status === "active"`.

---

### T5 — Memoria histórica: el Monstruo se ve crecer

**Problema actual:** El tablero solo muestra el ahora. No hay forma de ver "cómo estaba el Monstruo el 1 de abril" ni "qué cambió en los últimos 7 días".

**Visión radical:** Cada `board.refresh` guarda un snapshot. El TopToolbar tiene un slider de tiempo que permite navegar por la historia.

**Arquitectura:**
- Tabla `board_snapshots` ya existe (T1). Endpoint `board.history` devuelve los últimos N snapshots.
- Componente `TimelineSlider` en TopToolbar con marcas en cada snapshot. Default = ahora.
- Al mover el slider, se llama `board.snapshot(timestamp)` que devuelve ese estado y el `IsometricBoard` se anima al estado histórico.
- Indicador visual cuando estás en modo histórico (banner naranja "Viendo el Monstruo del 18 de mayo").

**Criterios de aceptación:**
- Mover el slider reproduce visualmente el crecimiento del Monstruo (edificios apareciendo, cambiando de color).
- Hay un botón "Volver a hoy" siempre visible.
- 1 test de regresión que valida que `board.snapshot(epoch)` con un timestamp inválido devuelve el snapshot más cercano sin error.

---

### T6 — Acciones desde el tablero: ContextCard se vuelve quirófano

**Problema actual:** ContextCard solo muestra info. No puedes hacer nada desde ahí.

**Visión radical:** ContextCard tiene 3 acciones reales:

1. **"Anotar incidente"** → abre input que escribe a tabla `node_incidents` (id, node_id, captured_at, author, severity, note).
2. **"Marcar como degradada / activa / en construcción"** → escribe a tabla `node_overrides` que tiene precedencia sobre el snapshot automático.
3. **"Pedir al Monstruo que la analice"** → llama `omnibox.ask` con prompt "Analiza la pieza X y dime qué le falta o qué riesgos tiene" y muestra la respuesta en un drawer.

**Arquitectura:**
- 2 tablas Drizzle nuevas: `node_incidents`, `node_overrides`.
- Endpoints tRPC `nodes.recordIncident`, `nodes.setOverride`, `nodes.askAbout`.
- `nodes.setOverride` requiere `protectedProcedure` (solo usuario autenticado puede degradar nodos).
- ContextCard agrega 3 botones al footer con confirmación toast.

**Criterios de aceptación:**
- Anotar un incidente persiste y se ve en el ContextCard la siguiente vez que se abre el nodo.
- Marcar un nodo como degradado lo cambia visualmente en el board en menos de 2s y persiste tras recargar.
- 2 tests de regresión: (a) `recordIncident` rechaza notas vacías; (b) `setOverride` requiere auth.

---

### T7 — Controles táctiles nativos en iPhone

**Problema actual:** En iPhone, el zoom y el pan solo funcionan con botones del toolbar. Es fricción enorme.

**Visión radical:** El Canvas R3F responde a gestos nativos de iOS: pinch-to-zoom, pan con un dedo, doble tap para reset.

**Arquitectura:**
- Usar `@use-gesture/react` (ya está en `package.json`).
- En `IsometricBoard`, envolver con `useGesture({ onPinch, onDrag, onDoubleClick })`.
- `onPinch` modifica `zoomLevel`. `onDrag` modifica `cameraTarget` (con inercia). `onDoubleClick` resetea a la vista por defecto.
- En desktop, mantener controles del toolbar como alternativa accesible.
- Detectar `useMobile()` para activar gestos solo en touch devices.

**Criterios de aceptación:**
- En iPhone real (Safari), pinch sobre el Canvas hace zoom suave entre 0.5x y 3x.
- Pan con un dedo mueve la cámara con inercia.
- Doble tap reinicia la vista en menos de 800ms.
- Validación visual con captura del usuario en `monstruo-fmpgkidx.manus.space`.

---

## 3. Orden de ejecución calibrado

El orden importa porque hay dependencias duras:

| # | Transformación | Depende de | Costo estimado | ROI |
|---|---|---|---|---|
| 1 | **T1 — Sincronización viva** | Drizzle migración | Medio (4-6h) | Crítico — desbloquea T5 y T6 |
| 2 | **T3 — Modo Papá funcional** | Nada | Bajo (2-3h) | Alto — visible inmediatamente, valor humano |
| 3 | **T2 — Cerebro narrativo** | T1 (necesita snapshot vivo) | Medio (3-4h) | Crítico — diferenciador real |
| 4 | **T4 — Capas conmutables** | Nada (puede ir en paralelo a T2) | Bajo (2-3h) | Alto — el tablero deja de ser estático |
| 5 | **T7 — Controles táctiles** | Nada | Bajo (1-2h) | Alto — fricción móvil eliminada |
| 6 | **T6 — Acciones desde tablero** | T1 (necesita persistencia) | Medio (3-5h) | Crítico — el tablero deja de ser pasivo |
| 7 | **T5 — Memoria histórica** | T1 + T6 (necesita snapshots con tiempo) | Medio (2-3h) | Medio — efecto wow, uso ocasional |

**Total estimado:** 17 a 26 horas de trabajo concentrado. Realista en 3 a 5 sesiones de medio día.

---

## 4. Criterios de aceptación globales del sprint

El sprint v3.0 está terminado cuando:

1. El tablero se sincroniza solo con el repo del Monstruo (sin acción humana) cada 5 minutos.
2. El Omnibox responde al menos 5 preguntas de demo en lenguaje humano con citas interactivas a nodos reales.
3. El Modo Papá transforma al menos 5 strings clave (LivePulse, ContextCard, Omnibox, distritos, status).
4. El tablero soporta 5 capas visualizables conmutables desde el toolbar.
5. El tablero recuerda al menos 30 días de snapshots y permite navegarlos.
6. ContextCard permite anotar incidentes y redeclarar el estado de un nodo.
7. En iPhone real, pinch-to-zoom y pan táctil funcionan en Safari.
8. Suite total ≥ 35 tests verde (los 26 actuales + al menos 9 nuevos).
9. Validación visual del usuario en `monstruo-fmpgkidx.manus.space` capturando un flujo end-to-end.

---

## 5. Stack técnico confirmado (sin invenciones)

Todas las herramientas están **ya disponibles** en el proyecto. Cero dependencias nuevas mayores:

| Capa | Herramienta | Ya está |
|---|---|---|
| Persistencia | Drizzle + TiDB MySQL | sí |
| API | tRPC v11 + superjson | sí |
| 3D | R3F + drei | sí |
| Animación | framer-motion | sí |
| Gestos táctiles | @use-gesture/react | sí (en package.json) |
| LLM | Gemini 3 Pro vía router | sí |
| Búsqueda | Fuse.js (legacy) → reemplazada por Gemini en T2 | sí |
| Markdown render | streamdown | sí |
| Tests | Vitest live + unit | sí |
| Cron | Manus Heartbeat | sí (`/home/ubuntu/tablero-campana/references/periodic-updates.md`) |

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `build_visual_ledger.py` falla en producción si el mount `/mnt/desktop/...` no existe | Endpoint `board.refresh` detecta el mount; si no existe, falla limpio con mensaje claro y conserva último snapshot válido |
| Gemini puede inventar nodos al responder | El system prompt del Omnibox prohíbe inventar nodos; el backend valida que cada cita exista en el snapshot antes de devolverla |
| Las capas con animaciones pesadas pueden lagear en iPhone viejo | Detectar `dpr < 2` o navigator.deviceMemory < 4 y degradar a transición instantánea sin animación |
| Snapshots históricos crecen sin límite | Política de retención: 30 días granular + 1 por semana después; cron de purga |
| Override manual de un nodo confunde al Omnibox | El snapshot incluye flag `manuallyOverridden`; el system prompt advierte al modelo |

---

## 7. Lo que **NO** entra en este sprint (descartado deliberadamente)

- **Multi-usuario / colaboración en tiempo real** — el Tablero es la herramienta de un solo Alfredo. WebSockets y CRDT son sobre-ingeniería para una audiencia de 1.
- **Mobile app nativa** — la PWA en Safari iPhone es suficiente si T7 cumple. iOS app store agrega 2 semanas de fricción para 0% de ROI.
- **Integración con Asana / Notion / Slack** — el Tablero debe ser primero útil por sí mismo. Las integraciones son el sprint v4.0.
- **Visualización 3D ultra-realista (sombras volumétricas, RTX, etc.)** — el actual ya es bello. Tiempo gastado en pulir más es robado al cerebro.
- **Reescritura del Canvas con WebGPU** — drei + R3F funcionan. Cambiar la base es deuda técnica disfrazada de innovación.

---

## 8. Lo que el sprint convierte en realidad

> **Antes (v2.4.2):** "Mira qué bonito se ve mi sistema" → estático, decorativo, sin memoria, sin voz.
>
> **Después (v3.0):** "Pregúntale al Monstruo cómo está, decláralo enfermo si lo notas mal, vuelve atrás en el tiempo, navégalo con los dedos" → el Tablero es un panel de mando vivo, conversable, accionable e histórico.

El v3.0 hace que el tablero deje de ser **el escaparate del Monstruo** y empiece a ser **el lugar donde Alfredo gobierna al Monstruo**. Esa es la diferencia radical.

---

**Documento canónico para arrancar el sprint.** Cuando lo apruebes, ejecuto en el orden T1 → T3 → T2 → T4 → T7 → T6 → T5, guardando checkpoint v3.0.X después de cada transformación validada con tests verdes y captura visual.
