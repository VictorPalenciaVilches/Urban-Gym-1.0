-- ============================================================================
-- FUNCIÓN RPC: reserve_spot
-- Reserva un cupo de forma atómica (evita sobreventa por race conditions).
-- Ejecutar esta función UNA VEZ en el SQL Editor del proyecto Supabase
-- correspondiente al booking-service (cxhjmilbamlhujirjpec).
-- ============================================================================

CREATE OR REPLACE FUNCTION reserve_spot(
  p_schedule_id UUID,
  p_member_id   UUID
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_spots   INT;
  v_booking RECORD;
BEGIN
  -- Bloquear la fila del horario para escritura exclusiva (evita race condition)
  SELECT available_spots
  INTO   v_spots
  FROM   schedules
  WHERE  id = p_schedule_id
  FOR UPDATE;

  IF v_spots IS NULL THEN
    RAISE EXCEPTION 'schedule_not_found';
  END IF;

  IF v_spots <= 0 THEN
    RAISE EXCEPTION 'no_spots';
  END IF;

  -- Insertar reserva
  INSERT INTO bookings (schedule_id, member_id, status)
  VALUES (p_schedule_id, p_member_id, 'confirmed')
  RETURNING * INTO v_booking;

  -- Decrementar cupos de forma atómica
  UPDATE schedules
  SET    available_spots = available_spots - 1
  WHERE  id = p_schedule_id;

  RETURN row_to_json(v_booking);
END;
$$;
