// Bilingual email templates (ES/EN). Server-only.
import {
  businessInfo,
  formatDate,
  hhmm,
  layout,
  priceLabel,
  type Lang,
} from "./mailer.server";

export type AppointmentRow = {
  id: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  service_name: string;
  barber: string;
  appointment_date: string;
  appointment_time: string;
  service_price: number | string | null;
  agreed_price: number | string | null;
  price_pending: boolean | null;
  comments?: string | null;
};

export type ConsultationRow = {
  id: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  preferred_date: string;
  preferred_time: string;
  alt_date: string | null;
  alt_time: string | null;
  proposed_price: number | string | null;
  wants_pro_quote: boolean | null;
  hair_notes: string | null;
  comments: string | null;
  service_name?: string | null;
};

const L = {
  es: {
    service: "Servicio",
    pro: "Profesional",
    date: "Fecha",
    time: "Hora",
    address: "Dirección",
    price: "Precio",
    cash: "Pago en efectivo en el salón.",
    client: "Cliente",
    phone: "Teléfono",
    email: "Email",
    notes: "Notas",
    budget: "Presupuesto propuesto",
    proQuote: "Prefiere que la profesional indique el precio",
    alt: "Alternativa",
    preferred: "Fecha/hora solicitada",
  },
  en: {
    service: "Service",
    pro: "Professional",
    date: "Date",
    time: "Time",
    address: "Address",
    price: "Price",
    cash: "Cash payment at the salon.",
    client: "Client",
    phone: "Phone",
    email: "Email",
    notes: "Notes",
    budget: "Proposed budget",
    proQuote: "Prefers the professional to set the price",
    alt: "Alternative",
    preferred: "Requested date/time",
  },
} as const;

export function bookingConfirmationEmail(a: AppointmentRow, lang: Lang) {
  const b = businessInfo();
  const t = L[lang];

  const subject =
    lang === "es"
      ? `Reserva confirmada — ${b.name}`
      : `Booking confirmed — ${b.name}`;

  const html = layout({
    title: lang === "es" ? "✅ Reserva confirmada" : "✅ Booking confirmed",
    intro:
      lang === "es"
        ? `Hola ${a.customer_name}, tu reserva está confirmada.`
        : `Hi ${a.customer_name}, your booking is confirmed.`,
    rows: [
      { label: t.service, value: a.service_name },
      { label: t.pro, value: a.barber },
      { label: t.date, value: formatDate(a.appointment_date, lang) },
      { label: t.time, value: hhmm(a.appointment_time) },
      { label: t.address, value: b.address },
      { label: t.price, value: priceLabel(lang, a) },
    ],
    footer: [
      t.cash,
      lang === "es"
        ? `Te esperamos en ${b.name}.`
        : `See you at ${b.name}.`,
    ],
  });

  return { subject, html };
}

export function bookingNoticeEmail(a: AppointmentRow, lang: Lang) {
  const b = businessInfo();
  const t = L[lang];

  return {
    subject: `Nueva reserva — ${a.customer_name} · ${a.appointment_date} ${hhmm(
      a.appointment_time,
    )}`,
    html: layout({
      title: "Nueva reserva confirmada",
      intro: `Se ha creado una reserva en ${b.name}.`,
      rows: [
        { label: t.client, value: a.customer_name },
        { label: t.phone, value: a.phone || "—" },
        { label: t.email, value: a.email || "—" },
        { label: t.service, value: a.service_name },
        { label: t.pro, value: a.barber },
        { label: t.date, value: a.appointment_date },
        { label: t.time, value: hhmm(a.appointment_time) },
        { label: t.price, value: priceLabel(lang, a) },
        { label: t.notes, value: a.comments || "—" },
      ],
    }),
  };
}

export function reminderEmail(a: AppointmentRow, lang: Lang) {
  const b = businessInfo();
  const t = L[lang];

  const subject =
    lang === "es"
      ? `Recordatorio de tu cita — ${b.name}`
      : `Appointment reminder — ${b.name}`;

  const html = layout({
    title: lang === "es" ? "⏰ Recordatorio de tu cita" : "⏰ Appointment reminder",
    intro:
      lang === "es"
        ? `Hola ${a.customer_name}, te recordamos tu cita de mañana.`
        : `Hi ${a.customer_name}, this is a reminder of your appointment tomorrow.`,
    rows: [
      { label: t.service, value: a.service_name },
      { label: t.pro, value: a.barber },
      { label: t.date, value: formatDate(a.appointment_date, lang) },
      { label: t.time, value: hhmm(a.appointment_time) },
      { label: t.address, value: b.address },
    ],
    footer: [t.cash],
  });

  return { subject, html };
}

function consultationRows(c: ConsultationRow, lang: Lang) {
  const b = businessInfo();
  const t = L[lang];

  const budget = c.wants_pro_quote
    ? t.proQuote
    : c.proposed_price === null || c.proposed_price === undefined
      ? "—"
      : `${b.currency}${Number(c.proposed_price).toFixed(2)}`;

  const rows = [
    { label: t.service, value: c.service_name || "—" },
    {
      label: t.preferred,
      value: `${formatDate(c.preferred_date, lang)} · ${hhmm(c.preferred_time)}`,
    },
  ];

  if (c.alt_date || c.alt_time) {
    rows.push({
      label: t.alt,
      value: `${c.alt_date ? formatDate(c.alt_date, lang) : formatDate(c.preferred_date, lang)} · ${hhmm(
        c.alt_time || c.preferred_time,
      )}`,
    });
  }

  rows.push({ label: t.budget, value: budget });
  rows.push({ label: t.notes, value: c.hair_notes || c.comments || "—" });

  return rows;
}

export function consultationReceivedEmail(c: ConsultationRow, lang: Lang) {
  const b = businessInfo();

  const subject =
    lang === "es"
      ? `Solicitud recibida — ${b.name}`
      : `Request received — ${b.name}`;

  const html = layout({
    title:
      lang === "es"
        ? "📝 Solicitud recibida (aún no es una reserva)"
        : "📝 Request received (not a booking yet)",
    intro:
      lang === "es"
        ? `Hola ${c.customer_name}, hemos recibido tu solicitud de precio y horario. Todavía NO es una reserva confirmada: la profesional te contactará para confirmar precio y hora.`
        : `Hi ${c.customer_name}, we received your price and time request. This is NOT a confirmed booking yet: the professional will contact you to agree on price and time.`,
    rows: consultationRows(c, lang),
    footer: [
      L[lang].cash,
      `${L[lang].address}: ${b.address}`,
    ],
  });

  return { subject, html };
}

export function consultationNoticeEmail(c: ConsultationRow, lang: Lang) {
  const t = L[lang];

  return {
    subject: `Nueva solicitud de precio — ${c.customer_name} · ${c.preferred_date} ${hhmm(
      c.preferred_time,
    )}`,
    html: layout({
      title: "Nueva solicitud de consulta",
      intro: "Un cliente ha solicitado precio y horario (sin reserva creada).",
      rows: [
        { label: t.client, value: c.customer_name },
        { label: t.phone, value: c.phone || "—" },
        { label: t.email, value: c.email || "—" },
        ...consultationRows(c, lang),
      ],
    }),
  };
}
