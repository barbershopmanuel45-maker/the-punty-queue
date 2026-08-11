-- =====================================================================
-- PROPUESTA FINAL (NO EJECUTADA) — Brightobarber
-- 20260813000000_variable_pricing_and_consultations.sql
--
-- 1) services: precio a consultar + duración variable + pago en efectivo
-- 2) booking_block_minutes como bloque interno de agenda
-- 3) catálogo final de 8 servicios (Manicura off, Color intacto)
-- 4) staff real: 1 peluquera + 2 barberos (sin UUIDs hardcodeados)
-- 5) consultation_requests + RPCs de negociación (agente IA)
--
-- Idempotente. No destructivo. No borra appointments.
-- Requiere: 20260811000000_init_salon_backend.sql,
--           20260812000000_atomic_booking.sql,
--           20260812010000_fix_create_booking_ambiguity.sql
-- =====================================================================

BEGIN;

-- Un único punto con el business_id (no se hardcodea en cada sentencia).
CREATE OR REPLACE FUNCTION public.current_business_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT bs.business_id FROM public.business_settings bs LIMIT 1;
$$;

-- =====================================================================
-- 1. public.services
-- =====================================================================
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS price_on_consultation  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duration_variable      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_method         text    NOT NULL DEFAULT 'cash_in_person',
  ADD COLUMN IF NOT EXISTS booking_block_minutes  integer;

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_payment_method_check;
ALTER TABLE public.services ADD CONSTRAINT services_payment_method_check
  CHECK (payment_method IN ('cash_in_person'));

UPDATE public.services
SET booking_block_minutes = COALESCE(booking_block_minutes, duration_minutes, 60)
WHERE booking_block_minutes IS NULL;

ALTER TABLE public.services ALTER COLUMN booking_block_minutes SET DEFAULT 60;
ALTER TABLE public.services ALTER COLUMN booking_block_minutes SET NOT NULL;
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_booking_block_positive;
ALTER TABLE public.services ADD CONSTRAINT services_booking_block_positive
  CHECK (booking_block_minutes > 0);

COMMENT ON COLUMN public.services.price IS
  'LEGACY/interno. Nunca mostrar: price_on_consultation = true.';
COMMENT ON COLUMN public.services.duration_minutes IS
  'LEGACY/interno. Nunca mostrar. La agenda usa booking_block_minutes.';
COMMENT ON COLUMN public.services.booking_block_minutes IS
  'SOLO agenda: minutos bloqueados para evitar solapes. NO es duración prometida.';

-- ---------------------------------------------------------------
-- 1b. Catálogo final. cut_styling se renombra (conserva UUID e historial).
--     Denominación INCLUSIVA: "Corte de cabello" / "Haircut" (Brighto atiende
--     caballeros y también señoras según el tipo de corte).
-- ---------------------------------------------------------------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS description_es text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS name_en text;

UPDATE public.services
SET slug = 'haircut',
    name = 'Corte de cabello',
    name_en = 'Haircut',
    category = 'barber',
    is_active = true,
    description_es = 'Corte de cabello realizado por Brighto. Servicio disponible para caballeros y también para señoras según el tipo de corte solicitado.',
    description_en = 'Haircut by Brighto. Available for men and also for women depending on the requested haircut style.'
WHERE business_id = public.current_business_id() AND slug IN ('cut_styling', 'mens_haircut');

INSERT INTO public.services
  (business_id, slug, name, name_en, category, price, duration_minutes,
   booking_block_minutes, price_on_consultation, duration_variable, payment_method, is_active)
VALUES
  (public.current_business_id(),'cornrows',         'Trenzas pegadas',         'Cornrows',           'braids', 0, 180, 180, true, true, 'cash_in_person', true),
  (public.current_business_id(),'individual_braids','Trenza individual',       'Individual braids',  'braids', 0, 180, 180, true, true, 'cash_in_person', true),
  (public.current_business_id(),'knotless_braids',  'Trenza sin nudo',         'Knotless braids',    'braids', 0, 180, 180, true, true, 'cash_in_person', true),
  (public.current_business_id(),'micro_twists',     'Micro-twist',             'Micro twists',       'braids', 0, 180, 180, true, true, 'cash_in_person', true),
  (public.current_business_id(),'natural_twists',   'Twist en cabello natural','Natural hair twists','braids', 0, 180, 180, true, true, 'cash_in_person', true),
  (public.current_business_id(),'crochet_braids',   'Crochet braids',          'Crochet braids',     'braids', 0, 180, 180, true, true, 'cash_in_person', true),
  (public.current_business_id(),'wash_blowdry',     'Lavado y secado',         'Wash and blow-dry',  'hair',   0, 120, 120, true, true, 'cash_in_person', true)
