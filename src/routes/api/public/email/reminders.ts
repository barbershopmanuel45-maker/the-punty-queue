import type {} from "@tanstack/react-start";
// 24h reminder sweep. Called by pg_cron (or any scheduler) with x-cron-secret.
// Idempotent through appointments.reminder_sent.
import { createFileRoute } from "@tanstack/react-router";
import type { AppointmentRow } from "@/lib/email/templates.server";

type ReminderRow = AppointmentRow & {
  business_id: string | null;
  status: string;
  lang: string | null;
};

export const Route = createFileRoute("/api/public/email/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { db, dbJson, pickLang, sendEmail } = await import(
          "@/lib/email/mailer.server"
        );
        const { reminderEmail } = await import("@/lib/email/templates.server");

        const secret = process.env["CRON_SECRET"];
        if (!secret || request.headers.get("x-cron-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const now = Date.now();
          const from = new Date(now + 23 * 3600_000);
          const to = new Date(now + 25 * 3600_000);

          // Candidate local dates in the salon timezone.
          const tz = process.env["BUSINESS_TIMEZONE"] || "Europe/London";
          const localDate = (d: Date) =>
            new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
          const localMinutes = (d: Date) => {
            const p = new Intl.DateTimeFormat("en-GB", {
              timeZone: tz,
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(d);
            const [h, m] = p.split(":").map(Number);
            return h * 60 + m;
          };

          const dates = Array.from(
            new Set([localDate(from), localDate(to)]),
          );

          const rows = await dbJson<ReminderRow[]>(
            `appointments?reminder_sent=is.false&status=in.(pending,confirmed)` +
              `&email=not.is.null&appointment_date=in.(${dates.join(",")})` +
              `&select=id,business_id,status,lang,customer_name,email,phone,service_name,barber,appointment_date,appointment_time,service_price,agreed_price,price_pending`,
          );

          const inWindow = rows.filter((r) => {
            const [h, m] = String(r.appointment_time).split(":").map(Number);
            const mins = h * 60 + (m || 0);
            if (r.appointment_date === localDate(from)) {
              return mins >= localMinutes(from);
            }
            if (r.appointment_date === localDate(to)) {
              return mins <= localMinutes(to);
            }
            return false;
          });

          let sent = 0;
          let failed = 0;

          for (const appt of inWindow) {
            // Atomic claim per appointment.
            const claimed = await dbJson<{ id: string }[]>(
              `appointments?id=eq.${appt.id}&reminder_sent=is.false&select=id`,
              {
                method: "PATCH",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify({ reminder_sent: true }),
              },
            );

            if (!claimed[0]) continue;

            const lang = pickLang(appt.lang);
            const mail = reminderEmail(appt, lang);

            try {
              await sendEmail({
                to: appt.email!,
                subject: mail.subject,
                html: mail.html,
              });
              sent += 1;

              await db("reminders", {
                method: "POST",
                body: JSON.stringify({
                  business_id: appt.business_id,
                  appointment_id: appt.id,
                  customer_name: appt.customer_name,
                  email: appt.email,
                  phone: appt.phone,
                  appointment_date: appt.appointment_date,
                  appointment_time: appt.appointment_time,
                  reminder_time: new Date().toISOString(),
                  channel: "email",
                  status: "sent",
                  message: mail.subject,
                  sent_at: new Date().toISOString(),
                }),
              });
            } catch (err) {
              failed += 1;
              console.error("[email/reminders] send failed", appt.id, err);
              // Release the claim so the next sweep retries.
              await db(`appointments?id=eq.${appt.id}`, {
                method: "PATCH",
                body: JSON.stringify({ reminder_sent: false }),
              }).catch(() => undefined);
            }
          }

          return Response.json({ ok: true, candidates: inWindow.length, sent, failed });
        } catch (error) {
          console.error("[email/reminders]", error);
          return Response.json({ error: "SWEEP_FAILED" }, { status: 500 });
        }
      },
    },
  },
});
