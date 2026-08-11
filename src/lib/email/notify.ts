/**
 * Fire-and-forget triggers for the server-side email routes.
 * No secrets here: the browser only sends a row id + language,
 * everything else is read server-side with the service role.
 */
async function post(path: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) console.error("[email]", path, res.status);
  } catch (error) {
    console.error("[email]", path, error);
  }
}

export function notifyBookingConfirmation(
  appointmentId: string | number | undefined | null,
  lang: string,
) {
  if (!appointmentId) return Promise.resolve();

  return post("/api/public/email/booking-confirmation", {
    appointment_id: String(appointmentId),
    lang,
  });
}

export function notifyConsultation(
  requestId: string | undefined | null,
  lang: string,
) {
  if (!requestId) return Promise.resolve();

  return post("/api/public/email/consultation", {
    request_id: String(requestId),
    lang,
  });
}
