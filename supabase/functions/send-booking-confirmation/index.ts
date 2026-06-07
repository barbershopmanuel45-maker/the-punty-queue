import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// HTML-escape user-controlled values to prevent HTML/script injection in emails
const esc = (s: unknown): string =>
  String(s ?? "")
    .slice(0, 200)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  try {
    // Require an authenticated caller (validate the JWT in the Authorization header)
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      to,
      customer_name,
      service,
      barber,
      appointment_date,
      appointment_time,
      price,
    } = body || {};

    if (typeof to !== "string" || !EMAIL_RE.test(to) || to.length > 254) {
      return new Response(JSON.stringify({ error: "Invalid recipient" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const html = `
      <div style="font-family:Arial,sans-serif;padding:24px;background:#f5f5f5">
        <div style="max-width:600px;margin:auto;background:white;padding:32px;border-radius:12px">
          <h1 style="color:#1d4ed8;">JuniorFADEfactory · Barber Shop</h1>

          <h2>✅ Reserva confirmada</h2>

          <p>Hola ${esc(customer_name)},</p>

          <p>Tu reserva ha sido confirmada.</p>

          <hr />

          <p><strong>Servicio:</strong> ${esc(service)}</p>
          <p><strong>Barbero:</strong> ${esc(barber)}</p>
          <p><strong>Fecha:</strong> ${esc(appointment_date)}</p>
          <p><strong>Hora:</strong> ${esc(appointment_time)}</p>
          <p><strong>Precio:</strong> £${esc(price)}</p>

          <hr />

          <p>Te esperamos en JuniorFADEfactory · Barber Shop.</p>
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
        from: "JuniorFADEfactory <reservas@avatarapp.dev>",
        to,
        subject: "Reserva confirmada — JuniorFADEfactory · Barber Shop",
        html,
      }),
    });

    const data = await resendResponse.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[send-booking-confirmation] error", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
