
CREATE OR REPLACE FUNCTION public.checkin_reservation(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_status reservation_status;
  v_check_in date;
  v_room_id uuid;
  v_tz text;
  v_today date;
BEGIN
  SELECT r.status, r.check_in, r.room_id, h.timezone
    INTO v_status, v_check_in, v_room_id, v_tz
  FROM public.reservations r
  JOIN public.hotels h ON h.id = r.hotel_id
  WHERE r.id = _id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada.';
  END IF;
  IF v_status <> 'confirmada'::reservation_status THEN
    RAISE EXCEPTION 'Só é possível fazer check-in de uma reserva confirmada.';
  END IF;

  v_today := (now() AT TIME ZONE COALESCE(v_tz, 'UTC'))::date;
  IF v_check_in > v_today THEN
    RAISE EXCEPTION 'Check-in só a partir de %.', to_char(v_check_in, 'DD/MM/YYYY');
  END IF;

  UPDATE public.reservations SET status = 'checkin'::reservation_status WHERE id = _id;
  UPDATE public.rooms SET status = 'ocupado'::room_status WHERE id = v_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_reservation(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_status reservation_status;
  v_room_id uuid;
BEGIN
  SELECT status, room_id INTO v_status, v_room_id
  FROM public.reservations WHERE id = _id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada.';
  END IF;
  IF v_status <> 'checkin'::reservation_status THEN
    RAISE EXCEPTION 'Só é possível fazer check-out de uma reserva em check-in.';
  END IF;

  UPDATE public.reservations SET status = 'checkout'::reservation_status WHERE id = _id;
  UPDATE public.rooms SET status = 'disponivel'::room_status WHERE id = v_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_reservation(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_status reservation_status;
BEGIN
  SELECT status INTO v_status FROM public.reservations WHERE id = _id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Reserva não encontrada.';
  END IF;
  IF v_status = 'checkin'::reservation_status THEN
    RAISE EXCEPTION 'Não é possível cancelar uma reserva já em check-in. Faça check-out.';
  END IF;
  IF v_status IN ('checkout'::reservation_status, 'cancelada'::reservation_status, 'no_show'::reservation_status) THEN
    RAISE EXCEPTION 'Reserva já está finalizada.';
  END IF;

  UPDATE public.reservations SET status = 'cancelada'::reservation_status WHERE id = _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.checkin_reservation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_reservation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(uuid) TO authenticated;
