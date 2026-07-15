
CREATE OR REPLACE FUNCTION public.search_guests(q text)
RETURNS SETOF public.guests
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT DISTINCT g.*
  FROM public.guests g
  LEFT JOIN public.reservations r
    ON r.guest_id = g.id
   AND r.status IN ('confirmada'::reservation_status, 'checkin'::reservation_status)
  LEFT JOIN public.rooms ro
    ON ro.id = r.room_id
  WHERE
    q IS NULL
    OR q = ''
    OR g.full_name ILIKE '%' || q || '%'
    OR g.document_number ILIKE '%' || q || '%'
    OR ro.number ILIKE '%' || q || '%'
  ORDER BY g.full_name
$$;

GRANT EXECUTE ON FUNCTION public.search_guests(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.search_guests(text) FROM anon, public;
