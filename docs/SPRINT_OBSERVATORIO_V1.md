# Sprint Observatorio Vivo v1.1 — La Forma como cabina de transparencia total del Monstruo

**Versión:** v1.1 (post 5-sabios consolidation)
**Estado:** Listo para firma T1-Alfredo
**Autor:** Hilo Manus tablero-campana, 26-may-2026
**Reemplaza:** Días 9-30 del plan canónico `FORJA_OS_SPRINT_v0_1_v2.md` y v1.0 de este mismo documento
**Conserva:** Días 1-8 ya ejecutados de Forja v4 (kernel TS + sub-envelopes + atenuación monotónica)

**Cambios de v1.0 → v1.1:** 13 ajustes integrados (7 bloqueantes + 6 refinamientos) consolidados de la consulta a los 5 sabios (Gemini, Claude Cowork, Grok 4 Heavy, Perplexity, ChatGPT 5.5 Pro). Ver `docs/sabios_observatorio_v1/00_VEREDICTO_CONSOLIDADO.md`.

---

## 1. Doctrina rectora

> **El Monstruo NO es una app. Es un kernel con N transports.**
> — Cowork T2-A, `VISION_APP_MONSTRUO_CLASE_MUNDIAL_2026_05_11.md` Cap 1

> **La verdadera interfaz del Monstruo es que NO tiene interfaz. Vive en todos lados como Jarvis.**
> — Alfredo Góngora, 26-may-2026

> **La Forma es la única excepción doctrinal: no es interfaz para operar, es el observatorio único de transparencia total. Muestra cada pieza viva en producción y cada pieza canonizada en planeación.**
> — Alfredo Góngora, 26-may-2026

La Forma es:

- **Cabina de transparencia** del kernel y todo su universo conectado
- **Mapa vivo** donde cada componente pulsa con su actividad real
- **Modo transparencia** donde lo ejecutado y lo canonizado-no-ejecutado conviven en la misma vista
- **Mirador del universo** de proyectos hijos del Monstruo (Flutter, simulador, catastros, ticketlike, CIP, softrestaurant, comercialización Leones, La Forja, etc.)

La Forma NO es:

- Un transport. No se opera al Monstruo desde aquí
- Un panel administrativo. No hay CRUD
- Una réplica del genoma. Eso ya existe parcialmente y queda subordinado a esta visión

### 1.1 Regla canónica de máximo poder doctrinal — READ-ONLY ESTRICTO

**Ajuste #7 bloqueante (ChatGPT 5.5 Pro, único pero alineado con doctrina canonizada):**

> **La Forma es estrictamente READ-ONLY hasta nuevo DSC. Cero buttons with side effects. Cero write path desde el Tablero al kernel. Cualquier acción desde el Tablero requiere un sprint separado tipo `TRANSPORT_LA_FORMA_001` con su propio DSC firmado por T1-Alfredo.**

Razón doctrinal: si la Forma nace con un solo botón que escribe al kernel, después es imposible quitarlo. La doctrina dice que La Forma observa y los transports operan. Si La Forma se vuelve transport por accidente, el principio "kernel + N transports, NO una app" colapsa y el Monstruo se vuelve dependiente de la Forma para ejecutar — exactamente lo opuesto a lo que el operador quiere.

Esto significa que:
- ContextCard renderiza información, no envía comandos.
- Los enlaces son a archivos en GitHub o documentos canónicos, no acciones.
- Si en el futuro el operador quiere "aprobar desde el Tablero" o "pausar al kernel desde el Tablero", se redacta y firma un sprint nuevo de transport.

---

## 2. Tres hitos del sprint en orden corregido

**Ajuste #8 refinamiento (ChatGPT 5.5 Pro):** El orden general B → A → C se mantiene pero con subdivisión: **B-lite primero (1-2 días), A completo, C completo, B-polish al final.**

Razón: si B se come 3-4 días completos antes del primer latido real, el Observatorio Vivo empieza como maqueta estática. El corazón del valor es A. B-lite valida el pipeline cross-repo y ofrece capa fantasma mínima sin costo estético. B-polish termina la estética 3D avanzada después de que A y C ya entreguen valor real.

### Hito B-lite — Modo Transparencia mínimo viable (1-2 días)

**Ajuste #4 bloqueante reformulado:** B-lite tiene Definition of Done binario reducido.

**Objetivo verificable:**

- Tabla `sprints` poblada con ≥20 sprints reales del repo `el-monstruo`.
- Capa visual conmutable "Sprints planeados" en el LayerSwitcher existente.
- Edificios fantasma usando `Building.tsx` con material `SPRINT/FUTURE` ya existente. Altura uniforme — sin escala log todavía.
- Click en edificio fantasma abre `ContextCard` con: ID, título, status badge, descripción truncada y enlace al MD canónico en GitHub.
- Filtro por status y por distrito en el LayerSwitcher.

**Ajuste #13 refinamiento (Perplexity, ChatGPT):** DoD binario obligatorio. Si cualquiera de los puntos anteriores falla, B-lite NO está hecho.

**Lo que se difiere a B-polish:**