ON CONFLICT (business_id, slug) DO UPDATE
SET name = EXCLUDED.name, name_en = EXCLUDED.name_en,
    category = EXCLUDED.category, is_active = true;

-- Bloques internos EXACTOS confirmados por el negocio.
UPDATE public.services s SET booking_block_minutes = v.mins
FROM (VALUES
  ('haircut',60),('cornrows',180),('individual_braids',180),
  ('knotless_braids',180),('micro_twists',180),('natural_twists',180),
  ('crochet_braids',180),('wash_blowdry',120)
) AS v(slug, mins)
WHERE s.business_id = public.current_business_id() AND s.slug = v.slug;

-- Modo comercial SOLO para el catálogo confirmado (Color queda intacto).
UPDATE public.services
SET price_on_consultation = true, duration_variable = true,
    payment_method = 'cash_in_person'
WHERE business_id = public.current_business_id()
  AND slug IN ('haircut','cornrows','individual_braids','knotless_braids',
               'micro_twists','natural_twists','crochet_braids','wash_blowdry');

-- Manicura: retirada NO destructiva. Color NO se toca.
UPDATE public.services
SET is_active = false
WHERE business_id = public.current_business_id() AND slug = 'manicure';


-- =====================================================================
-- 2. Personal real: Brighto (barbero) + Dorra (peluquera)
--    Auditoría previa (solo lectura) del NUEVO Supabase:
--      pro_1 793b45a8-… -> tiene la ÚNICA cita existente (12/08/2026 10:30,
--                          servicio cut_styling, 60 min) => es Brighto.
--      pro_2 fa8c2f79-… -> placeholder sembrado, sin citas => se reutiliza
--                          para Dorra (misma fila, mismo UUID, sin DELETE).
--    Ningún UUID se escribe a mano ni se cambia. Ninguna cita se reasigna.
-- =====================================================================
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'barber';
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE public.staff ADD CONSTRAINT staff_role_check
  CHECK (role IN ('barber', 'hairdresser'));

-- Brighto: conserva el UUID de pro_1 y su historial de citas.
UPDATE public.staff
SET slug = 'brighto', name = 'Brighto', role = 'barber', is_active = true
WHERE business_id = public.current_business_id() AND slug = 'pro_1';

-- Dorra: reutiliza la fila placeholder pro_2 (sin citas). Si esa fila ya no
-- existiera, se crea una nueva con gen_random_uuid() (default de la tabla).
UPDATE public.staff
SET slug = 'dorra', name = 'Dorra', role = 'hairdresser', is_active = true
WHERE business_id = public.current_business_id() AND slug = 'pro_2';

INSERT INTO public.staff (business_id, slug, name, role, is_active)
SELECT public.current_business_id(), 'dorra', 'Dorra', 'hairdresser', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.staff
  WHERE business_id = public.current_business_id() AND slug = 'dorra'
);

-- ---------------------------------------------------------------
-- 2b. staff_services: matriz EXACTA confirmada por el negocio.
--     Dorra   -> cornrows, individual_braids, knotless_braids, micro_twists,
--                natural_twists, crochet_braids, wash_blowdry
--     Brighto -> haircut
--     Sin inferencias por categoría ni por "servicio activo".
-- ---------------------------------------------------------------
INSERT INTO public.staff_services (staff_id, service_id)
SELECT st.id, sv.id
FROM public.staff st
JOIN public.services sv
  ON sv.business_id = st.business_id
 AND (
      (st.slug = 'dorra'   AND sv.slug IN ('cornrows','individual_braids','knotless_braids',
                                           'micro_twists','natural_twists','crochet_braids',
                                           'wash_blowdry'))
   OR (st.slug = 'brighto' AND sv.slug = 'haircut')
     )
WHERE st.business_id = public.current_business_id()
ON CONFLICT DO NOTHING;

