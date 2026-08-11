-- =====================================================================
-- Emails: confirmación, aviso al negocio, solicitudes y recordatorio 24h
-- Idempotente. NO modifica create_booking, RLS de negocio, business_id
-- ni datos históricos (solo añade columnas nuevas anulables).
-- =====================================================================

-- ---------------------------------------------------------------
-- 1. Idempotencia + idioma
-- ---------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS lang text;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_lang_chk;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_lang_chk
  CHECK (lang IS NULL OR lang IN ('es','en')) NOT VALID;

ALTER TABLE public.consultation_requests
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS lang text;

ALTER TABLE public.consultation_requests
  DROP CONSTRAINT IF EXISTS consultation_requests_lang_chk;
ALTER TABLE public.consultation_requests
  ADD CONSTRAINT consultation_requests_lang_chk
  CHECK (lang IS NULL OR lang IN ('es','en')) NOT VALID;

COMMENT ON COLUMN public.appointments.confirmation_sent_at IS
  'Marca de envío del email de confirmación. La ruta server-side la reclama de forma atómica para evitar duplicados.';
COMMENT ON COLUMN public.consultation_requests.notified_at IS
  'Marca de envío de los emails de la solicitud (cliente + negocio).';

-- Índice para el barrido de recordatorios (24h antes).
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_pending
  ON public.appointments (appointment_date, appointment_time)
  WHERE reminder_sent = false AND status IN ('pending','confirmed');

-- ---------------------------------------------------------------
-- 2. Programación del recordatorio 24h (pg_cron + pg_net)
--    Sustituye <APP_URL> y <CRON_SECRET> antes de ejecutar.
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'send-24h-reminders';

SELECT cron.schedule(
  'send-24h-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := '<APP_URL>/api/public/email/reminders',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', '<CRON_SECRET>'),
    body    := '{}'::jsonb
  );
  $$
);
