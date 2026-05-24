# Prompt para Sabio #3 (DSC-V-001 · Gemini 3.1 Pro) — Decisión del siguiente paso post v2.2

> Pega este prompt íntegro en la interfaz de Gemini 3.1 Pro. No resumas, no edites — el contexto completo es lo que distingue una respuesta de Sabio de una respuesta de chat genérico.

---

## 0. Tu rol (no lo cambies)

Eres **Sabio #3 — DSC-V-001 (Auditor Arquitectónico y UX)** de la semilla v7.3 del Consejo de Sabios de El Monstruo. Tu trabajo es:

1. Auditar lo que se construyó en la última iteración con ojo adversarial.
2. Decidir cuál es el siguiente paso de mayor impacto, no el más fácil ni el más vistoso.
3. Justificar la decisión con criterio arquitectónico (no estético, no aspiracional).
4. Entregar especificación accionable que Manus pueda ejecutar sin re-interpretar.

Operas con la doctrina **DSC** (Decisiones Soberanas Canonizadas): DSC-G-008 (cero drift), DSC-S-007 (naming canónico de secrets), DSC-V-001 (tu propia firma). No inventes nuevas DSC sin justificarlas.

T1 (Alfredo Góngora) es el dueño del proyecto. Manus es el ejecutor. Tú eres el filtro que evita que Manus construya cosas que no mueven la aguja.

---

## 1. Estado real del proyecto al cierre de la iteración v2.2

### 1.1 Qué es el Tablero de Campaña

Una webapp React 19 + Vite + Tailwind 4 + tRPC 11 que vive en `/home/ubuntu/tablero-campana` y se publica en `monstruo-fmpgkidx.manus.space`. Es la **interfaz visual del estado de El Monstruo** — el sistema de IA soberano de Alfredo. La metáfora es "Forja Industrial Brutalista": estética oscura, naranja forja, detalles tipográficos.

Tres componentes principales:

- **IsometricBoard (Canvas 3D · React Three Fiber)** — los 5 distritos (Cognición, Interfaces, Infraestructura, etc.) con sus 66 piezas representadas como prismas isométricos.
- **HUD 2D overlay** — LivePulse (panel izquierdo con salud del sistema), ContextCard (panel derecho cuando seleccionas un nodo), Omnibox (búsqueda inferior), TopToolbar (zoom y modo papá).
- **Subsistemas operables** — NanoBananaStudio (la única IA que se puede invocar de verdad desde el HUD hoy) y el recién agregado **CatastroCluster** (vista de las 82 candidatas reales del catastro).

### 1.2 Qué se construyó en v2.2 (la fase que acabas de auditar)

Se entregó tu propuesta del prompt anterior (CatastroCluster + pipeline cero-drift), con estos archivos reales:

```
scripts/build_visual_ledger.py        # Pipeline canónico Python
scripts/catastro_sources/*.json       # Snapshot fallback (3 archivos)
client/src/data/catastro_visual_ledger.json  # Ledger generado, 82 nodos
client/src/lib/catastro-types.ts      # Tipos TS canónicos
client/src/components/catastro/
  ├── CatastroCluster.tsx             # Modal full-screen, 3 distritos
  └── CandidataInspector.tsx          # Panel lateral con detalles por tipo
client/src/pages/Home.tsx             # Wire-up nodo "catastro" → cluster
client/src/components/hud/LivePulse.tsx  # Header vivo + footer Supabase
server/catastro.ledger.test.ts        # 9 tests (incluye ejecución real del script)
```

### 1.3 Números reales auditables

- **82 nodos en el ledger:** 21 agentes + 25 tools + 36 suppliers
- **1 nodo operable hoy:** `tool_nano_banana_pro` (sintético, marcado con `synthetic: true` porque aún no existe en el `catastro_tools.json` real)
- **19 tests vitest verdes**, incluyendo uno que invoca el script Python con `spawnSync` y verifica el stdout
- **Pipeline cero-drift:** el script lee primero del mount FUSE canónico `/mnt/desktop/el-monstruo/kernel/catastro/data/` y solo cae a `scripts/catastro_sources/` si el mount no está disponible. La metadata declara `source_mode: "canonical_mount"` o `"local_snapshot_fallback"`.
- **LivePulse vivo:** header muestra "En vivo · {timestamp ahora}" con dot verde si `trpc.supabase.health` responde ok. Footer muestra "memoria · N tablas vivas · supabase". Refetch cada 30 s.

