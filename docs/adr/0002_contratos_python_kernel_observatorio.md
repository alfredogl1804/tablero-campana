# ADR 0002 — Contratos canónicos del kernel `el-monstruo` para el Observatorio Vivo

| Campo | Valor |
|---|---|
| Número | 0002 |
| Título | Contratos Python reales del kernel para el Observatorio Vivo |
| Estado | **Propuesto** (firma T1 pendiente) |
| Fecha | 2026-05-26 |
| Autor | Manus AI (hilo Tablero) |
| Reemplaza | — |
| Reemplazado por | — |
| Sprint relacionado | Observatorio Vivo v1.1 — Hito 7 |
| ADR predecesor | [ADR 0001 — Topología cross-DB del Observatorio](./0001_topologia_cross_db_observatorio.md) |

## 1. Contexto

El Sprint Observatorio Vivo v1.1 introduce un **Adapter Forja↔kernel** (Hito 8) que cumple dos roles diferentes y separables:

1. **Telemetría observacional** (no Forja): el Tablero observa eventos firmados que el kernel publica al bus, sin invocar al kernel.
2. **Acción material irreversible** (Forja gateway): cuando el Tablero intenta operar sobre el kernel — promover sprints, ejecutar deploys, alterar el genoma — debe pasar por la Forja como puerta canónica.

Los seis sabios consultados en el plan v1.1 dejaron una regla bloqueante (UNÁNIME 5/5): el adapter **no debe inventar nombres de funciones, módulos ni endpoints** del kernel. Cualquier código del Tablero que asuma un contrato inexistente del kernel es deuda técnica garantizada y rompe la doctrina del Objetivo #7 ("No inventar la rueda") y del DSC-G-008 ("Validación pre-spec").

Este ADR canoniza los contratos **reales y verificables** del kernel `el-monstruo` que el Observatorio puede usar, extraídos por inspección directa del repositorio `alfredogl1804/el-monstruo` en commit `HEAD` del branch `main` al 2026-05-26.

## 2. Decisión

El Adapter Forja↔kernel del Tablero **se ata exclusivamente** a los siguientes contratos. Cualquier otro nombre que aparezca en código del Tablero referente al kernel es violación de este ADR y bloquea el cierre del sprint.

### 2.1 Bus de eventos del kernel

