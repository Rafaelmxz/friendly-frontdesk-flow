
-- 1. Drop demo trigger + function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Ensure citext
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

-- 3. hotel_invites table
CREATE TABLE public.hotel_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  email extensions.citext NOT NULL,
  role public.app_role NOT NULL DEFAULT 'recepcionista',
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX hotel_invites_pending_unique
  ON public.hotel_invites (hotel_id, lower(email::text))
  WHERE accepted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_invites TO authenticated;
GRANT ALL ON public.hotel_invites TO service_role;

ALTER TABLE public.hotel_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invites of own hotel - select"
  ON public.hotel_invites FOR SELECT TO authenticated
  USING (hotel_id = public.current_hotel_id()
    AND public.has_role(auth.uid(), hotel_id, 'admin'));

CREATE POLICY "Admins manage invites of own hotel - insert"
  ON public.hotel_invites FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.current_hotel_id()
    AND public.has_role(auth.uid(), hotel_id, 'admin'));

CREATE POLICY "Admins manage invites of own hotel - update"
  ON public.hotel_invites FOR UPDATE TO authenticated
  USING (hotel_id = public.current_hotel_id()
    AND public.has_role(auth.uid(), hotel_id, 'admin'))
  WITH CHECK (hotel_id = public.current_hotel_id()
    AND public.has_role(auth.uid(), hotel_id, 'admin'));

CREATE POLICY "Admins manage invites of own hotel - delete"
  ON public.hotel_invites FOR DELETE TO authenticated
  USING (hotel_id = public.current_hotel_id()
    AND public.has_role(auth.uid(), hotel_id, 'admin'));

CREATE TRIGGER hotel_invites_set_updated_at
  BEFORE UPDATE ON public.hotel_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
