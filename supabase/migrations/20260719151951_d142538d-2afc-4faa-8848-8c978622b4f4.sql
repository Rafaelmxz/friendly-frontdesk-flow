
DROP FUNCTION IF EXISTS public.dashboard_metrics();

CREATE OR REPLACE FUNCTION public.register_payment(
  _reservation_id uuid,
  _amount numeric,
  _method payment_method,
  _status payment_status,
  _paid_at timestamptz,
  _notes text
) RETURNS payments
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_hotel_id uuid;
  v_tz text;
  v_paid_at timestamptz;
  v_row payments;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero.';
  END IF;

  SELECT r.hotel_id, h.timezone INTO v_hotel_id, v_tz
  FROM public.reservations r
  JOIN public.hotels h ON h.id = r.hotel_id
  WHERE r.id = _reservation_id;

  IF v_hotel_id IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada.';
  END IF;

  v_paid_at := _paid_at;
  IF _status = 'pago'::payment_status AND v_paid_at IS NULL THEN
    v_paid_at := now();
  END IF;

  INSERT INTO public.payments (reservation_id, hotel_id, amount, method, status, paid_at, notes, created_by)
  VALUES (_reservation_id, v_hotel_id, _amount, _method, _status, v_paid_at, NULLIF(_notes, ''), auth.uid())
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_payment(uuid, numeric, payment_method, payment_status, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_payment(
  _id uuid,
  _amount numeric,
  _method payment_method,
  _status payment_status,
  _paid_at timestamptz,
  _notes text
) RETURNS payments
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_paid_at timestamptz;
  v_row payments;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero.';
  END IF;

  v_paid_at := _paid_at;
  IF _status = 'pago'::payment_status AND v_paid_at IS NULL THEN
    v_paid_at := now();
  END IF;

  UPDATE public.payments
  SET amount = _amount,
      method = _method,
      status = _status,
      paid_at = v_paid_at,
      notes = NULLIF(_notes, '')
  WHERE id = _id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Pagamento não encontrado.';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_payment(uuid, numeric, payment_method, payment_status, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dashboard_metrics()
 RETURNS TABLE(rooms_ocupados bigint, rooms_disponiveis bigint, checkins_hoje bigint, checkouts_hoje bigint, receita_mes numeric, receita_recebida_mes numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tz text;
  v_today date;
  v_month_start date;
  v_next_month date;
  v_month_start_ts timestamptz;
  v_next_month_ts timestamptz;
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
  v_month_start_ts := v_month_start::timestamp AT TIME ZONE v_tz;
  v_next_month_ts := v_next_month::timestamp AT TIME ZONE v_tz;

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
        AND check_in < v_next_month),
    (SELECT COALESCE(sum(amount), 0) FROM public.payments
      WHERE status = 'pago'::payment_status
        AND paid_at >= v_month_start_ts
        AND paid_at < v_next_month_ts);
END;
$function$;
