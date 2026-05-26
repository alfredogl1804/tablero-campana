# Sprint Observatorio Vivo v1 — La Forma como cabina de transparencia total del Monstruo

**Estado:** Borrador de canonización
**Autor:** Hilo Manus tablero-campana, 26-may-2026
**Reemplaza:** Días 9-30 del plan canónico `FORJA_OS_SPRINT_v0_1_v2.md`
**Conserva:** Días 1-8 ya ejecutados de Forja v4 (kernel TS + sub-envelopes + atenuación)

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

- Un transport (no se opera al Monstruo desde aquí)
- Un panel administrativo (no hay CRUD)
- Una réplica del genoma (eso ya existe parcialmente y queda subordinado a esta visión)

---

## 2. Tres hitos del sprint

### Hito B — Modo Transparencia (sprints fantasma)

**Objetivo verificable:** En el Tablero, el operador ve simultáneamente:

- Lo ejecutado (nodos sólidos con material ACTIVE/DEGRADED)
- Lo canonizado-no-ejecutado (nodos fantasma con material SPRINT/FUTURE existente, pero ahora alimentado por sprints reales del repo)
- Cada sprint canonizado tiene una **carta visible** con: ID, título, distrito afectado, piezas que tocará, dependencias, estado (draft/firmado/ejecutándose/completado), fecha estimada.

**Por qué primero:** No depende del kernel vivo, no requiere nueva infra, reusa el rendering de `Building.tsx` con material `SPRINT/FUTURE` que ya existe. Construye el lenguaje visual que A y C reusarán.

### Hito A — Bus de eventos vivos del kernel

**Objetivo verificable:** Cuando el agente del kernel (Telegram bot, Embrión, sub-agentes paralelos) ejecuta una acción, el Tablero pinta un latido visible en tiempo real (<2s de latencia):

- Mensajes Telegram entrantes → pulso en distrito Interfaces
- Tool calls (browser, code_exec, file_ops) → pulso en distrito Capacidades sobre el brazo correspondiente
- LangGraph node activations (`enrich`, `execute`, `hitl_review`) → pulso en distrito Cognición
- Mem0 / MemPalace / LightRAG queries → pulso en distrito Cognición sobre las memorias
- Embrión budget changes → termómetro vivo en distrito Capacidades
- Receipts firmados → hilo dorado en el ledger del Tablero

**Mecanismo:** Supabase Realtime (PostgreSQL CHANGES via WebSocket) sobre tabla `kernel_events_stream` poblada por el kernel Python.

### Hito C — Mapa estelar de proyectos conectados

**Objetivo verificable:** Un distrito nuevo o capa adicional muestra todos los proyectos hijos del Monstruo, cada uno con:

- Nombre, repo, URL de producción si aplica
- Health check vivo (último latido recibido)
- Última actividad relevante (commit, deploy, transacción)
- Conexión visible al kernel (línea cargada o vacía según actividad)
- Estado: ACTIVE / IDLE / DEGRADED / OFFLINE / EMBRIONARIO (solo doctrina, no construido)

**Proyectos canónicos identificados al 26-may-2026:**

| Proyecto | Repo | Producción | Tipo |
|---|---|---|---|
| el-monstruo (kernel) | `alfredogl1804/el-monstruo` | Railway `el-monstruo-kernel-production` | Kernel |
| tablero-campana (La Forma) | `alfredogl1804/tablero-campana` | Manus webdev | Observatorio (este) |
| apps/mobile (Flutter) | dentro de `el-monstruo` | iPhone Alfredo, NO App Store | Transport P0 |
| Bot Telegram (`@MounstroOC_bot`) | `bot_v3.py` en `el-monstruo` | Railway `bot-telegram` | Transport P0 |
| Command Center PWA | `el-monstruo-command-center` | Railway login wall | Transport P1 |
| apps/la-forja (Cliente Cero) | dentro de `el-monstruo` | Local + branch | Cliente Cero |
| simulador-predictivo-causal | repo separado | Railway | Proyecto-hijo |
| catastros (catastro_sources) | `el-monstruo/scripts/catastros/` | snapshots versionados | Investigación |
| ticketlike.mx | `like-kukulkan-tickets` | Producción Stripe live | Operativo |
| CIP (creacion-cip) | repo o doctrina | embrión | Embrión |
| softrestaurant-ai-10x | doctrina + radar | embrión | Embrión |
| comercialización Leones (Zona Like 313) | doctrina operativa | embrión | Embrión |
| WhatsApp transport | NO existe | NO existe | Embrión P0 |
| Apple Watch transport | NO existe | NO existe | Embrión P2 |

