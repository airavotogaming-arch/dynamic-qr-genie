-- Neon-backed storage for dynamic QR links and identity-free scan events.
-- Keep the database credentials server-side; no public client gets direct table access.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.qr_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination text NOT NULL,
  label text NOT NULL DEFAULT '',
  password_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qr_scans (
  id uuid PRIMARY KEY,
  qr_id uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
  scanned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qr_scans_code_time
  ON public.qr_scans(qr_id, scanned_at DESC);
