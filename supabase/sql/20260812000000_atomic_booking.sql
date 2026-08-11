-- =====================================================================
-- 20260812000000_atomic_booking.sql
-- Phase 3: atomic booking engine.
-- Run AFTER 20260811000000_init_salon_backend.sql on the NEW project.
-- Never run against the old JuniorFADEfactory project.
--
-- DESIGN NOTES
-- * business_id is uuid everywhere (appointments already uses uuid in the
--   init script). Keeping services/staff on the same type avoids casts in
--   the EXCLUDE constraint and in every join.
-- * Times are stored as local wall-clock date + time of the salon (no tz),
--   which is what the app has always used and what a salon agenda means
--   ("14:00 in the shop"). Therefore the booking interval is a `tsrange`
--   (timestamp WITHOUT time zone). No UTC conversion is applied to stored
--   values; only "is it in the past?" converts now() into the business
--   timezone stored in business_settings.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------
-- 0. Business constants
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_settings (
  business_id     uuid PRIMARY KEY,
  timezone        text NOT NULL DEFAULT 'Europe/London',
  slot_interval   integer NOT NULL DEFAULT 30 CHECK (slot_interval > 0),
  initial_status  text NOT NULL DEFAULT 'confirmed'
                  CHECK (initial_status IN ('pending', 'confirmed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.business_settings (business_id, timezone)
VALUES ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 'Europe/London')
ON CONFLICT (business_id) DO NOTHING;

-- Opening hours live in the DB (option B, minimal) so the booking RPC and
-- the frontend cannot drift apart. dow: 0 = Sunday .. 6 = Saturday.
CREATE TABLE IF NOT EXISTS public.business_hours (
  business_id uuid NOT NULL,
  dow         smallint NOT NULL CHECK (dow BETWEEN 0 AND 6),
  open_time   time NOT NULL,
  close_time  time NOT NULL,
  is_closed   boolean NOT NULL DEFAULT false,
  PRIMARY KEY (business_id, dow),
  CHECK (close_time > open_time)
);

-- Brightobarber: lunes a domingo, 10:00–22:00.
INSERT INTO public.business_hours (business_id, dow, open_time, close_time, is_closed)
VALUES
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 0, '10:00', '22:00', false),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 1, '10:00', '22:00', false),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 2, '10:00', '22:00', false),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 3, '10:00', '22:00', false),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 4, '10:00', '22:00', false),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 5, '10:00', '22:00', false),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 6, '10:00', '22:00', false)
ON CONFLICT (business_id, dow) DO UPDATE
SET open_time  = EXCLUDED.open_time,
    close_time = EXCLUDED.close_time,
    is_closed  = EXCLUDED.is_closed;

-- business_settings holds internal configuration (timezone, initial status,
-- slot interval). The public site never reads it: the RPC does. Keep it
-- staff-only. business_hours IS public: the booking UI must show the window.
GRANT SELECT ON public.business_settings TO authenticated;
GRANT SELECT ON public.business_hours TO anon, authenticated;
GRANT ALL ON public.business_settings TO service_role;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read settings" ON public.business_settings;
DROP POLICY IF EXISTS "Staff read settings" ON public.business_settings;
CREATE POLICY "Staff read settings"
ON public.business_settings FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins manage settings" ON public.business_settings;
CREATE POLICY "Admins manage settings"
ON public.business_settings FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read hours" ON public.business_hours;
CREATE POLICY "Public read hours"
ON public.business_hours FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage hours" ON public.business_hours;
CREATE POLICY "Admins manage hours"
ON public.business_hours FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_business_settings_updated_at ON public.business_settings;
CREATE TRIGGER trg_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------
-- 1. services (authoritative price + duration)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid NOT NULL,
  slug             text NOT NULL,
  name             text NOT NULL,
  category         text,
  price            numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_services_business_active
  ON public.services (business_id, is_active);

