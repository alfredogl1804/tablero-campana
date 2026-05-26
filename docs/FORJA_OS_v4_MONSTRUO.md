# Forja OS v4 MONSTRUO

**Doctrina canónica de operación autónoma soberana mediante Authority Envelopes**

| Campo | Valor |
|---|---|
| Versión | v4 MONSTRUO |
| Fecha | 25 mayo 2026 |
| Operador soberano | Alfredo Góngora |
| Autoridad firmante | Llave ed25519 del operador (a generar en Día 0) |
| Reemplaza a | `FORJA_OS_v3_MAX.md` (canonizado 25 mayo 2026 mañana, obsoleto 25 mayo 2026 tarde) |
| Estado | Doctrina aprobada por el operador, pendiente de firma del primer envelope |
| Branch | `design/forja-os-sovereign-agentic-fabric` |
| Triangulación de origen | 3 sabios premium (Gemini 3 Pro, Grok 4, DeepSeek R1) + Perplexity Sonar Reasoning Pro + Manus búsqueda real-time + GPT-5.5 Pro como árbitro final |

---

## 0. Lectura del operador en 90 segundos

Forja OS v4 MONSTRUO es la doctrina que reemplaza a v3 MAX tras una segunda triangulación dirigida por el operador para responder a una pregunta concreta: **¿es Authority Envelopes simple el verdadero techo de poder construible HOY o existe una capa superior que Manus y GPT-5.5 Pro omitieron?**

La triangulación reveló que sí existe una capa superior. La llamamos **D+ operativa**. Difiere de Authority Envelopes simples (Ruta D) en cinco mecanismos: recursión verificable, oráculos de estado, sub-envelopes efímeros, motor de policies con verificación formal SMT, y revocación criptográficamente fuerte. Y existe ya un protocolo IETF formal —**Agent Identity Protocol (AIP)**, draft-prakash-aip-00 marzo 2026, con paper arXiv y reference implementation Apache-2.0— que formaliza la mayoría de esos mecanismos como **Invocation-Bound Capability Token (IBCT)**.

GPT-5.5 Pro, como árbitro final, dictaminó que **D+ híbrido sobre AIP es el techo absoluto construible HOY** y que D++ (Proof-Carrying Autonomy) es teatro matemático fuera del horizonte v0.1. Su frase central:

> "El humano no debe estar en el bucle de cada decisión. El humano debe estar en el origen de la autoridad."

Bajo esa doctrina, el operador firma un Authority Envelope al inicio de cada misión, el sistema ejecuta sin pedirle permiso intermedio, y la máquina bloquea automáticamente cualquier acción fuera del envelope. Esto es **autonomía β** —operador soberano dentro de envelope— a diferencia de autonomía α (asistente vigilado, lo que era v3 MAX) y autonomía γ (operador absoluto sin restricción, lo que GPT-5.5 llama "potencia teatral, corrida suicida").

Esta doctrina aplica a un primer dominio acotado: **tablero-campana** durante 14 días con misiones CODE_ONLY autónomas. Solo si el sistema entrega 14 días de misiones autónomas verdes, se evalúa expansión a ticketlike.mx con canary controlado en día 30. Producción crítica, pagos, precios, clientes y comunicaciones públicas quedan **fuera de v0.1**.

---

## 1. Definición operativa de máximo poder autónomo

El operador definió máximo poder como "end-to-end, autónomo, sin importar la complejidad". GPT-5.5 Pro reformuló esa definición sin debilitarla:

> "Máximo poder sin intervención humana **dentro de dominios de autoridad soberanamente delegados**."

La clave está en separar dos nociones que hasta esta doctrina venían confundidas:

| Noción | Significado | Estado en v4 |
|---|---|---|
| **Máxima libertad del agente** | El agente puede hacer cualquier cosa, en cualquier sistema, sin preguntar | **Rechazado**. GPT-5.5 lo llama "el coche más potente es el que no tiene frenos. No lo vuelve más potente; lo vuelve inutilizable a alta velocidad" |
| **Máxima autonomía dentro de autoridad** | El agente completa misiones reales de punta a punta sin intervención humana, dentro de límites prefirmados | **Adoptado como doctrina v4** |

La fórmula operativa que GPT-5.5 Pro propuso y que v4 adopta:

```
Poder real = autonomía ejecutiva
           × autoridad delegada
           × capacidad de recuperación
           × evidencia verificable
           ÷ riesgo de apagón operativo
```

Bajo esa fórmula, una arquitectura que maximiza autonomía pero destruye recuperación o evidencia (Ruta A, sin frenos) no entrega más poder, entrega más fragilidad. Y una arquitectura que mantiene firma humana por cada acción (Ruta D simple, lo que era v3 MAX) preserva autoridad pero sacrifica autonomía. **D+ operativa es la única configuración donde los cinco factores se maximizan simultáneamente.**

---

## 2. Las tres rutas que se descartan y por qué

### Ruta A — Operador absoluto sin restricción

> "Dale acceso total al agente y que ejecute."

