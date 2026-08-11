import type {} from "@tanstack/react-start";
// Consultation request: notice to the business + "request received" to the
// client (never presented as a confirmed booking). Idempotent via notified_at.
import { createFileRoute } from "@tanstack/react-router";
import type { ConsultationRow } from "@/lib/email/templates.server";

export const Route = createFileRoute("/api/public/email/consultation")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { db, dbJson, isUuid, pickLang, sendEmail, businessInfo } =
          await import("@/lib/email/mailer.server");
        const { consultationReceivedEmail, consultationNoticeEmail } =
          await import("@/lib/email/templates.server");

        let claimedId: string | null = null;

        try {
          const body = (await request.json().catch(() => ({}))) as Record<
            string,
            unknown
          >;
          const id = body["request_id"];
          const lang = pickLang(body["lang"]);

          if (!isUuid(id)) {
            return Response.json({ error: "INVALID_ID" }, { status: 400 });
          }

          const claimed = await dbJson<
            (ConsultationRow & { services?: { name: string } | null })[]
          >(
            `consultation_requests?id=eq.${id}&notified_at=is.null` +
              `&select=id,customer_name,email,phone,preferred_date,preferred_time,alt_date,alt_time,proposed_price,wants_pro_quote,hair_notes,comments,services(name)`,
            {
              method: "PATCH",
              headers: { Prefer: "return=representation" },
              body: JSON.stringify({
                notified_at: new Date().toISOString(),
                lang,
              }),
            },
          );

          const raw = claimed[0];
          if (!raw) return Response.json({ skipped: "already_sent" });

          claimedId = raw.id;

          const req: ConsultationRow = {
            ...raw,
            service_name: raw.services?.name || null,
          };

          const business = businessInfo();
          let sent = 0;

          if (req.email) {
            const mail = consultationReceivedEmail(req, lang);
            await sendEmail({
              to: req.email,
              subject: mail.subject,
              html: mail.html,
              replyTo: business.notify || undefined,
            });
            sent += 1;
          }

          if (business.notify) {
            const notice = consultationNoticeEmail(req, lang);
            await sendEmail({
              to: business.notify,
              subject: notice.subject,
              html: notice.html,
              replyTo: req.email || undefined,
            });
            sent += 1;
          }

          return Response.json({ ok: true, sent });
        } catch (error) {
          console.error("[email/consultation]", error);

          if (claimedId) {
            try {
              await db(`consultation_requests?id=eq.${claimedId}`, {
                method: "PATCH",
                body: JSON.stringify({ notified_at: null }),
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
