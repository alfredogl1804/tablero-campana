/**
 * eventPublisher — publica eventos firmados al bus del observatorio.
 *
 * Doctrina v1.1 §3.2:
 *   - Cada publicación es un INSERT en `kernel_events_stream_signed` (Postgres).
 *   - El INSERT dispara CDC vía supabase_realtime publication.
 *   - Antes del insert, el publisher firma el payload con su privada ed25519.
 *
 * Diseño:
 *   - Usa Supabase service_role para bypassear RLS (el publisher está en backend).
 *   - Idempotente: si event_id ya existe, ignora.
 *   - Fail-loud: si falta env, falla al construir.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { signEvent, getSignerFromEnv, SignedEvent } from "./eventSigner";

export interface PublishInput {
  source_table: "monstruo_event_stream" | "runtime_events" | "thread_immunity_events" | "manual_publish";
  source_row_id?: string;
  event_type: string;
  source: string;
  payload: Record<string, unknown>;
  emitted_at?: Date;
  affects_districts?: string[];
  affects_projects?: string[];
}

export class EventPublisher {
  private supabase: SupabaseClient;
  private signer: { privatePem: string; publicPem: string; keyId: string };

  constructor(supabaseUrl?: string, supabaseServiceKey?: string) {
    const url = supabaseUrl ?? process.env.SUPABASE_URL;
    const key = supabaseServiceKey ?? process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error("EventPublisher requires SUPABASE_URL + SUPABASE_SERVICE_KEY");
    }
    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.signer = getSignerFromEnv();
  }

  /**
   * Firma y publica un evento. Devuelve el evento con id BIGSERIAL asignado
   * por la DB, o un error si falló.
   */
  async publish(input: PublishInput): Promise<{ id: number; signed: SignedEvent }> {
    const emittedAt = input.emitted_at ?? new Date();

    // CRÍTICO: Postgres normaliza ISO timestamps con Z a formato +00:00
    // al guardar en columnas TIMESTAMPTZ. Para que la firma sea reproducible
    // post round-trip, firmamos el timestamp YA en el formato que Postgres
    // devolverá al hacer SELECT. Esto evita que la verificación falle por
    // diferencia de representación cuando el JSON visual cambia pero el
    // valor es idéntico.
    const emittedAtPgFormat = emittedAt.toISOString().replace("Z", "+00:00");

    // Construir el payload completo que se firma. Incluye campos críticos
    // para que la firma cubra source_table, source, event_type, etc.
    const fullPayload = {
      source_table: input.source_table,
      source_row_id: input.source_row_id ?? null,
      event_type: input.event_type,
      source: input.source,
      payload: input.payload,
      emitted_at: emittedAtPgFormat,
    };

    const signed = signEvent(fullPayload, this.signer.privatePem, this.signer.keyId);

    const row = {
      source_table: input.source_table,
      source_row_id: input.source_row_id ?? null,
      event_type: input.event_type,
      source: input.source,
      payload: input.payload,
      schema_version: "v1",
      event_hash_canonical: signed.event_hash_canonical,
      signature_ed25519: signed.signature_ed25519,
      agent_key_id: signed.agent_key_id,
      emitted_at: emittedAtPgFormat,
      affects_districts: input.affects_districts ?? null,
      affects_projects: input.affects_projects ?? null,
    };

    const { data, error } = await this.supabase
      .from("kernel_events_stream_signed")
      .insert(row)
      .select("id")
      .single();

    if (error) {
      throw new Error(`EventPublisher.publish failed: ${error.message}`);
    }

    return { id: (data as { id: number }).id, signed };
  }

  /**
   * Cuenta filas en la tabla. Útil para diagnostics.
   */
  async count(): Promise<number> {
    const { count, error } = await this.supabase
      .from("kernel_events_stream_signed")
      .select("*", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  /**
   * Lista los últimos N eventos del bus. Para verificar end-to-end.
   */
  async listRecent(limit = 10) {
    const { data, error } = await this.supabase
      .from("kernel_events_stream_signed")
      .select("*")
      .order("emitted_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data;
  }
}
