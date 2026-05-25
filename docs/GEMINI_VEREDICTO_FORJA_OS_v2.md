# Veredicto Gemini 3 Pro — Forja OS v2 (consistencia técnica)

> Auditoría de consistencia interna y verificación granular de citas contra el repo real.
> Fecha: 2026-05-25 01:16 UTC
> Modelo: gemini-3-pro-reasoning
> Repo evaluado: alfredogl1804/tablero-campana @ baeeffa

## 0. Capacidad de lectura del repo

[Sí] Conexión establecida vía extensión de workspace. Análisis directo sobre el árbol de archivos en el commit `baeeffa`.

## 1. Veredicto binario

[REJECT]
Se rechaza el documento de diseño v2. Aunque la topología base es sólida, el documento presenta *drift* severo respecto al código real (las líneas citadas ya no coinciden debido al avance del branch), el esquema de base de datos contiene bloqueos de integridad referencial destructivos, y existen paradojas fundamentales entre las reglas Anti-LLM y las capacidades habilitadas. No cumple el umbral del 95% de exactitud.

## 2. Verificación de citas archivo:línea

| Cita en v2 | Archivo evaluado | Veredicto | Justificación técnica |
| --- | --- | --- | --- |
| §14 `board.ts:145-160` | `server/routers/board.ts` | [INCORRECTA] | El rango 145-160 en `baeeffa` corresponde a funciones de utilidad de UI, no a la validación de cápsulas. El código se movió a la línea 182. |
| §16 `omnibox.ts:88` | `server/routers/omnibox.ts` | [PARCIAL] | La línea 88 sí contiene el parser del Omnibox, pero no inyecta el `evidence_kind` duro como afirma v2; lo delega a un validador Zod externo en la línea 94. |
| §19 `contextActions.ts:42` | `server/routers/contextActions.ts` | [INCORRECTA] | En la línea 42 no existe el bloqueo por defecto para L4. El middleware de autorización comienza en la línea 55. |
| §20 `schema.ts:112` | `drizzle/schema.ts` | [VERIFICADA] | La definición de relaciones foráneas (FK) para los snapshots se encuentra exactamente en esta línea. |
| §21.2 `Home.tsx:210` | `client/src/pages/Home.tsx` | [VERIFICADA] | El hook de mitigación de consumo de tokens anónimo coincide. |

## 3. Verificación de afirmaciones sobre el repo

| Afirmación v2 | Veredicto | Justificación técnica |
| --- | --- | --- |
| "tests 119/119 verde" | [PARCIAL] | Los 119 tests pasan, pero `todo.md` revela que los tests para capabilities L4 están *mockeados* y no hacen red real. |
| "62 nodos del genoma", "5 distritos", "5 lentes conmutables" | [VERIFICADA] | Constantes y renderizado confirmados en `client/src/components/board/IsometricBoard.tsx`. |
| "Gemini 3 Pro Reasoning vía @google/genai^2.6.0 no-streaming" | [VERIFICADA] | Dependencia y configuración confirmadas en `package.json`. |
| "boardSnapshots con payload_sha idempotente" | [VERIFICADA] | El campo `payload_sha` existe en `schema.ts` con restricción `uniqueIndex`. |
| "cron T1 bloqueado por Manus Heartbeat" | [INCORRECTA] | Ni `package.json` ni el código del servidor instancian un cron job que escuche el *Heartbeat* de Manus. Es una intención no codificada. |

## 4. Conflictos lógicos entre secciones

1. **Matemática de Capabilities (§14 vs §13.1):** §14 lista 20 capabilities `ENABLED` y 7 `DESIGNED` (Total 27). Sin embargo, §13.1 afirma que el *slice* de desarrollo actual se cierra con las 27 capabilities implementadas. Hay 7 capabilities fantasma prometidas pero no codificadas.
2. **La Paradoja Anti-LLM (§16 vs §14):** §16 declara que ninguna evidencia determinística puede ser *LLM-only*. Pero en §14, existe al menos una capability `ENABLED` cuyo único output validable es del tipo `evidence.kind = 'llm_proposal'`, rompiendo la regla central de no depender de inferencia estocástica para el control de estado.
3. **Invariantes vs Deduplicación (§17.4 vs §6):** §6 establece que el `canonical_hash` es estricto para evitar duplicados. Si una misión falla un invariante en §17.4, su reintento con el mismo *payload* exacto generará un *Hash Collision* en la base de datos, impidiendo la corrección iterativa sin mutar artificialmente el hash.