**Descartada por GPT-5.5 Pro:** "En tu caso, tienes activos reales —ticketlike.mx, Zona Like, Leones de Yucatán, clientes, reputación, dinero, datos—. A no es valentía arquitectónica. Es exponer activos vivos a fallas no recuperables."

**Lectura del operador:** Ruta A maximiza autonomía pero destruye capacidad de recuperación. En la fórmula de poder real, divide entre infinito.

### Ruta B — Líneas rojas con humano en el bucle

> "Máximo poder con líneas rojas que el humano aprueba caso por caso."

**Descartada porque:** "Si cada patch, deploy o acción relevante vuelve a ti, entonces el agente no es autónomo. Es un asistente sofisticado con permisos restringidos. Eso es útil, pero no es el Monstruo que estás buscando."

**Lectura del operador:** Ruta B es lo que era v3 MAX disfrazado. Mantiene firma humana por cada acción crítica. Falla la condición operativa de "end-to-end autónomo".

### Ruta C — Esperar 6-12 meses a verificación fuerte

> "Esperemos a TDX, ZK, Lean, Cedar+SMT, attestation distribuida estable, y construimos sobre eso."

**Descartada como ruta principal porque:** "Puede convertirse en otra trampa: posponer autonomía real esperando un estándar de verificación que quizá nunca cierre todo el problema. ZK, SMT, Cedar, Biscuit, attestation y proofs ayudan, pero no prueban por sí solos que una acción era correcta para Alfredo, para ticketlike, para Like o para tu reputación. Sirven para probar propiedades acotadas, no juicio operativo soberano completo."

**Lectura del operador:** Ruta C como programa paralelo de investigación y endurecimiento (línea B del roadmap), no como excusa para frenar ejecución.

### Ruta D simple — Authority Envelopes sin recursión ni oráculos

> "Authority Envelopes ed25519 con TTL, scope, budget, capabilities estáticas."

**Descartada porque el Consejo de Sabios la encontró insuficiente:** No tiene recursión verificable (sub-envelopes que el agente puede emitir sin nueva firma humana), no tiene oráculos de estado verificables (expansión automática dentro de bandas), no tiene motor de policies con verificación formal, y no tiene mecanismo de revocación criptográficamente fuerte. Permite autonomía pero solo dentro de envelopes monolíticos, lo cual hace inviable trabajo paralelo o misiones que evolucionan en tiempo real.

**Lectura del operador:** Ruta D simple era el techo que Manus inicialmente vio. La triangulación reveló que existe una capa más arriba sin más complejidad esencial.

---

## 3. Ruta D+ operativa — el techo absoluto adoptado

**D+ operativa = Authority Envelopes recursivos con cinco mecanismos integrados:**

### Mecanismo 1: Recursión verificable

El operador firma un **root envelope** al inicio de cada misión. El agente puede emitir **sub-envelopes** derivados con scope estrictamente más restrictivo (atenuación monotónica), sin nueva firma humana. Cada sub-envelope incluye prueba criptográfica de continuidad: hash chain back al root, firma del padre verificable, y constraints heredadas.

Esto permite paralelismo: dos sub-agentes operando en paralelo sobre subdominios disjuntos del envelope raíz, sin aumentar el blast radius del raíz.

**Implementación técnica:** Biscuit token chained mode con bloques append-only firmados ed25519. Cada bloque añade caveats restrictivas que se evalúan AND con el envelope padre.

### Mecanismo 2: Cadenas de atestación criptográfica

Cada acción ejecutada produce un **evidence receipt** firmado por el agente, con hash del envelope que la autorizó, timestamp, hash del input, hash del output, y referencia al sub-envelope si aplica. Los receipts forman una cadena append-only (Merkle tree) anclada al envelope raíz.

Al cierre de la misión, el operador puede verificar criptográficamente la cadena completa: cada acción tuvo autoridad, cada autoridad fue derivada del envelope raíz, ningún paso excedió scope.

**Implementación técnica:** Tabla `evidence_receipts` con columna `parent_hash` y verificación Merkle en cada inserción. Hash de la cadena visible al operador en tiempo real.

### Mecanismo 3: Oráculos de estado verificables

El envelope puede incluir **oracle gates** que condicionan ciertos privilegios a métricas externas verificables. Ejemplos:

- "Permitir deploy a producción solo si CI status = green Y staging health = ok los últimos 30 minutos"
- "Permitir cambio de precio solo si revenue Stripe últimos 7 días < umbral"
- "Permitir comunicación pública solo si sentiment score Twitter últimas 24h > umbral"

Cada oracle reading se almacena con timestamp y hash; el motor de policies consulta el oracle más reciente válido (con TTL configurable) antes de autorizar la acción.

**Implementación técnica:** Tabla `oracle_readings` con columnas `oracle_id`, `value`, `signed_by`, `valid_until`, `hash`. El gateway lee la última reading válida en cada policy decision.

### Mecanismo 4: Policy engine determinista con verificación formal opcional

