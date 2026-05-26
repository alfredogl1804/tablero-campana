/**
 * Genera un keypair ed25519 para firmar eventos del bus del observatorio.
 *
 * Doctrina v1.1 §3.1:
 *   - La privada se guarda en secret (env var OBSERVATORIO_SIGNER_PRIVATE_KEY).
 *   - La pública se publica en el repo el-monstruo en docs/keys/<key_id>.pub
 *   - El agent_key_id versiona: ej. "tablero-campana-pub-2026Q2".
 *   - Rotación: cada 6 meses (Regla Dura #6, tabla de rotación).
 */

import { generateKeyPairSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const KEY_ID = process.argv[2] ?? `tablero-campana-pub-${new Date().getFullYear()}Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;

const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const outDir = "/tmp/observatorio_keys";
fs.mkdirSync(outDir, { recursive: true });

const pubPath = path.join(outDir, `${KEY_ID}.pub`);
const privPath = path.join(outDir, `${KEY_ID}.priv`);

fs.writeFileSync(pubPath, publicKey, { mode: 0o644 });
fs.writeFileSync(privPath, privateKey, { mode: 0o600 });

// Compact base64 versions for easier transport in env vars
const publicKeyB64 = Buffer.from(publicKey).toString("base64");
const privateKeyB64 = Buffer.from(privateKey).toString("base64");

console.log("════════════════════════════════════════════════════════════");
console.log("  ED25519 KEYPAIR GENERADO");
console.log("════════════════════════════════════════════════════════════");
console.log(`Key ID: ${KEY_ID}`);
console.log(`Generated at: ${new Date().toISOString()}`);
console.log();
console.log(`Pub PEM: ${pubPath}`);
console.log(`Priv PEM: ${privPath}`);
console.log();
console.log("─── Pública (compartir libremente) ─────────────────────");
console.log(publicKey);
console.log();
console.log("─── Privada (NUNCA compartir, solo en secret env) ──────");
console.log(`PRIVATE_PEM_LENGTH=${privateKey.length}`);
console.log(`PRIVATE_BASE64_LENGTH=${privateKeyB64.length}`);
console.log();
console.log("Para inyectar al webdev project:");
console.log(`  webdev_request_secrets:`);
console.log(`    OBSERVATORIO_SIGNER_KEY_ID=${KEY_ID}`);
console.log(`    OBSERVATORIO_SIGNER_PRIVATE_PEM=<contenido de ${privPath}>`);
console.log();
console.log("La pública debe canonizarse en:");
console.log(`  el-monstruo/docs/keys/${KEY_ID}.pub`);
console.log("════════════════════════════════════════════════════════════");
