-- =====================================================================
-- PROPUESTA (NO EJECUTADA) 20260813000000_variable_pricing.sql
-- Brightobarber: precios a consultar + duración variable + pago en
-- efectivo en el salón. Idempotente. No destructivo.
--
-- Requiere: 20260811000000_init_salon_backend.sql
--           20260812000000_atomic_booking.sql
--           20260812010000_fix_create_booking_ambiguity.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. public.services: separar información comercial vs. interna
-- ---------------------------------------------------------------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS price_on_consultation  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duration_variable      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_method         text    NOT NULL DEFAULT 'cash_in_person',
  ADD COLUMN IF NOT EXISTS booking_block_minutes  integer;

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_payment_method_check;
ALTER TABLE public.services
  ADD CONSTRAINT services_payment_method_check
  CHECK (payment_method IN ('cash_in_person'));

-- Semilla del bloque de agenda a partir de la duración antigua, para que
-- ninguna fila quede sin valor antes de imponer NOT NULL.
UPDATE public.services
SET booking_block_minutes = COALESCE(booking_block_minutes, duration_minutes, 60)
WHERE booking_block_minutes IS NULL;

ALTER TABLE public.services
  ALTER COLUMN booking_block_minutes SET DEFAULT 60;
ALTER TABLE public.services
  ALTER COLUMN booking_block_minutes SET NOT NULL;
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_booking_block_positive;
ALTER TABLE public.services
  ADD CONSTRAINT services_booking_block_positive
  CHECK (booking_block_minutes > 0);

-- price y duration_minutes NO se eliminan (histórico + NOT NULL existente).
-- Pasan a ser campos internos/legacy: el frontend deja de leerlos cuando
-- price_on_consultation / duration_variable son true.
COMMENT ON COLUMN public.services.price IS
  'LEGACY/interno. No mostrar si price_on_consultation = true.';
COMMENT ON COLUMN public.services.duration_minutes IS
  'LEGACY/interno. No mostrar. La agenda usa booking_block_minutes.';
COMMENT ON COLUMN public.services.booking_block_minutes IS
  'Solo agenda: minutos que se bloquean para evitar solapes. NO es la duración prometida al cliente.';

-- ---------------------------------------------------------------
-- 2. Catálogo final (8 servicios). gen_random_uuid() para los nuevos.
--    cut_styling se RENOMBRA (conserva UUID e historial).
-- ---------------------------------------------------------------
UPDATE public.services
SET slug = 'mens_haircut',
    name = 'Corte de cabello para hombres',
    category = 'hair',
    is_active = true
WHERE business_id = '7c8f0987-88d1-4a87-87a6-68db1573b5b6'
  AND slug = 'cut_styling';

INSERT INTO public.services
  (business_id, slug, name, category, price, duration_minutes,
   booking_block_minutes, price_on_consultation, duration_variable, payment_method, is_active)
VALUES
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6','cornrows',        'Trenzas pegadas',        'braids', 0, 120, 120, true, true, 'cash_in_person', true),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6','individual_braids','Trenza individual',     'braids', 0, 240, 240, true, true, 'cash_in_person', true),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6','knotless_braids', 'Trenza sin nudo',        'braids', 0, 240, 240, true, true, 'cash_in_person', true),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6','micro_twists',    'Micro-twist',            'braids', 0, 300, 300, true, true, 'cash_in_person', true),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6','natural_twists',  'Twist en cabello natural','braids',0, 180, 180, true, true, 'cash_in_person', true),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6','crochet_braids',  'Crochet braids',         'braids', 0, 180, 180, true, true, 'cash_in_person', true),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6','wash_blowdry',    'Lavado y secado',        'hair',   0,  60,  60, true, true, 'cash_in_person', true)
ON CONFLICT (business_id, slug) DO UPDATE
SET name = EXCLUDED.name,
    category = EXCLUDED.category,
    is_active = true;

-- Corte de hombre: bloque de agenda más corto.
UPDATE public.services
SET booking_block_minutes = 60
WHERE business_id = '7c8f0987-88d1-4a87-87a6-68db1573b5b6'
  AND slug = 'mens_haircut';