-- Brighto no ofrece peluquería: se retira SOLO esa relación heredada del seed.
DELETE FROM public.staff_services ss
USING public.staff st, public.services sv
WHERE ss.staff_id = st.id AND ss.service_id = sv.id
  AND st.slug = 'brighto'
  AND sv.slug <> 'haircut'
  AND sv.slug <> 'color';   -- Color CONGELADO: sus relaciones no se tocan.

-- Dorra: se retiran relaciones heredadas fuera de su matriz confirmada
-- (excepto Color, congelado hasta confirmación del negocio).
DELETE FROM public.staff_services ss
USING public.staff st, public.services sv
WHERE ss.staff_id = st.id AND ss.service_id = sv.id
  AND st.slug = 'dorra'
  AND sv.slug NOT IN ('cornrows','individual_braids','knotless_braids',
                      'micro_twists','natural_twists','crochet_braids',
                      'wash_blowdry','color');

-- Manicura (inactiva) fuera de la matriz de competencias. No DELETE de citas.
DELETE FROM public.staff_services ss
USING public.services sv
WHERE ss.service_id = sv.id
  AND sv.business_id = public.current_business_id()
  AND sv.slug = 'manicure';

-- =====================================================================
-- 3. appointments: metadatos comerciales. booking_range y EXCLUDE intactos.
-- =====================================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS duration_is_estimate boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_pending        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS agreed_price         numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_method       text    NOT NULL DEFAULT 'cash_in_person';

COMMENT ON COLUMN public.appointments.service_duration IS
  'Bloque de agenda (booking_block_minutes). No es la duración real prometida.';

-- =====================================================================
-- 4. create_booking: mismo contrato, el bloque sale de booking_block_minutes
-- =====================================================================
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
  id uuid, staff_id uuid, staff_name text, service_id uuid, service_name text,
  service_price numeric, service_duration integer,
  appointment_date date, appointment_time time, status text
)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _biz        uuid := public.current_business_id();
  _svc        public.services%ROWTYPE;
  _block      integer;
  _tz text; _status text; _slot integer;
  _start timestamp; _end timestamp; _local_now timestamp;
  _hours public.business_hours%ROWTYPE;
  _candidate record; _new_id uuid;
  _name text := btrim(coalesce(_customer_name, ''));
  _tel  text := btrim(coalesce(_phone, ''));
  _mail text := nullif(btrim(lower(coalesce(_email, ''))), '');
