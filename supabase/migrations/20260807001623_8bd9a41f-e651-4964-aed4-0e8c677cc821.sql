CREATE OR REPLACE FUNCTION public.reservations_calendar(_from date, _to date)
RETURNS TABLE(id uuid, room_id uuid, guest_id uuid, guest_name text, check_in date, check_out date, status reservation_status)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.id, r.room_id, r.guest_id, g.full_name, r.check_in, r.check_out, r.status
  FROM public.reservations r
  JOIN public.guests g ON g.id = r.guest_id
  WHERE r.status IN ('pendente'::reservation_status, 'confirmada'::reservation_status, 'checkin'::reservation_status)
    AND r.check_in < _to
    AND r.check_out > _from
  ORDER BY r.check_in;
$$;