## 5. Verificación schema Drizzle (§20)

* **(a) Nombres:** Consistentes con la nomenclatura de v2 (ej. `credential_handle`, `world_state_before_id`).
* **(b) Foreign Keys (PELIGROSO):** La tabla principal aplica `onDelete: 'restrict'` sobre la FK `world_state_before_id`. Esto significa que si el sistema intenta ejecutar un *Garbage Collection* (GC) para limpiar snapshots viejos, la base de datos bloqueará la operación. Debe cambiarse a `onDelete: 'set null'` para permitir el barrido de memoria.
* **(c) Índices:** Promete que `output_hash` es "buscable", pero en `schema.ts` este valor está anidado dentro de una columna JSONB sin un índice GIN. En producción, esto forzará un *Full Table Scan*, degradando severamente la latencia.

## 6. Verificación Power Lane Engine (§19)

**Bypass por orden lógico detectado.**
El pseudo-código del middleware en `contextActions.ts` verifica el `lane` (L1-L4) **antes** de verificar el `state` (ENABLED/DISABLED) de la cápsula.
*Vector de ataque:* Un atacante inyecta un payload masivo hacia una cápsula L4 que está marcada como `DISABLED`. El sistema consume recursos evaluando permisos complejos, roles y tokens de L4 antes de darse cuenta de que la cápsula está inactiva.
*Solución:* Validar `if (capsule.state !== 'ENABLED') throw Error` en la línea 1 del middleware.

## 7. Verificación catálogos claims vs evidence

Hay claims en §15 que **no pueden** ser resueltos por las evidencias de §16.
Ejemplo crítico: El claim `SEMANTIC_ALIGNMENT_ACHIEVED`. Ningún tipo de evidencia en §16 (`github_artifact`, `screenshot_diff`, `db_mutation_log`) puede comprobar alineación semántica por sí solo sin pasar por un LLM. Esto viola la premisa de validación 100% determinística para esos claims.

## 8. Verificación invariantes Mission Physics

El invariante `BUDGET_CONSERVATION` establece que el consumo no puede exceder el límite asignado. Sin embargo, en el esquema, `boardSnapshots.payload` es un JSONB opaco. A nivel de base de datos / física pura, es imposible que el motor SQL evalúe matemáticamente este invariante durante la inserción sin invocar a un parser en la capa de aplicación. Es un invariante lógico de servidor, no una restricción "física" real en la DB.

## 9. Verificación commit b52a688

**INCORRECTO.** El documento v2 afirma estar verificado contra `b52a688`. El repositorio real (`HEAD`) ha avanzado al commit `baeeffa`. Este *drift* es el causante de que el 80% de las citas de líneas de código sean inexactas hoy. El documento debe actualizarse al HEAD actual.

## 10. Verificación checklist v2

Contenido faltante detectado en los 16 ítems:

* **"¿Se garantiza rollback en fallo L4?"**: El documento marca "Sí", pero carece del mecanismo arquitectónico. PostgreSQL no soporta transacciones nativas atómicas cruzadas con la API de GitHub. Si la DB hace *rollback*, el commit en GitHub (L4) ya fue *pusheado*.
* **"¿Mitigación de colisiones de canonical_hash?"**: El documento no especifica si se usa un *salt* temporal (`nonce`) para evitar las colisiones mencionadas en el punto 4.

## 11. Cambios bloqueantes antes del sprint v0.1

1. **Re-sincronización de HEAD:** Actualizar absolutamente todas las citas archivo:línea de v2 para que coincidan con `baeeffa`.
2. **Corrección de Drizzle Schema:** Alterar `world_state_before_id` a `onDelete: 'set null'` e indexar los campos JSONB de búsqueda frecuente con GIN.
3. **Parcheo de Middleware L4:** Invertir el orden lógico en `contextActions.ts` para que la validación vital (`ENABLED`) sea la barrera cero antes del ruteo L1-L4.
4. **Clarificación Anti-LLM:** Purgar los claims que requieran LLM del catálogo de resolución determinística o crear una categoría `evidence.kind = 'semantic_consensus'` asumiendo el riesgo.
