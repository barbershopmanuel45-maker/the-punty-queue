-- =====================================================================
-- 00_repair_user_roles.sql
-- Run BEFORE 20260811000000_init_salon_backend.sql on the NEW salon project.
--
-- Context: public.user_roles exists as a VIEW (relkind = 'v'), which made
-- CREATE TABLE IF NOT EXISTS skip silently and CREATE INDEX fail with 42809.
--
-- Scope guarantees:
--   * touches ONLY objects of this app in schema public
--   * NEVER touches auth.*, storage.*, realtime.*, extensions or any other project
--   * no DROP SCHEMA, no DROP OWNED, no TRUNCATE of auth data
-- =====================================================================

-- ---------------------------------------------------------------
-- STEP 0 (READ ONLY) — run this first and keep the output.
-- ---------------------------------------------------------------
-- 0.1 What is user_roles and what does it select?
SELECT c.relname,
       c.relkind,
       pg_get_userbyid(c.relowner) AS owner,
       CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid, true) END AS definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'user_roles';

-- 0.2 Does the view expose any row we would lose?
SELECT count(*) AS rows_in_view FROM public.user_roles;
SELECT * FROM public.user_roles LIMIT 50;

-- 0.3 Which of our objects already exist?
SELECT c.relname, c.relkind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('profiles','user_roles','appointments','walkins','reminders','reviews')
ORDER BY 1;

SELECT p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('set_updated_at','handle_new_user','has_role','is_admin','is_staff','get_public_booking_slots')
ORDER BY 1;

SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY 1,2;

-- 0.4 Any real data at risk?
SELECT 'profiles' t, count(*) FROM public.profiles
UNION ALL SELECT 'appointments', count(*) FROM public.appointments
UNION ALL SELECT 'walkins', count(*) FROM public.walkins
UNION ALL SELECT 'reminders', count(*) FROM public.reminders
UNION ALL SELECT 'reviews', count(*) FROM public.reviews;
-- (a table that does not exist yet will simply error; note which one)

-- 0.5 Anything depending on the view?
SELECT DISTINCT dependent.relname AS depends_on_user_roles, dependent.relkind
FROM pg_depend d
JOIN pg_rewrite rw ON rw.oid = d.objid
JOIN pg_class dependent ON dependent.oid = rw.ev_class
JOIN pg_class source ON source.oid = d.refobjid
JOIN pg_namespace n ON n.oid = source.relnamespace
WHERE n.nspname = 'public' AND source.relname = 'user_roles'
  AND dependent.relname <> 'user_roles';


-- =====================================================================
-- STEP 1 — REPAIR (run only after STEP 0 confirms the view holds nothing
-- you need; the view is derived from public.profiles, so no unique data).
-- Wrapped in a transaction: if anything fails, nothing is applied.
-- =====================================================================
BEGIN;

-- 1.1 Keep a snapshot of whatever the view returns, just in case.
--     Safe: it is a plain table in public, you can drop it later.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'user_roles' AND c.relkind IN ('v','m')
  ) THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS public._backup_user_roles_view AS SELECT * FROM public.user_roles';
  END IF;
END $$;

-- 1.2 Remove the VIEW (only if it really is a view / matview).
DO $$
DECLARE k "char";
BEGIN
  SELECT c.relkind INTO k
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'user_roles';

  IF k = 'v' THEN
    EXECUTE 'DROP VIEW public.user_roles CASCADE';
  ELSIF k = 'm' THEN
    EXECUTE 'DROP MATERIALIZED VIEW public.user_roles CASCADE';
  ELSIF k = 'r' THEN
    RAISE NOTICE 'public.user_roles is already a real table; nothing to drop.';
  ELSIF k IS NULL THEN
    RAISE NOTICE 'public.user_roles does not exist; nothing to drop.';
  ELSE
    RAISE EXCEPTION 'public.user_roles has unexpected relkind=%; stopping.', k;
  END IF;
END $$;

COMMIT;

-- After COMMIT: re-run supabase/sql/20260811000000_init_salon_backend.sql.
-- It is idempotent and will create user_roles as a real TABLE with its
-- index, RLS, policies and grants, and skip everything already present.


-- =====================================================================
-- STEP 2 (OPTIONAL) — CONTROLLED RESET
-- Use ONLY if STEP 0.4 shows zero rows everywhere and you prefer a clean
-- slate. Destroys ONLY this app's objects. auth.users is left untouched,
-- so existing logins survive; profiles are recreated by handle_new_user
-- for NEW users only, so re-insert profile rows for existing users after.
-- =====================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.get_public_booking_slots(text);
-- DROP TABLE IF EXISTS public.reminders   CASCADE;
-- DROP TABLE IF EXISTS public.reviews     CASCADE;
-- DROP TABLE IF EXISTS public.walkins     CASCADE;
-- DROP TABLE IF EXISTS public.appointments CASCADE;
-- DROP TABLE IF EXISTS public.user_roles  CASCADE;
-- DROP VIEW  IF EXISTS public.user_roles  CASCADE;
-- DROP TABLE IF EXISTS public.profiles    CASCADE;
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;  -- our trigger only
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP FUNCTION IF EXISTS public.is_staff(uuid);
-- DROP FUNCTION IF EXISTS public.is_admin(uuid);
-- DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
-- DROP FUNCTION IF EXISTS public.set_updated_at();
-- DROP TYPE IF EXISTS public.app_role;
-- COMMIT;


-- =====================================================================
-- STEP 3 — VERIFICATION (read only, run after the init migration)
-- =====================================================================
-- 3.1 user_roles must be a real table
-- SELECT relname, relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
-- WHERE n.nspname='public' AND relname='user_roles';   -- expect relkind = r

-- 3.2 columns
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='user_roles' ORDER BY ordinal_position;

-- 3.3 constraints + index
-- SELECT conname, contype FROM pg_constraint
-- WHERE conrelid = 'public.user_roles'::regclass;
-- SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='user_roles';

-- 3.4 RLS on + policies
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE oid IN ('public.user_roles'::regclass,'public.profiles'::regclass,
--               'public.appointments'::regclass,'public.walkins'::regclass,
--               'public.reminders'::regclass,'public.reviews'::regclass);
-- SELECT tablename, policyname, cmd, roles FROM pg_policies
-- WHERE schemaname='public' ORDER BY 1,2;

-- 3.5 helper functions
-- SELECT public.has_role('00000000-0000-0000-0000-000000000000'::uuid,'admin');  -- false
-- SELECT public.is_admin('00000000-0000-0000-0000-000000000000'::uuid);          -- false
-- SELECT public.is_staff('00000000-0000-0000-0000-000000000000'::uuid);          -- false

-- 3.6 grant your own user the owner role (replace the UUID)
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<YOUR-AUTH-USER-UUID>', 'owner') ON CONFLICT DO NOTHING;

-- 3.7 clean the snapshot once you are happy
-- DROP TABLE IF EXISTS public._backup_user_roles_view;