---

## 3. Schemas canónicos

### 3.1 Tabla `sprints` (Hito B)

```sql
CREATE TABLE sprints (
  sprint_id VARCHAR(64) PRIMARY KEY,           -- ej: "MEGA-CATASTRO-88.3", "LA-FORJA-001-v3.2"
  source_repo VARCHAR(128) NOT NULL,           -- "el-monstruo" | "tablero-campana" | "el-monstruo-command-center"
  source_path VARCHAR(512) NOT NULL,           -- "bridge/sprints_propuestos/sprint_88_X.md"
  title VARCHAR(256) NOT NULL,
  description_md TEXT,                         -- snapshot del markdown
  status ENUM('draft','signed','executing','completed','rejected','obsolete') NOT NULL,
  signed_by VARCHAR(64),                       -- "T1-Alfredo" | "Cowork-T2-A" | NULL
  signed_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  affected_districts JSON NOT NULL,            -- ["cognicion","interfaces"]
  affected_nodes JSON,                         -- IDs de nodos del genoma que toca
  affected_projects JSON,                      -- IDs de proyectos del universo
  dependencies JSON,                           -- otros sprint_ids bloqueantes
  estimated_days INT,
  actual_days INT,
  pr_numbers JSON,                             -- [188, 189, 190] de GitHub
  metadata JSON,                               -- libre para extensiones
  ingested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ingested_from VARCHAR(64) NOT NULL,          -- "ingestor_v1" | "manual"
  hash_canonical VARCHAR(64) NOT NULL,         -- sha256 del MD para detectar cambios
  INDEX idx_status (status),
  INDEX idx_source (source_repo, source_path),
  INDEX idx_district (affected_districts(50))
);
```

### 3.2 Tabla `kernel_events_stream` (Hito A)

```sql
CREATE TABLE kernel_events_stream (
  event_id VARCHAR(36) PRIMARY KEY,
  emitted_at TIMESTAMP(3) NOT NULL,
  kernel_version VARCHAR(32) NOT NULL,         -- "0.20.0-sprint27"
  event_type VARCHAR(64) NOT NULL,             -- "telegram.message_in", "langgraph.node.enrich.start", "tool.browser.exec", "mem0.query", "embrion.budget.update", "receipt.signed"
  source_component VARCHAR(64) NOT NULL,       -- "kernel.engine", "kernel.nodes.enrich", "tools.browser_automation"
  district VARCHAR(32) NOT NULL,               -- "cognicion" | "interfaces" | "infraestructura" | "capacidades" | "futuro" | "universo"
  target_node_id VARCHAR(128),                 -- ID del nodo del genoma que pulsa
  target_project_id VARCHAR(64),               -- proyecto del universo afectado (si aplica)
  payload JSON,                                -- datos del evento
  severity ENUM('info','notice','warning','error','critical') NOT NULL DEFAULT 'info',
  trace_id VARCHAR(64),                        -- correlación cross-event
  parent_event_id VARCHAR(36),                 -- encadenado
  expires_at TIMESTAMP NULL,                   -- para auto-purge si quieres TTL
  INDEX idx_emitted (emitted_at),
  INDEX idx_type (event_type),
  INDEX idx_district (district),
  INDEX idx_trace (trace_id)
);
-- Habilitar Supabase Realtime sobre esta tabla:
-- ALTER PUBLICATION supabase_realtime ADD TABLE kernel_events_stream;
```

### 3.3 Tabla `connected_projects` (Hito C)

