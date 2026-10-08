CREATE TABLE public.qr_scans (
 id uuid PRIMARY KEY,
 qr_id uuid NOT NULL REFERENCES public.qr_links(id) ON DELETE CASCADE,
 scanned_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.qr_scans TO service_role;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;
CREATE INDEX qr_scans_code_time ON public.qr_scans(qr_id, scanned_at DESC);

CREATE OR REPLACE FUNCTION public.qr_record_scan(p_id uuid, p_event uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.qr_links WHERE id = p_id) THEN RETURN false; END IF;
 INSERT INTO public.qr_scans(id, qr_id) VALUES (p_event, p_id) ON CONFLICT (id) DO NOTHING;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.qr_record_scan(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qr_record_scan(uuid, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.qr_analytics(p_id uuid, p_password text, p_page integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_code jsonb; v_total bigint; v_today bigint; v_week bigint; v_last timestamptz; v_rows jsonb;
BEGIN
 IF p_password IS NULL OR length(p_password) < 10 OR length(p_password) > 64 OR p_page IS NULL OR p_page < 0 OR p_page > 100000 THEN
  RETURN jsonb_build_object('error', 'Check your code ID and password.');
 END IF;
 v_code := public.qr_manage(p_id, p_password, NULL);
 IF v_code ? 'error' THEN RETURN v_code; END IF;
 SELECT count(*), count(*) FILTER (WHERE scanned_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'), count(*) FILTER (WHERE scanned_at >= now() - interval '7 days'), max(scanned_at)
 INTO v_total, v_today, v_week, v_last FROM public.qr_scans WHERE qr_id = p_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'scannedAt', s.scanned_at) ORDER BY s.scanned_at DESC, s.id), '[]'::jsonb) INTO v_rows
 FROM (SELECT id, scanned_at FROM public.qr_scans WHERE qr_id = p_id ORDER BY scanned_at DESC, id LIMIT 20 OFFSET p_page * 20) s;
 RETURN jsonb_build_object('code', v_code, 'total', v_total, 'today', v_today, 'week', v_week, 'lastScan', v_last, 'scans', v_rows, 'page', p_page);
END; $$;
REVOKE ALL ON FUNCTION public.qr_analytics(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qr_analytics(uuid, text, integer) TO anon, authenticated, service_role;