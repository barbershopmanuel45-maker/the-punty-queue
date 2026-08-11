-- =====================================================================
-- 20260812010000_fix_create_booking_ambiguity.sql
-- PATCH: fixes "42702: column reference \"id\" is ambiguous" inside
-- public.create_booking().
--
-- Cause: the function declares RETURNS TABLE (id, staff_id, service_id,
-- service_name, service_price, service_duration, appointment_date,
-- appointment_time, status). Those OUT parameters are PL/pgSQL variables
-- visible in every statement of the body, so any UNQUALIFIED column with
-- the same name (e.g. `WHERE id = _service_id`) is ambiguous.
--
-- Fix: alias every table and qualify every column. Signature, RETURNS
-- TABLE, constraints, grants, RLS, hours and slot logic are unchanged.
-- Run this AFTER 20260812000000_atomic_booking.sql. Do not re-run that file.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.create_booking(
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
  SELECT sv.* INTO _svc
  FROM public.services AS sv
  WHERE sv.id = _service_id
    AND sv.business_id = _biz
    AND sv.is_active IS TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE' USING ERRCODE = 'P0001';
  END IF;

  SELECT bs.timezone, bs.initial_status, bs.slot_interval
    INTO _tz, _status, _slot
  FROM public.business_settings AS bs
  WHERE bs.business_id = _biz;

  _tz := coalesce(_tz, 'Europe/London');
  _status := coalesce(_status, 'confirmed');
  _slot := coalesce(_slot, 30);

  -- The requested time must fall on the slot grid (no seconds, no 10:07).
  IF EXTRACT(SECOND FROM _appointment_time) <> 0
     OR (EXTRACT(HOUR FROM _appointment_time)::int * 60
         + EXTRACT(MINUTE FROM _appointment_time)::int) % _slot <> 0 THEN
    RAISE EXCEPTION 'INVALID_SLOT_INTERVAL' USING ERRCODE = 'P0001';
  END IF;

  _start := _appointment_date + _appointment_time;
  _end   := _start + make_interval(mins => _svc.duration_minutes);
  _local_now := (now() AT TIME ZONE _tz);

  IF _start < _local_now THEN
    RAISE EXCEPTION 'SLOT_IN_THE_PAST' USING ERRCODE = 'P0001';
  END IF;

  -- Opening hours: the whole interval must fit in the same day's window.
  SELECT bh.* INTO _hours
  FROM public.business_hours AS bh
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
    FROM public.staff AS st
    JOIN public.staff_services AS ss
      ON ss.staff_id = st.id AND ss.service_id = _svc.id
    WHERE st.id = _staff_id
      AND st.business_id = _biz
      AND st.is_active IS TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'STAFF_NOT_AVAILABLE' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Candidate list. With an explicit staff member it holds exactly one row;
  -- with "cualquiera" it holds every compatible professional, ordered by
  -- active bookings that day (least loaded first) and then deterministically.
  FOR _candidate IN
    SELECT st.id AS cand_id, st.name AS cand_name
    FROM public.staff AS st
    JOIN public.staff_services AS ss
      ON ss.staff_id = st.id AND ss.service_id = _svc.id
    WHERE st.business_id = _biz
      AND st.is_active IS TRUE
      AND (_staff_id IS NULL OR st.id = _staff_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments AS a
        WHERE a.staff_id = st.id
          AND a.status IN ('pending', 'confirmed')
          AND a.booking_range && tsrange(_start, _end, '[)')
      )
    ORDER BY (
      SELECT count(*) FROM public.appointments AS a2
      WHERE a2.staff_id = st.id
        AND a2.appointment_date = _appointment_date
        AND a2.status IN ('pending', 'confirmed')
    ) ASC, st.name ASC, st.id ASC
  LOOP
    BEGIN
      INSERT INTO public.appointments AS ap (
        business_id, customer_name, phone, email,
        service_id, service_name, service_price, service_duration,
        staff_id, barber, appointment_date, appointment_time,
        comments, status
      )
      VALUES (
        _biz, _name, _tel, coalesce(_mail, ''),
        _svc.id, _svc.name, _svc.price, _svc.duration_minutes,
        _candidate.cand_id, _candidate.cand_name,
        _appointment_date, _appointment_time,
        nullif(btrim(coalesce(_comments, '')), ''), _status
      )
      RETURNING ap.id INTO _new_id;

      RETURN QUERY
      SELECT _new_id, _candidate.cand_id, _candidate.cand_name,
             _svc.id, _svc.name, _svc.price, _svc.duration_minutes,
             _appointment_date, _appointment_time, _status;
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