-- Todo el catálogo queda en modo "precio a consultar".
UPDATE public.services
SET price_on_consultation = true,
    duration_variable     = true,
    payment_method        = 'cash_in_person'
WHERE business_id = '7c8f0987-88d1-4a87-87a6-68db1573b5b6';

-- ---------------------------------------------------------------
-- 3. Manicura y Color: retirada NO destructiva
-- ---------------------------------------------------------------
UPDATE public.services
SET is_active = false
WHERE business_id = '7c8f0987-88d1-4a87-87a6-68db1573b5b6'
  AND slug IN ('manicure', 'color');   -- 'color' solo si lo autorizas

-- Se conservan sus filas en staff_services (inocuas: create_booking exige
-- is_active = true). Si prefieres limpieza explícita, descomenta:
-- DELETE FROM public.staff_services ss
-- USING public.services s
-- WHERE ss.service_id = s.id AND s.is_active IS FALSE;

-- Los appointments históricos NO se tocan.

-- ---------------------------------------------------------------
-- 4. staff_services: el personal activo cubre los servicios activos
-- ---------------------------------------------------------------
INSERT INTO public.staff_services (staff_id, service_id)
SELECT st.id, sv.id
FROM public.staff st
JOIN public.services sv ON sv.business_id = st.business_id
WHERE st.business_id = '7c8f0987-88d1-4a87-87a6-68db1573b5b6'
  AND st.is_active IS TRUE
  AND sv.is_active IS TRUE
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- 5. appointments: marcar la duración como bloque estimado
--    (NO se toca booking_range ni el EXCLUDE)
-- ---------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS duration_is_estimate boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_pending        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_method       text    NOT NULL DEFAULT 'cash_in_person';

COMMENT ON COLUMN public.appointments.service_duration IS
  'Bloque de agenda en minutos (booking_block_minutes). No es la duración real prometida.';

-- ---------------------------------------------------------------
-- 6. create_booking: usa booking_block_minutes como bloque de agenda
--    Misma firma, mismas validaciones, mismo anti-solape.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_booking(
  _customer_name    text,
  _phone            text,
  _service_id       uuid,
  _appointment_date date,
  _appointment_time time,
  _email            text DEFAULT NULL,
  _staff_id         uuid DEFAULT NULL,
  _comments         text DEFAULT NULL
)
RETURNS TABLE (
  id               uuid,
  staff_id         uuid,
  staff_name       text,
  service_id       uuid,
  service_name     text,
  service_price    numeric,
  service_duration integer,
  appointment_date date,
  appointment_time time,
  status           text
)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _biz        constant uuid := '7c8f0987-88d1-4a87-87a6-68db1573b5b6';
  _svc        public.services%ROWTYPE;
  _block      integer;
  _tz         text;
  _status     text;
  _slot       integer;
  _start      timestamp;
  _end        timestamp;
  _local_now  timestamp;
  _hours      public.business_hours%ROWTYPE;
  _candidate  record;
  _new_id     uuid;
  _name       text := btrim(coalesce(_customer_name, ''));
  _tel        text := btrim(coalesce(_phone, ''));
  _mail       text := nullif(btrim(lower(coalesce(_email, ''))), '');