El kernel expone un bus de eventos canónico vía FastAPI en [`kernel/events/event_bus_api.py`](https://github.com/alfredogl1804/el-monstruo/blob/main/kernel/events/event_bus_api.py).

| Endpoint | Método | Auth | Propósito |
|---|---|---|---|
| `/v1/events/emit` | POST | `Bearer $SMS_API_KEY` o header `X-Api-Key` | Emite un evento al stream inmutable |
| `/v1/events/crystallize` | POST | `Bearer $SMS_API_KEY` | Cristaliza eventos pendientes al SMS |
| `/v1/events/stream` | GET | `Bearer $SMS_API_KEY` | Consulta el stream con filtros |
| `/v1/events/stats` | GET | `Bearer $SMS_API_KEY` | Estadísticas del stream |

El **request schema canónico** del POST `/v1/events/emit` es la clase `EmitEventRequest` (Pydantic). Sus campos obligatorios y enums están fijados:

- `event_type` ∈ `{decision, discovery, error, concept, build, destroy, emotion, proposal, validation, connection}` — **11 tipos**, ningún otro valor es válido.
- `source: str` — identificador del emisor (thread ID, agente, embrión, etc.).
- `source_type` ∈ `{manus_thread, chatgpt, claude, sabio, embrion, human, webhook, system}` — **8 tipos**, ningún otro valor es válido.
- `title: str` — máximo 500 caracteres.
- `content: str` — descripción completa.
- `value_signal` ∈ `{critical, high, medium, low}` — default `medium`.
- `related_entities: list[str]`, `related_events: list[str]`, `personal_layer: dict | None` — opcionales.

La **response canónica** es `EmitEventResponse`: `event_id`, `status`, `auto_classification`, `crystallization_pending`.

> Doctrina interna del módulo: *"La Operación ES el Registro. El Event Bus es el fundamento del Reactor de Coherencia."*

### 2.2 Contrato del Kernel ejecutor

El kernel canoniza su contrato de ejecución en [`contracts/kernel_interface.py`](https://github.com/alfredogl1804/el-monstruo/blob/main/contracts/kernel_interface.py). El Tablero **nunca importa motores específicos** (Semantic Kernel, PydanticAI, etc.); solo dialoga con esta interfaz vía la puerta `kernel_monstruo` de la Forja.

#### 2.2.1 Estados de ejecución (`RunStatus`)

```
PENDING → ROUTING → EXECUTING → AWAITING_TOOL | AWAITING_HUMAN | STREAMING
        → CHECKPOINTED → COMPLETED | FAILED | CANCELLED
```

#### 2.2.2 Tipos de intención (`IntentType`)

`CHAT`, `DEEP_THINK`, `EXECUTE`, `BACKGROUND`, `SYSTEM`.

#### 2.2.3 Modelos canónicos

| Dataclass | Campos clave |
|---|---|
| `RunInput` | `run_id: UUID`, `user_id: str`, `channel: str` (telegram/console/api), `message: str`, `attachments: list[str]`, `context: dict`, `parent_run_id: UUID?` |
| `RunOutput` | `run_id`, `status`, `intent`, `model_used`, `response`, `tool_calls`, `tokens_in/out`, `cost_usd`, `latency_ms`, `metadata` |
| `Checkpoint` | `checkpoint_id`, `run_id`, `step`, `status`, `state` |

#### 2.2.4 Métodos abstractos del `KernelInterface`

`start_run`, `step`, `checkpoint`, `resume`, `cancel`, `stream`, `get_status`, `register_hook`. Los hooks aceptados por `register_hook` son: `pre_route`, `post_route`, `pre_execute`, `post_execute`, `pre_tool`, `post_tool`, `on_error`, `on_cancel`.

### 2.3 Puerta canónica de la Forja

La Forja API expone una puerta única hacia el kernel: [`apps/la-forja/api/src/puertas/kernel_monstruo.ts`](https://github.com/alfredogl1804/el-monstruo/blob/main/apps/la-forja/api/src/puertas/kernel_monstruo.ts), publicada como **`invokeKernelMonstruo`**.

Características vinculantes para el Tablero:

| Atributo | Valor canónico |
|---|---|
| Base URL producción | `https://el-monstruo-kernel-production.up.railway.app` |
| Override env | `KERNEL_MONSTRUO_BASE_URL` |
| Método HTTP | `POST` exclusivamente |
| Content-Type | `application/json` |
| Auth headers | Heredados del request original (la puerta no añade auth propia) |
| Input shape | `{ endpoint: string, body: unknown, baseUrl?, fetchImpl?, headers? }` |
| Output shape | `{ status: number, data: unknown, durationMs: number }` |
| Error shape | `Error("[la-forja:puerta_kernel_http_failed] <status> <statusText> url=<url> body=<...>")` |

El endpoint debe empezar con `/`. Si no, la puerta lanza `[la-forja:puerta_kernel_invalid_endpoint]`. El Tablero **debe respetar este contrato literal** al construir requests.

### 2.4 Contratos descartados

Durante la auditoría se evaluaron — y **rechazaron** — los siguientes nombres como contratos públicos del kernel para uso del Tablero:

| Nombre | Por qué se rechaza |
|---|---|
| `forja_action()`, `forja.execute()`, `FORJA_GATEWAY` | No existen en el código actual; eran nombres especulativos del plan v1.1 |
| `kernel_events_stream` (tabla del kernel) | No existe; el plan v1.1 v0 asumía crearla. La auditoría reveló que el bus real es `monstruo_event_stream` (Supabase) + `/v1/events/emit` (FastAPI) |
| `forja_sprints` (tabla) | Existe pero está vacía (0 rows) y es schema viejo pre-canonización |

El observatorio del Tablero ya creó su propia vista materializada firmada `kernel_events_stream_signed` en el ADR 0001 (topología cross-DB) — esa **sí es del Tablero**, no del kernel, y la doctrina §3.1 del v1.1 la requiere para cumplir la regla de firma ed25519.

## 3. Consecuencias

### 3.1 Para el Hito 8 (Adapter Forja↔kernel shadow)

El adapter del Tablero queda **fijado** a estos contratos. Implementación:

- **Lectura observacional**: subscriber a Supabase Realtime sobre `monstruo_event_stream` (no requiere Forja, no es acción material). Ya implementado en Hito A vía `kernel_events_stream_signed` (vista firmada).
- **Acción material**: cualquier mutación al kernel pasa por `invokeKernelMonstruo` con `endpoint` apuntando a una ruta Hono/FastAPI que el kernel ya exponga (ej. `/sop/query`, `/epia/record`, `/maoc/orchestrate`). Si el endpoint no existe en el kernel, **se rechaza el sprint** hasta que el equipo del kernel lo cree.

### 3.2 Para el modo shadow

En modo shadow (default del Hito 8), el adapter **registra la intención** de invocación pero **no la ejecuta**. Telemetría obligatoria:

- Log estructurado con `endpoint`, `body_hash`, `would_call_at`, `actor_user_id`.
- Persistencia en TiDB tabla `forja_shadow_calls` (a crear en migración del Hito 8).
- Métricas Prometheus equivalentes a las del Hito A: `tablero_forja_shadow_intents_total`, `tablero_forja_shadow_dropped_total`.

El switch a modo `enforce` requiere **un nuevo DSC firmado** por Alfredo, no se activa por simple flag. Esto cumple la Regla Dura #6 (default a archive) aplicada a acciones materiales.

### 3.3 Para nuevos endpoints del kernel

Si el Tablero requiere un endpoint que el kernel aún no expone (por ejemplo, `/observatorio/health`), el flujo canónico es:

1. El Tablero escribe un sprint propuesto en `bridge/sprints_propuestos/sprint_<ID>_<nombre>.md`.
2. El sprint describe el endpoint, su contrato, su auth, su impacto.
3. Cowork audita y firma.
4. Kernel implementa.
5. **Hasta entonces**, el Tablero no asume el endpoint.

### 3.4 Para versionado

Si cualquiera de estos contratos cambia en el repo `el-monstruo`, este ADR se reemplaza por uno nuevo (numerado `0002a`, `0002b`, etc.) y todo código del Tablero que dependa del contrato anterior se marca obsoleto en la misma sesión. La doctrina v1.1 §3.1 exige soporte de las **2 versiones más recientes** durante el período de migración.

## 4. Validación

Esta sección certifica que cada contrato citado en este ADR fue inspeccionado en código real, no en suposición.

| Contrato | Archivo en repo | Forma de verificación |
|---|---|---|
| `EmitEventRequest` schema | `kernel/events/event_bus_api.py` líneas 67-99 | Lectura directa de Pydantic class |
| `event_type` enum 11 valores | `kernel/events/event_bus_api.py` línea 70 | Pattern regex literal del Field |
| `source_type` enum 8 valores | `kernel/events/event_bus_api.py` línea 73 | Pattern regex literal del Field |
| `value_signal` enum 4 valores | `kernel/events/event_bus_api.py` línea 80 | Pattern regex literal del Field |
| `RunStatus`, `IntentType`, `RunInput`, `RunOutput`, `Checkpoint`, `KernelInterface` | `contracts/kernel_interface.py` | Lectura directa de dataclasses + ABC |
| `invokeKernelMonstruo` puerta | `apps/la-forja/api/src/puertas/kernel_monstruo.ts` | Lectura directa del export |
| Base URL Railway producción | mismo archivo, líneas 13-14 + comment | Documentado en JSDoc canónico |

## 5. Decisiones abiertas

Las siguientes preguntas **no son resueltas por este ADR** y quedan canonizadas como deuda explícita para sprints futuros:

1. **Catálogo de endpoints kernel**: el kernel expone múltiples rutas FastAPI/Hono. Falta un catálogo único versionado en `contracts/kernel_routes.yaml` o equivalente. Mientras tanto, cada sprint que añada uso de un endpoint debe documentar su contrato individual en su propio MD.
2. **Auth del Tablero hacia la Forja**: actualmente `invokeKernelMonstruo` no añade auth propia, hereda los headers del caller. El Tablero debe definir si pasa un JWT propio o reusa el de la sesión del usuario. Sprint a abrir.
3. **Rate limiting compartido**: la Forja tiene middleware de budget; el kernel tiene su propio rate-limit. Falta una política compartida para evitar que el observatorio sature el bus en modo de carga alta. Decisión derivada al sprint Hito B-polish.

## 6. Aprobación

Este ADR queda **propuesto** hasta firma T1 de Alfredo. Sin firma, el Hito 8 (Adapter Forja↔kernel) no puede iniciarse.

## Referencias

[1] Repositorio `el-monstruo`: <https://github.com/alfredogl1804/el-monstruo>
[2] Bus de eventos del kernel: <https://github.com/alfredogl1804/el-monstruo/blob/main/kernel/events/event_bus_api.py>
[3] Contrato canónico del kernel: <https://github.com/alfredogl1804/el-monstruo/blob/main/contracts/kernel_interface.py>
[4] Puerta canónica Forja→kernel: <https://github.com/alfredogl1804/el-monstruo/blob/main/apps/la-forja/api/src/puertas/kernel_monstruo.ts>
[5] ADR 0001 Topología cross-DB: [`./0001_topologia_cross_db_observatorio.md`](./0001_topologia_cross_db_observatorio.md)
[6] Sprint v1.1: [`docs/SPRINT_OBSERVATORIO_V1.md`](../SPRINT_OBSERVATORIO_V1.md)
[7] Veredicto consolidado de los 5 sabios: [`docs/sabios_observatorio_v1/VEREDICTO_CONSOLIDADO.md`](../sabios_observatorio_v1/VEREDICTO_CONSOLIDADO.md)
