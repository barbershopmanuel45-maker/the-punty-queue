import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { services, type Lang } from "@/lib/i18n";
import {
  listBookings,
  listReminders,
  createReminderLog,
  markBookingReminderSent,
  type BookingUI,
  type ReminderUI,
} from "@/lib/data";
import { fetchProfile, type Profile } from "@/lib/profile";

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.toLowerCase() || "";

const T = {
  es: {
    title: "Recordatorios",
    subtitle: "Sistema automático de notificaciones a clientes",
    pending: "Pendientes",
    sent: "Enviados",
    none: "No hay recordatorios pendientes.",
    nonesent: "Aún no se ha enviado ningún recordatorio.",
    in: "en",
    min: "min",
    sentVia: "Enviado por",
    msg: (n: string, t: string) =>
      `Hola ${n}, te recordamos tu cita en El Punty a las ${t}.`,
    badgePending: "Pendiente",
    badgeSent: "Enviado",
    auto: "Conectado a Supabase",
    markSent: "Enviar email y marcar enviado",
    sending: "Enviando...",
    loading: "Cargando...",
  },
  en: {
    title: "Reminders",
    subtitle: "Automated notification system for clients",
    pending: "Pending",
    sent: "Sent",
    none: "No pending reminders.",
    nonesent: "No reminders have been sent yet.",
    in: "in",
    min: "min",
    sentVia: "Sent via",
    msg: (n: string, t: string) =>
      `Hi ${n}, this is a reminder of your appointment at El Punty at ${t}.`,
    badgePending: "Pending",
    badgeSent: "Sent",
    auto: "Connected to Supabase",
    markSent: "Send email and mark sent",
    sending: "Sending...",
    loading: "Loading...",
  },
};

const CHANNEL_ICON: Record<ReminderUI["channel"], string> = {
  email: "📧",
  sms: "💬",
  whatsapp: "🟢",
};

function getApptTime(b: BookingUI): number {
  if (!b.date || !b.time) return NaN;
  return new Date(`${b.date}T${String(b.time).slice(0, 5)}`).getTime();
}

function serviceName(id: string, lang: Lang) {
  const s = services.find(
    (x) => x.id === id || x.name_es === id || x.name_en === id,
  );

  if (!s) return id;

  return lang === "es" ? s.name_es : s.name_en;
}

function rDate(r: ReminderUI) {
  return r.sent_at || r.reminder_time || r.created_at || "";
}

