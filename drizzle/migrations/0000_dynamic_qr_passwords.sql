CREATE TABLE public.qr_links (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), destination text NOT NULL, label text NOT NULL DEFAULT '', password_hash text NOT NULL, failed_attempts integer NOT NULL DEFAULT 0, locked_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.qr_links TO service_role;
ALTER TABLE public.qr_links ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.qr_create(p_url text, p_label text, p_password text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_id uuid;
BEGIN
IF length(p_url)>2048 OR p_url !~ '^https?://' OR length(p_label)>80 OR length(p_password)<10 OR length(p_password)>64 OR octet_length(p_password)>64 THEN RETURN jsonb_build_object('error','Check the URL, name, and password (10–64 characters).'); END IF;
INSERT INTO public.qr_links(destination,label,password_hash) VALUES(p_url,p_label,crypt(p_password,gen_salt('bf',12))) RETURNING id INTO v_id;
RETURN jsonb_build_object('id',v_id,'destination',p_url,'label',p_label);
END; $$;
REVOKE ALL ON FUNCTION public.qr_create(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qr_create(text,text,text) TO anon, authenticated, service_role;
CREATE FUNCTION public.qr_manage(p_id uuid, p_password text, p_url text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE r public.qr_links%ROWTYPE;
BEGIN
SELECT * INTO r FROM public.qr_links WHERE id=p_id FOR UPDATE;
IF NOT FOUND THEN RETURN jsonb_build_object('error','Code not found or password incorrect.'); END IF;
IF r.locked_until>now() THEN RETURN jsonb_build_object('error','Too many attempts. Try again in 15 minutes.'); END IF;
IF length(p_password)>64 OR crypt(p_password,r.password_hash) IS DISTINCT FROM r.password_hash THEN
UPDATE public.qr_links SET failed_attempts=CASE WHEN failed_attempts>=4 THEN 0 ELSE failed_attempts+1 END, locked_until=CASE WHEN failed_attempts>=4 THEN now()+interval '15 minutes' ELSE NULL END WHERE id=p_id;
RETURN jsonb_build_object('error','Code not found or password incorrect.'); END IF;
IF p_url IS NOT NULL AND (length(p_url)>2048 OR p_url !~ '^https?://') THEN RETURN jsonb_build_object('error','Enter a valid http or https URL.'); END IF;
UPDATE public.qr_links SET destination=coalesce(p_url,destination), failed_attempts=0,locked_until=NULL,updated_at=CASE WHEN p_url IS NOT NULL THEN now() ELSE updated_at END WHERE id=p_id RETURNING * INTO r;
RETURN jsonb_build_object('id',r.id,'destination',r.destination,'label',r.label);
END; $$;
REVOKE ALL ON FUNCTION public.qr_manage(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qr_manage(uuid,text,text) TO anon, authenticated, service_role;
CREATE FUNCTION public.qr_resolve(p_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT destination FROM public.qr_links WHERE id=p_id $$;
REVOKE ALL ON FUNCTION public.qr_resolve(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qr_resolve(uuid) TO anon, authenticated, service_role;