```sql
CREATE TABLE connected_projects (
  project_id VARCHAR(64) PRIMARY KEY,
  display_name VARCHAR(128) NOT NULL,
  category ENUM('kernel','transport','observatorio','operativo','investigacion','embrion') NOT NULL,
  source_repo VARCHAR(256),
  production_url VARCHAR(512),
  health_check_url VARCHAR(512),
  health_check_method ENUM('http','tcp','db','manual','none') NOT NULL DEFAULT 'http',
  district VARCHAR(32),                        -- distrito principal donde se renderiza
  position_x INT,                              -- coords fijas en el grid (memoria espacial)
  position_y INT,
  status ENUM('ACTIVE','IDLE','DEGRADED','OFFLINE','EMBRIONARIO') NOT NULL,
  last_heartbeat TIMESTAMP NULL,
  last_activity TIMESTAMP NULL,
  metadata JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_status (status)
);
```

### 3.4 Tabla `project_heartbeats` (Hito C)

```sql
CREATE TABLE project_heartbeats (
  heartbeat_id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  emitted_at TIMESTAMP(3) NOT NULL,
  status ENUM('ACTIVE','IDLE','DEGRADED','OFFLINE') NOT NULL,
  latency_ms INT,
  payload JSON,                                -- métricas específicas del proyecto
  INDEX idx_project_time (project_id, emitted_at)
);
```

---

## 4. Bus de eventos: contrato

**Transport elegido:** Supabase Realtime sobre PostgreSQL.

**Flujo:**

1. Kernel Python (en `el-monstruo`) tiene un nuevo módulo `kernel/observatorio/event_publisher.py` que expone `publish_event(event_type, district, payload, ...)`.
2. `event_publisher` escribe en la tabla `kernel_events_stream` del Supabase del Monstruo (NO TiDB del Tablero — el Tablero también suscribe a este Supabase).
3. Supabase Realtime emite el INSERT como evento WebSocket.
4. El Tablero (`tablero-campana`) tiene un cliente Realtime que suscribe a `kernel_events_stream`, mantiene una ventana deslizante de últimos N eventos en estado React, y pinta:
   - Un pulso animado sobre `target_node_id` durante 2-4s
   - Un latido en el `LivePulse` HUD
   - Un timeline de eventos en panel lateral

**Latencia objetivo:** <2s desde `publish_event` hasta render visual.

**Backpressure:** Si el Tablero recibe >100 eventos/s, se aplica throttling visual (agregación) pero los eventos se persisten todos.

---

## 5. Ingestor de sprints (Hito B detalle)

**Mecanismo:** Script Python `scripts/ingest_sprints.py` que:

1. Lee `bridge/sprints_propuestos/*.md` del repo `el-monstruo` montado vía FUSE en `/mnt/desktop/el-monstruo/`.
2. Para cada archivo, extrae frontmatter o cabecera del MD (título, ID, status, distrito, etc.).
3. Computa `hash_canonical` del contenido.
4. Inserta o actualiza fila en `sprints` (tabla TiDB del Tablero).
5. Emite evento `sprint.ingested` al bus de eventos del kernel (cuando exista Hito A).

**Frecuencia:** ejecución manual + cron cada 15 min vía Heartbeat de Manus.

**Detección de status:**

- `draft` por defecto si solo está en `bridge/sprints_propuestos/`
- `signed` si el filename contiene `_FIRMADO_` o el frontmatter tiene `signed_by`
- `executing` si hay branch activo con prefijo del sprint_id
- `completed` si está en `bridge/sprints_completados/`
- `rejected` si está en `bridge/sprints_rejected/` (carpeta nueva si aplica)
- `obsolete` si filename contiene `_OBSOLETE_` o `_DEPRECATED_`

---

## 6. Visualizador de sprints fantasma (Hito B detalle)

**Reusa:** `Building.tsx` con material `SPRINT/FUTURE` ya existente.

**Agrega:**

