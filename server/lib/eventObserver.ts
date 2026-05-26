/**
 * eventObserver — singleton que consume el bus firmado del kernel y mantiene
 * un buffer en memoria de los últimos N eventos verificados. El frontend
 * consume vía tRPC sin hablar directo con Supabase.
 *
 * Doctrina v1.1 §3.3:
 *   - Backpressure: window de 250 eventos en memoria como tope.
 *   - Fallback polling: si Realtime se desconecta >5s, polling cada 5s.
 *   - Métricas obligatorias: dropped_count, last_received_at, lag_ms.
 *   - Verificación: cada evento firmado se verifica antes de exponerse.
 */

import { createClient, SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { verifyEvent } from "./eventSigner";

export interface ObservedEvent {
  id: number;
  event_id: string;
  source_table: string;
  source_row_id: string | null;
  event_type: string;
  source: string;
  payload: Record<string, unknown>;
  schema_version: string;
  event_hash_canonical: string;
  signature_ed25519: string;
  agent_key_id: string;
  emitted_at: string;
  ingested_at: string;
  affects_districts: string[] | null;
  affects_projects: string[] | null;
  // Marca de verificación local
  verified: boolean;
  verification_reason?: string;
}

export interface ObserverMetrics {
  status: "connecting" | "live" | "polling_fallback" | "down";
  total_received: number;
  total_verified: number;
  total_rejected: number;
  buffer_size: number;
  last_received_at: string | null;
  last_lag_ms: number | null;
  reconnect_count: number;
  source: "realtime_cdc" | "polling" | "mixed";
}

const WINDOW_SIZE = 250;
const POLL_INTERVAL_MS = 5000;
const RECONNECT_THRESHOLD_MS = 5000;

class EventObserver {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private buffer: ObservedEvent[] = [];
  private metrics: ObserverMetrics;
  private allowedKeys: Map<string, string>;
  private pollingTimer: NodeJS.Timeout | null = null;
  private lastSeenId: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error("EventObserver requires SUPABASE_URL + SUPABASE_SERVICE_KEY");
    this.supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });

    const pubPem = (process.env.OBSERVATORIO_SIGNER_PUBLIC_PEM || "").replace(/\\n/g, "\n");
    const keyId = process.env.OBSERVATORIO_SIGNER_KEY_ID || "";
    this.allowedKeys = new Map(keyId && pubPem ? [[keyId, pubPem]] : []);

    this.metrics = {
      status: "connecting",
      total_received: 0,
      total_verified: 0,
      total_rejected: 0,
      buffer_size: 0,
      last_received_at: null,
      last_lag_ms: null,
      reconnect_count: 0,
      source: "realtime_cdc",
    };
  }

  async start(): Promise<void> {
    // 1. Cargar últimos eventos del bus para tener histórico al arrancar.
    await this.bootstrapFromHistory();

    // 2. Suscribirse a CDC.
    this.subscribeRealtime();
  }

  private async bootstrapFromHistory(): Promise<void> {
    const { data, error } = await this.supabase
      .from("kernel_events_stream_signed")
      .select("*")
      .order("id", { ascending: false })
      .limit(WINDOW_SIZE);
    if (error) {
      console.warn("[Observer] bootstrap failed:", error.message);
      return;
    }
    if (data) {
      const events = (data as unknown as ObservedEvent[]).reverse();
      for (const ev of events) {
        this.processEvent(ev, "polling");
      }
    }
  }

  private subscribeRealtime() {
    if (this.channel) {
      this.channel.unsubscribe();
    }
    this.channel = this.supabase.channel("kernel_events_stream_signed");
    this.channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "kernel_events_stream_signed",
        },
        (payload) => {
          const newEvent = payload.new as unknown as ObservedEvent;
          this.processEvent(newEvent, "realtime_cdc");
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.metrics.status = "live";
          this.metrics.source = "realtime_cdc";
          this.stopPolling();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          this.metrics.status = "polling_fallback";
          this.metrics.source = "polling";
          this.startPolling();
          this.scheduleReconnect();
        }
      });
  }

  private startPolling() {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => {
      void this.pollOnce();
    }, POLL_INTERVAL_MS);
  }

  private stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async pollOnce(): Promise<void> {
    const { data, error } = await this.supabase
      .from("kernel_events_stream_signed")
      .select("*")
      .gt("id", this.lastSeenId)
      .order("id", { ascending: true })
      .limit(50);
    if (error) {
      this.metrics.status = "down";
      return;
    }
    if (data) {
      for (const ev of data as unknown as ObservedEvent[]) {
        this.processEvent(ev, "polling");
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.metrics.reconnect_count++;
      this.subscribeRealtime();
    }, RECONNECT_THRESHOLD_MS);
  }

  private processEvent(rawEvent: ObservedEvent, source: "realtime_cdc" | "polling") {
    this.metrics.total_received++;
    this.metrics.last_received_at = new Date().toISOString();
    if (rawEvent.emitted_at) {
      this.metrics.last_lag_ms =
        Date.now() - new Date(rawEvent.emitted_at).getTime();
    }

    // Verificación de firma
    const signedEvent = {
      payload: {
        source_table: rawEvent.source_table,
        source_row_id: rawEvent.source_row_id,
        event_type: rawEvent.event_type,
        source: rawEvent.source,
        payload: rawEvent.payload,
        emitted_at: rawEvent.emitted_at,
      },
      event_hash_canonical: rawEvent.event_hash_canonical,
      signature_ed25519: rawEvent.signature_ed25519,
      agent_key_id: rawEvent.agent_key_id,
    };

    const result = verifyEvent(signedEvent, this.allowedKeys);
    rawEvent.verified = result.valid;
    rawEvent.verification_reason = result.reason;

    if (result.valid) this.metrics.total_verified++;
    else this.metrics.total_rejected++;

    if (rawEvent.id > this.lastSeenId) this.lastSeenId = rawEvent.id;

    // Backpressure window
    this.buffer.push(rawEvent);
    if (this.buffer.length > WINDOW_SIZE) {
      this.buffer = this.buffer.slice(-WINDOW_SIZE);
    }
    this.metrics.buffer_size = this.buffer.length;
    if (source !== this.metrics.source) {
      this.metrics.source = "mixed";
    }
  }

  getRecent(limit = 50, opts?: { onlyVerified?: boolean }): ObservedEvent[] {
    const slice = this.buffer.slice(-limit).reverse();
    if (opts?.onlyVerified) return slice.filter((e) => e.verified);
    return slice;
  }

  getMetrics(): ObserverMetrics {
    return { ...this.metrics };
  }
}

// Singleton — un solo observer por proceso server.
let observer: EventObserver | null = null;

export function getEventObserver(): EventObserver {
  if (!observer) {
    observer = new EventObserver();
    void observer.start();
  }
  return observer;
}
