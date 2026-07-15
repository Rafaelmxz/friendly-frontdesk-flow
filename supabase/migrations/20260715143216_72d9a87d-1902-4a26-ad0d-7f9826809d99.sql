
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.has_role(uuid, uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.current_hotel_id() SET SCHEMA private;

REVOKE ALL ON FUNCTION private.has_role(uuid, uuid, public.app_role) FROM public, anon;
REVOKE ALL ON FUNCTION private.current_hotel_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.current_hotel_id() TO authenticated;
