/**
 * E2E test del eventPublisher contra el kernel Supabase REAL.
 *
 * Esto no es unit test — escribe filas reales en kernel_events_stream_signed.
 * Doctrina: las filas insertadas tienen source="manus_test_observatorio_v1",
 * lo que permite limpiarlas si fuese necesario.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { EventPublisher } from "./eventPublisher";
import { verifyEvent } from "./eventSigner";

describe("EventPublisher E2E (kernel Supabase real)", () => {
  let publisher: EventPublisher;

  beforeAll(() => {
    publisher = new EventPublisher();
  });

  it("count() works (sanity check connectivity)", async () => {
    const c = await publisher.count();
    expect(typeof c).toBe("number");
    expect(c).toBeGreaterThanOrEqual(0);
  });

  it("publish() inserts a signed row and returns id", async () => {
    const before = await publisher.count();

    const { id, signed } = await publisher.publish({
      source_table: "manual_publish",
      event_type: "observatorio_test_event",
      source: "manus_test_observatorio_v1",
      payload: {
        test: true,
        message: "Hito A — first event from EventPublisher test",
        ts: new Date().toISOString(),
      },
    });

    expect(id).toBeGreaterThan(0);
    expect(signed.signature_ed25519).toBeTruthy();

    const after = await publisher.count();
    expect(after).toBe(before + 1);
  });

  it("inserted row is verifiable end-to-end", async () => {
    const recent = await publisher.listRecent(5);
    const myRow = recent?.find(
      (r) =>
        (r as { source: string }).source === "manus_test_observatorio_v1",
    ) as
      | {
          payload: unknown;
          event_hash_canonical: string;
          signature_ed25519: string;
          agent_key_id: string;
          source_table: string;
          source_row_id: string | null;
          event_type: string;
          source: string;
          emitted_at: string;
        }
      | undefined;

    expect(myRow).toBeDefined();
    if (!myRow) return;

    // Reconstruimos el fullPayload firmado para verificar
    const fullPayload = {
      source_table: myRow.source_table,
      source_row_id: myRow.source_row_id,
      event_type: myRow.event_type,
      source: myRow.source,
      payload: myRow.payload,
      emitted_at: myRow.emitted_at,
    };

    const allowed = new Map([
      [
        process.env.OBSERVATORIO_SIGNER_KEY_ID!,
        process.env.OBSERVATORIO_SIGNER_PUBLIC_PEM!.replace(/\\n/g, "\n"),
      ],
    ]);

    const result = verifyEvent(
      {
        payload: fullPayload,
        event_hash_canonical: myRow.event_hash_canonical,
        signature_ed25519: myRow.signature_ed25519,
        agent_key_id: myRow.agent_key_id,
      },
      allowed,
    );

    expect(result.valid).toBe(true);
  });
});