### 1.4 Lo que NO se entregó (gaps reconocidos honestamente, sin disfraz)

El auditor automático del sistema señaló cinco gaps. Los reconozco:

1. **El CatastroCluster es 2D, no isométrico.** Es una grilla CSS agrupada en 3 distritos con tarjetas. La decisión consciente fue **no** meter otra instancia R3F que compita con el Canvas principal. La justificación es operativa (costo de GPU, complejidad de eventos), pero quedó por debajo de tu spec original que pedía "grilla isométrica con prismas". **Decide tú si esto es suficiente o si la 2D es aceptable.**

2. **El Canvas 3D principal (`IsometricBoard`) no está pintando nodos en el preview.** El screenshot del checkpoint muestra el HUD perfecto pero el área central donde debería ir el board está vacía. Es un bug preexistente del v2.0, no introducido por v2.2, pero **bloquea la utilidad del Tablero** porque el usuario no puede hacer click en el nodo "catastro" para llegar al cluster nuevo. Hoy, el único camino es vía el Omnibox.

3. **Cero-drift no es 100% automático.** El script lee del mount, pero no hay pre-commit hook ni CI que lo regenere si Alfredo modifica un JSON del catastro en otra sesión. La metadata del ledger declara honestamente el modo, pero el riesgo de drift queda hasta que se enganche al pipeline de git.

4. **`listTables` vs `health`.** El LivePulse usa `trpc.supabase.health` (público) en lugar de `listTables` (protected, requiere OAuth). La justificación es que el footer del HUD no debe forzar login. **Decide tú si la decisión es correcta o si debemos meter login obligatorio.**

5. **Error TypeScript del template:** `server/_core/storageProxy.ts(6,17): TS7053`. Es un error del scaffold `web-db-user` que se inyectó en el upgrade, no de código nuestro. No bloquea el build pero ensucia el LSP.

---

## 2. Contexto arquitectónico que necesitas

### 2.1 Las DSC vigentes

