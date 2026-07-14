
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

revoke all on function public.current_hotel_id() from public, anon;
revoke all on function public.has_role(uuid, uuid, public.app_role) from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon;
revoke all on function public.validate_room_tenant() from public, anon;
revoke all on function public.validate_reservation_tenant() from public, anon;
revoke all on function public.validate_payment_tenant() from public, anon;

grant execute on function public.current_hotel_id() to authenticated;
grant execute on function public.has_role(uuid, uuid, public.app_role) to authenticated;