DROP TRIGGER IF EXISTS trg_services_updated_at ON public.services;
CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.services (business_id, slug, name, category, price, duration_minutes)
VALUES
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 'cut_styling', 'Corte y peinado', 'hair',   35, 60),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 'color',       'Color',           'hair',   65, 120),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 'manicure',    'Manicura',        'beauty', 30, 60)
ON CONFLICT (business_id, slug) DO NOTHING;

-- ---------------------------------------------------------------
-- 2. staff
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  slug        text NOT NULL,
  name        text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_staff_business_active
  ON public.staff (business_id, is_active);

DROP TRIGGER IF EXISTS trg_staff_updated_at ON public.staff;
CREATE TRIGGER trg_staff_updated_at
BEFORE UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.staff (business_id, slug, name)
VALUES
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 'pro_1', 'Profesional 1'),
  ('7c8f0987-88d1-4a87-87a6-68db1573b5b6', 'pro_2', 'Profesional 2')
ON CONFLICT (business_id, slug) DO NOTHING;

-- ---------------------------------------------------------------
-- 3. staff_services
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_services (
  staff_id   uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_services_service
  ON public.staff_services (service_id);

-- Placeholder catalogue: every professional performs every service.
INSERT INTO public.staff_services (staff_id, service_id)
SELECT st.id, sv.id
FROM public.staff st
CROSS JOIN public.services sv
WHERE st.business_id = sv.business_id
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- 4. RLS for catalogue tables
-- ---------------------------------------------------------------
GRANT SELECT ON public.services, public.staff, public.staff_services TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services, public.staff, public.staff_services TO authenticated;
GRANT ALL ON public.services, public.staff, public.staff_services TO service_role;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active services" ON public.services;
CREATE POLICY "Public read active services"
ON public.services FOR SELECT TO anon, authenticated USING (is_active IS TRUE);

DROP POLICY IF EXISTS "Staff read all services" ON public.services;
CREATE POLICY "Staff read all services"
ON public.services FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins manage services" ON public.services;
CREATE POLICY "Admins manage services"
ON public.services FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read active staff" ON public.staff;
CREATE POLICY "Public read active staff"
ON public.staff FOR SELECT TO anon, authenticated USING (is_active IS TRUE);

DROP POLICY IF EXISTS "Staff read all staff" ON public.staff;
CREATE POLICY "Staff read all staff"
ON public.staff FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins manage staff" ON public.staff;
CREATE POLICY "Admins manage staff"
ON public.staff FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read staff services" ON public.staff_services;
CREATE POLICY "Public read staff services"
ON public.staff_services FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage staff services" ON public.staff_services;
CREATE POLICY "Admins manage staff services"
ON public.staff_services FOR ALL TO authenticated
USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------
-- 5. appointments: real identity + booking interval
-- ---------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS staff_id   uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

-- [start, end) built from LOCAL date + time and the snapshot duration, which
-- only the RPC (or an admin) can write. Adjacent bookings 14:00-15:00 and
-- 15:00-16:00 do not overlap.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS booking_range tsrange
  GENERATED ALWAYS AS (
    tsrange(
      (appointment_date + appointment_time),
      (appointment_date + appointment_time) + make_interval(mins => service_duration),
      '[)'
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_appointments_staff_range
  ON public.appointments USING gist (staff_id, booking_range)
  WHERE status IN ('pending', 'confirmed');

-- Final anti-overlap guarantee. Only blocking statuses participate, so
-- 'cancelled' and 'completed' free the slot. Different staff never collide.
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    business_id WITH =,
    staff_id WITH =,
    booking_range WITH &&
  ) WHERE (status IN ('pending', 'confirmed') AND staff_id IS NOT NULL);

-- ---------------------------------------------------------------
-- 6. Remove the public direct-INSERT path (RPC is the only public way in)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
REVOKE INSERT ON public.appointments FROM anon;
REVOKE INSERT ON public.appointments FROM authenticated;

GRANT INSERT ON public.appointments TO authenticated;
DROP POLICY IF EXISTS "Staff create appointments" ON public.appointments;
CREATE POLICY "Staff create appointments"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------
-- 7. create_booking: the only public way to create an appointment
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_booking(text, text, uuid, date, time, text, uuid, text);
CREATE FUNCTION public.create_booking(
  _customer_name    text,
  _phone            text,
  _service_id       uuid,
  _appointment_date date,
  _appointment_time time,
  _email            text DEFAULT NULL,
  _staff_id         uuid DEFAULT NULL,   -- NULL = "cualquiera"
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
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _biz        constant uuid := '7c8f0987-88d1-4a87-87a6-68db1573b5b6';
  _svc        public.services%ROWTYPE;
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

  -- Authoritative service data. Price/duration/name from the client are ignored.
  SELECT * INTO _svc
  FROM public.services
  WHERE id = _service_id AND business_id = _biz AND is_active IS TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE' USING ERRCODE = 'P0001';
  END IF;

  SELECT timezone, initial_status INTO _tz, _status
  FROM public.business_settings WHERE business_id = _biz;

  _tz := coalesce(_tz, 'Europe/London');
  _status := coalesce(_status, 'confirmed');

  _start := _appointment_date + _appointment_time;
  _end   := _start + make_interval(mins => _svc.duration_minutes);
  _local_now := (now() AT TIME ZONE _tz);

  IF _start < _local_now THEN
    RAISE EXCEPTION 'SLOT_IN_THE_PAST' USING ERRCODE = 'P0001';
  END IF;

  -- Opening hours: the whole interval must fit in the same day's window.
  SELECT * INTO _hours
  FROM public.business_hours
  WHERE business_id = _biz
    AND dow = EXTRACT(DOW FROM _appointment_date)::smallint;

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

  -- Candidate list. With an explicit staff member it holds exactly one row;
  -- with "cualquiera" it holds every compatible professional, ordered by
  -- active bookings that day (least loaded first) and then deterministically.
  FOR _candidate IN
    SELECT st.id, st.name
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
        comments, status
      )
      VALUES (
        _biz, _name, _tel, coalesce(_mail, ''),
        _svc.id, _svc.name, _svc.price, _svc.duration_minutes,
        _candidate.id, _candidate.name, _appointment_date, _appointment_time,
        nullif(btrim(coalesce(_comments, '')), ''), _status
      )
      RETURNING appointments.id INTO _new_id;

      RETURN QUERY
      SELECT _new_id, _candidate.id, _candidate.name, _svc.id, _svc.name,
             _svc.price, _svc.duration_minutes, _appointment_date,
             _appointment_time, _status;
      RETURN;
    EXCEPTION
      WHEN exclusion_violation THEN     -- SQLSTATE 23P01
        -- Someone booked this professional a moment ago: try the next one.
        CONTINUE;
    END;
  END LOOP;

  RAISE EXCEPTION 'BOOKING_SLOT_TAKEN' USING ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(text, text, uuid, date, time, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(text, text, uuid, date, time, text, uuid, text)
  TO anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- 8. Availability RPC: id-based, still PII free
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_booking_slots(text);
CREATE FUNCTION public.get_public_booking_slots(_business_id text DEFAULT NULL)
RETURNS TABLE (
  staff_id         uuid,
  barber           text,
  appointment_date text,
  appointment_time text,
  service_duration integer,
  status           text,
  business_id      text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.staff_id,
    a.barber::text,
    a.appointment_date::text,
    to_char(a.appointment_time, 'HH24:MI')::text,
    a.service_duration::integer,
    a.status::text,
    a.business_id::text
  FROM public.appointments a
  WHERE a.status IN ('pending', 'confirmed')
    AND a.appointment_date >= CURRENT_DATE
    AND (_business_id IS NULL OR a.business_id::text = _business_id);
$$;

REVOKE ALL ON FUNCTION public.get_public_booking_slots(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_slots(text)
  TO anon, authenticated, service_role;
