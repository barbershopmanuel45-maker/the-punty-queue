DO $$
BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'staff', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'owner'::public.app_role)
      OR public.has_role(_user_id, 'admin'::public.app_role)
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can read roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

INSERT INTO public.user_roles (user_id, role)
SELECT
  p.id,
  CASE lower(p.role::text)
    WHEN 'owner' THEN 'owner'::public.app_role
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'staff' THEN 'staff'::public.app_role
    ELSE 'user'::public.app_role
  END
FROM public.profiles p
WHERE p.id IS NOT NULL
  AND p.role IS NOT NULL
  AND lower(p.role::text) IN ('owner', 'admin', 'staff', 'user')
ON CONFLICT (user_id, role) DO NOTHING;

GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are visible to owner or admin" ON public.profiles;
CREATE POLICY "Profiles are visible to owner or admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_admin(auth.uid()));

GRANT INSERT ON public.appointments TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
CREATE POLICY "Anyone can create appointments"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_public_booking_slots(_business_id text DEFAULT NULL)
RETURNS TABLE (
  barber text,
  appointment_date date,
  appointment_time time,
  service_duration integer,
  status text,
  business_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.barber::text,
    a.appointment_date,
    a.appointment_time,
    a.service_duration,
    a.status::text,
    a.business_id::text
  FROM public.appointments a
  WHERE a.status IN ('pending', 'confirmed')
    AND a.appointment_date >= CURRENT_DATE
    AND (_business_id IS NULL OR a.business_id::text = _business_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_booking_slots(text) TO anon, authenticated, service_role;

GRANT INSERT ON public.walkins TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.walkins TO authenticated;
GRANT ALL ON public.walkins TO service_role;
ALTER TABLE public.walkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can join walkin queue" ON public.walkins;
DROP POLICY IF EXISTS "Admins can read walkins" ON public.walkins;
DROP POLICY IF EXISTS "Admins can update walkins" ON public.walkins;
DROP POLICY IF EXISTS "Admins can delete walkins" ON public.walkins;
CREATE POLICY "Anyone can join walkin queue"
ON public.walkins
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read walkins"
ON public.walkins
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update walkins"
ON public.walkins
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete walkins"
ON public.walkins
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage reminders" ON public.reminders;
CREATE POLICY "Admins can manage reminders"
ON public.reminders
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Public can read active reviews"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (is_active IS TRUE);

CREATE POLICY "Admins can manage reviews"
ON public.reviews
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DO $$
BEGIN
  IF to_regclass('public.bookings') IS NOT NULL THEN
    GRANT SELECT, UPDATE, DELETE ON public.bookings TO authenticated;
    GRANT ALL ON public.bookings TO service_role;
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins can read bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
    DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;

    CREATE POLICY "Admins can read bookings"
    ON public.bookings
    FOR SELECT
    TO authenticated
    USING (public.is_admin(auth.uid()));

    CREATE POLICY "Admins can update bookings"
    ON public.bookings
    FOR UPDATE
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

    CREATE POLICY "Admins can delete bookings"
    ON public.bookings
    FOR DELETE
    TO authenticated
    USING (public.is_admin(auth.uid()));
  END IF;
END $$;