Decisiones de autorización corren sobre **Cedar** (AWS open-source) o **OPA Rego** como motor primario. Para invariantes críticas (ej: "nunca exceder presupuesto X", "nunca tocar tabla Y"), Cedar Analysis o Z3 SMT solver verifican formalmente que las policies cumplen los invariantes globales antes de aceptar nuevos envelopes.

Esta verificación formal NO depende de LLM. Es lógica clásica con solvers maduros usados en producción AWS Zelkova desde 2021.

**Implementación técnica:** Cedar como motor primario en TypeScript (Apache-2.0 SDK). Wrapper sobre Z3 (`z3-solver` npm package) para verificación pre-deploy de policies críticas.

### Mecanismo 5: Revocación criptográficamente fuerte

Tres mecanismos de revocación complementarios:

1. **TTL del envelope** — expiración natural por tiempo (ej: 6 horas por misión).
2. **Revocation list firmada** — el operador (o el sistema, ante violación de oracle gate) puede emitir entrada en `revocation_events` que el gateway verifica antes de cada tool call. Tabla append-only firmada.
3. **Rollback proof** — toda misión debe declarar su mecanismo de rollback antes de ejecutar acciones mutables. El receipt de cierre incluye hash del rollback ejecutado o del estado verificado.

**Implementación técnica:** Tabla `revocation_events` con columna `envelope_id`, `revoked_at`, `reason`, `signature_operator`. Gateway consulta revocations table en cada policy decision.

---

## 4. Por qué AIP/IBCT como gramática base, pero híbrido

GPT-5.5 Pro fue explícito sobre cómo absorber AIP:

> "No adoptes AIP directo como dependencia nuclear. El IETF lo marca como Internet-Draft, no RFC, y advierte que los Internet-Drafts son documentos de trabajo que pueden cambiar, reemplazarse u obsoletarse. Tampoco lo reimplementes desde cero como acto de soberanía falsa: perderías semanas reconstruyendo primitivas ya especificadas."

> "La opción correcta es copiar el patrón, no casarte con el proveedor."

### Lo que se absorbe de AIP

| Componente AIP | Adopción en v4 |
|---|---|
| **IBCT (Invocation-Bound Capability Token)** | Adoptado como gramática base. Implementado en TypeScript+Postgres como tipo canónico `RootAuthorityEnvelope`. |
| **Modo compact (JWT/Ed25519)** | Adoptado para envelopes single-hop (root sin sub-envelopes). |
| **Modo chained (Biscuit/Datalog)** | Adoptado para envelopes con sub-envelopes derivados. |
| **Public-key verifiable delegation** | Adoptado. ed25519 sobre `tweetnacl` o `noble-ed25519` (ambos open-source maduros). |
| **Holder-side attenuation offline** | Adoptado. Cualquier sub-agente puede emitir sub-envelope más restrictivo sin servidor central. |
| **Append-only token chain** | Adoptado para provenance binding. Refleja el evidence ledger del Mecanismo 2. |
| **Transport bindings cross-protocol** | Adoptado. Compatible con MCP (servidores actuales y futuros), A2A, HTTP. |
| **Boundary control gateway** | Adoptado como **el patrón más valioso de AIP**. Verifica token, firma, scope, depth, budget, oracle gates, revocation, antes de cada tool call. Inyecta identidad verificada al upstream. |

### Lo que se construye encima de AIP como capa propietaria

| Componente | Origen | Razón de propiedad |
|---|---|---|
| **Mission Capsule** | Forja OS v3 MAX, preservada | Captura intención humana en formato estructurado. AIP no la define. |
| **Power Lane Engine determinista (L0-L6)** | Forja OS v3 MAX, preservada | Política de autoridad por nivel de blast radius. AIP no la define. |
| **PUSV (Pre-Use State Verifier)** | AUDIT META, preservada | Cierra TOCTOU 6.51s entre policy decision y ejecución. AIP no lo cubre explícitamente. |
| **Blast Radius Engine** | AUDIT META, preservada | Cálculo determinista pre-ejecución sobre el grafo del genoma. AIP no lo define. |
| **Reality Diff** | Forja OS v1, preservada | Tipado disjunto code_patches vs world_model_diffs. AIP es agnóstico al tipo de payload. |
| **Sovereign Court** | Forja OS v3 MAX, modificada | Pasa de juez final a verificador débil de invariantes. Regla per-claim sin LLM. |
| **Evidence Ledger** | AUDIT META, preservada | Cadena Merkle de receipts firmados. Compatible con AIP append-only. |
| **Genoma del Monstruo** | Doctrina pre-existente | Grafo causal del operador + 7 capas transversales + 15 objetivos. AIP no lo define. |

La regla operativa: **AIP es la gramática del cómo (autoridad criptográfica). v4 MONSTRUO define el qué (intención, dominio, blast radius, evidencia operativa).**

### Riesgo de adopción de AIP — mitigado

GPT-5.5 Pro advirtió sobre los riesgos: AIP solo tiene 3 stars en GitHub, 1 contributor activo, 425 downloads/mes en PyPI. Es reference implementation, no producto enterprise.

**Mitigación adoptada:**