- Escala logarítmica por `estimated_days`.
- Líneas translúcidas conectando edificios fantasma a nodos sólidos.
- Animaciones de transición.
- Hover refinado.
- Navegación fina entre sprints relacionados.

**Por qué primero:** No depende del kernel vivo, no requiere infra nueva, reusa rendering existente. Construye el lenguaje visual que A y C reusarán. **Costo: 1-2 días, no 3-4.**

### Hito A — Bus de eventos vivos del kernel (5-7 días)

**Objetivo verificable:** Cuando el agente del kernel ejecuta una acción material o emite telemetría observacional, el Tablero pinta un latido visible en tiempo real en menos de 2 segundos.

| Categoría de evento | Origen | Distrito | Renderizado |
|---|---|---|---|
| Mensajes Telegram entrantes | Bot Telegram | Interfaces | Pulso sobre nodo Telegram |
| Tool calls (browser, code_exec, file_ops) | Kernel tool dispatcher | Capacidades | Pulso sobre brazo correspondiente |
| LangGraph node activations | Kernel engine | Cognición | Pulso sobre nodo del flujo |
| Mem0 / MemPalace / LightRAG queries | Memoria | Cognición | Pulso sobre las memorias |
| Embrión budget changes | Embrión | Capacidades | Termómetro vivo |
| Receipts firmados | Forja receipt writer | Universo | Hilo dorado en ledger |

**Ajuste #4 bloqueante reformulado (ChatGPT 5.5):** mecanismo Supabase Realtime HÍBRIDO, no Postgres Changes puro.

#### 2.1 Mecanismo del bus — Supabase Realtime híbrido

**Componente A (source of truth, ledger durable):** Tabla `kernel_events_stream` en **Postgres del Monstruo** (Supabase del kernel). Cada evento del kernel hace INSERT aquí. Persistencia, auditoría histórica, queries SQL, replays.

**Componente B (visual bus, baja latencia):** Supabase Broadcast privado. Después del INSERT en `kernel_events_stream`, un trigger Postgres o el propio publisher emite el evento por **canal Broadcast privado** suscrito por el Tablero. Broadcast es el mecanismo recomendado por Supabase para visualización en tiempo real, no Postgres Changes (Supabase official guidance).

**Componente C (fallback):** Si WebSocket cae o el cliente del Tablero pierde conexión durante >5s, el cliente activa polling paginado desde `kernel_events_stream` cada 5s. Cuando WebSocket recupera, vuelve a Broadcast. **Drop visual permitido, drop ledger nunca.**

#### 2.2 Backpressure y coalescing (ajuste #3 bloqueante)

| Variable | Valor canónico |
|---|---|
| Visual window React | 250 eventos máximo en memoria del cliente |
| Aggregation window | 1 segundo |
| Aggregation key | `district + event_type + trace_id` |
| Drop policy visual | FIFO desde el evento 251 hacia atrás |
| Drop policy ledger | NUNCA. Postgres conserva todo. |
| Fallback polling | 5 segundos cuando WebSocket cae |

**Métricas obligatorias desde el día 1:**

- `events_per_minute` por kernel
- `payload_p50_bytes`, `payload_p95_bytes`
- `websocket_disconnects_total`
- `broadcast_lag_ms_p50`, `broadcast_lag_ms_p95`
- `postgres_insert_lag_ms_p50`, `postgres_insert_lag_ms_p95`
- `visual_window_drops_total`

Métricas se exponen en endpoint `/api/observatorio/health` del Tablero y se renderizan en un panel HUD secundario (no en el canvas 3D).

#### 2.3 Cuotas Supabase (ajuste #5 refinamiento, ChatGPT)

| Plan Supabase | Límite Realtime |
|---|---|
| Free | 200 conexiones, 100 msg/s |
| Pro | 500 msg/s |
| Pro sin spend cap o Team | 2,500 msg/s |
| Enterprise | configurable |

Si el kernel emite >100 msg/s sostenidos, considerar coalescing de eventos `langgraph.node.*` con sampling antes de publicar. Si emite >500 msg/s, evaluar plan Team o desplegar Realtime self-hosted como fallback.

#### 2.4 Latencia objetivo

<2 segundos desde `publish_event` en kernel hasta render visual en el Tablero.

### Hito C — Mapa estelar de proyectos conectados (3-5 días)

**Objetivo verificable:** Un nuevo distrito o capa adicional muestra todos los proyectos hijos del Monstruo, cada uno con:

- Nombre, repo, URL de producción si aplica.
- Health check vivo (último latido recibido).
- Última actividad relevante (commit, deploy, transacción).
- Conexión visible al kernel (línea cargada o vacía según actividad).
- Estado: `ACTIVE` / `IDLE` / `DEGRADED` / `OFFLINE` / `EMBRIONARIO` (solo doctrina, no construido).

**Ajuste #10 refinamiento (ChatGPT):** taxonomía explícita de health check method.

| `health_check_method` | Significado |
|---|---|
| `http` | Tablero hace fetch al `health_check_url` cada N minutos |
| `db` | Tablero consulta directamente a su DB |
| `github_commit` | Tablero consulta GitHub API por último commit en branch principal |
| `manual` | Operador actualiza estado a mano |
| `doctrine_only` | Solo existe doctrina canonizada, no hay implementación. Estado siempre `EMBRIONARIO`, NUNCA `ACTIVE`. |
| `none` | Sin verificación posible |

