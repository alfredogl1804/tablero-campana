# ADR 0001 — Topología cross-DB del Observatorio Vivo

| Campo | Valor |
|---|---|
| Número | 0001 |
| Título | Topología cross-DB del Observatorio Vivo (TiDB Tablero + Postgres kernel) |
| Estado | **Aceptado** (implementado en Hito A) |
| Fecha | 2026-05-26 |
| Autor | Manus AI (hilo Tablero) |
| Sprint relacionado | Observatorio Vivo v1.1 — Hitos A y C |

## 1. Contexto

El plan v1.1 del Sprint Observatorio Vivo asumía inicialmente un único motor de base de datos para todo el flujo. Los seis sabios consultados (UNÁNIME 5/5) levantaron la objeción bloqueante: **el Tablero usa TiDB (MySQL) y el kernel usa Supabase (Postgres)**. SQL específico de Postgres (extensiones `pgcrypto`, `pg_notify`, `LISTEN/NOTIFY`, índices `GIN`) no funciona en TiDB, y mezclar ambos dialectos en el mismo paquete genera deuda técnica garantizada.

La auditoría del kernel reveló además 9 tablas de eventos preexistentes (`monstruo_event_stream`, `runtime_events`, `events`, `memory_events`, `kernel_audit_log`, `forja_sprints`, `thread_immunity_events`, `catastro_eventos`, `security_web_events`) — ninguna firmada con ed25519 ni con `event_hash_canonical`. La doctrina v1.1 §3.1 exige firma criptográfica obligatoria para todo lo que pasa al Tablero.

## 2. Decisión

El Observatorio Vivo opera sobre **dos motores de base de datos cooperantes**, con un contrato explícito de límites:

### 2.1 Distribución por motor

| Motor | DB | Tablas | Propósito |
|---|---|---|---|
| **TiDB** (MySQL-compat) | `DATABASE_URL` del Tablero | `sprints`, `connected_projects`, `project_health_pings`, `tablero_snapshots` (heredada), `node_states` (heredada) | Estado material del Tablero: catálogo, snapshots, sprint history. SQL conservador. |
| **Postgres** (Supabase) | `SUPABASE_URL` del kernel | `monstruo_event_stream` (kernel), `runtime_events` (kernel), `kernel_events_stream_signed` (Tablero) | Bus de eventos del Monstruo + vista firmada para el Tablero. SQL Postgres-only OK. |

### 2.2 La vista firmada `kernel_events_stream_signed`

El Tablero **no creó una tabla nueva en el bus del kernel**. En su lugar canonizó una **tabla complementaria** en el schema Supabase del kernel — gobernada por el Tablero — donde se publican copias firmadas (ed25519) del subconjunto de eventos relevantes para el observatorio.

Schema canónico aplicado en migration `migrations/kernel/0001_kernel_events_stream_signed.sql`:

```sql
CREATE TABLE public.kernel_events_stream_signed (
  event_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingested_at       timestamptz NOT NULL DEFAULT now(),
  source_event_id   uuid,                 -- FK opcional a monstruo_event_stream.id
  event_type        text NOT NULL,        -- 11 enums canónicos del kernel
  source            text NOT NULL,
  source_type       text NOT NULL,
  payload           jsonb NOT NULL,
  agent_key_id      text NOT NULL,        -- key_id que firmó
  signature_ed25519 text NOT NULL,        -- base64
  event_hash_canonical text NOT NULL      -- sha256 hex del payload canónico
);

ALTER TABLE public.kernel_events_stream_signed ENABLE ROW LEVEL SECURITY;
-- Policies: insert restringido a service_role + agent_key_id whitelisted
-- Lectura pública para Realtime broadcast de la app del Tablero
ALTER PUBLICATION supabase_realtime ADD TABLE public.kernel_events_stream_signed;
```

### 2.3 Reglas de límite