export default function Reminders({ lang }: { lang: Lang }) {
  const [bookings, setBookings] = useState<BookingUI[]>([]);
  const [reminders, setReminders] = useState<ReminderUI[]>([]);
  const [tab, setTab] = useState<"pending" | "sent">("pending");
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobRunning, setJobRunning] = useState(false);
  const [jobResult, setJobResult] = useState<{ sent: number; failed: number } | null>(null);

  const tt = T[lang];

  const isAdmin =
    profile?.role === "admin" ||
    (!!ADMIN_EMAIL && profile?.email?.toLowerCase() === ADMIN_EMAIL);

  const load = async () => {
    setLoading(true);

    try {
      const [bookingRes, reminderRes] = await Promise.all([
        listBookings(),
        listReminders(),
      ]);

      setBookings(bookingRes.data || []);
      setReminders(reminderRes.data || []);
    } catch (error) {
      console.error("[reminders] load failed", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    fetchProfile().then(setProfile).catch(() => setProfile(null));

    const id = window.setInterval(load, 30000);

    return () => window.clearInterval(id);
  }, []);

  const pendingBookings = useMemo(() => {
    const now = Date.now();

    return bookings
      .filter((b) => {
        if (b.status === "cancelled" || b.status === "completed") return false;
        if (b.reminder_sent) return false;

        const apptTs = getApptTime(b);
        if (Number.isNaN(apptTs)) return false;

        return apptTs >= now;
      })
      .sort((a, b) => getApptTime(a) - getApptTime(b));
  }, [bookings]);

  const sentReminders = useMemo(() => {
    return reminders
      .filter((r) => r.status === "sent")
      .sort((a, b) => {
        const at = rDate(a);
        const bt = rDate(b);
        return at < bt ? 1 : -1;
      });
  }, [reminders]);

  const sendReminder = async (b: BookingUI) => {
    const key = String(b.id || b.createdAt);
    const nowIso = new Date().toISOString();
    const appointmentTime = String(b.time || "").slice(0, 5);
    const message = tt.msg(b.name, appointmentTime);
    const channel: ReminderUI["channel"] = b.email ? "email" : "whatsapp";

    if (!b.email) {
      alert(
        lang === "es"
          ? "Esta reserva no tiene email. No se puede enviar email real."
          : "This booking has no email. Real email cannot be sent.",
      );
      return;
    }

    setSendingId(key);

    try {
      const { error: emailError } = await supabase.functions.invoke(
        "send-reminder-email",
        {
          body: {
            to: b.email,
            customer_name: b.name,
            message,
            appointment_date: b.date,
            appointment_time: appointmentTime,
            service: serviceName(b.service, lang),
          },
        },
      );

      if (emailError) throw emailError;

      await createReminderLog({
        appointment_id: b.id || null,
        customer_name: b.name,
        email: b.email || "",
        phone: b.phone || "",
        appointment_date: b.date,
        appointment_time: appointmentTime,
        reminder_time: nowIso,
        channel,
        status: "sent",
        message,
        sent_at: nowIso,
        created_at: nowIso,
        business_id: b.business_id || null,
      });

      await markBookingReminderSent(b);
      await load();
      setTab("sent");
    } catch (error) {
      console.error("[reminders] send failed", error);
      alert(
        lang === "es"
          ? "No se pudo enviar/guardar el recordatorio. Revisa Edge Function, RESEND_API_KEY y RLS."
          : "Could not send/save the reminder. Check Edge Function, RESEND_API_KEY and RLS.",
      );
    } finally {
      setSendingId(null);
    }
  };

  const runReminderJob = async () => {
    if (jobRunning) return;
    setJobRunning(true);
    setJobResult(null);
    let sent = 0;
    let failed = 0;
    const targets = pendingBookings.filter((b) => b.email);
    for (const b of targets) {
      try {
        await sendReminder(b);
        sent += 1;
      } catch {
        failed += 1;
      }
    }
    setJobResult({ sent, failed });
    setJobRunning(false);
  };

  // Exposed for internal testing (console): window.__runReminderJob()
  if (typeof window !== "undefined") {
    (window as unknown as { __runReminderJob?: () => Promise<void> }).__runReminderJob =
      runReminderJob;
  }

  const list = tab === "pending" ? pendingBookings : sentReminders;

  return (
    <section
      id="reminders"
      className="py-20 md:py-28 px-4 sm:px-6 bg-secondary/40"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-3">
          <h2 className="text-3xl md:text-5xl font-bold text-brand-blue mb-3">
            {tt.title}
          </h2>

          <p className="text-muted-foreground text-lg">{tt.subtitle}</p>

          <div className="inline-flex items-center gap-2 mt-4 text-xs text-muted-foreground bg-white px-3 py-1.5 rounded-full shadow-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {loading ? tt.loading : tt.auto}
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <button
              onClick={runReminderJob}
              disabled={jobRunning || pendingBookings.length === 0}
              className="text-xs font-medium px-3 py-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {jobRunning ? "Running…" : "Run reminder job"}
            </button>
            {jobResult && (
              <div className="text-xs text-muted-foreground">
                Reminder job executed · {jobResult.sent} sent
                {jobResult.failed > 0 ? ` · ${jobResult.failed} failed` : ""}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-2 my-8">
          <button
            onClick={() => setTab("pending")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition flex items-center gap-2 ${
              tab === "pending"
                ? "bg-gradient-brand text-white shadow-soft"
                : "bg-white text-muted-foreground hover:text-foreground"
            }`}
          >
            🟡 {tt.pending}
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {pendingBookings.length}
            </span>
          </button>

          <button
            onClick={() => setTab("sent")}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition flex items-center gap-2 ${
              tab === "sent"
                ? "bg-gradient-brand text-white shadow-soft"
                : "bg-white text-muted-foreground hover:text-foreground"
            }`}
          >
            🟢 {tt.sent}
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {sentReminders.length}
            </span>
          </button>
        </div>

        <div className="space-y-3">
          {list.length === 0 ? (
            <div className="bg-card rounded-2xl p-12 text-center text-muted-foreground shadow-card">
              {tab === "pending" ? tt.none : tt.nonesent}
            </div>
          ) : tab === "pending" ? (
            (list as BookingUI[]).map((b) => {
              const key = String(b.id || b.createdAt);
              const apptTs = getApptTime(b);
              const diffMin = Math.round((apptTs - Date.now()) / 60000);
              const appointmentTime = String(b.time || "").slice(0, 5);
              const message = tt.msg(b.name, appointmentTime);
              const isSending = sendingId === key;

              return (
                <div
                  key={key}
                  className="bg-card rounded-2xl p-5 shadow-card hover:shadow-soft transition flex flex-col sm:flex-row gap-4 items-start"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-yellow-100 text-yellow-700">
                    ⏰
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-bold text-foreground">{b.name}</span>
                      <span className="text-xs text-muted-foreground">·</span>

                      <span className="text-sm text-muted-foreground">
                        {serviceName(b.service, lang)}
                      </span>

                      <span className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800">
                        🟡 {tt.badgePending}
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground mb-2">
                      📅 {b.date} · 🕐 {appointmentTime}
                      {!Number.isNaN(diffMin) && (
                        <span className="ml-2 text-brand-blue font-medium">
                          {tt.in} {diffMin > 0 ? `${diffMin} ${tt.min}` : "—"}
                        </span>
                      )}
                    </div>

                    <div className="bg-secondary/50 rounded-xl p-3 text-sm italic text-foreground/80">
                      "{message}"
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => sendReminder(b)}
                        disabled={isSending}
                        className="mt-3 text-xs font-medium px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSending ? tt.sending : tt.markSent}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            (list as ReminderUI[]).map((r) => (
              <div
                key={r.id || `${r.customer_name}-${r.sent_at || r.created_at}`}
                className="bg-card rounded-2xl p-5 shadow-card hover:shadow-soft transition flex flex-col sm:flex-row gap-4 items-start"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 bg-green-100 text-green-600">
                  ✅
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-foreground">
                      {r.customer_name}
                    </span>

                    <span className="ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                      🟢 {tt.badgeSent}
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground mb-2">
                    {r.appointment_date && <>📅 {r.appointment_date}</>}
                    {r.appointment_time && (
                      <> · 🕐 {String(r.appointment_time).slice(0, 5)}</>
                    )}
                  </div>

                  <div className="bg-secondary/50 rounded-xl p-3 text-sm italic text-foreground/80">
                    "{r.message}"
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    {CHANNEL_ICON[r.channel] || "📧"} {tt.sentVia}{" "}
                    <b className="capitalize">{r.channel}</b>
                    {(r.sent_at || r.reminder_time) &&
                      ` · ${new Date(
                        r.sent_at || r.reminder_time || "",
                      ).toLocaleTimeString(
                        lang === "es" ? "es-ES" : "en-GB",
                        { hour: "2-digit", minute: "2-digit" },
                      )}`}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
