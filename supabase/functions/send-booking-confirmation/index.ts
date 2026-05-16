import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const {
      to,
      customer_name,
      service,
      barber,
      appointment_date,
      appointment_time,
      price,
    } = await req.json();

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const html = `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#f5f5f5">
        <div style="max-width:600px;margin:auto;background:white;padding:32px;border-radius:12px">
          <h1 style="color:#1d4ed8;">El Punty Barber Shop</h1>

          <h2>✅ Reserva confirmada</h2>

          <p>Hola ${customer_name},</p>

          <p>Tu reserva ha sido confirmada.</p>

          <hr />

          <p><strong>Servicio:</strong> ${service}</p>
          <p><strong>Barbero:</strong> ${barber}</p>
          <p><strong>Fecha:</strong> ${appointment_date}</p>
          <p><strong>Hora:</strong> ${appointment_time}</p>
          <p><strong>Precio:</strong> £${price}</p>

          <hr />

          <p>Te esperamos en El Punty Barber Shop.</p>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "El Punty Barber Shop <reservas@avatarapp.dev>",
        to,
        subject: "Reserva confirmada — El Punty Barber Shop",
        html,
      }),
    });

    const data = await resendResponse.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