**Regla canónica:** un proyecto con `health_check_method = doctrine_only` jamás puede aparecer pintado como `ACTIVE`. Si un día se construye, se cambia su `health_check_method` a `http|db|github_commit` y se le permite estar `ACTIVE`.

**Proyectos canónicos identificados al 26-may-2026:**

| Proyecto | Repo | Producción | Tipo | Health method |
|---|---|---|---|---|
| el-monstruo (kernel) | `alfredogl1804/el-monstruo` | Railway `el-monstruo-kernel-production` | Kernel | `http` |
| tablero-campana (La Forma) | `alfredogl1804/tablero-campana` | Manus webdev | Observatorio (este) | `http` |
| apps/mobile (Flutter) | dentro de `el-monstruo` | iPhone Alfredo, NO App Store | Transport P0 | `manual` |
| Bot Telegram (`@MounstroOC_bot`) | `bot_v3.py` en `el-monstruo` | Railway `bot-telegram` | Transport P0 | `http` |
| Command Center PWA | `el-monstruo-command-center` | Railway login wall | Transport P1 | `http` |
| apps/la-forja (Cliente Cero) | dentro de `el-monstruo` | Local + branch | Cliente Cero | `github_commit` |
| simulador-predictivo-causal | repo separado | Railway | Proyecto-hijo | `http` |
| catastros (catastro_sources) | `el-monstruo/scripts/catastros/` | snapshots versionados | Investigación | `github_commit` |
| ticketlike.mx | `like-kukulkan-tickets` | Producción Stripe live | Operativo | `http` |
| CIP (creacion-cip) | doctrina | embrión | Embrión | `doctrine_only` |
| softrestaurant-ai-10x | doctrina + radar | embrión | Embrión | `doctrine_only` |
| comercialización Leones (Zona Like 313) | doctrina operativa | embrión | Embrión | `doctrine_only` |
| WhatsApp transport | NO existe | NO existe | Embrión P0 | `doctrine_only` |
| Apple Watch transport | NO existe | NO existe | Embrión P2 | `doctrine_only` |

### Hito B-polish — Estética 3D avanzada (1-2 días, diferido)

Tras Hito A y C completos, vuelven los refinamientos visuales del Tablero:

- Escala logarítmica de altura por `estimated_days`.
- Líneas translúcidas conectando edificios fantasma a nodos sólidos que tocará el sprint.
- Animaciones de fade-in al activar la capa "Sprints planeados".
- Hover refinado con tooltip narrativo.
- Navegación entre sprints relacionados (dependencies).

---

## 3. Schemas canónicos por motor

**Ajuste #2 bloqueante (Cowork + Perplexity + ChatGPT):** SQL separado por motor. Cada tabla declara explícitamente el motor donde vive. Migraciones independientes. Test en DB real obligatorio.

### 3.0 Topología de bases declarada

**Doctrina cross-DB:**

| Tabla | Motor | Repo donde se migra | Razón |
|---|---|---|---|
| `kernel_events_stream` | **Postgres / Supabase del Monstruo** | `el-monstruo` | Kernel ya escribe a Supabase. Trigger Postgres → Broadcast nativo. Realtime sobre Postgres es feature first-class. |
| `sprints` | **TiDB del Tablero** (MySQL dialect) | `tablero-campana` | Drizzle del Tablero ya está conectado a TiDB. Ingestor lee desde GitHub API y escribe a TiDB sin pasar por kernel. |
| `connected_projects` | **TiDB del Tablero** | `tablero-campana` | Visualización local del Tablero, no la consume el kernel. |
| `project_heartbeats` | **TiDB del Tablero** | `tablero-campana` | Tablero hace polling de health checks y persiste localmente. |
| `forja_*` (8 tablas Forja v4 ya existentes) | **TiDB del Tablero** | `tablero-campana` | Ya migradas en Día 1 de Forja v0.1. |

**ADR cross-repo nuevo (FALTA):** `docs/ADR/0001_topologia_cross_db_observatorio.md` que canoniza esta topología. Pendiente redactar tras firma del plan.

### 3.1 Tabla `sprints` (Hito B-lite, motor TiDB / MySQL dialect)

```sql
-- Migration: tablero-campana/drizzle/migrations/00XX_observatorio_sprints.sql
-- Motor: TiDB (compatible MySQL dialect)
CREATE TABLE sprints (
  sprint_id VARCHAR(64) PRIMARY KEY,
  source_repo VARCHAR(128) NOT NULL,
  source_path VARCHAR(512) NOT NULL,
  title VARCHAR(256) NOT NULL,
  description_md TEXT,
  status VARCHAR(32) NOT NULL,
  signed_by VARCHAR(64),
  signed_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  affected_districts JSON NOT NULL,
  affected_nodes JSON,
  affected_projects JSON,
  dependencies JSON,
  estimated_days INT,
  actual_days INT,
  pr_numbers JSON,
  metadata JSON,
  ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ingested_from VARCHAR(64) NOT NULL,
  hash_canonical VARCHAR(64) NOT NULL,
  INDEX idx_status (status),
  INDEX idx_source (source_repo, source_path(200)),
  INDEX idx_district ((CAST(affected_districts AS CHAR(64))))
);
```

