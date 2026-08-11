// Server-only email helpers (Resend + service-role REST access).
// Never import this file from browser code.

export type Lang = "es" | "en";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && UUID_RE.test(v);

export const pickLang = (v: unknown): Lang => (v === "en" ? "en" : "es");

export const esc = (s: unknown): string =>
  String(s ?? "")
    .slice(0, 400)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function businessInfo() {
  return {
    name: process.env["BUSINESS_NAME"] || "Brightobarber",
    address:
      process.env["BUSINESS_ADDRESS"] ||
      "624 Old Kent Road, London, SE15 1JB, United Kingdom",
    notify: process.env["BUSINESS_NOTIFY_EMAIL"] || "",
    from: process.env["EMAIL_FROM"] || "",
    currency: process.env["CURRENCY_SYMBOL"] || "£",
    brand: process.env["BRAND_COLOR"] || "#1d4ed8",
    timezone: process.env["BUSINESS_TIMEZONE"] || "Europe/London",
  };
}

/** Price line. A pending price is never rendered as £0. */
export function priceLabel(
  lang: Lang,
  opts: {
    price_pending?: boolean | null;
    agreed_price?: number | string | null;
    service_price?: number | string | null;
  },
): string {
  const pending = opts.price_pending === true;
  const agreed =
    opts.agreed_price === null || opts.agreed_price === undefined
      ? null
      : Number(opts.agreed_price);
  const base =
    opts.service_price === null || opts.service_price === undefined
      ? null
      : Number(opts.service_price);

  const value = agreed ?? (pending ? null : base);

  if (pending || value === null || Number.isNaN(value)) {
    return lang === "es" ? "Precio a consultar" : "Price on consultation";
  }

  return `${businessInfo().currency}${value.toFixed(2)}`;
}

export function formatDate(dateIso: string, lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang === "es" ? "es-ES" : "en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: businessInfo().timezone,
    }).format(new Date(`${dateIso}T12:00:00Z`));
  } catch {
    return dateIso;
  }
}

export const hhmm = (t: unknown) => String(t ?? "").slice(0, 5);

export function layout(opts: {
  title: string;
  intro: string;
  rows: { label: string; value: string }[];
  footer?: string[];
}): string {
  const b = businessInfo();

  const rows = opts.rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b7280">${esc(r.label)}</td>` +
        `<td style="padding:6px 0;font-weight:600;color:#111827">${esc(r.value)}</td></tr>`,
    )
    .join("");

  const footer = (opts.footer || [])
    .map(
      (f) =>
        `<p style="color:#6b7280;font-size:13px;margin:6px 0">${esc(f)}</p>`,
    )
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f5f5f5;padding:24px">
  <div style="max-width:600px;margin:auto;background:#fff;padding:32px;border-radius:12px">
    <h1 style="margin:0 0 16px;color:${esc(b.brand)};font-size:22px">${esc(b.name)}</h1>
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827">${esc(opts.title)}</h2>
    <p style="color:#374151;margin:0 0 8px">${esc(opts.intro)}</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">${rows}</table>
    <hr style="border:none;border-top:1px solid #e5e7eb" />
    ${footer}
  </div>
</div>`;
}

/** Sends one email through Resend. Throws on provider failure. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const key = process.env["RESEND_API_KEY"];
  const from = businessInfo().from;

  if (!key || !from) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  if (!EMAIL_RE.test(opts.to) || opts.to.length > 254) {
    throw new Error("INVALID_RECIPIENT");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[resend] ${res.status} ${text}`);
    throw new Error(`EMAIL_SEND_FAILED_${res.status}`);
  }
}

/** Service-role PostgREST call (server-only). */
export async function db(path: string, init: RequestInit = {}) {
  const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) throw new Error("SUPABASE_SERVER_ENV_MISSING");

  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[db] ${res.status} ${text}`);
    throw new Error(`DB_ERROR_${res.status}`);
  }

  return res;
}

export async function dbJson<T>(path: string, init?: RequestInit): Promise<T> {
  return (await (await db(path, init)).json()) as T;
}