BEGIN
  IF _name = '' OR length(_name) > 120 THEN
    RAISE EXCEPTION 'INVALID_CUSTOMER_NAME' USING ERRCODE = 'P0001'; END IF;
  IF _tel = '' OR length(_tel) > 32 THEN
    RAISE EXCEPTION 'INVALID_PHONE' USING ERRCODE = 'P0001'; END IF;
  IF _mail IS NOT NULL AND _mail !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'INVALID_EMAIL' USING ERRCODE = 'P0001'; END IF;
  IF _appointment_date IS NULL OR _appointment_time IS NULL THEN
    RAISE EXCEPTION 'INVALID_SLOT' USING ERRCODE = 'P0001'; END IF;

  SELECT s.* INTO _svc FROM public.services s
  WHERE s.id = _service_id AND s.business_id = _biz AND s.is_active IS TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE' USING ERRCODE = 'P0001'; END IF;

  -- ÚNICO cambio funcional respecto a la versión actual.
  _block := coalesce(_svc.booking_block_minutes, _svc.duration_minutes, 60);

  SELECT bs.timezone, bs.initial_status, bs.slot_interval
    INTO _tz, _status, _slot
  FROM public.business_settings bs WHERE bs.business_id = _biz;
  _tz := coalesce(_tz,'Europe/London');
  _status := coalesce(_status,'confirmed');
  _slot := coalesce(_slot,30);

  IF EXTRACT(SECOND FROM _appointment_time) <> 0
     OR (EXTRACT(HOUR FROM _appointment_time)::int * 60
         + EXTRACT(MINUTE FROM _appointment_time)::int) % _slot <> 0 THEN
    RAISE EXCEPTION 'INVALID_SLOT_INTERVAL' USING ERRCODE = 'P0001'; END IF;

  _start := _appointment_date + _appointment_time;
  _end   := _start + make_interval(mins => _block);
  _local_now := (now() AT TIME ZONE _tz);
  IF _start < _local_now THEN
    RAISE EXCEPTION 'SLOT_IN_THE_PAST' USING ERRCODE = 'P0001'; END IF;

  SELECT bh.* INTO _hours FROM public.business_hours bh
  WHERE bh.business_id = _biz
    AND bh.dow = EXTRACT(DOW FROM _appointment_date)::smallint;
  IF NOT FOUND OR _hours.is_closed THEN
    RAISE EXCEPTION 'OUTSIDE_OPENING_HOURS' USING ERRCODE = 'P0001'; END IF;
  IF _appointment_time < _hours.open_time
     OR _end > (_appointment_date + _hours.close_time) THEN
    RAISE EXCEPTION 'OUTSIDE_OPENING_HOURS' USING ERRCODE = 'P0001'; END IF;

  IF _staff_id IS NOT NULL THEN
    PERFORM 1 FROM public.staff st
    JOIN public.staff_services ss ON ss.staff_id = st.id AND ss.service_id = _svc.id
    WHERE st.id = _staff_id AND st.business_id = _biz AND st.is_active IS TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'STAFF_NOT_AVAILABLE' USING ERRCODE = 'P0001'; END IF;
  END IF;

  FOR _candidate IN
    SELECT st.id AS cid, st.name AS cname
    FROM public.staff st
    JOIN public.staff_services ss ON ss.staff_id = st.id AND ss.service_id = _svc.id
    WHERE st.business_id = _biz AND st.is_active IS TRUE
      AND (_staff_id IS NULL OR st.id = _staff_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.staff_id = st.id AND a.status IN ('pending','confirmed')
          AND a.booking_range && tsrange(_start, _end, '[)'))
    ORDER BY (
      SELECT count(*) FROM public.appointments a2
      WHERE a2.staff_id = st.id AND a2.appointment_date = _appointment_date
        AND a2.status IN ('pending','confirmed')) ASC, st.name ASC, st.id ASC
  LOOP
    BEGIN
      INSERT INTO public.appointments (
        business_id, customer_name, phone, email,
        service_id, service_name, service_price, service_duration,
        staff_id, barber, appointment_date, appointment_time,
        comments, status, duration_is_estimate, price_pending, payment_method)
      VALUES (
        _biz, _name, _tel, coalesce(_mail,''),
        _svc.id, _svc.name, 0, _block,
        _candidate.cid, _candidate.cname, _appointment_date, _appointment_time,
        nullif(btrim(coalesce(_comments,'')),''), _status,
        _svc.duration_variable, _svc.price_on_consultation, _svc.payment_method)
      RETURNING appointments.id INTO _new_id;

      RETURN QUERY SELECT _new_id, _candidate.cid, _candidate.cname, _svc.id,
        _svc.name, 0::numeric, _block, _appointment_date, _appointment_time, _status;
      RETURN;
    EXCEPTION WHEN exclusion_violation THEN CONTINUE;
    END;
  END LOOP;

  RAISE EXCEPTION 'BOOKING_SLOT_TAKEN' USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(text,text,uuid,date,time,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(text,text,uuid,date,time,text,uuid,text)
  TO anon, authenticated, service_role;

-- =====================================================================
-- 5. consultation_requests: negociación de precio/horario (agente IA)
--    NO bloquea la agenda. Solo la profesional convierte a reserva.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.consultation_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL,
  service_id          uuid REFERENCES public.services(id) ON DELETE SET NULL,
  customer_name       text NOT NULL,
  phone               text NOT NULL,
  email               text,
  preferred_date      date NOT NULL,
  preferred_time      time NOT NULL,
  alt_date            date,
  alt_time            time,
  proposed_price      numeric(10,2) CHECK (proposed_price IS NULL OR proposed_price >= 0),
  wants_pro_quote     boolean NOT NULL DEFAULT true,
  hair_notes          text,
  comments            text,
  source              text NOT NULL DEFAULT 'ai_agent'
                      CHECK (source IN ('ai_agent','web_form','staff')),
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','counter_offered','accepted','declined','converted','cancelled','expired')),
  -- Respuesta de la profesional
  quoted_price        numeric(10,2) CHECK (quoted_price IS NULL OR quoted_price >= 0),
  counter_date        date,
  counter_time        time,
  assigned_staff_id   uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  staff_notes         text,
  responded_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at        timestamptz,
  -- Resultado
  appointment_id      uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (length(btrim(customer_name)) BETWEEN 1 AND 120),
  CHECK (length(btrim(phone)) BETWEEN 1 AND 32),
  CHECK (email IS NULL OR email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

CREATE INDEX IF NOT EXISTS idx_consult_status
  ON public.consultation_requests (business_id, status, preferred_date);

DROP TRIGGER IF EXISTS trg_consult_updated_at ON public.consultation_requests;
CREATE TRIGGER trg_consult_updated_at
BEFORE UPDATE ON public.consultation_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --- Grants + RLS: el público NUNCA lee ni escribe la tabla directamente.
GRANT SELECT, UPDATE ON public.consultation_requests TO authenticated;
GRANT ALL ON public.consultation_requests TO service_role;
-- anon: sin ningún privilegio de tabla. Entra solo por la RPC SECURITY DEFINER.

ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read consultations" ON public.consultation_requests;
CREATE POLICY "Staff read consultations"
ON public.consultation_requests FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff update consultations" ON public.consultation_requests;
CREATE POLICY "Staff update consultations"
ON public.consultation_requests FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins manage consultations" ON public.consultation_requests;
CREATE POLICY "Admins manage consultations"
ON public.consultation_requests FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
-- Sin política de INSERT para anon/authenticated: solo la RPC inserta.

-- ---------------------------------------------------------------
-- 5b. RPC pública: crear solicitud (NO crea cita, NO bloquea agenda)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_consultation(
  _customer_name   text,
  _phone           text,
  _service_id      uuid,
  _preferred_date  date,
  _preferred_time  time,
  _alt_date        date    DEFAULT NULL,
  _alt_time        time    DEFAULT NULL,
  _proposed_price  numeric DEFAULT NULL,
  _wants_pro_quote boolean DEFAULT true,
  _email           text    DEFAULT NULL,
  _hair_notes      text    DEFAULT NULL,
  _comments        text    DEFAULT NULL
)
RETURNS TABLE (id uuid, status text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _biz  uuid := public.current_business_id();
  _svc  public.services%ROWTYPE;
  _tz   text;
  _name text := btrim(coalesce(_customer_name,''));
  _tel  text := btrim(coalesce(_phone,''));
  _mail text := nullif(btrim(lower(coalesce(_email,''))),'');
  _new  uuid;
BEGIN
  IF _name = '' OR length(_name) > 120 THEN
    RAISE EXCEPTION 'INVALID_CUSTOMER_NAME' USING ERRCODE='P0001'; END IF;
  IF _tel = '' OR length(_tel) > 32 THEN
    RAISE EXCEPTION 'INVALID_PHONE' USING ERRCODE='P0001'; END IF;
  IF _mail IS NOT NULL AND _mail !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'INVALID_EMAIL' USING ERRCODE='P0001'; END IF;

  SELECT s.* INTO _svc FROM public.services s
  WHERE s.id = _service_id AND s.business_id = _biz AND s.is_active IS TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE' USING ERRCODE='P0001'; END IF;

  SELECT bs.timezone INTO _tz FROM public.business_settings bs WHERE bs.business_id = _biz;
  IF (_preferred_date + _preferred_time) < (now() AT TIME ZONE coalesce(_tz,'Europe/London')) THEN
    RAISE EXCEPTION 'SLOT_IN_THE_PAST' USING ERRCODE='P0001'; END IF;

  -- Anti-spam básico: máx. 3 solicitudes pendientes por teléfono.
  IF (SELECT count(*) FROM public.consultation_requests c
      WHERE c.phone = _tel AND c.status IN ('pending','counter_offered')) >= 3 THEN
    RAISE EXCEPTION 'TOO_MANY_PENDING_REQUESTS' USING ERRCODE='P0001'; END IF;

  INSERT INTO public.consultation_requests (
    business_id, service_id, customer_name, phone, email,
    preferred_date, preferred_time, alt_date, alt_time,
    proposed_price, wants_pro_quote, hair_notes, comments, source, status)
  VALUES (
    _biz, _svc.id, _name, _tel, _mail,
    _preferred_date, _preferred_time, _alt_date, _alt_time,
    CASE WHEN _wants_pro_quote THEN NULL ELSE _proposed_price END,
    _wants_pro_quote,
    nullif(btrim(coalesce(_hair_notes,'')),''),
    nullif(btrim(coalesce(_comments,'')),''),
    'ai_agent', 'pending')
  RETURNING consultation_requests.id INTO _new;

  RETURN QUERY SELECT _new, 'pending'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.request_consultation(text,text,uuid,date,time,date,time,numeric,boolean,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_consultation(text,text,uuid,date,time,date,time,numeric,boolean,text,text,text)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- 5c. Contraoferta / rechazo (solo staff autenticado)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.counter_offer_consultation(
  _request_id uuid, _quoted_price numeric DEFAULT NULL,
  _counter_date date DEFAULT NULL, _counter_time time DEFAULT NULL,
  _staff_id uuid DEFAULT NULL, _staff_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE='P0001'; END IF;

  UPDATE public.consultation_requests c
  SET quoted_price = coalesce(_quoted_price, c.quoted_price),
      counter_date = coalesce(_counter_date, c.counter_date),
      counter_time = coalesce(_counter_time, c.counter_time),
      assigned_staff_id = coalesce(_staff_id, c.assigned_staff_id),
      staff_notes = coalesce(_staff_notes, c.staff_notes),
      status = 'counter_offered',
      responded_by = auth.uid(), responded_at = now()
  WHERE c.id = _request_id AND c.status IN ('pending','counter_offered');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_OPEN' USING ERRCODE='P0001'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_consultation(
  _request_id uuid, _staff_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE='P0001'; END IF;

  UPDATE public.consultation_requests c
  SET status = 'declined', staff_notes = coalesce(_staff_notes, c.staff_notes),
      responded_by = auth.uid(), responded_at = now()
  WHERE c.id = _request_id AND c.status IN ('pending','counter_offered');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_OPEN' USING ERRCODE='P0001'; END IF;
END;
$$;

-- ---------------------------------------------------------------
-- 5d. Aceptar => crea la reserva SIEMPRE vía create_booking
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_consultation(
  _request_id    uuid,
  _final_date    date    DEFAULT NULL,
  _final_time    time    DEFAULT NULL,
  _staff_id      uuid    DEFAULT NULL,
  _agreed_price  numeric DEFAULT NULL)
RETURNS TABLE (appointment_id uuid, staff_id uuid, staff_name text,
               appointment_date date, appointment_time time, status text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _req  public.consultation_requests%ROWTYPE;
  _date date; _time time; _staff uuid; _b record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE='P0001'; END IF;

  SELECT c.* INTO _req FROM public.consultation_requests c
  WHERE c.id = _request_id AND c.status IN ('pending','counter_offered')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_OPEN' USING ERRCODE='P0001'; END IF;

  _date  := coalesce(_final_date, _req.counter_date, _req.preferred_date);
  _time  := coalesce(_final_time, _req.counter_time, _req.preferred_time);
  _staff := coalesce(_staff_id, _req.assigned_staff_id);

  -- Única vía de creación: TODAS las validaciones y el EXCLUDE anti-solape
  -- se ejecutan aquí. Si el hueco está ocupado, esto lanza BOOKING_SLOT_TAKEN
  -- y la transacción entera revierte: la solicitud sigue abierta.
  SELECT * INTO _b FROM public.create_booking(
    _req.customer_name, _req.phone, _req.service_id, _date, _time,
    _req.email, _staff,
    nullif(concat_ws(' | ', _req.comments, _req.hair_notes), ''));

  UPDATE public.appointments a
  SET agreed_price = coalesce(_agreed_price, _req.quoted_price),
      price_pending = (coalesce(_agreed_price, _req.quoted_price) IS NULL)
  WHERE a.id = _b.id;

  UPDATE public.consultation_requests c
  SET status = 'converted', appointment_id = _b.id,
      quoted_price = coalesce(_agreed_price, c.quoted_price),
      assigned_staff_id = _b.staff_id,
      counter_date = _date, counter_time = _time,
      responded_by = auth.uid(), responded_at = now()
  WHERE c.id = _request_id;

  RETURN QUERY SELECT _b.id, _b.staff_id, _b.staff_name, _b.appointment_date,
                      _b.appointment_time, _b.status;
END;
$$;

REVOKE ALL ON FUNCTION public.counter_offer_consultation(uuid,numeric,date,time,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decline_consultation(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_consultation(uuid,date,time,uuid,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.counter_offer_consultation(uuid,numeric,date,time,uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_consultation(uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_consultation(uuid,date,time,uuid,numeric) TO authenticated, service_role;

COMMIT;