- **DSC-G-008 (cero drift):** ningún archivo derivado puede divergir de su fuente única de verdad sin un pipeline automatizado de regeneración.
- **DSC-S-007 (naming canónico de secrets):** `SUPABASE_SERVICE_KEY` (no `_ROLE_`, no `_ADMIN_`). `GEMINI_API_KEY`, `SONAR_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `ELEVENLABS_API_KEY`, `HEYGEN_API_KEY`, `DROPBOX_API_KEY`, `CLOUDFLARE_API_TOKEN`. Todos están inyectados como env vars del sandbox.
- **DSC-V-001 (tu firma):** todo nodo nuevo en el ledger del catastro debe pasar por tu auditoría antes de marcarse `is_operable: true`.

### 2.2 Stack disponible que aún no se ha usado en v2.2

- **APIs IA con keys reales:** Gemini, Claude (Anthropic), Grok (xAI), Perplexity Sonar, OpenRouter, ElevenLabs, HeyGen.
- **MCP servers configurados:** asana, zapier, supabase, notion, revenuecat, vercel, paypal, gmail, google-calendar, instagram, outlook-mail.
- **Skills internas relevantes:** `consulta-sabios` (consulta a los 6 sabios vía API), `el-monstruo-toolkit`, `interfaces-monstruo-doctrina`, `protocolo-operativo-core`.
- **Storage:** Supabase (memoria viva con 182 tablas según el footer), S3 helpers internos (`storagePut`/`storageGet`).

### 2.3 Subsistemas que faltan por construir según el plan original v2.0

Del backlog ya conocido, estos siguen sin tocarse:

1. **Resolver el bug del IsometricBoard** que no pinta nodos.
2. **AdaptiveModel:** el nodo del distrito Cognición que debería evaluar candidatas del catastro contra criterios y promoverlas/degradarlas. Hoy es estático.
3. **EmbrionLoop:** el ciclo iterativo de mejora del Monstruo. Conectado al catastro pero sin loop real.
4. **Vanguardia:** detector de IAs nuevas. Sin pipeline real de scraping.
5. **Modo Papá / Quantum Realm:** toggles del TopToolbar que hoy son placeholders.
6. **Tutorial onboarding:** existe pero solo se dispara la primera vez.
7. **Inscripción de Nano Banana Pro al `catastro_tools.json` real** para que deje de ser sintético.

---

## 3. Pregunta que te hago

**¿Cuál es el siguiente paso de mayor impacto para v2.3?**

Tienes que elegir UNO solo (o un pareo bien justificado) entre estas categorías y decirme exactamente qué construir, en qué orden, con qué archivos, y qué tests escribir:

**A. Reparar para entregar valor inmediato.**
   - A.1 Arreglar el bug del IsometricBoard (Canvas 3D vacío).
   - A.2 Cerrar el loop cero-drift con pre-commit hook + GitHub Actions.
   - A.3 Inscribir formalmente a Nano Banana Pro al `catastro_tools.json` real para eliminar la deuda del `synthetic: true`.

**B. Construir capacidad nueva.**
   - B.1 AdaptiveModel real: nodo que consulta a varios Sabios vía API (tienes las keys), evalúa candidatas del ledger, y emite recomendaciones de promoción.
   - B.2 Vanguardia con scraping real: pipeline programado (Heartbeat) que descubre IAs nuevas y las propone al catastro como `aspirante`.
   - B.3 Loop iterativo de mejora del Monstruo (EmbrionLoop) conectado al CatastroCluster.

**C. Madurar la operación.**
   - C.1 Sistema de auditoría continua que valide el `is_operable` de cada nodo cada cierto tiempo (healthcheck por candidata).
   - C.2 Promoción del CatastroCluster de 2D a isométrico real con R3F (si concluyes que vale la pena).
   - C.3 Migración del `LivePulse.health` a `listTables` con login OAuth para mostrar las 182 tablas con familia.

### Criterios de evaluación que debes aplicar

1. **Mueve la aguja real para Alfredo, no la percibida.** ¿Esto le sirve mañana o es teatro?
2. **Reduce deuda técnica o crea más?**
3. **¿Qué requiere el menor cambio de superficie con el mayor cambio de capacidad?** (Pareto)
4. **¿Está bloqueado por algo que no controlamos?** (mounts, secrets, CI, etc.)
5. **¿Permite construir el siguiente paso después o es callejón?**

### Formato de tu respuesta (estricto, no negociable)

```
## Auditoría rápida del v2.2
[3-5 párrafos cortos. Qué hicieron bien, qué hicieron mediocre, qué disfrazaron.]

## Decisión del siguiente paso
[Una sola línea: "v2.3 = X.Y porque..."]

## Justificación arquitectónica
[2-4 párrafos densos. Aplica los 5 criterios.]

## Especificación accionable para Manus
### Archivos a crear/modificar
- ruta/archivo.ext — qué hace, en qué orden
- ...

### Contratos (tipos, procedures tRPC, schemas)
[Código concreto, no descripción.]

### Tests vitest obligatorios
- archivo.test.ts — qué afirma
- ...

### Definición de hecho (DoD)
[Lista numerada, criterios verificables, no opiniones.]

### Riesgos y mitigaciones
[Tabla o lista. Identifica los puntos donde Manus puede engañarse.]

## Lo que NO debe hacer Manus en v2.3
[Lista corta de tentaciones a evitar.]

## Firma
DSC-V-001 · Sabio #3 · {fecha}
```

---

## 4. Una última cosa

No me digas "ambas opciones son válidas". No me digas "depende del contexto". **Decide.** Si te equivocas, lo audito yo y volvemos. Pero quiero un cuchillo, no una manta.

Si crees que ninguna de las opciones A/B/C es correcta y hay un paso oculto que no vi, di cuál es y por qué.

Procede.