**Notas críticas:**
- `status` declarado como `VARCHAR(32)` en lugar de `ENUM(...)` para evitar lock-in de dialecto. Validación de valores en aplicación con `zod`. Valores permitidos: `draft`, `signed`, `executing`, `completed`, `rejected`, `obsolete`.
- Sin `ON UPDATE CURRENT_TIMESTAMP` (incompatibilidad cross-motor).
- Índice sobre `affected_districts` cambia de `(50)` a expresión sobre `CAST(...)` para portabilidad.

### 3.2 Tabla `kernel_events_stream` (Hito A, motor Postgres / Supabase del Monstruo)

```sql
-- Migration: el-monstruo/supabase/migrations/00XX_observatorio_kernel_events.sql
-- Motor: PostgreSQL (Supabase del Monstruo)
-- Ajuste #1 bloqueante (UNANIMIDAD 5/5): autenticidad criptográfica obligatoria
CREATE TYPE event_severity AS ENUM ('info','notice','warning','error','critical');

CREATE TABLE kernel_events_stream (
  event_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kernel_version    VARCHAR(32) NOT NULL,
  event_type        VARCHAR(64) NOT NULL,
  source_component  VARCHAR(64) NOT NULL,
  district          VARCHAR(32) NOT NULL,
  target_node_id    VARCHAR(128),
  target_project_id VARCHAR(64),
  payload           JSONB,
  severity          event_severity NOT NULL DEFAULT 'info',
  trace_id          VARCHAR(64),
  parent_event_id   UUID,

  -- Autenticidad criptográfica (ajuste #1 bloqueante UNÁNIME)
  event_hash_canonical    CHAR(64)       NOT NULL,    -- sha256 hex de canonical RFC 8785 sobre todo menos firma
  event_signature_ed25519 VARCHAR(128)   NOT NULL,    -- base64url ed25519 sobre event_hash_canonical
  agent_key_id            VARCHAR(64)    NOT NULL,    -- pubkey id del agente firmante
  prev_event_hash         CHAR(64),                   -- encadenamiento opcional por trace_id

  expires_at        TIMESTAMPTZ
);

CREATE INDEX idx_kev_emitted ON kernel_events_stream (emitted_at DESC);
CREATE INDEX idx_kev_type    ON kernel_events_stream (event_type);
CREATE INDEX idx_kev_district ON kernel_events_stream (district);
CREATE INDEX idx_kev_trace   ON kernel_events_stream (trace_id);
CREATE INDEX idx_kev_agent   ON kernel_events_stream (agent_key_id);

-- RLS: solo service_role puede insertar; cualquier autenticado puede leer
ALTER TABLE kernel_events_stream ENABLE ROW LEVEL SECURITY;

CREATE POLICY kev_insert_service ON kernel_events_stream
  FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY kev_select_authenticated ON kernel_events_stream
  FOR SELECT TO authenticated
  USING (true);

-- Habilitar Realtime sobre esta tabla (modo Broadcast privado preferido)
ALTER PUBLICATION supabase_realtime ADD TABLE kernel_events_stream;

-- Trigger Postgres opcional para emitir Broadcast privado tras insert
-- (alternativa: que el publisher Python emita Broadcast directamente)
```

**Notas críticas:**
- `event_id` ahora `UUID` con `gen_random_uuid()` nativo Postgres (no `VARCHAR(36)`).
- `severity` usa `ENUM` Postgres con `CREATE TYPE`, no `ENUM(...)` inline MySQL.
- `payload` es `JSONB` (más eficiente en Postgres) en lugar de `JSON`.
- `emitted_at` usa `TIMESTAMPTZ` con default `NOW()`, no `TIMESTAMP(3)` MySQL.
- Tres campos criptográficos nuevos según ajuste #1 unánime: `event_hash_canonical`, `event_signature_ed25519`, `agent_key_id`. Opcional: `prev_event_hash` para encadenamiento por trace.
- RLS habilitado: service_role del kernel inserta, authenticated lee. Esto satisface ajuste de Grok 4 sobre RLS escritura cross-repo.

### 3.3 Tabla `connected_projects` (Hito C, motor TiDB / MySQL dialect)

```sql
-- Migration: tablero-campana/drizzle/migrations/00XX_observatorio_projects.sql
-- Motor: TiDB
CREATE TABLE connected_projects (
  project_id VARCHAR(64) PRIMARY KEY,
  display_name VARCHAR(128) NOT NULL,
  category VARCHAR(32) NOT NULL,
  source_repo VARCHAR(256),
  production_url VARCHAR(512),
  health_check_url VARCHAR(512),
  health_check_method VARCHAR(32) NOT NULL DEFAULT 'http',
  district VARCHAR(32),
  position_x INT,
  position_y INT,
  status VARCHAR(32) NOT NULL,
  last_heartbeat TIMESTAMP NULL,
  last_activity TIMESTAMP NULL,
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_status (status)
);
```

