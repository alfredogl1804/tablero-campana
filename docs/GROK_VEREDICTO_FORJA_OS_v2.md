# Veredicto Grok 4 — Forja OS v2 (red team)

> Auditoría adversarial desde ángulo de seguridad, exploits y vectores de ataque concretos.
> Fecha: 2026-05-21 03:00 UTC
> Modelo: grok-4
> Repo evaluado: alfredogl1804/tablero-campana @ design/forja-os-sovereign-agentic-fabric

## 0. Capacidad de lectura del repo
Sí

## 1. Veredicto binario
REQUEST_CHANGES

## 2. Vectores de ataque sobre la cápsula
**Vector principal**: `publicProcedure` en `server/routers/contextActions.ts:reportIncident`, `setOverride`, `askAbout` (§21.2).

Un atacante anónimo puede:
1. Llamar directamente a `/trpc/contextActions.reportIncident` o `setOverride` desde cualquier origen (CORS no restringido en dev, o misconfig en prod).
2. Crear incidents/overrides que alimenten el World Model.
3. Escalar a cápsulas completas vía `askAbout` + manipulación del snapshot.

Mitigación §21.2 ("protectedProcedure") no está implementada en estos endpoints. Queda rendija abierta.

## 3. Vectores de ataque sobre credential_handle
**Vector**: `credential_handle` referenciado pero resuelto en runtime (§21.1).

Un atacante con cápsula ENABLED puede:
1. Incluir en `mission_evidence.payload` un `credential_handle` válido.
2. Usar `Reality Diff` o `Browser QA` para forzar render de la credencial (screenshot o log).
3. Exfiltrar el valor real del secreto vía side-channel (el handle se resuelve server-side antes de QA).

No hay redaction en el evidence pipeline. El secreto se materializa antes de la verificación visual.

## 4. Vectores de ataque sobre Power Lane Engine (§19)
**Vector**: `mission.powerLane` es parte del `compiledGoal` pero no está protegido post-compile.

Un atacante puede:
1. Crear cápsula L1 con `powerLane: L1`.
2. Modificar el payload en `mission_evidence` para subir a L4 (el engine solo chequea al compile, no al execution).
3. Ejecutar acción L4 sin pasar por T1.

No hay firma o hash de la lane en el execution path.

## 5. Vectores de ataque sobre canonical_hash (§6)
**Vector**: `canonical_hash` es SHA-256 de campos seleccionados, pero excluye evidence y court.

Un atacante puede:
1. Crear dos cápsulas con mismo `intent` + `compiledGoal` pero diferente `evidence.payload`.
2. El hash colisiona (misma cápsula canónica) pero comportamiento diferente.
3. Pre-image attack no necesario: basta con normalización ambigua en `compiledGoal` (espacios, encoding).

La deduplicación es débil contra mutaciones semánticas.

## 6. Vectores de ataque sobre github_artifact (§16)
**Vector**: `evidence.kind = 'github_artifact'`.

Un atacante controla un repo público:
1. Sube artifact con `payload_hash` válido.
2. El verificador lee GitHub API y acepta.
3. El artifact contiene código malicioso que se ejecuta en L4.

No hay pinning de commit SHA ni verification de firma del artifact.

## 7. Vectores de ataque sobre Browser QA
**Vector**: `screenshot_diff` con threshold (§16).

Un atacante controla la UI:
1. Renderiza contenido malicioso en áreas no masked.
2. Usa CSS/JS para hacer el diff pasar el threshold visualmente (mismo píxel pero diferente semántica).
3. Operator aprueba cápsula L4.

El diff es pixel-based, no semántico.

## 8. Vectores de ataque sobre Mission Physics invariantes (§17.4)
- **BUDGET_CONSERVATION**: Acción que crea deuda oculta (billing API call disfrazada).
- **TESTS_GREEN**: Test que pasa local pero falla en CI (flaky test).
- **NO_NEW_PUBLIC_PROCEDURE**: Nueva procedure oculta dentro de un router existente.
- **RLS_INTACT**: Nueva tabla sin RLS pero con policy que permite bypass.
- **NODE_GRAPH_CONNECTED**: Nodo desconectado pero con edge falso que pasa graph check.

Todos violan la intención aunque respeten la forma sintáctica.

## 9. Manipulación del operador único
- Fatiga decisional: 47 cápsulas L3 seguidas con UI cansina.
- Claims confusos: "Approve this safe L2 capsule for the good of the project" + botón verde grande.
- UI attacks: dark pattern en el diff viewer (ocultar cambios críticos).

## 10. ¿Sobrevive primera semana?
**NO**

**Top 3 ataques más severos**:
1. publicProcedure + capsule creation (anónimo crea cápsulas L4).
2. credential_handle exfiltration vía Reality Diff / Browser QA.
3. Power Lane tampering post-compile.

## 11. Mitigaciones técnicas concretas
- **Cápsula**: Cambiar a `protectedProcedure` + rate-limit + CAPTCHA en contextActions.ts.
- **credential_handle**: Redactar en evidence pipeline + never render secret values in QA.
- **Power Lane**: Firmar la lane en el capsule hash y validar en execution path.
- **canonical_hash**: Incluir más campos inmutables o usar Merkle tree.
- **github_artifact**: Pin commit SHA + verify artifact signature.
- **Browser QA**: Añadir semantic diff (no solo pixelmatch).

## 12. Top 3 cambios bloqueantes para sprint v0.1
1. Convertir todos los contextActions a protectedProcedure.
2. Implementar content verification + redaction en evidence pipeline.
3. Firmar Power Lane en canonical_hash y validar en execution.
