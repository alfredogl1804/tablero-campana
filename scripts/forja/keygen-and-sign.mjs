#!/usr/bin/env node
/**
 * Forja OS v4 — Herramienta de keygen ed25519 y firma del primer envelope
 *
 * Uso:
 *   node forja-keygen-and-sign.mjs keygen --output ~/.monstruo/keys/operator-ed25519
 *   node forja-keygen-and-sign.mjs sign --envelope envelope.json --key ~/.monstruo/keys/operator-ed25519
 *   node forja-keygen-and-sign.mjs verify --envelope envelope-signed.json --pubkey operator.pub
 *
 * Dependencias mínimas (instalar antes con):
 *   npm install --save-dev @noble/curves @noble/hashes
 *
 * Sin frameworks frágiles. Sin red. Solo crypto.
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

// ============================================================
// Utilidades canónicas
// ============================================================

function expandHome(path) {
  if (path.startsWith('~/')) return resolve(homedir(), path.slice(2));
  return resolve(path);
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  if (hex.length % 2 !== 0) throw new Error('hex string must have even length');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function canonicalJsonStringify(obj) {
  // JSON canónico: keys ordenadas alfabéticamente, sin whitespace, sin trailing newline
  const sortKeys = (o) => {
    if (Array.isArray(o)) return o.map(sortKeys);
    if (o && typeof o === 'object' && o.constructor === Object) {
      return Object.keys(o).sort().reduce((acc, k) => {
        acc[k] = sortKeys(o[k]);
        return acc;
      }, {});
    }
    return o;
  };
  return JSON.stringify(sortKeys(obj));
}

function computeEnvelopeHash(envelope) {
  // Hash del envelope EXCLUYENDO los campos signature y canonicalHash
  const { signature, canonicalHash, ...envelopeForHash } = envelope;
  const canonical = canonicalJsonStringify(envelopeForHash);
  const hashBytes = sha256(new TextEncoder().encode(canonical));
  return bytesToHex(hashBytes);
}

// ============================================================
// Comando: keygen
// ============================================================

function cmdKeygen(outputPath) {
  outputPath = expandHome(outputPath);
  
  // Generar 32 bytes de entropía
  const privateKey = randomBytes(32);
  const publicKey = ed25519.getPublicKey(privateKey);
  
  // Verificar redondez del par firmando un mensaje de prueba
  const testMessage = new TextEncoder().encode('forja-os-v4-keygen-test');
  const testSignature = ed25519.sign(testMessage, privateKey);
  const testValid = ed25519.verify(testSignature, testMessage, publicKey);
  if (!testValid) {
    throw new Error('FATAL: keygen produced unverifiable keypair');
  }
  
  // Crear directorio si no existe
  const dir = dirname(outputPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  
  // Escribir privada (con permisos restrictivos via chmod después)
  const privateHex = bytesToHex(privateKey);
  const publicHex = bytesToHex(publicKey);
  
  writeFileSync(outputPath, privateHex + '\n', { mode: 0o600 });
  writeFileSync(outputPath + '.pub', publicHex + '\n', { mode: 0o644 });
  
  // Hash de identificación
  const fingerprint = bytesToHex(sha256(publicKey)).slice(0, 16);
  
  console.log('FORJA OS v4 — Operator Keypair Generated');
  console.log('=========================================');
  console.log(`Private key:  ${outputPath}`);
  console.log(`Public key:   ${outputPath}.pub`);
  console.log(`Public hex:   ${publicHex}`);
  console.log(`Fingerprint:  ${fingerprint}`);
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Copy the private key contents into 1Password as');
  console.log('   "Monstruo Operator Root Key" with TTL audit = 12 months');
  console.log('2. Commit the .pub file to repo at:');
  console.log('   tablero-campana/public_keys/operator.pub');
  console.log('3. Record the fingerprint in FORJA_OS_v4_MONSTRUO.md addendum');
  console.log('4. Delete the local private key file once 1Password backup is confirmed');
}

// ============================================================
// Comando: sign
// ============================================================

function cmdSign(envelopePath, keyPath) {
  envelopePath = expandHome(envelopePath);
  keyPath = expandHome(keyPath);
  
  // Leer envelope draft
  const envelopeRaw = readFileSync(envelopePath, 'utf-8');
  let envelope;
  try {
    envelope = JSON.parse(envelopeRaw);
  } catch (e) {
    throw new Error(`Failed to parse envelope JSON: ${e.message}`);
  }
  
  // Validar campos mínimos
  const required = [
    'envelopeId', 'operatorOpenId', 'missionCapsuleId',
    'domainScope', 'powerLaneMax', 'capabilitiesAllowed',
    'capabilitiesDenied', 'prohibited', 'budget', 'oracleGates',
    'rollbackRequired', 'issuedAt', 'ttlSeconds'
  ];
  for (const field of required) {
    if (!(field in envelope)) {
      throw new Error(`envelope missing required field: ${field}`);
    }
  }
  
  // Leer llave privada
  const privateHex = readFileSync(keyPath, 'utf-8').trim();
  const privateKey = hexToBytes(privateHex);
  if (privateKey.length !== 32) {
    throw new Error(`private key must be 32 bytes, got ${privateKey.length}`);
  }
  
  // Derivar pública y inyectar en envelope
  const publicKey = ed25519.getPublicKey(privateKey);
  const publicHex = bytesToHex(publicKey);
  envelope.operatorPublicKey = publicHex;
  
  // Calcular canonical hash
  const canonicalHash = computeEnvelopeHash(envelope);
  envelope.canonicalHash = canonicalHash;
  
  // Firmar el hash
  const messageBytes = hexToBytes(canonicalHash);
  const signature = ed25519.sign(messageBytes, privateKey);
  envelope.signature = bytesToHex(signature);
  
  // Verificar el round-trip
  const valid = ed25519.verify(signature, messageBytes, publicKey);
  if (!valid) {
    throw new Error('FATAL: signature failed verification immediately after signing');
  }
  
  // Escribir envelope firmado
  const outputPath = envelopePath.replace(/\.json$/, '-signed.json');
  writeFileSync(outputPath, JSON.stringify(envelope, null, 2) + '\n');
  
  // Fingerprint operador
  const fingerprint = bytesToHex(sha256(publicKey)).slice(0, 16);
  
  console.log('FORJA OS v4 — Envelope Signed');
  console.log('==============================');
  console.log(`Envelope ID:        ${envelope.envelopeId}`);
  console.log(`Operator:           ${envelope.operatorOpenId}`);
  console.log(`Operator pubkey:    ${publicHex}`);
  console.log(`Operator fpr:       ${fingerprint}`);
  console.log(`Canonical hash:     ${canonicalHash}`);
  console.log(`Signature:          ${envelope.signature}`);
  console.log(`Mission:            ${envelope.missionCapsuleId}`);
  console.log(`Power lane max:     L${envelope.powerLaneMax}`);
  console.log(`TTL:                ${envelope.ttlSeconds}s (${(envelope.ttlSeconds / 3600).toFixed(2)} hours)`);
  console.log(`Capabilities:       ${envelope.capabilitiesAllowed.length} allowed, ${envelope.capabilitiesDenied.length} denied`);
  console.log(`Prohibited:         ${envelope.prohibited.length} absolute prohibitions`);
  console.log(`Oracle gates:       ${envelope.oracleGates.length}`);
  console.log('');
  console.log(`Signed envelope written to: ${outputPath}`);
  console.log('');
  console.log('NEXT STEP:');
  console.log('Insert this envelope into root_authority_envelopes table via:');
  console.log('  pnpm tsx scripts/forja/insert-envelope.ts ' + outputPath);
}

// ============================================================
// Comando: verify
// ============================================================

function cmdVerify(envelopePath, pubkeyPath) {
  envelopePath = expandHome(envelopePath);
  pubkeyPath = expandHome(pubkeyPath);
  
  const envelope = JSON.parse(readFileSync(envelopePath, 'utf-8'));
  const publicHex = readFileSync(pubkeyPath, 'utf-8').trim();
  
  // 1. Verificar que pubkey en archivo coincide con pubkey en envelope
  if (envelope.operatorPublicKey !== publicHex) {
    console.error('FAIL: operatorPublicKey in envelope does not match provided pubkey');
    console.error(`  envelope: ${envelope.operatorPublicKey}`);
    console.error(`  pubkey:   ${publicHex}`);
    process.exit(1);
  }
  
  // 2. Recomputar canonical hash
  const computedHash = computeEnvelopeHash(envelope);
  if (computedHash !== envelope.canonicalHash) {
    console.error('FAIL: canonicalHash mismatch (envelope was tampered)');
    console.error(`  recomputed: ${computedHash}`);
    console.error(`  stored:     ${envelope.canonicalHash}`);
    process.exit(1);
  }
  
  // 3. Verificar firma
  const publicKey = hexToBytes(publicHex);
  const messageBytes = hexToBytes(computedHash);
  const signatureBytes = hexToBytes(envelope.signature);
  const valid = ed25519.verify(signatureBytes, messageBytes, publicKey);
  
  if (!valid) {
    console.error('FAIL: ed25519 signature verification failed');
    process.exit(1);
  }
  
  // Verificar TTL no expirado
  const issuedMs = new Date(envelope.issuedAt).getTime();
  const expiresMs = issuedMs + envelope.ttlSeconds * 1000;
  const nowMs = Date.now();
  const expired = nowMs > expiresMs;
  
  console.log('FORJA OS v4 — Envelope Verification');
  console.log('====================================');
  console.log(`Envelope ID:      ${envelope.envelopeId}`);
  console.log(`Signature:        VALID`);
  console.log(`Canonical hash:   VALID`);
  console.log(`Public key match: VALID`);
  console.log(`TTL status:       ${expired ? 'EXPIRED' : 'ACTIVE'} (expires ${new Date(expiresMs).toISOString()})`);
  console.log('');
  console.log(expired ? 'OVERALL: SIGNED VALIDLY but EXPIRED' : 'OVERALL: VALID AND ACTIVE');
}

// ============================================================
// Generador de envelope template
// ============================================================

function cmdTemplate(outputPath) {
  outputPath = expandHome(outputPath);
  
  const issuedAt = new Date().toISOString();
  const envelopeId = bytesToHex(randomBytes(16))
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  const missionId = bytesToHex(randomBytes(16))
    .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
  
  const template = {
    envelopeId,
    operatorOpenId: 'alfredo-gongora-soberano',
    
    missionCapsuleId: missionId,
    
    domainScope: {
      repos: ['tablero-campana'],
      envs: ['staging'],
      resources: ['repo:tablero-campana/branches/agent/*', 'env:staging']
    },
    
    powerLaneMax: 3,
    
    capabilitiesAllowed: [
      'read_repo',
      'write_branch',
      'run_tests',
      'deploy_staging',
      'read_db_staging'
    ],
    
    capabilitiesDenied: [
      'production_deploy',
      'write_db_prod',
      'customer_pii_access',
      'stripe_keys',
      'public_communication',
      'price_modification',
      'root_credentials'
    ],
    
    prohibited: [
      { category: 'production_deploy', description: 'No production deploys until v0.2' },
      { category: 'customer_data_access', description: 'No PII access of any kind' },
      { category: 'price_modification', description: 'No price changes ever in v0.1' },
      { category: 'public_communication', description: 'No emails, posts, or external comms' },
      { category: 'root_credentials', description: 'No access to root keys, env vars, or 1Password' }
    ],
    
    budget: {
      maxTokens: 100000,
      maxCostUsdCents: 500,
      maxActions: 50,
      maxDurationSeconds: 21600  // 6 hours
    },
    
    oracleGates: [
      { oracleId: 'github_ci_status:tablero-campana:main', condition: "value === 'green'" },
      { oracleId: 'staging_health:tablero-campana', condition: "value === 'ok'" }
    ],
    
    rollbackRequired: true,
    
    issuedAt,
    ttlSeconds: 21600,  // 6 hours
    
    // Pendiente de firma:
    operatorPublicKey: 'PENDING-SIGNATURE',
    canonicalHash: 'PENDING-SIGNATURE',
    signature: 'PENDING-SIGNATURE',
    
    // Comentario humano editable
    _description: 'Diagnose top 3 visual bugs in tablero-campana D2 board, propose fixes, apply to staging branch, run tests, deploy to staging URL'
  };
  
  writeFileSync(outputPath, JSON.stringify(template, null, 2) + '\n');
  
  console.log('FORJA OS v4 — Envelope Template Created');
  console.log('========================================');
  console.log(`Template written to: ${outputPath}`);
  console.log(`Envelope ID:         ${envelopeId}`);
  console.log(`Mission ID:          ${missionId}`);
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Edit the template to refine mission, scope, capabilities');
  console.log('2. Sign with: node forja-keygen-and-sign.mjs sign --envelope ' + outputPath + ' --key <key-path>');
}

// ============================================================
// CLI entry point
// ============================================================

function parseArgs(args) {
  const result = { command: args[0], flags: {} };
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result.flags[key] = next;
        i++;
      } else {
        result.flags[key] = true;
      }
    }
  }
  return result;
}

function printUsage() {
  console.log('Forja OS v4 — Operator Keygen + Envelope Signing Tool');
  console.log('=====================================================');
  console.log('');
  console.log('Usage:');
  console.log('  node forja-keygen-and-sign.mjs keygen --output <path>');
  console.log('  node forja-keygen-and-sign.mjs template --output <envelope.json>');
  console.log('  node forja-keygen-and-sign.mjs sign --envelope <path> --key <path>');
  console.log('  node forja-keygen-and-sign.mjs verify --envelope <signed.json> --pubkey <path.pub>');
  console.log('');
  console.log('Examples:');
  console.log('  node forja-keygen-and-sign.mjs keygen --output ~/.monstruo/keys/operator-ed25519');
  console.log('  node forja-keygen-and-sign.mjs template --output ~/envelope-draft.json');
  console.log('  node forja-keygen-and-sign.mjs sign --envelope ~/envelope-draft.json --key ~/.monstruo/keys/operator-ed25519');
  console.log('  node forja-keygen-and-sign.mjs verify --envelope ~/envelope-draft-signed.json --pubkey ~/.monstruo/keys/operator-ed25519.pub');
}

const args = process.argv.slice(2);
if (args.length === 0) {
  printUsage();
  process.exit(0);
}

const { command, flags } = parseArgs(args);

try {
  switch (command) {
    case 'keygen':
      if (!flags.output) throw new Error('--output required');
      cmdKeygen(flags.output);
      break;
    case 'template':
      if (!flags.output) throw new Error('--output required');
      cmdTemplate(flags.output);
      break;
    case 'sign':
      if (!flags.envelope) throw new Error('--envelope required');
      if (!flags.key) throw new Error('--key required');
      cmdSign(flags.envelope, flags.key);
      break;
    case 'verify':
      if (!flags.envelope) throw new Error('--envelope required');
      if (!flags.pubkey) throw new Error('--pubkey required');
      cmdVerify(flags.envelope, flags.pubkey);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