Validación de valores en aplicación con zod:
- `category` en `kernel|transport|observatorio|operativo|investigacion|embrion`
- `health_check_method` en `http|db|github_commit|manual|doctrine_only|none`
- `status` en `ACTIVE|IDLE|DEGRADED|OFFLINE|EMBRIONARIO`

### 3.4 Tabla `project_heartbeats` (Hito C, motor TiDB / MySQL dialect)

```sql
-- Migration: tablero-campana/drizzle/migrations/00XX_observatorio_heartbeats.sql
-- Motor: TiDB
CREATE TABLE project_heartbeats (
  heartbeat_id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  emitted_at TIMESTAMP(3) NOT NULL,
  status VARCHAR(32) NOT NULL,
  latency_ms INT,
  payload JSON,
  INDEX idx_project_time (project_id, emitted_at)
);
```

### 3.5 Test en DB real obligatorio

**Ajuste #2 bloqueante reformulado:** ningún schema declarado aquí se considera firmado canónicamente hasta que:

1. `tablero-campana`: ejecutar `pnpm db:push` y verificar que las tres tablas existen en TiDB.
2. `el-monstruo`: ejecutar la migración Supabase y verificar via psql que la tabla y los índices existen, RLS está habilitado, Realtime publication la incluye.
3. Test E2E: insertar fila de prueba, leer fila, verificar firma ed25519, eliminar fila.

Sin estos tests verde, el sprint NO avanza a fases de implementación visual.

---

## 4. Bus de eventos: contrato canónico

**Ajuste #4 bloqueante:** Supabase Realtime HÍBRIDO (Postgres ledger + Broadcast privado), no Postgres Changes puro.

### 4.1 Arquitectura

```
[ Kernel Python (el-monstruo, Railway) ]
        |
        | publish_event(event_type, district, payload, target_node_id, ...)
        v
[ kernel/observatorio/event_publisher.py ]
        |
        | 1. Compute canonical hash (RFC 8785) over event payload + metadata
        | 2. Sign with kernel ed25519 key (agent_key_id)
        | 3. INSERT INTO kernel_events_stream (Postgres Supabase)
        | 4. Send Broadcast privado en canal "observatorio:{district}"
        v
[ Supabase Realtime ]
        |
        | WebSocket Broadcast privado
        v
[ Tablero (tablero-campana, Manus webdev) ]
        |
        | useObservatorioStream() React hook
        | - Verifica firma ed25519 contra agent_key_id conocido
        | - Si firma válida: añade a visual window 250 eventos
        | - Si firma inválida: marca como UNTRUSTED visualmente, log warning
        | - Aggregation por district + event_type + trace_id cada 1s
        v
[ Renderer 3D + HUD ]
        - Pulso animado sobre target_node_id
        - LivePulse HUD
        - Timeline lateral
```

### 4.2 Verificación de firma en cliente

**Ajuste #1 bloqueante UNÁNIME:** el Tablero NO confía en eventos sin firma válida.

```ts
// client/src/lib/observatorio/verifyEvent.ts (nuevo)
import { verifyEd25519 } from "@/lib/forja/ed25519"; // reusa Forja v4
import { canonicalize } from "@/lib/forja/canonical"; // reusa Forja v4

export async function verifyKernelEvent(event: KernelEvent): Promise<boolean> {
  const knownAgentKey = await loadAgentPublicKey(event.agent_key_id);
  if (!knownAgentKey) return false;

  // Recompute canonical hash
  const { event_signature_ed25519, ...payload } = event;
  const canonical = canonicalize(payload);
  const recomputedHash = sha256Hex(canonical);
  if (recomputedHash !== event.event_hash_canonical) return false;

  // Verify signature
  return verifyEd25519(
    Buffer.from(event.event_hash_canonical, "hex"),
    Buffer.from(event_signature_ed25519, "base64url"),
    knownAgentKey
  );
}
```

**Reusa código Forja v4 ya construido en Días 1-8.** No es nueva implementación criptográfica.

### 4.3 Llaves de agentes y rotación

**Tabla nueva `agent_keys` en TiDB del Tablero:**

```sql
CREATE TABLE agent_keys (
  agent_key_id VARCHAR(64) PRIMARY KEY,
  agent_name VARCHAR(128) NOT NULL,
  public_key_pem TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rotated_at TIMESTAMP NULL,
  rotated_to VARCHAR(64),
  metadata JSON
);
```

Agentes canónicos al 26-may-2026:

| `agent_key_id` | Agente |
|---|---|
| `kernel-engine-v0` | LangGraph del kernel principal |
| `bot-telegram-v0` | Bot Telegram embebido en el kernel |
| `embrion-v0` | Loop del Embrión |
| `forja-gateway-v0` | Forja v4 gateway emitiendo receipts |

### 4.4 Versionado de schema de eventos (ajuste #12 refinamiento)

Cada evento incluye `kernel_version`. El Tablero mantiene una tabla de **traducciones por versión** para soportar al menos las 2 últimas versiones del kernel sin romperse. Cuando una versión se vuelve obsoleta, eventos viejos se marcan como `LEGACY` visualmente pero siguen renderizando.

