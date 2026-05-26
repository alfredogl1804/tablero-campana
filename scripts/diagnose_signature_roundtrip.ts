import { EventPublisher } from "../server/lib/eventPublisher";
import { canonicalize, hashCanonical, verifySignature } from "../server/lib/eventSigner";

async function main() {
  const publisher = new EventPublisher();
  const recent = await publisher.listRecent(2);
  if (!recent || recent.length === 0) {
    console.log("No rows yet");
    return;
  }

  for (const row of recent.slice(0, 1) as Array<Record<string, unknown>>) {
    console.log("=== Row from DB ===");
    console.log(JSON.stringify(row, null, 2));
    console.log();

    const fullPayload = {
      source_table: row.source_table,
      source_row_id: row.source_row_id,
      event_type: row.event_type,
      source: row.source,
      payload: row.payload,
      emitted_at: row.emitted_at,
    };
    console.log("=== Reconstructed fullPayload ===");
    console.log(JSON.stringify(fullPayload, null, 2));
    console.log();

    const canon = canonicalize(fullPayload);
    console.log("=== Canonical ===");
    console.log(canon);
    console.log();

    const recomputedHash = hashCanonical(fullPayload);
    console.log("recomputed_hash:", recomputedHash);
    console.log("stored_hash:    ", row.event_hash_canonical);
    console.log("match:", recomputedHash === row.event_hash_canonical);
    console.log();

    const pubPem = (process.env.OBSERVATORIO_SIGNER_PUBLIC_PEM || "").replace(/\\n/g, "\n");
    const sigOk = verifySignature(fullPayload, row.signature_ed25519 as string, pubPem);
    console.log("signature_verifies:", sigOk);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
