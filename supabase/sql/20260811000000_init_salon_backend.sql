-- =====================================================================
-- 20260811000000_init_salon_backend.sql
-- Initial schema for the NEW, independent salon Supabase project.
-- Run manually (SQL Editor) on an EMPTY project.
-- Do NOT run this on the JuniorFADEfactory project.
-- Self-contained: no data, IDs or references from any previous project.
-- =====================================================================

-- ---------------------------------------------------------------
-- 0. PREFLIGHT GUARD
--    CREATE TABLE IF NOT EXISTS only checks pg_class by NAME, so a VIEW,
--    MATERIALIZED VIEW, FOREIGN TABLE or SEQUENCE with one of our names is
--    silently "skipped" and the script keeps going until CREATE INDEX /
--    ALTER TABLE fails with a confusing 42809. Fail loudly and early instead.
-- ---------------------------------------------------------------
DO $$
DECLARE
  r record;
  bad text[] := '{}';
BEGIN
  FOR r IN
    SELECT c.relname, c.relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'profiles', 'user_roles', 'appointments',
        'walkins', 'reminders', 'reviews'
      )
      AND c.relkind <> 'r'
  LOOP
    bad := bad || format('%s (relkind=%s)', r.relname, r.relkind);
  END LOOP;

  IF array_length(bad, 1) > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: public.% already exists but is NOT a regular table. Offenders: %. Drop or rename these relations first (see supabase/sql/00_repair_user_roles.sql).',
      'schema', array_to_string(bad, ', ');
  END IF;
END $$;


-- ---------------------------------------------------------------
-- 1. Types
-- ---------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'staff', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------
-- 2. Shared helpers
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------
-- 3. profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    text,
  role         text,
  business_id  uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON public.profiles (business_id);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create a profile row whenever an auth user is created.
-- Required: the app reads public.profiles right after login and treats a
-- missing row as "no business access".
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------
-- 4. user_roles + role helpers
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner'::public.app_role, 'admin'::public.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner'::public.app_role, 'admin'::public.app_role, 'staff'::public.app_role)
  )
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

-- Policies (declared after the helper functions they depend on)
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all roles" ON public.user_roles;
CREATE POLICY "Admins read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin(auth.uid()));

-- A user may edit only their own display name (role/business_id stay frozen).
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  AND business_id IS NOT DISTINCT FROM (SELECT p.business_id FROM public.profiles p WHERE p.id = auth.uid())
);

DROP POLICY IF EXISTS "Admins update profiles" ON public.profiles;
CREATE POLICY "Admins update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------
-- 5. appointments
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid,
  customer_name    text NOT NULL,
  phone            text NOT NULL,
  email            text,
  service_name     text NOT NULL,
  service_price    numeric(10,2) NOT NULL DEFAULT 0,
  service_duration integer NOT NULL DEFAULT 30 CHECK (service_duration > 0),
  barber           text NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  comments         text,
  status           text NOT NULL DEFAULT 'confirmed'
                   CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  reminder_sent    boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_business_date
  ON public.appointments (business_id, appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date_active
  ON public.appointments (barber, appointment_date)
  WHERE status IN ('pending', 'confirmed');
CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON public.appointments (status);

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT INSERT ON public.appointments TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Public may create a booking, never read/update/delete one.
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
CREATE POLICY "Public can create appointments"
ON public.appointments FOR INSERT TO anon, authenticated
WITH CHECK (
  status IN ('pending', 'confirmed')
  AND appointment_date >= (CURRENT_DATE - 1)
);

DROP POLICY IF EXISTS "Staff read appointments" ON public.appointments;
CREATE POLICY "Staff read appointments"
ON public.appointments FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff update appointments" ON public.appointments;
CREATE POLICY "Staff update appointments"
ON public.appointments FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins delete appointments" ON public.appointments;
CREATE POLICY "Admins delete appointments"
ON public.appointments FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------
-- 6. walkins
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.walkins (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id            uuid,
  customer_name          text NOT NULL,
  phone                  text,
  estimated_wait_minutes integer NOT NULL DEFAULT 15 CHECK (estimated_wait_minutes >= 0),
  status                 text NOT NULL DEFAULT 'waiting'
                         CHECK (status IN ('waiting', 'served', 'cancelled')),
  joined_at              timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_walkins_business_joined
  ON public.walkins (business_id, joined_at);
CREATE INDEX IF NOT EXISTS idx_walkins_status ON public.walkins (status);

DROP TRIGGER IF EXISTS trg_walkins_updated_at ON public.walkins;
CREATE TRIGGER trg_walkins_updated_at
BEFORE UPDATE ON public.walkins
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT INSERT ON public.walkins TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.walkins TO authenticated;
GRANT ALL ON public.walkins TO service_role;
ALTER TABLE public.walkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can join walkin queue" ON public.walkins;
CREATE POLICY "Public can join walkin queue"
ON public.walkins FOR INSERT TO anon, authenticated
WITH CHECK (status = 'waiting');

DROP POLICY IF EXISTS "Staff read walkins" ON public.walkins;
CREATE POLICY "Staff read walkins"
ON public.walkins FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff update walkins" ON public.walkins;
CREATE POLICY "Staff update walkins"
ON public.walkins FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins delete walkins" ON public.walkins;
CREATE POLICY "Admins delete walkins"
ON public.walkins FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------
-- 7. reminders (delivery log)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reminders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      uuid,
  appointment_id   uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  customer_name    text NOT NULL DEFAULT '',
  email            text,
  phone            text,
  appointment_date date,
  appointment_time time,
  reminder_time    timestamptz,
  channel          text NOT NULL DEFAULT 'email'
                   CHECK (channel IN ('email', 'sms', 'whatsapp')),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'sent', 'failed')),
  message          text NOT NULL DEFAULT '',
  sent_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_business_created
  ON public.reminders (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminders_appointment
  ON public.reminders (appointment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read reminders" ON public.reminders;
CREATE POLICY "Staff read reminders"
ON public.reminders FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff create reminders" ON public.reminders;
CREATE POLICY "Staff create reminders"
ON public.reminders FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Admins update reminders" ON public.reminders;
CREATE POLICY "Admins update reminders"
ON public.reminders FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete reminders" ON public.reminders;
CREATE POLICY "Admins delete reminders"
ON public.reminders FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------
-- 8. reviews
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  name        text NOT NULL,
  role        text,
  rating      integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment     text NOT NULL DEFAULT '',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_active_created
  ON public.reviews (is_active, created_at DESC);

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active reviews" ON public.reviews;
CREATE POLICY "Public read active reviews"
ON public.reviews FOR SELECT TO anon, authenticated
USING (is_active IS TRUE);

DROP POLICY IF EXISTS "Admins read all reviews" ON public.reviews;
CREATE POLICY "Admins read all reviews"
ON public.reviews FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins insert reviews" ON public.reviews;
CREATE POLICY "Admins insert reviews"
ON public.reviews FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update reviews" ON public.reviews;
CREATE POLICY "Admins update reviews"
ON public.reviews FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete reviews" ON public.reviews;
CREATE POLICY "Admins delete reviews"
ON public.reviews FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------
-- 9. Public availability RPC
--    Returns ONLY occupancy data: no customer_name, phone, email,
--    comments, price or row id is ever exposed.
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_public_booking_slots(text);
CREATE FUNCTION public.get_public_booking_slots(_business_id text DEFAULT NULL)
RETURNS TABLE (
  barber            text,
  appointment_date  text,
  appointment_time  text,
  service_duration  integer,
  status            text,
  business_id       text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
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
