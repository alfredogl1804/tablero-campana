# Forja OS v4 — Operator Fingerprint Addendum

**Generated:** 2026-05-25 (Día 0 del Sprint v0.1 v2)

## Identidad criptográfica del operador soberano

| Field | Value |
|---|---|
| Operator Open ID | `alfredo-gongora-soberano` |
| Public key (hex) | `cbfd8895990a57fb9155b55ec817b5d92cfbf3416d83fb0712afbc58b4b5b064` |
| Fingerprint (sha256[:16]) | `ec0f16749dd527a5` |
| Algorithm | ed25519 |
| Key file location | `public_keys/operator.pub` (in repo) |
| Private key custody | 1Password entry "Monstruo Operator Root Key" |
| TTL audit | 12 months |

## Validez canónica

Cualquier Authority Envelope cuyo campo `operatorPublicKey` no coincida con `cbfd8895990a57fb9155b55ec817b5d92cfbf3416d83fb0712afbc58b4b5b064` debe ser **rechazado automáticamente** por el BoundaryGateway.

Cualquier intento de operación firmada con otra llave que reclame ser del operador debe disparar alarma de seguridad.

## Rotación

Esta llave queda vigente hasta:
- (a) compromiso detectado, o
- (b) rotación periódica programada cada 12 meses, o
- (c) decisión soberana explícita del operador.

En cualquier caso, la rotación requiere:
1. Generar nueva llave con `node scripts/forja/keygen-and-sign.mjs keygen`
2. Firmar `revocation_event` con llave vieja sobre la nueva pubkey (cadena de custodia)
3. Actualizar `public_keys/operator.pub` y este addendum
4. Re-emitir todos los envelopes activos con nueva llave (los viejos quedan revocados)

## Verificación de identidad

Para confirmar que esta pubkey corresponde efectivamente al operador soberano Alfredo Góngora:

\`\`\`bash
# El fingerprint debe coincidir
echo -n "$(cat public_keys/operator.pub)" | xxd -r -p | shasum -a 256 | cut -c1-16
# Output esperado: ec0f16749dd527a5
\`\`\`

