DROP POLICY IF EXISTS user_roles_select_self_or_admin ON public.user_roles;

CREATE POLICY user_roles_select_same_hotel
ON public.user_roles
FOR SELECT
TO authenticated
USING (hotel_id = private.current_hotel_id());