BEGIN
  IF _name = '' OR length(_name) > 120 THEN
    RAISE EXCEPTION 'INVALID_CUSTOMER_NAME' USING ERRCODE = 'P0001';
  END IF;
  IF _tel = '' OR length(_tel) > 32 THEN
    RAISE EXCEPTION 'INVALID_PHONE' USING ERRCODE = 'P0001';
  END IF;
  IF _mail IS NOT NULL AND _mail !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'INVALID_EMAIL' USING ERRCODE = 'P0001';
  END IF;
  IF _appointment_date IS NULL OR _appointment_time IS NULL THEN
    RAISE EXCEPTION 'INVALID_SLOT' USING ERRCODE = 'P0001';
  END IF;

  SELECT s.* INTO _svc
  FROM public.services s
  WHERE s.id = _service_id AND s.business_id = _biz AND s.is_active IS TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE' USING ERRCODE = 'P0001';
  END IF;

  -- ÚNICO cambio funcional: el bloque de agenda es booking_block_minutes.
  _block := coalesce(_svc.booking_block_minutes, _svc.duration_minutes, 60);

  SELECT bs.timezone, bs.initial_status, bs.slot_interval
    INTO _tz, _status, _slot
  FROM public.business_settings bs WHERE bs.business_id = _biz;
  _tz := coalesce(_tz, 'Europe/London');
  _status := coalesce(_status, 'confirmed');
  _slot := coalesce(_slot, 30);

  IF EXTRACT(SECOND FROM _appointment_time) <> 0
     OR (EXTRACT(HOUR FROM _appointment_time)::int * 60
         + EXTRACT(MINUTE FROM _appointment_time)::int) % _slot <> 0 THEN
    RAISE EXCEPTION 'INVALID_SLOT_INTERVAL' USING ERRCODE = 'P0001';
  END IF;

  _start := _appointment_date + _appointment_time;
  _end   := _start + make_interval(mins => _block);
  _local_now := (now() AT TIME ZONE _tz);

  IF _start < _local_now THEN
    RAISE EXCEPTION 'SLOT_IN_THE_PAST' USING ERRCODE = 'P0001';
  END IF;

  SELECT bh.* INTO _hours
  FROM public.business_hours bh
  WHERE bh.business_id = _biz
    AND bh.dow = EXTRACT(DOW FROM _appointment_date)::smallint;
  IF NOT FOUND OR _hours.is_closed THEN
    RAISE EXCEPTION 'OUTSIDE_OPENING_HOURS' USING ERRCODE = 'P0001';
  END IF;
  IF _appointment_time < _hours.open_time
     OR _end > (_appointment_date + _hours.close_time) THEN
    RAISE EXCEPTION 'OUTSIDE_OPENING_HOURS' USING ERRCODE = 'P0001';
  END IF;

  IF _staff_id IS NOT NULL THEN
    PERFORM 1
    FROM public.staff st
    JOIN public.staff_services ss ON ss.staff_id = st.id AND ss.service_id = _svc.id
    WHERE st.id = _staff_id AND st.business_id = _biz AND st.is_active IS TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'STAFF_NOT_AVAILABLE' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  FOR _candidate IN
    SELECT st.id AS cid, st.name AS cname
    FROM public.staff st
    JOIN public.staff_services ss ON ss.staff_id = st.id AND ss.service_id = _svc.id
    WHERE st.business_id = _biz
      AND st.is_active IS TRUE
      AND (_staff_id IS NULL OR st.id = _staff_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.staff_id = st.id
          AND a.status IN ('pending', 'confirmed')
          AND a.booking_range && tsrange(_start, _end, '[)')
      )
    ORDER BY (
      SELECT count(*) FROM public.appointments a2
      WHERE a2.staff_id = st.id
        AND a2.appointment_date = _appointment_date
        AND a2.status IN ('pending', 'confirmed')
    ) ASC, st.name ASC, st.id ASC
  LOOP
    BEGIN
      INSERT INTO public.appointments (
        business_id, customer_name, phone, email,
        service_id, service_name, service_price, service_duration,
        staff_id, barber, appointment_date, appointment_time,
        comments, status, duration_is_estimate, price_pending, payment_method
      )
      VALUES (
        _biz, _name, _tel, coalesce(_mail, ''),
        _svc.id, _svc.name, 0, _block,
        _candidate.cid, _candidate.cname, _appointment_date, _appointment_time,
        nullif(btrim(coalesce(_comments, '')), ''), _status,
        _svc.duration_variable, _svc.price_on_consultation, _svc.payment_method
      )
      RETURNING appointments.id INTO _new_id;

      RETURN QUERY
      SELECT _new_id, _candidate.cid, _candidate.cname, _svc.id, _svc.name,
             0::numeric, _block, _appointment_date, _appointment_time, _status;
      RETURN;
    EXCEPTION
      WHEN exclusion_violation THEN
        CONTINUE;
    END;
  END LOOP;

  RAISE EXCEPTION 'BOOKING_SLOT_TAKEN' USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(text, text, uuid, date, time, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(text, text, uuid, date, time, text, uuid, text)
  TO anon, authenticated, service_role;

COMMIT;