---

## 5. Ingestor de sprints (Hito B-lite detalle)

**Ajuste de transparencia:** ingestor lee desde **GitHub API** del repo `alfredogl1804/el-monstruo`, NO desde mount FUSE local.

Razón: el plan original asumía que `/mnt/desktop/el-monstruo/` siempre estaba disponible. Esto NO es robusto para producción (Manus webdev no tiene mount FUSE en runtime). GitHub API funciona desde cualquier ambiente con `GITHUB_TOKEN`.

### 5.1 Mecanismo

Script Node.js `tablero-campana/scripts/ingest_sprints.ts` que:

1. Usa `gh api` o `Octokit` con `GITHUB_TOKEN` ya disponible.
2. Lista archivos en `bridge/sprints_propuestos/`, `bridge/sprints_completados/` y `bridge/sprints_rejected/` del repo `alfredogl1804/el-monstruo`.
3. Para cada archivo MD, descarga contenido raw.
4. Extrae frontmatter o cabecera (título, ID, status, distrito, dependencias, días estimados, PRs asociados).
5. Computa `hash_canonical` (sha256 hex del contenido MD).
6. UPSERT en tabla `sprints` (TiDB del Tablero) si `hash_canonical` cambió o es nuevo.
7. Loggea en consola y en endpoint `/api/observatorio/ingest-status` cuántos se ingestaron.
8. Tras Hito A vivo: opcionalmente emite evento `sprint.ingested` al bus del kernel (no bloqueante).

### 5.2 Frecuencia

- Manual: tRPC mutation `forja.ingestSprints` o endpoint `/api/observatorio/ingest`.
- Programado: cron cada 15 minutos vía Heartbeat de Manus si está disponible. Fallback: cron interno con `node-cron`.

### 5.3 Detección de status

| Status | Detección |
|---|---|
| `draft` | Default si archivo está en `bridge/sprints_propuestos/` y no tiene marcas de firma |
| `signed` | Filename contiene `_FIRMADO_` o frontmatter tiene `signed_by` |
| `executing` | Existe branch en GitHub con prefijo del `sprint_id` |
| `completed` | Archivo en `bridge/sprints_completados/` |
| `rejected` | Archivo en `bridge/sprints_rejected/` |
| `obsolete` | Filename contiene `_OBSOLETE_` o `_DEPRECATED_` |

---

## 6. Visualizador de sprints fantasma (Hito B-lite + B-polish)

### 6.1 Hito B-lite (mínimo viable, 1-2 días)

**Reusa:** `Building.tsx` con material `SPRINT/FUTURE` ya existente. **Cero código nuevo de rendering 3D.**

**Agrega:**

