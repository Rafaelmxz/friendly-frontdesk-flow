GRANT DELETE ON TABLE public.profiles TO authenticated;

DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_delete_admin
ON public.profiles
FOR DELETE
TO authenticated
USING (
  hotel_id = private.current_hotel_id()
  AND private.has_role(auth.uid(), hotel_id, 'admin'::public.app_role)
  AND id <> auth.uid()
);

CREATE OR REPLACE FUNCTION public.remove_hotel_member(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_hotel_id uuid;
  v_target_role public.app_role;
  v_admin_count bigint;
BEGIN
  v_hotel_id := private.current_hotel_id();

  IF v_hotel_id IS NULL OR NOT private.has_role(auth.uid(), v_hotel_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem remover membros.' USING ERRCODE = '42501';
  END IF;

  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio acesso.' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_target_role
  FROM public.user_roles
  WHERE user_id = _user_id AND hotel_id = v_hotel_id
  LIMIT 1;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Membro não encontrado.';
  END IF;

  IF v_target_role = 'admin'::public.app_role THEN
    SELECT count(*) INTO v_admin_count
    FROM public.user_roles
    WHERE hotel_id = v_hotel_id AND role = 'admin'::public.app_role;

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'O hotel precisa manter pelo menos um administrador.';
    END IF;
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND hotel_id = v_hotel_id;

  DELETE FROM public.profiles
  WHERE id = _user_id AND hotel_id = v_hotel_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.remove_hotel_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_hotel_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_hotel_member(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.renew_hotel_invite(_id uuid, _token text)
RETURNS public.hotel_invites
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_hotel_id uuid;
  v_old public.hotel_invites;
  v_new public.hotel_invites;
BEGIN
  v_hotel_id := private.current_hotel_id();

  IF v_hotel_id IS NULL OR NOT private.has_role(auth.uid(), v_hotel_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem reenviar convites.' USING ERRCODE = '42501';
  END IF;

  IF _token IS NULL OR length(_token) < 32 THEN
    RAISE EXCEPTION 'Token de convite inválido.';
  END IF;

  DELETE FROM public.hotel_invites
  WHERE id = _id
    AND hotel_id = v_hotel_id
    AND accepted_at IS NULL
  RETURNING * INTO v_old;

  IF v_old.id IS NULL THEN
    RAISE EXCEPTION 'Convite pendente não encontrado.';
  END IF;

  INSERT INTO public.hotel_invites (
    hotel_id,
    email,
    role,
    token,
    invited_by,
    expires_at
  ) VALUES (
    v_hotel_id,
    v_old.email,
    v_old.role,
    _token,
    auth.uid(),
    now() + interval '7 days'
  )
  RETURNING * INTO v_new;

  RETURN v_new;
END;
$function$;

REVOKE ALL ON FUNCTION public.renew_hotel_invite(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renew_hotel_invite(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.renew_hotel_invite(uuid, text) TO service_role;