// Booking confirmation email (client) + notice to the business.
// Public endpoint on purpose: the booking form runs anonymously.
// It only accepts an appointment id, reads the row server-side with the
// service role and claims `confirmation_sent_at` atomically (idempotent).
import { createFileRoute } from "@tanstack/react-router";
import type { AppointmentRow } from "@/lib/email/templates.server";

export const Route = createFileRoute("/api/public/email/booking-confirmation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { db, dbJson, isUuid, pickLang, sendEmail, businessInfo } =
          await import("@/lib/email/mailer.server");
        const { bookingConfirmationEmail, bookingNoticeEmail } = await import(
          "@/lib/email/templates.server"
        );

        let claimedId: string | null = null;

        try {
          const body = (await request.json().catch(() => ({}))) as Record<
            string,
            unknown
          >;
          const id = body["appointment_id"];
          const lang = pickLang(body["lang"]);

          if (!isUuid(id)) {
            return Response.json({ error: "INVALID_ID" }, { status: 400 });
          }

          // Atomic claim: only the first call gets the row back.
          const claimed = await dbJson<AppointmentRow[]>(
            `appointments?id=eq.${id}&confirmation_sent_at=is.null` +
              `&select=id,customer_name,email,phone,service_name,barber,appointment_date,appointment_time,service_price,agreed_price,price_pending,comments`,
            {
              method: "PATCH",
              headers: { Prefer: "return=representation" },
              body: JSON.stringify({
                confirmation_sent_at: new Date().toISOString(),
                lang,
              }),
            },
          );

          const appt = claimed[0];
          if (!appt) return Response.json({ skipped: "already_sent" });

          claimedId = appt.id;

          const business = businessInfo();
          let sent = 0;

          if (appt.email) {
            const mail = bookingConfirmationEmail(appt, lang);
            await sendEmail({
              to: appt.email,
              subject: mail.subject,
              html: mail.html,
              replyTo: business.notify || undefined,
            });
            sent += 1;
          }

          if (business.notify) {
            const notice = bookingNoticeEmail(appt, lang);
            await sendEmail({
              to: business.notify,
              subject: notice.subject,
              html: notice.html,
              replyTo: appt.email || undefined,
            });
            sent += 1;
          }

          return Response.json({ ok: true, sent });
        } catch (error) {
          console.error("[email/booking-confirmation]", error);

          // Release the claim so a later retry can still deliver it.
          if (claimedId) {
            try {
              await db(`appointments?id=eq.${claimedId}`, {
                method: "PATCH",
                body: JSON.stringify({ confirmation_sent_at: null }),
              });
            } catch {
              /* ignore */
            }
          }

          return Response.json({ error: "EMAIL_FAILED" }, { status: 500 });
        }
      },
    },
  },
});