1. Capa visual conmutable en `LayerSwitcher` existente: nuevo modo `"Sprints planeados"`.
2. En este modo, sobre cada distrito afectado por sprints `draft|signed|executing`, aparecen edificios fantasma adicionales con altura uniforme (ej. 1.5x altura promedio del distrito).
3. Click en edificio fantasma abre `ContextCard` con:
   - Título del sprint
   - Status badge color-coded
   - Descripción markdown truncada a 500 chars
   - Distritos y nodos afectados como tags clicables (no navegan en B-lite)
   - **Botón "Ver MD canónico"** → abre el archivo en GitHub en nueva pestaña (read-only, doctrina #7)
4. Filtro por status y por distrito en LayerSwitcher.

### 6.2 Hito B-polish (estética avanzada, 1-2 días al final)

Lo que se difiere a este hito final del sprint:

1. Altura proporcional a `estimated_days` con escala logarítmica (1d → 1.0u, 7d → 1.85u, 30d → 2.7u).
2. Líneas translúcidas conectando cada edificio fantasma con los nodos sólidos que tocará.
3. Animaciones: fade-in al activar la capa, pulso suave sobre `executing`, opacidad reducida sobre `obsolete`.
4. Hover refinado con tooltip narrativo ("Este sprint construirá X conectando Y con Z").
5. Navegación: click en tag de dependencia salta a otro sprint.
6. Modo "vista temporal": slider para ver el board proyectado a 7d, 30d, 90d con sprints aplicados.

---

## 7. Adapter Forja v4 ↔ kernel — telemetry separada de material

**Ajuste #5 bloqueante (ChatGPT 5.5 Pro):** separar eventos observacionales (telemetry) de acciones materiales. Telemetry NO pasa por Forja. Solo acciones materiales requieren validación Forja.

**Ajuste #6 bloqueante (Perplexity):** nombres reales de archivos del kernel Python verificados antes de implementar. Nada de inventar `ActionEnvelope.evaluate()` si el archivo real es `core/policy_engine.py::PolicyEngine.evaluate()`.

### 7.1 Verificación de contratos reales del kernel (PRE-IMPLEMENTACIÓN)

Antes de escribir una sola línea del adapter, redactar y firmar:

**`docs/ADR/0002_contratos_python_kernel_observatorio.md`** que liste con paths exactos del repo `alfredogl1804/el-monstruo`:

- Path real del módulo donde vive el ActionEnvelope o equivalente
- Path real del módulo donde vive el PolicyEngine o equivalente
- Path real del módulo donde vive el engine principal del LangGraph
- Path real del módulo donde se emite EventBuilder o equivalente

Sin este ADR firmado, el código del adapter no se escribe.

### 7.2 Categorización de eventos kernel → ¿pasa por Forja?

| Categoría | Ejemplos | ¿Forja valida? | Adapter |
|---|---|---|---|
| **Telemetry observacional** | `telegram.message_in`, `langgraph.node.start`, `mem0.query`, `embrion.heartbeat` | NO | Solo publica al bus |
| **Acción material reversible** | `langgraph.node.respond`, `tools.code_exec` (en sandbox) | OPCIONAL (modo shadow) | Forja registra, no bloquea |
| **Acción material irreversible** | `tools.deploy.production`, `tools.payment.charge`, `tools.public_message.send`, `tools.file_ops.write_main` | SÍ | Forja gateway valida ANTES de ejecutar; sin token ALLOW, no se ejecuta |
| **Receipt firmado** | `receipt.signed` por agente | SÍ | Forja registra como receipt encadenado Merkle |

**Ventaja arquitectónica:** el kernel no se traba pidiendo Forja por cada microevento. Solo cuando va a hacer algo materialmente irreversible. Esto preserva latencia <2s del observatorio Y mantiene gobernanza criptográfica donde importa.

### 7.3 Compatibilidad gradual de Forja

| Fase | Modo Forja | Cuándo |
|---|---|---|
| 1 | **shadow** | Forja observa decisiones del kernel, registra receipts, NO bloquea acciones. Cierre de Hito Adapter. |
| 2 | **enforce_warn** | Forja bloquea solo acciones de capability `production_deploy` y otras críticas pre-acordadas. Sprint posterior. |
| 3 | **enforce_full** | Toda acción material del kernel pasa por Forja gateway antes de ejecutar. Sprint posterior. |

Cada paso requiere DSC firmado por T1-Alfredo. **Este sprint solo entrega Fase 1 (shadow).**

### 7.4 Branch drift mitigación (ajuste #11 refinamiento)

Antes de implementar el adapter Python en `el-monstruo`, ejecutar:

1. Rebase de `design/forja-os-sovereign-agentic-fabric` (tablero-campana) contra `main` actual.
2. Validación de schemas migrados en TiDB y Supabase del Monstruo.
3. Tests Forja v4 verde (`pnpm vitest run forja`).
4. Tests del kernel verde según su propia suite.

Si rebase produce conflictos, resolverlos antes de cualquier código del adapter.

### 7.5 Spike día 0 opcional (ajuste #9 refinamiento)

Antes de invertir 5-7 días en Hito A completo, ejecutar **spike de medio día**: empujar un evento hardcodeado por todo el camino:

1. Kernel emite UN evento de prueba con `event_type='spike.test'`.
2. INSERT en `kernel_events_stream` Postgres.
3. Trigger / publisher emite Broadcast privado.
4. Tablero recibe, verifica firma, renderiza pulso de prueba en distrito Capacidades.

Si el camino completo funciona en spike, los 5-7 días de Hito A son seguros. Si falla, el spike revela el bottleneck antes de invertir tiempo grande.

---

## 8. Criterios de cierre del Sprint Observatorio v1.1

| Hito | Criterio binario verificable |
|---|---|
| **B-lite** | Tabla `sprints` en TiDB con ≥20 sprints reales del repo `el-monstruo`. Capa "Sprints planeados" funcional. Click abre `ContextCard` con MD truncado y enlace GitHub. Filtros por status y distrito. **Tests E2E verde + DoD binario PASS.** |
| **A** | Tabla `kernel_events_stream` en Postgres del Monstruo recibe eventos firmados ed25519 con `event_hash_canonical` válido. RLS habilitado. Tablero recibe vía Broadcast privado en <2s. Todas las firmas se verifican client-side; eventos sin firma se marcan UNTRUSTED. Backpressure activo (window 250, agg 1s). Métricas obligatorias expuestas. **Spike día 0 verde + Tests E2E verde con event mock firmado.** |
| **C** | Tabla `connected_projects` poblada con ≥10 proyectos. Cada proyecto tiene `health_check_method` declarado. Proyectos `doctrine_only` jamás aparecen `ACTIVE`. Tablero renderiza distrito o capa que los muestra. **Tests E2E verde con health checks mock.** |
| **Adapter Forja↔kernel shadow** | ADR `0002_contratos_python_kernel_observatorio.md` firmado. Adapter Python en `el-monstruo/core/forja_bridge/` opera modo shadow. Receipts del kernel persisten en TiDB de Forja. Solo acciones materiales irreversibles consultan Forja gateway, telemetry NO. **Tests E2E verde.** |
| **B-polish** | Escala log + líneas translúcidas + animaciones + hover narrativo + navegación dependencias. **Tests E2E visuales verde.** |
| **DoCR (Doctrine Compliance Review)** | La Forma sigue siendo READ-ONLY. No hay button con side effect implementado en este sprint. Confirmado por audit final. |

---

## 9. Lo que NO entrega este sprint

- Modo `enforce_warn` ni `enforce_full` de Forja↔kernel (queda en `shadow`).
- WhatsApp transport (no existe, sigue siendo embrión `doctrine_only`).
- Apple Watch transport.
- App Flutter changes (sigue su sprint REALIGNMENT_001 separado).
- Acciones desde el Tablero que afecten al kernel (es solo observatorio, no transport — doctrina #1.1).
- Vista histórica con scrubbing temporal del Tablero (deferida a sprint v0.2 del Observatorio).
- Federación multi-operador.
- TDX runtime attestation o ZK-proofs.

---

## 10. Estimación

| Hito | Tiempo estimado | Riesgo |
|---|---|---|
| B-lite (sprints fantasma mínimo) | 1-2 días | Bajo |
| Spike día 0 de A | 0.5 día | Bajo |
| A completo (bus de eventos) | 5-7 días | Medio (firma criptográfica + cross-repo + fallback polling + métricas) |
| C (mapa estelar) | 3-5 días | Medio (depende de health checks reales) |
| Adapter Forja↔kernel shadow | 4-6 días | Alto (cross-repo, cross-language, requiere ADR contratos previo) |
| B-polish (estética 3D) | 1-2 días | Bajo |
| **Total bruto** | **15.5-22.5 días** | |
| Buffer auditoría Cowork + iteración + DoCR | +3-5 días | |
| **Total con buffer** | **18.5-27.5 días** | |

---

## 11. Atribución, sabios y firma

**Borrador autor:** Hilo Manus tablero-campana, 26-may-2026.

**Auditoría sabios consultados (`docs/sabios_observatorio_v1/`):**

- Gemini — `01_gemini.md` — APROBAR CON AJUSTES
- Claude Cowork (Opus 4.7) — `02_claude_cowork.md` — APROBAR CON AJUSTES
- Grok 4 Heavy — `03_grok4.md` — APROBAR CON AJUSTES
- Perplexity — `04_perplexity.md` — APROBAR CON AJUSTES
- ChatGPT 5.5 Pro — `05_chatgpt.md` — APROBAR CON AJUSTES

**Veredicto consolidado:** `00_VEREDICTO_CONSOLIDADO.md`. Recomendación unánime 5/5.

**Ajustes aplicados de v1.0 → v1.1:**

| # | Ajuste | Sabios | Sección |
|---|---|---|---|
| 1 | Eventos firmados ed25519 + event_hash_canonical + agent_key_id + prev_event_hash | 5/5 UNÁNIME | §3.2, §4.2, §4.3 |
| 2 | SQL separado por motor + drizzle test real + ADR topología cross-DB | 4/5 | §3.0, §3.1-3.4, §3.5 |
| 3 | Backpressure + coalescing + fallback polling + métricas + drop visual never drop ledger | 4/5 | §2.2, §2.3 |
| 4 | Bus Supabase Realtime HÍBRIDO Postgres ledger + Broadcast privado | 1/5 + ChatGPT, no contradicho | §2.1, §4 |
| 5 | Adapter Forja separa telemetry de material | 1/5 + ChatGPT, no contradicho | §7.2 |
| 6 | ADR contratos Python reales del kernel ANTES de implementar adapter | 1/5 + Perplexity, único | §7.1 |
| 7 | La Forma READ-ONLY estricta hasta nuevo DSC | 1/5 + ChatGPT, doctrinal | §1.1 |
| 8 | Orden corregido B-lite → A → C → B-polish | 1/5 + ChatGPT, refinamiento | §2 |
| 9 | Spike día 0 opcional de A | 1/5 + Cowork, refinamiento | §7.5 |
| 10 | Health check taxonomía con `doctrine_only` | 1/5 + ChatGPT, refinamiento | §2 Hito C |
| 11 | Branch drift mitigación con rebase pre-implementación | 2/5 Cowork+Perplexity, refinamiento | §7.4 |
| 12 | Versionado schema eventos + graceful degradation | 3/5 Gemini+Cowork+Grok, refinamiento | §4.4 |
| 13 | DoD binario obligatorio para B-lite (≥20 sprints, filtros, cero kernel) | 2/5 Perplexity+ChatGPT, refinamiento | §2 Hito B-lite |

**Pendiente firma:** T1-Alfredo (binaria: APROBAR / RECHAZAR / AJUSTAR).

**Pendiente audit post-firma:** Cowork (cuando opere en modo emergente).

Sin firma T1, este sprint queda en `draft` y no se ejecuta.

---

## 12. Línea final canonizada

> **Manus: aprobar Observatorio Vivo v1.1 con (a) eventos firmados ed25519 con `event_hash_canonical` y `agent_key_id`, (b) SQL separado TiDB/Postgres con drizzle test real y ADR topología cross-DB, (c) backpressure + coalescing + fallback polling + métricas, (d) Supabase híbrido Postgres ledger + Broadcast privado, (e) adapter Forja separa telemetry de material y requiere ADR contratos Python reales pre-implementación, (f) La Forma estrictamente READ-ONLY hasta nuevo DSC, (g) orden B-lite → A → C → B-polish con DoD binario en B-lite.**