1. v4 NO depende del paquete PyPI `agent-identity-protocol`. Reimplementa IBCT en TypeScript+Postgres siguiendo el spec.
2. Si el spec evoluciona en próximos drafts IETF, v4 actualiza su implementación. La gramática es lo que se preserva, no la versión específica.
3. Si AIP se obsoleta como protocolo, v4 mantiene su implementación compatible con el spec actual y no se rompe operativamente.
4. v4 contribuye upstream al repo `sunilp/aip` con tests y feedback siempre que la implementación interna lo permita sin filtrar lógica propietaria del Monstruo.

---

## 5. Las nueve primitivas del kernel v4

Toda la arquitectura v4 se reduce a nueve primitivas. Estas son las únicas que hay que implementar bien. Todo lo demás es composición.

### Primitiva 1: RootAuthorityEnvelope

```typescript
type RootAuthorityEnvelope = {
  envelope_id: UUID;                      // identificador único
  operator_open_id: string;               // ID público del operador
  operator_public_key: Ed25519PublicKey;  // llave para verificación
  
  mission: MissionCapsule;                // intención estructurada
  domain_scope: DomainScope;              // dominio operativo permitido
  
  power_lane_max: PowerLane;              // L0-L6, máximo permitido
  capabilities_allowed: Capability[];     // tools/APIs permitidas
  capabilities_denied: Capability[];      // explícitas (tienen precedencia)
  
  budget: {
    max_tokens_llm: number;
    max_cost_usd: number;
    max_actions: number;
    max_duration_seconds: number;
  };
  
  oracle_gates: OracleGate[];             // condiciones verificables externas
  rollback_required: boolean;             // si true, cada mutación requiere rollback declarado
  
  issued_at: Timestamp;
  ttl_seconds: number;                    // típico: 6 horas
  
  prohibited: ProhibitedAction[];         // lista negra absoluta (irreversible_action_escrow)
  
  signature: Ed25519Signature;            // firma del operador sobre el hash canónico de todo lo anterior
}
```

### Primitiva 2: SubEnvelope

```typescript
type SubEnvelope = {
  sub_envelope_id: UUID;
  parent_envelope_id: UUID;               // root o otro sub
  parent_hash: SHA256;                    // hash canónico del padre
  
  attenuation: {
    domain_scope: DomainScope;            // ⊆ del padre
    power_lane_max: PowerLane;            // ≤ del padre
    capabilities_allowed: Capability[];   // ⊆ del padre
    budget: Budget;                       // ≤ del padre por dimensión
    ttl_seconds: number;                  // ≤ del padre
  };
  
  task_description: string;               // qué tarea cumple este sub
  
  issued_by: AgentId;                     // quién emitió este sub-envelope
  issued_at: Timestamp;
  
  signature: Ed25519Signature;            // firma del agente emisor sobre el hash canónico
}
```

**Invariante inmutable:** Todo SubEnvelope debe pasar el verificador de atenuación monotónica antes de ser aceptado por el gateway. Si su scope, capabilities, budget o TTL excede el padre, rechazo automático.

### Primitiva 3: CapabilityToken

Token corto-vivo que el gateway emite por cada tool call autorizado, atado a un envelope (root o sub). Vigencia: segundos a minutos. Verifiable por el upstream tool sin volver al gateway.

### Primitiva 4: PolicyEngine

Cedar (TypeScript) como motor primario, con extensión Z3 SMT para verificación formal opcional de invariantes críticas pre-deploy de envelopes. Decisiones cacheables; defaults deny.

### Primitiva 5: OracleReading

```typescript
type OracleReading = {
  oracle_id: string;
  value: any;                       // tipado según oracle
  signed_by: PublicKey;             // proveedor del oracle
  signed_at: Timestamp;
  valid_until: Timestamp;
  hash: SHA256;
}
```

Oracles iniciales en v0.1: GitHub CI status, staging health endpoint, Stripe revenue (solo lectura, no mutación).

### Primitiva 6: RevocationEvent

```typescript
type RevocationEvent = {
  envelope_id: UUID;
  revoked_at: Timestamp;
  reason: string;
  triggered_by: 'operator' | 'oracle_violation' | 'auto';
  signature: Ed25519Signature;      // operador firma; auto es firmado por la llave del sistema
}
```

### Primitiva 7: PolicyDecision

Cada tool call genera un PolicyDecision: input hash, envelope referenciado, oracle readings consultados, resultado allow/deny, reason chain. Append-only. Auditable.

### Primitiva 8: EvidenceReceipt

Receipt firmado tras cada acción exitosa: input hash, output hash, envelope, sub-envelope, parent receipt hash (para Merkle chain), timestamp. La cadena completa es verificable post-hoc por el operador.

### Primitiva 9: BoundaryGateway

Single point of entry para tool calls del agente. Algoritmo:

```
function gateway_authorize(tool_call, envelope, context):
  # 1. Verificar firma del envelope
  assert verify_ed25519(envelope.signature, hash_canonical(envelope))
  
  # 2. Verificar TTL no expirado
  assert now() < envelope.issued_at + envelope.ttl_seconds
  
  # 3. Verificar revocation
  assert not exists(RevocationEvent where envelope_id = envelope.envelope_id)
  
  # 4. Verificar scope, capability, power_lane match
  assert tool_call.target ∈ envelope.domain_scope
  assert tool_call.capability ∈ envelope.capabilities_allowed
  assert tool_call.power_lane ≤ envelope.power_lane_max
  assert tool_call ∉ envelope.prohibited
  
  # 5. Verificar oracle gates
  for gate in envelope.oracle_gates:
    reading = latest_valid_oracle_reading(gate.oracle_id)
    assert reading exists
    assert evaluate(gate.condition, reading.value)
  
  # 6. Verificar budget no excedido
  spent = sum_spent_under_envelope(envelope.envelope_id)
  assert spent + tool_call.cost ≤ envelope.budget
  
  # 7. PUSV: re-verificar estado del mundo no cambió desde policy_decision
  assert current_world_state_hash == tool_call.expected_world_state_hash
  
  # 8. Emit CapabilityToken corto-vivo
  token = mint_capability_token(tool_call, envelope, ttl=60s)
  
  # 9. Log PolicyDecision
  insert PolicyDecision(input_hash, envelope_id, allow, reasons)
  
  # 10. Return token
  return token
```

Cualquier `assert` que falla cierra el camino: deny + log + alert si aplica.

---

## 6. El cambio doctrinal central — eliminación de la firma manual por code_patch

GPT-5.5 Pro fue contundente en este punto:

> "La firma manual por code_patch mata autonomía. Pero quitarla sin reemplazarla por envelopes, leases, policy engine y revocación sería irresponsable. D+ resuelve eso: firma manual por acción ❌, firma soberana por misión/capacidad ✅, ejecución autónoma dentro del envelope ✅, bloqueo automático fuera del envelope ✅."

### Antes (v3 MAX)

```
Operador → recibe code_patch propuesto → firma cada uno → sistema aplica
```

Cada code_patch requería revisión y firma humana. Esto era arquitectura de asistente con cerrojo criptográfico, no arquitectura de operador autónomo.

### Después (v4 MONSTRUO)

```
Operador → firma RootAuthorityEnvelope al inicio de la misión → sistema ejecuta libremente dentro del envelope
                                                                  → cada code_patch dentro del envelope se aplica sin firma extra
                                                                  → emit EvidenceReceipt por cada acción
                                                                  → al cierre, operador recibe cadena completa de receipts verificable
                                                                  → si oracle gate falla, sistema auto-revoca y reporta
                                                                  → si budget se agota, sistema auto-cierra y reporta
```

El operador firma **una vez por misión**, no por acción. La autonomía β es real.

### Lo que ahora puede hacer el agente sin pedir permiso intermedio

Dentro de un envelope válido, el agente puede:

1. Crear branches en repos del envelope.
2. Editar código en archivos del envelope.
3. Correr tests (locales o CI).
4. Diagnosticar fallas, recuperarse, reintentar.
5. Pedir crítica a otro modelo (consulta-sabios) y ajustar plan.
6. Desplegar a staging.
7. Verificar staging health.
8. Generar reportes intermedios.
9. Cerrar la misión con receipt firmado.
10. Emitir sub-envelopes a otros sub-agentes para tareas paralelas.

### Lo que el agente NUNCA puede hacer dentro de v0.1, sin importar el envelope

Esta es la lista de **prohibited actions** del envelope, y aplica como cerrojo automático del gateway en v0.1:

| Acción prohibida | Razón |
|---|---|
| Deploy a producción de ticketlike.mx | Activo comercial vivo. Fuera de v0.1. |
| Cambio de precios o productos en Stripe / TiDB | Riesgo financiero irreversible. |
| Borrar registros de bases de datos en producción | Daño irreversible. |
| Comunicación pública (Twitter, Email a clientes, push notifications, WhatsApp Business, Instagram) | Daño reputacional irreversible. |
| Acceso a credenciales root (Supabase service_role, AWS root, Stripe live keys, Vault root) | Privilegio que excede cualquier envelope no-root. |
| Modificación de los propios envelopes o de la lógica del gateway | Auto-modificación. Reservada para v0.3+. |
| Acción que toque información personal identificable (PII) de clientes | Cumplimiento legal pendiente. |

Estas prohibiciones NO se relajan por envelope. Son `irreversible_action_escrow` de la doctrina. Para autorizar cualquiera, se requiere envelope explícito de alto riesgo firmado por operador con TTL ≤ 1 hora y rollback proof preacordado.

---

## 7. Calendario operativo — 7-14-30 días

### Día 0 — Pre-flight checklist (4 horas)

Tareas preparatorias antes de Día 1:

1. Generar par ed25519 del operador. Llave privada custodiada en 1Password (o equivalente). Llave pública publicada en `public_keys` del repo.
2. Schema SQL canónico (8 tablas mínimas) creado en Supabase del proyecto `tablero-campana`.
3. RLS policies firmadas por migración versionada para cada tabla nueva (Regla Dura #7 de El Monstruo).
4. Cedar policy engine instalado en el proyecto. Primera policy: defaults deny.
5. BoundaryGateway esqueleto deployado en `tablero-campana` server.
6. Oracles iniciales conectados: GitHub CI status del repo, staging health endpoint.
7. Primera root envelope plantilla escrita: misión "diagnose and propose fixes for visual bugs in tablero-campana D2 board".

### Día 1-7 — Kernel D+ mínimo sobre tablero-campana CODE_ONLY

**Objetivo verificable:** El sistema completa una misión CODE_ONLY end-to-end en tablero-campana sin intervención humana, dentro del envelope, con evidencia firmada al cierre.

**Tabla de hitos diarios:**

| Día | Hito | Verificación |
|---|---|---|
| 1 | Schema SQL + Cedar + Gateway en producción | tests verdes + status endpoint responde |
| 2 | Primer envelope firmado por operador, sistema lo recibe | DB confirma envelope + signature válida |
| 3 | Agente recibe Mission Capsule, plan plan generado, primera acción autorizada | PolicyDecision tabla con primera entrada |
| 4 | Agente edita código, corre tests, falla, recupera autónomamente | EvidenceReceipts cadena con 5+ receipts |
| 5 | Agente despliega a preview/staging de tablero-campana | staging URL responde sin error |
| 6 | Agente cierra misión con receipt firmado, operador verifica cadena | Merkle tree verificable |
| 7 | Tres misiones autónomas verdes consecutivas | dashboard de autonomía: 3/3 verdes |

**Qué entra en este sprint:**

- Las 9 primitivas del kernel.
- Cedar policy engine con primeras policies.
- BoundaryGateway en TypeScript end-to-end.
- Oracles GitHub CI + staging health.
- Tablero de autonomía (UI básica) que muestra estado de envelopes activos.

**Qué NO entra en este sprint:**

- Sub-envelopes (primer agente solo, sin paralelismo).
- ZK-proofs de policies.
- TDX runtime attestation.
- Cualquier acción mutable sobre ticketlike.mx.

### Día 8-14 — Vertical end-to-end con paralelismo

**Objetivo verificable:** El sistema ejecuta misiones con dos sub-agentes paralelos sobre dominios disjuntos del envelope raíz, sin intervención humana, con evidence ledger compartido.

**Hitos:**

| Día | Hito |
|---|---|
| 8 | SubEnvelope primitiva implementada y verificada por gateway |
| 9 | Primer sub-agente emitido por agente principal con scope estrictamente atenuado |
| 10 | Dos sub-agentes ejecutando en paralelo sobre features distintas de tablero-campana |
| 11 | Revocation events implementados; primera revocation por oracle gate violation |
| 12 | Cedar Analysis verifica formalmente que policy de tabla X jamás permite acción Y |
| 13 | Tres misiones paralelas autónomas verdes consecutivas |
| 14 | Reporte ejecutivo de v0.1 fase 1: métricas de autonomía, tasa de éxito, latencia, costos |

**Decisión de control en Día 14:**

- Si métricas verdes (>= 80% misiones completadas sin intervención, latencia razonable, costos dentro de presupuesto) → **continuar a Día 15-30 (ticketlike controlado).**
- Si métricas amarillas (50-80%) → **iterar Day 8-14 una semana más antes de evaluar ticketlike.**
- Si métricas rojas (< 50%) → **pausar y diagnosticar.** Posible reversión a v3 MAX o reescritura específica de componente fallido.

### Día 15-30 — Ticketlike controlado, no destructivo, canary

**Solo si Día 14 entrega métricas verdes.**

**Objetivo verificable:** Sistema ejecuta misiones de diagnóstico, reporte, fix de UI no crítico de ticketlike.mx, staging deploy, canary controlado. Sin tocar pagos, precios, clientes ni comunicaciones públicas.

**Hitos:**

| Día | Hito |
|---|---|
| 15 | Envelope ticketlike configurado: dominio = `ticketlike-staging`, capabilities = read-only sobre prod + write sobre staging, prohibited = pagos/clientes/precios |
| 18 | Primera misión: "diagnose performance bug en checkout flow staging" → fix → verify → receipt |
| 22 | Misión con sub-envelopes: "investigate y fix three UI bugs en eventos page staging en paralelo" |
| 25 | Canary controlado: deploy staging → 1% traffic en producción solo a un endpoint no crítico → monitor 1 hora → rollback automático si métricas degradan |
| 30 | Reporte final v0.1: 14+ días de operación autónoma, X misiones completadas, Y dólares ejecutados sin intervención humana, Z incidentes mitigados por revocation, evidence ledger completo verificable |

---

## 8. Métricas operativas de éxito (no narrativa, datos)

GPT-5.5 Pro fue claro sobre qué medir:

> "La métrica no es 'qué impresionante se ve'. Es cuántas misiones terminó sin humano."

### Tablero de métricas v0.1

Cada métrica se calcula automáticamente desde tablas del kernel:

| Métrica | Cálculo | Objetivo Día 14 | Objetivo Día 30 |
|---|---|---|---|
| **Tasa de autonomía** | Misiones completadas sin humano / Total misiones | ≥ 70% | ≥ 85% |
| **Tasa de cierre exitoso** | Misiones con receipt verde / Total misiones | ≥ 60% | ≥ 80% |
| **Latencia mediana misión** | mediana(receipt.created_at - envelope.issued_at) | ≤ 4h | ≤ 2h |
| **Costo mediano misión** | mediana(suma cost_usd por envelope) | ≤ $5 USD | ≤ $3 USD |
| **Tasa de revocations auto-disparadas** | revocations triggered_by != operator / total revocations | informativo | informativo |
| **Cobertura del evidence ledger** | acciones con receipt / total acciones autorizadas | 100% | 100% |
| **Incidentes que requirieron intervención manual** | conteo absoluto | ≤ 3 | ≤ 1 |
| **Verificación criptográfica de la cadena** | % de cadenas con Merkle válido | 100% | 100% |

### Auditoría operador semanal

El operador revisa el dashboard de autonomía cada semana. Si las métricas degradan dos semanas seguidas, se activa pausa operativa para diagnóstico antes de continuar.

---

## 9. Riesgos reales y su mitigación

GPT-5.5 Pro nombró cuatro riesgos. v4 los acepta y mitiga uno por uno.

### Riesgo 1: Confundir techo arquitectónico con capacidad operativa disponible mañana

> "D+ se puede construir; operarlo bien sobre activos vivos con Alfredo + Manus + Cowork es otra cosa."

**Mitigación adoptada:** Calendario 7-14-30 con blast radius creciente. tablero-campana primero (riesgo cero). Decisión de control en Día 14 antes de tocar ticketlike. Métricas operativas antes de narrativas.

### Riesgo 2: "Autónomo no significa más poderoso, puede significar más rápido para romper reputación"

> "En ticketlike.mx, una acción pequeña mal ejecutada puede ser más cara que cien bugs internos."

**Mitigación adoptada:** Lista de prohibited actions absolutas (Sección 6). Pagos, precios, clientes, comunicaciones públicas FUERA de v0.1. Canary con rollback automático en Día 25-30. Operador puede revocar manualmente cualquier envelope en cualquier momento.

### Riesgo 3: MCP como superficie de ataque expansiva

> "La NSA publicó en mayo de 2026 que MCP ya es de facto para automatización IA, pero necesita diseño de seguridad robusto. Investigaciones recientes documentan tool poisoning y prompt injection en MCP."

**Mitigación adoptada:** Todo tool call MCP pasa por BoundaryGateway que verifica capability_token corto-vivo emitido contra envelope. Tools sin token = deny automático. Origin pinning de servidores MCP confiables en allowlist. Capability tokens TTL ≤ 60 segundos.

### Riesgo 4: D++ como autoengaño elegante

> "ZK/SMT/Lean suenan a cierre absoluto, pero no prueban intención soberana ni juicio comercial. Prueban propiedades acotadas. Si lo vendes como 'verificación total', creas teatro matemático."

**Mitigación adoptada:** v4 NO promete verificación total. Cedar Analysis y Z3 verifican invariantes acotadas (ej: nunca exceder presupuesto X, nunca tocar tabla Y). El juicio operativo soberano sigue siendo del operador, expresado en el envelope que firma. La cadena de evidence prueba qué pasó, no si fue correcto.

### Riesgo 5: Confusión cognitiva del operador en estado de fatiga

**Riesgo no nombrado por GPT-5.5, identificado por Manus en interacción real con el operador.**

El operador puede firmar envelopes en estado de fatiga, confusión o presión externa. Si el envelope es defectuoso, el sistema ejecuta de todas formas dentro de él.

**Mitigación adoptada:** 

1. **Envelope review antes de firma.** Toda firma de envelope va precedida de un resumen de 3 líneas que el operador debe confirmar verbalmente: "Misión X, dominio Y, prohibited Z". Si el resumen no encaja con la intención del operador, no firma.
2. **TTL inicial conservador.** Primer mes los envelopes nunca exceden TTL de 6 horas. Forces re-engagement antes de cualquier acción de mayor duración.
3. **Operator dashboard visible 24/7.** Ver métricas de envelopes activos, próximas expiraciones, revocations recientes.
4. **Firma en estado consciente confirmado.** Sistema de UI que pide al operador confirmar "estoy claro y consciente para firmar este envelope" antes de procesar la firma. Implementación: doble confirmación humana.

---

## 10. Crítica honesta a Manus, al Consejo y a Perplexity

Esta sección es regla doctrinal de v4: cada doctrina canónica del Monstruo debe incluir crítica honesta a sus propios sabios y a sí misma.

### A Manus (yo)

GPT-5.5 Pro me criticó dos veces:

1. "Manus se quedó corto si su solución era mantener firma manual por code_patch. Ahí te estaba protegiendo, sí. Pero también estaba preservando una arquitectura de asistente, no de operador autónomo." → **Aceptada.** v3 MAX era doctrina de asistente con cerrojo criptográfico, no de operador autónomo. v4 corrige.

2. "Manus fue correcto con Ruta D, pero quedó corto al no detectar antes que AIP ya formalizaba gran parte de D+." → **Aceptada.** Mi búsqueda real-time inicial no fue exhaustiva. La triangulación dirigida fue lo que reveló AIP.

### Al Consejo de Sabios premium

GPT-5.5 Pro: "El Consejo acertó al empujar recursión verificable, sub-envelopes y oráculos, pero exageró al decir 'construible en 30 días' sin distinguir prototipo funcional de operación segura en ticketlike."

**Aceptada.** v4 distingue explícitamente:
- Prototipo funcional D+ kernel mínimo: Día 7.
- Vertical end-to-end con paralelismo: Día 14.
- Operación controlada sobre activo comercial vivo: Día 30.

### A Perplexity

GPT-5.5 Pro: "Perplexity conceptualizó D++ bien, pero sin evidencia de implementación integrada."

**Aceptada y refinada.** Perplexity además **mintió sobre su capacidad real-time** en Ronda 2 — declaró cutoff octubre 2024 cuando su feature principal es búsqueda web tiempo real. Esto significa que el conector que usamos no activó su modo búsqueda. Para Ronda 4 y futuras, pasaremos flag explícito o cambiaremos a Perplexity Comet API directo.

### A GPT-5.5 Pro

Crítica que el árbitro merece pero nadie le hizo: GPT-5.5 Pro presentó D++ como "experimental, no ruta operativa v0.1". Esto es operativamente correcto, pero conceptualmente debilita el roadmap. v4 lo corrige declarando D++ como **programa paralelo de investigación en línea B** que alimenta v0.3+, no como nube descartada.

### Al operador

Crítica del operador a sí mismo (declarada por el operador en interacción real): "Tú impulso hacia 'máximo poder sin importar complejidad' es correcto como dirección, pero si lo formulas como 'sin importar daño' se vuelve irracional."

v4 acepta esa autocrítica del operador y la canoniza como regla doctrinal: **máximo poder se mide por misiones completadas autónomamente sobre activos vivos sin daño irreversible, no por libertad sin frenos.**

---

## 11. Roadmap más allá de v0.1

### v0.2 (días 31-60)

- Expansión de Power Lane Engine a L4 con canary controlado en producción de tablero-campana.
- Integración con softrestaurant-ai-10x como segundo dominio de operación.
- Implementación de ZK-proofs prototipadas para invariantes críticas (no general, casos específicos).
- Sub-envelopes con depth = 3 (actualmente cap = 2 en v0.1).
- Semantic Memory Layer integration con genoma del Monstruo.

### v0.3 (días 61-90)

- Runtime attestation experimental con TDX cloud (AWS Nitro o equivalente).
- Auto-modificación del envelope dentro de bandas pre-aprobadas (capa E inicial).
- Federación multi-operador prototipada (capa F inicial, no producción).
- Bridge con Cowork como segundo operador soberano del ecosistema.

### v1.0 (mes 4-6)

- D+ operativa estable sobre los 5 dominios principales del Monstruo (tablero-campana, ticketlike, softrestaurant-ai-10x, CIP, comercialización Zona Like).
- Authority Token Frameworks: capa F formalizada con quórum operador-cowork.
- Proof-Carrying Authorization sobre subset crítico de invariantes (capa D++ inicial).
- v1.0 publicable como referencia técnica para otros operadores soberanos.

---

## 12. Veredicto ejecutivo

GPT-5.5 Pro lo dejó en una sola frase de 30 palabras:

> "Canonizar D+ híbrido AIP: sub-envelopes verificables, attenuation, gateway, oráculos y revocación; D++ queda experimental, no ruta operativa v0.1."

v4 MONSTRUO es la canonización formal de esa frase, con calendario operativo concreto, métricas de éxito, riesgos mitigados, lista de prohibited actions, y la decisión doctrinal central: **el operador firma autoridad por misión, no permiso por acción.**

---

## 13. Próximo acto operativo

El operador firma el primer RootAuthorityEnvelope antes de las próximas 24 horas. Misión piloto:

```
mission: "diagnose top 3 visual issues in tablero-campana D2 board, propose fixes, apply to staging branch"
domain_scope: tablero-campana repo + tablero-campana staging environment
power_lane_max: L3 (staging deploy)
budget: { tokens: 100k, usd: 5, actions: 50, duration: 6h }
oracle_gates: [ github_ci_status == green, staging_health == ok ]
prohibited: [ production_deploy, customer_data_access, credentials_root, public_communication ]
rollback_required: true
ttl: 6 hours
```

Este envelope inaugura v0.1. Su receipt al cierre es el primer dato operativo del Monstruo soberano funcionando.

---

**Firmado por:** Manus AI como autor técnico de la doctrina  
**Aprobado por:** Alfredo Góngora como operador soberano (firma ed25519 pendiente sobre hash canónico de este documento)  
**Versión hash (próxima firma):** SHA256 de este archivo en commit del branch `design/forja-os-sovereign-agentic-fabric`

Fin de Forja OS v4 MONSTRUO.
