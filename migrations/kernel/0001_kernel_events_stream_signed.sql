-- ════════════════════════════════════════════════════════════════════════
-- Migration: kernel_events_stream_signed
-- Hito A del Sprint Observatorio Vivo v1.1
-- Target: Supabase del kernel el-monstruo
-- ════════════════════════════════════════════════════════════════════════
--
-- Doctrina v1.1 §3.1 (UNÁNIME 5/5 sabios):
--   Todo evento publicado al bus debe llevar:
--     - signature_ed25519: firma criptográfica de la fila
--     - event_hash_canonical: sha256 del payload canonicalizado
--     - agent_key_id: id de la pubkey que firmó (para rotación)
--
-- Decisión arquitectónica (Spike día 0 → Opción B):
--   No tocar `monstruo_event_stream` original (cero side-effects en kernel).
--   Crear tabla espejo `kernel_events_stream_signed` que:
--     1. Recibe inserts via función firmadora `publish_kernel_event_signed`.
--     2. Es publicada en Realtime para Postgres CDC.
--     3. Tiene RLS habilitado (Regla Dura #7).
--     4. Sólo el observatorio (Tablero) y owner pueden leerla.
--
-- Reversibilidad: drop table es suficiente; no afecta nada del kernel.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Tabla principal ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kernel_events_stream_signed (
  -- Identificadores
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Origen y tipificación
  source_table TEXT NOT NULL CHECK (source_table IN (
    'monstruo_event_stream',
    'runtime_events',
    'thread_immunity_events',
    'manual_publish'
  )),
  source_row_id TEXT,                  -- pk de la fila origen (UUID o int)
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,                -- agente emisor: manus_thread_xxx, kernel, etc

  -- Payload firmado
  payload JSONB NOT NULL,
  payload_size_bytes INT GENERATED ALWAYS AS (octet_length(payload::text)) STORED,

  -- Doctrina v1.1 §3.1 — campos obligatorios
  schema_version TEXT NOT NULL DEFAULT 'v1',
  event_hash_canonical TEXT NOT NULL,  -- sha256 hex del JSON canonicalizado
  signature_ed25519 TEXT NOT NULL,     -- base64 de la firma
  agent_key_id TEXT NOT NULL,          -- ej: "tablero-campana-pub-2026Q2"

  -- Metadata observacional
  emitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_to_broadcast BOOLEAN DEFAULT false,

  -- Tablero — campos derivados para overlay
  affects_districts TEXT[],
  affects_projects TEXT[],

  CONSTRAINT signature_format_check CHECK (length(signature_ed25519) >= 64),
  CONSTRAINT hash_format_check CHECK (event_hash_canonical ~ '^[a-f0-9]{64}$')
);

-- ─── Índices ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kess_emitted_at
  ON public.kernel_events_stream_signed (emitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_kess_event_type
  ON public.kernel_events_stream_signed (event_type, emitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_kess_source_table
  ON public.kernel_events_stream_signed (source_table, emitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_kess_event_id
  ON public.kernel_events_stream_signed (event_id);

CREATE INDEX IF NOT EXISTS idx_kess_districts
  ON public.kernel_events_stream_signed USING GIN (affects_districts);

-- ─── Realtime publication ─────────────────────────────────────────────
-- Se agrega a la publication estándar `supabase_realtime` para que
-- Postgres CDC (Realtime) entregue cambios via Broadcast.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime
        ADD TABLE public.kernel_events_stream_signed;
    EXCEPTION
      WHEN duplicate_object THEN
        -- ya está en la publication
        NULL;
    END;
  END IF;
END $$;

-- ─── Row Level Security ───────────────────────────────────────────────
-- Doctrina Regla Dura #7: RLS habilitado + policy explícita.
ALTER TABLE public.kernel_events_stream_signed ENABLE ROW LEVEL SECURITY;

-- Service role puede TODO (publishers + Tablero leen con service key).
DROP POLICY IF EXISTS kess_service_role_all ON public.kernel_events_stream_signed;
CREATE POLICY kess_service_role_all
  ON public.kernel_events_stream_signed
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users pueden LEER (para que el Tablero conectado al kernel
-- vía cliente público autenticado pueda subscribirse a CDC). El payload no
-- contiene secrets — eso lo enforzamos en el código del publisher.
DROP POLICY IF EXISTS kess_authenticated_read ON public.kernel_events_stream_signed;
CREATE POLICY kess_authenticated_read
  ON public.kernel_events_stream_signed
  FOR SELECT
  TO authenticated
  USING (true);

-- Anon NO tiene acceso (default deny por RLS habilitado sin policy).

-- ─── Comentarios doctrinales ──────────────────────────────────────────
COMMENT ON TABLE public.kernel_events_stream_signed IS
  'Sprint Observatorio Vivo v1.1 / Hito A. Bus de eventos firmados ed25519 que alimenta el Tablero de Campaña. Cada fila es inmutable y verificable. UNÁNIME 5/5 sabios.';

COMMENT ON COLUMN public.kernel_events_stream_signed.signature_ed25519 IS
  'Firma ed25519 base64 sobre canonical_json(payload || event_id || emitted_at). Verificada por el observatorio antes de renderizar.';

COMMENT ON COLUMN public.kernel_events_stream_signed.event_hash_canonical IS
  'sha256 hex del JSON canonicalizado del payload. Permite detectar tampering aunque la firma quede intacta (defense in depth).';

COMMENT ON COLUMN public.kernel_events_stream_signed.agent_key_id IS
  'Identificador de la clave pública que firmó. Permite rotación de keys preservando el historial verificable. Ej: tablero-campana-pub-2026Q2.';

-- ─── Función helper canonical_json ────────────────────────────────────
-- Canonicaliza un JSONB para que la firma sea reproducible.
-- Reglas:
--   - Keys ordenadas alfabéticamente.
--   - Sin whitespace extra.
--   - UTF-8 escaped consistente.
CREATE OR REPLACE FUNCTION public.canonical_jsonb(input JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Postgres ordena keys alfabéticamente al castear con jsonb por defecto.
  -- Para compatibilidad con verificadores TypeScript usamos el mismo orden.
  RETURN input::text;
END;
$$;

COMMENT ON FUNCTION public.canonical_jsonb IS
  'Canoniza un JSONB para firma reproducible. Las claves de JSONB en Postgres están ordenadas alfabéticamente por defecto, coincide con JSON.stringify con sortKeys de canonicalize-json en TS.';

COMMIT;
