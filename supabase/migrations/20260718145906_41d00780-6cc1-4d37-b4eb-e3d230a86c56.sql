
CREATE OR REPLACE FUNCTION public.dashboard_metrics()
RETURNS TABLE (
  rooms_ocupados bigint,
  rooms_disponiveis bigint,
  checkins_hoje bigint,
  checkouts_hoje bigint,
  receita_mes numeric
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_today date;
  v_month_start date;
  v_next_month date;
BEGIN
  SELECT h.timezone INTO v_tz
  FROM public.hotels h
  JOIN public.profiles p ON p.hotel_id = h.id
  WHERE p.id = auth.uid()
  LIMIT 1;

  v_tz := COALESCE(v_tz, 'UTC');
  v_today := (now() AT TIME ZONE v_tz)::date;
  v_month_start := date_trunc('month', v_today)::date;
  v_next_month := (v_month_start + interval '1 month')::date;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.rooms WHERE status = 'ocupado'::room_status),
    (SELECT count(*) FROM public.rooms WHERE status = 'disponivel'::room_status),
    (SELECT count(*) FROM public.reservations
      WHERE status = 'confirmada'::reservation_status AND check_in = v_today),
    (SELECT count(*) FROM public.reservations
      WHERE status = 'checkin'::reservation_status AND check_out = v_today),
    (SELECT COALESCE(sum(total_amount), 0) FROM public.reservations
      WHERE status IN ('confirmada'::reservation_status, 'checkin'::reservation_status, 'checkout'::reservation_status)
        AND check_in >= v_month_start
        AND check_in < v_next_month);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_metrics() TO authenticated;

CREATE OR REPLACE FUNCTION public.reservations_calendar(_from date, _to date)
RETURNS TABLE (
  id uuid,
  room_id uuid,
  guest_id uuid,
  guest_name text,
  check_in date,
  check_out date,
  status reservation_status
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.id, r.room_id, r.guest_id, g.full_name, r.check_in, r.check_out, r.status
  FROM public.reservations r
  JOIN public.guests g ON g.id = r.guest_id
  WHERE r.status IN ('confirmada'::reservation_status, 'checkin'::reservation_status)
    AND r.check_in < _to
    AND r.check_out > _from
  ORDER BY r.check_in;
$$;

GRANT EXECUTE ON FUNCTION public.reservations_calendar(date, date) TO authenticated;