1. Capa visual conmutable con `LayerSwitcher` existente: nuevo modo "Sprints planeados".
2. En este modo, sobre cada distrito afectado por sprints draft/firmados, aparecen edificios fantasma adicionales con altura proporcional a `estimated_days` (escala log).
3. Click en edificio fantasma → abre `ContextCard` con:
   - Título del sprint
   - Status badge
   - Descripción markdown
   - Distritos y nodos afectados (clicables para navegar)
   - Dependencias bloqueantes (otros sprints)
   - Botón "Ver MD canónico" → abre el archivo en GitHub
4. Línea translúcida conecta cada edificio fantasma con los nodos sólidos que tocará al ejecutarse.

---

## 7. Adapter Forja v4 ↔ kernel (Fase 6)

**Mecanismo:** Módulo Python `el-monstruo/core/forja_bridge/`:

- `forja_client.py`: wrapper async sobre la API tRPC del Tablero (`/api/trpc/forja.*`). Permite al kernel cargar envelopes activos, pre-validar acciones contra Forja gateway, y registrar receipts.
- `action_envelope_hook.py`: hook que se inyecta en `kernel/engine.py` antes de cada `ActionEnvelope.evaluate()`. Si Forja v4 niega la acción, `ActionEnvelope` la marca como `denied_by_forja` y NO se ejecuta.
- `receipt_writer.py`: cuando una acción se completa, emite un `evidenceReceipts.record` al Tablero firmado por la llave del agente.

**Compatibilidad gradual:**

1. Fase 1: Forja v4 opera en modo **shadow** — observa decisiones del kernel, registra receipts, pero NO bloquea acciones.
2. Fase 2: Forja v4 opera en modo **enforce_warn** — bloquea solo acciones de capability `production_deploy` u otras críticas, log de violations sin bloquear.
3. Fase 3: Forja v4 opera en modo **enforce_full** — toda acción del kernel pasa por Forja gateway antes de ejecutar.

Cada paso requiere firma T1-Alfredo en DSC.

---

## 8. Criterio de cierre del Sprint Observatorio v1

| Hito | Criterio binario verificable |
|---|---|
| B | Tabla `sprints` poblada con ≥20 sprints reales del repo `el-monstruo`. Capa visual "Sprints planeados" funcional en Tablero. Click en sprint card abre `ContextCard` con contenido. Tests E2E verde. |
| A | Tabla `kernel_events_stream` recibe eventos del kernel en producción. Tablero pinta latidos en <2s. Telegram bot emite `telegram.message_in` que se ve. Tests E2E verde con event mock. |
| C | Tabla `connected_projects` poblada con ≥10 proyectos. Cada uno tiene health check funcional. Tablero renderiza distrito o capa que los muestra. Tests E2E verde con proyectos mock. |
| Forja↔kernel | Adapter Python en repo `el-monstruo` que opera en modo shadow. Receipts del kernel persisten en TiDB de Forja. Tests E2E verde. |

---

## 9. Lo que NO entrega este sprint

- Modo enforce_full de Forja↔kernel (queda en shadow).
- WhatsApp transport (no existe, sigue siendo embrión).
- Apple Watch transport.
- App Flutter changes (sigue su sprint REALIGNMENT_001 separado).
- Acciones desde el Tablero que afecten al kernel (es solo observatorio, no transport).

---

## 10. Estimación

| Hito | Tiempo estimado | Riesgo |
|---|---|---|
| B (sprints fantasma) | 3-4 días | Bajo |
| A (bus de eventos) | 5-7 días | Medio (requiere coordinar con repo el-monstruo) |
| C (mapa estelar) | 3-5 días | Medio (depende de health checks accesibles) |
| Forja↔kernel shadow | 4-6 días | Alto (cross-repo, cross-language) |
| **Total bruto** | **15-22 días** | |
| Buffer para auditorías Cowork + iteración | +3-5 días | |
| **Total con buffer** | **18-27 días** | |

---

## 11. Atribución y firma

**Borrador autor:** Hilo Manus tablero-campana, 26-may-2026.
**Pendiente firma:** T1-Alfredo (binaria: APROBAR / RECHAZAR / AJUSTAR).
**Pendiente audit:** Cowork (cuando opere en modo emergente).

Sin firma T1, este sprint queda en `draft` y no se ejecuta.