1. **Ningún SQL del Tablero hacia TiDB usa funciones Postgres**. Si necesita JSON, usa `JSON_EXTRACT` MySQL, no `->>`.
2. **Ningún SQL hacia Postgres usa funciones MySQL**. Si necesita timestamps Unix, usa `extract(epoch from ...)`, no `UNIX_TIMESTAMP`.
3. **Ningún FK cruza motores**. La relación `kernel_events_stream_signed.source_event_id → monstruo_event_stream.id` es lógica, no FK física.
4. **Ningún JOIN cross-DB**. La hidratación de eventos (ej. unir un evento firmado con su sprint en TiDB) se hace en código TypeScript, leyendo de cada motor por separado.
5. **Migrations separadas**: `drizzle/migrations/` para TiDB, `migrations/kernel/` para Postgres del kernel. Nunca mezclar.

### 2.4 Backpressure y fallback

Implementado en Hito A (`server/lib/eventObserver.ts`):

- Window de 250 eventos en memoria; si llega más rápido, se descarta el más viejo y se incrementa `total_dropped`.
- Aggregation cada 1 segundo para entregar al frontend.
- Fallback a polling de 5 segundos si Postgres CDC pierde conexión por más de 10 segundos.
- Métricas Prometheus equivalentes: `tablero_observatorio_events_received_total`, `tablero_observatorio_events_verified_total`, `tablero_observatorio_events_rejected_total`, `tablero_observatorio_lag_ms`.

## 3. Consecuencias

### 3.1 Positivas

- El Tablero **opera sobre la realidad existente** del kernel sin duplicar bus.
- Cada motor mantiene su pureza dialectal: cero código mixto.
- La firma ed25519 vive **fuera** del bus original del kernel — eso significa que el equipo del kernel puede seguir publicando como siempre y el Tablero canoniza su propia capa firmada por encima, sin imponer nada al kernel.
- Roundtrip publish→verify→render < 500ms validado en spike día 0.

### 3.2 Negativas

- **Doble responsabilidad de migration**: cada cambio de schema requiere decidir explícitamente a qué motor pertenece y aplicarse en su pipeline correcto.
- **Sin transacciones cross-DB**: si una operación necesita escribir en ambos motores (raro, pero posible), debe diseñarse con outbox pattern, no con 2PC.
- **Visibilidad del estado real distribuido**: para auditar "qué pasó", hay que leer de dos lugares. Mitigación: el Tablero compone un timeline unificado en su backend (Hito A `eventObserver` + Hito B-lite `sprintIngestor`).

### 3.3 Para nuevos modelos de datos

Antes de crear cualquier tabla, el desarrollador responde dos preguntas:

1. **¿Pertenece al estado material del Tablero (snapshots, catálogo, history)?** → TiDB.
2. **¿Es bus de eventos en tiempo real con CDC?** → Postgres del kernel.

Si la respuesta es ambigua, se levanta un sprint propuesto antes de crear la tabla.

## 4. Validación

| Implementación | Status | Evidencia |
|---|---|---|
| Migration aplicada | ✓ | `migrations/kernel/0001_kernel_events_stream_signed.sql` ejecutada en kernel Supabase prod, HTTP 200 GET |
| Spike día 0 con 5 checks | 3/5 verde, 2 informativos | Documentado en plan v1.1 §11 |
| Publisher ed25519 round-trip | ✓ | 3/3 tests verdes en `server/lib/eventPublisher.test.ts` |
| Observer CDC live + fallback | ✓ | Status `live` reportado por router observatorio |
| HUD render < 500ms del evento | ✓ | Validado por roundtrip Broadcast 393ms |

## 5. Aprobación

Este ADR queda **aceptado** porque su implementación ya pasó tests verdes en Hito A. Cualquier reversión o cambio futuro requiere ADR sucesor numerado.

## Referencias

[1] Sprint Observatorio v1.1: [`../SPRINT_OBSERVATORIO_V1.md`](../SPRINT_OBSERVATORIO_V1.md)
[2] Veredicto sabios: [`../sabios_observatorio_v1/VEREDICTO_CONSOLIDADO.md`](../sabios_observatorio_v1/VEREDICTO_CONSOLIDADO.md)
[3] Migration aplicada: [`../../migrations/kernel/0001_kernel_events_stream_signed.sql`](../../migrations/kernel/0001_kernel_events_stream_signed.sql)
[4] ADR 0002 Contratos Python kernel: [`./0002_contratos_python_kernel_observatorio.md`](./0002_contratos_python_kernel_observatorio.md)
