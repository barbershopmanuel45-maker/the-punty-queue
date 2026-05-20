import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { services, barbers, type Lang } from "@/lib/i18n";
import logo from "@/assets/logo.jpeg";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/profile";

import {
  createBooking,
  listBookings,
  listWalkins,
  listReminders,
  updateBooking,
  updateBookingStatus,
  deleteBooking,
  createWalkin,
  updateWalkin,
  updateWalkinStatus,
  deleteWalkin,
  markBookingReminderSent,
  setCurrentBusinessId,
  type BookingUI,
  type WalkinUI,
  type ReminderUI,
} from "@/lib/data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — El Punty" },
      {
        name: "description",
        content: "Panel de administración interno de El Punty.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

type Booking = BookingUI;
type Walkin = WalkinUI;

type ProfileRow = Profile & {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  business_id?: string | null;
};

type BookingForm = {
  name: string;
  phone: string;
  email: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  comments: string;
  price: string;
  duration: string;
  status: Booking["status"];
};

type WalkinForm = {
  name: string;
  phone: string;
  estimated_wait_minutes: string;
  status: Walkin["status"];
};

const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL || "feliperubio104@gmail.com";

const BK = "elpunty_bookings";
const WK = "elpunty_queue";

const emptyBookingForm = (): BookingForm => ({
  name: "",
  phone: "",
  email: "",
  service: services[0]?.id || "",
  barber: barbers[0] || "",
  date: "",
  time: "",
  comments: "",
  price: String(services[0]?.price || 0),
  duration: String(services[0]?.duration || 30),
  status: "confirmed",
});

const emptyWalkinForm = (): WalkinForm => ({
  name: "",
  phone: "",
  estimated_wait_minutes: "15",
  status: "waiting",
});

function AdminPage() {
  const navigate = useNavigate();

  const [lang, setLang] = useState<Lang>("es");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [walkins, setWalkins] = useState<Walkin[]>([]);
  const [reminders, setReminders] = useState<ReminderUI[]>([]);

  const [source, setSource] = useState<
    "supabase" | "localStorage"
  >("supabase");

  const [tab, setTab] = useState<
    "bookings" | "walkins" | "reminders"
  >("bookings");

  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [authError, setAuthError] = useState("");

  const [loading, setLoading] = useState(false);

  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const [notice, setNotice] = useState("");

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const [bookingForm, setBookingForm] =
    useState<BookingForm>(emptyBookingForm);

  const [editingBooking, setEditingBooking] =
    useState<Booking | null>(null);

  const [walkinForm, setWalkinForm] =
    useState<WalkinForm>(emptyWalkinForm);

  const [editingWalkin, setEditingWalkin] =
    useState<Walkin | null>(null);

  const todayIso = () => {
    const d = new Date();

    return `${d.getFullYear()}-${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // ✅ CORREGIDO
  const busyKey = (
    item: Booking | Walkin | ReminderUI,
  ): string => {
    if ("id" in item && item.id) {
      return String(item.id);
    }

    if ("createdAt" in item && item.createdAt) {
      return String(item.createdAt);
    }

    if ("customer_name" in item && item.customer_name) {
      return String(item.customer_name);
    }

    return `busy-${Date.now()}`;
  };

  const runOnce = async (
    key: string,
    fn: () => Promise<void>,
  ) => {
    if (busyIds.has(key)) return;

    setBusyIds((prev) => new Set(prev).add(key));

    try {
      await fn();
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);

        next.delete(key);

        return next;
      });
    }
  };

  const isAdminProfile = (p: ProfileRow | null) => {
    const role = String(p?.role || "").toLowerCase();

    const email = String(p?.email || "").toLowerCase();

    return (
      role === "admin" ||
      role === "owner" ||
      email === ADMIN_EMAIL.toLowerCase()
    );
  };

  const normalizeBookingRow = (row: any): Booking => {
    const date =
      row.date ||
      row.appointment_date ||
      row.booking_date ||
      "";

    const rawTime =
      row.time ||
      row.appointment_time ||
      row.booking_time ||
      "";

    const createdAt =
      row.createdAt ||
      row.created_at ||
      row.inserted_at ||
      Date.now();

    return {
      id: row.id,
      name:
        row.name ||
        row.customer_name ||
        row.client_name ||
        "",
      phone: row.phone || "",
      email: row.email || "",
      service:
        row.service ||
        row.service_name ||
        row.service_id ||
        "",
      barber:
        row.barber ||
        row.professional ||
        row.professional_name ||
        row.barber_name ||
        "",
      date,
      time: String(rawTime || "").slice(0, 5),
      comments:
        row.comments ||
        row.notes ||
        "",
      price:
        Number(row.price ?? row.service_price ?? 0) || 0,
      duration:
        Number(row.duration ?? row.service_duration ?? 30) || 30,
      createdAt:
        typeof createdAt === "number"
          ? createdAt
          : new Date(createdAt).getTime() || Date.now(),
      status: row.status || "confirmed",
      reminder_sent: Boolean(row.reminder_sent),
      business_id: row.business_id || null,
    };
  };

  const mergeBookings = (items: Booking[]) => {
    const map = new Map<string, Booking>();

    items.forEach((item) => {
      const key =
        String(item.id || "") ||
        `${item.name}-${item.phone}-${item.date}-${item.time}-${item.service}`;

      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return Array.from(map.values());
  };

  const refresh = async (_bizId?: string | null) => {
    setLoading(true);

    try {
      const [bk, wk, rm, rawAppointments] = await Promise.all([
        // Importante: aquí NO filtramos por business_id.
        // Así el admin muestra también reservas creadas desde la web pública.
        listBookings(null),
        listWalkins(null),
        listReminders(null),
        supabase.from("appointments").select("*"),
      ]);

      const dataBookings = (bk.data || []).map(normalizeBookingRow);

      const directBookings =
        rawAppointments.error || !rawAppointments.data
          ? []
          : rawAppointments.data.map(normalizeBookingRow);

      setBookings(mergeBookings([...dataBookings, ...directBookings]));
      setWalkins(wk.data || []);
      setReminders(rm.data || []);

      setSource(
        !rawAppointments.error ||
          bk.source === "supabase" ||
          wk.source === "supabase" ||
          rm.source === "supabase"
          ? "supabase"
          : "localStorage",
      );

      if (rawAppointments.error) {
        console.error("[admin] appointments direct load failed", rawAppointments.error);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let mounted = true;
    const stored = localStorage.getItem(
      "elpunty_lang",
    ) as Lang | null;

    if (stored === "es" || stored === "en") {
      setLang(stored);
    }

    const loadAuthAndProfile = async () => {
      setAuthChecked(false);
      setAuthError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        setCurrentBusinessId(null);

        navigate({
          to: "/login",
          replace: true,
        });

        return;
      }

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      if (profileError || !profileData) {
        setProfile(null);
        setCurrentBusinessId(null);
        setAuthError("Usuario sin perfil asignado");
        setAuthChecked(true);
        return;
      }

      const cleanProfile: ProfileRow = {
        ...(profileData as ProfileRow),
        email:
          (profileData as ProfileRow).email ||
          user.email ||
          "",
      };

      if (!cleanProfile.business_id) {
        setProfile(cleanProfile);
        setCurrentBusinessId(null);

        setAuthError(
          "Usuario sin barbería asignada",
        );

        setAuthChecked(true);

        return;
      }

      if (!isAdminProfile(cleanProfile)) {
        setProfile(cleanProfile);

        setCurrentBusinessId(null);

        setAuthError(
          "Esta página es solo para administradores.",
        );

        setAuthChecked(true);

        return;
      }

      setProfile(cleanProfile);

      setCurrentBusinessId(
        cleanProfile.business_id,
      );

      setAuthChecked(true);

      await refresh(cleanProfile.business_id);
    };

    loadAuthAndProfile();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentBusinessId(null);
        setProfile(null);
        setAuthChecked(false);

        navigate({
          to: "/login",
          replace: true,
        });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const logout = async () => {
    await supabase.auth.signOut();

    setCurrentBusinessId(null);

    setProfile(null);

    localStorage.removeItem(
      "elpunty_business_id",
    );

    navigate({
      to: "/login",
      replace: true,
    });
  };

  const serviceName = (id: string) => {
    const s = services.find(
      (x) =>
        x.id === id ||
        x.name_es === id ||
        x.name_en === id,
    );

    return s
      ? lang === "es"
        ? s.name_es
        : s.name_en
      : id;
  };

  const selectServiceForForm = (
    serviceId: string,
  ) => {
    const s = services.find(
      (x) => x.id === serviceId,
    );

    setBookingForm((prev) => ({
      ...prev,
      service: serviceId,
      price: String(
        s?.price ?? prev.price,
      ),
      duration: String(
        s?.duration ?? prev.duration,
      ),
    }));
  };

  const submitBooking = async (
    e: FormEvent,
  ) => {
    e.preventDefault();

    const payload: Booking = {
      id: editingBooking?.id,

      name: bookingForm.name.trim(),

      phone: bookingForm.phone.trim(),

      email: bookingForm.email
        .trim()
        .toLowerCase(),

      service: bookingForm.service,

      barber: bookingForm.barber,

      date: bookingForm.date,

      time: bookingForm.time,

      comments:
        bookingForm.comments.trim(),

      price:
        Number(bookingForm.price) || 0,

      duration:
        Number(bookingForm.duration) ||
        30,

      createdAt:
        editingBooking?.createdAt ||
        Date.now(),

      status:
        bookingForm.status ||
        "confirmed",

      reminder_sent:
        editingBooking?.reminder_sent ||
        false,

      business_id:
        profile?.business_id || null,
    };

    const key = editingBooking
      ? busyKey(editingBooking)
      : "new-booking";

    await runOnce(key, async () => {
      if (editingBooking) {
        await updateBooking(
          editingBooking,
          payload,
        );
      } else {
        await createBooking(payload);
      }

      setEditingBooking(null);

      setBookingForm(emptyBookingForm());

      await refresh();
    });
  };

  const startEditBooking = (
    b: Booking,
  ) => {
    setEditingBooking(b);

    setTab("bookings");

    setBookingForm({
      name: b.name || "",
      phone: b.phone || "",
      email: b.email || "",
      service:
        b.service ||
        services[0]?.id ||
        "",
      barber:
        b.barber ||
        barbers[0] ||
        "",
      date: b.date || "",
      time: b.time || "",
      comments: b.comments || "",
      price: String(b.price || 0),
      duration: String(
        b.duration || 30,
      ),
      status:
        b.status || "confirmed",
    });
  };

  const submitWalkin = async (
    e: FormEvent,
  ) => {
    e.preventDefault();

    const payload: Walkin = {
      id:
        editingWalkin?.id ||
        Date.now(),

      name: walkinForm.name.trim(),

      phone:
        walkinForm.phone.trim(),

      createdAt:
        editingWalkin?.createdAt ||
        Date.now(),

      attended:
        walkinForm.status === "served",

      status:
        walkinForm.status ||
        "waiting",

      estimated_wait_minutes:
        Number(
          walkinForm.estimated_wait_minutes,
        ) || 15,

      business_id:
        profile?.business_id || null,
    };

    const key = editingWalkin
      ? busyKey(editingWalkin)
      : "new-walkin";

    await runOnce(key, async () => {
      if (editingWalkin) {
        await updateWalkin(
          editingWalkin,
          payload,
        );
      } else {
        await createWalkin(
          payload.name || "Walk-in",
          payload.phone || "",
        );
      }

      setEditingWalkin(null);

      setWalkinForm(emptyWalkinForm());

      await refresh();
    });
  };

  const startEditWalkin = (w: Walkin) => {
    setEditingWalkin(w);
    setTab("walkins");

    setWalkinForm({
      name: w.name || "",
      phone: w.phone || "",
      estimated_wait_minutes: String(w.estimated_wait_minutes || 15),
      status: w.status || (w.attended ? "served" : "waiting"),
    });
  };
  const filteredBookings = useMemo(() => {
    const q = query.trim().toLowerCase();

    return bookings
      .filter((b) => {
        const matchesQuery =
          !q ||
          String(b.name || "").toLowerCase().includes(q) ||
          String(b.phone || "").toLowerCase().includes(q) ||
          String(b.email || "").toLowerCase().includes(q) ||
          String(b.barber || "").toLowerCase().includes(q) ||
          serviceName(b.service).toLowerCase().includes(q);

        const matchesStatus =
          statusFilter === "all" || (b.status || "confirmed") === statusFilter;

        const matchesDate =
          dateFilter === "all" ||
          (dateFilter === "today" && b.date === todayIso()) ||
          b.date === dateFilter;

        return matchesQuery && matchesStatus && matchesDate;
      })
      .sort((a, b) =>
        `${b.date || ""} ${b.time || ""}`.localeCompare(
          `${a.date || ""} ${a.time || ""}`,
        ),
      );
  }, [bookings, query, statusFilter, dateFilter, lang]);

  const sortedWalkins = useMemo(() => {
    return [...walkins].sort((a, b) => {
      const order: Record<string, number> = {
        waiting: 0,
        served: 1,
        cancelled: 2,
      };

      const as = a.status || (a.attended ? "served" : "waiting");
      const bs = b.status || (b.attended ? "served" : "waiting");

      const diff = (order[as] ?? 9) - (order[bs] ?? 9);
      if (diff !== 0) return diff;

      return Number(a.createdAt || 0) - Number(b.createdAt || 0);
    });
  }, [walkins]);

  const filteredWalkins = useMemo(() => {
    const q = query.trim().toLowerCase();

    return sortedWalkins.filter((w) => {
      const status = w.status || (w.attended ? "served" : "waiting");

      const matchesQuery =
        !q ||
        String(w.name || "").toLowerCase().includes(q) ||
        String(w.phone || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [sortedWalkins, query, statusFilter]);

  const filteredReminders = useMemo(() => {
    const q = query.trim().toLowerCase();

    return reminders
      .filter((r) => {
        const matchesQuery =
          !q ||
          String(r.customer_name || "").toLowerCase().includes(q) ||
          String(r.email || "").toLowerCase().includes(q) ||
          String(r.phone || "").toLowerCase().includes(q) ||
          String(r.message || "").toLowerCase().includes(q);

        const matchesStatus =
          statusFilter === "all" || r.status === statusFilter;

        const reminderDate = String(r.sent_at || r.created_at || "").slice(0, 10);

        const matchesDate =
          dateFilter === "all" ||
          (dateFilter === "today" && reminderDate === todayIso()) ||
          reminderDate === dateFilter;

        return matchesQuery && matchesStatus && matchesDate;
      })
      .sort((a, b) =>
        String(b.sent_at || b.created_at || "").localeCompare(
          String(a.sent_at || a.created_at || ""),
        ),
      );
  }, [reminders, query, statusFilter, dateFilter]);

  const stats = useMemo(() => {
    const completed = bookings.filter((b) => b.status === "completed");

    const activeWalkins = walkins.filter(
      (w) => (w.status || "waiting") === "waiting",
    );

    return {
      bookings: bookings.length,
      walkins: activeWalkins.length,
      reminders: reminders.filter((r) => r.status === "sent").length,
      revenue: completed.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      pending: bookings.filter((b) => b.status === "pending").length,
      completed: completed.length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings, walkins, reminders]);

  const setBookingStatus = async (
    b: Booking,
    status: NonNullable<Booking["status"]>,
  ) => {
    const key = busyKey(b);

    await runOnce(key, async () => {
      await updateBookingStatus(b, status);
      await refresh();
    });
  };

  const removeBooking = async (b: Booking) => {
    if (
      !confirm(
        lang === "es" ? "¿Eliminar esta reserva?" : "Delete this booking?",
      )
    ) {
      return;
    }

    await runOnce(busyKey(b), async () => {
      await deleteBooking(b);
      await refresh();
    });
  };

  const attendWalkin = async (w: Walkin) => {
    await runOnce(busyKey(w), async () => {
      await updateWalkinStatus(w, "served");
      await refresh();
    });
  };

  const cancelWalkin = async (w: Walkin) => {
    await runOnce(busyKey(w), async () => {
      await updateWalkinStatus(w, "cancelled");
      await refresh();
    });
  };

  const removeWalkin = async (w: Walkin) => {
    if (
      !confirm(
        lang === "es" ? "¿Eliminar este walk-in?" : "Delete this walk-in?",
      )
    ) {
      return;
    }

    await runOnce(busyKey(w), async () => {
      await deleteWalkin(w);
      await refresh();
    });
  };

  const resendReminder = async (b: Booking) => {
    const key = busyKey(b);
    const appointmentTime = String(b.time || "").slice(0, 5);
    const message = `Hola ${b.name}, te recordamos tu cita en El Punty a las ${appointmentTime}.`;

    await runOnce(key, async () => {
      setNotice("");

      const { data, error } = await supabase.functions.invoke(
        "send-reminder-email",
        {
          body: {
            to: b.email,
            customer_name: b.name,
            message,
            appointment_date: b.date,
            appointment_time: appointmentTime,
          },
        },
      );

      if (error || data?.ok === false) {
        console.error("[admin] resend reminder failed", error || data);
        setNotice("No se pudo enviar el recordatorio.");
        return;
      }

      await markBookingReminderSent(b);
      setNotice("Recordatorio enviado correctamente.");
      await refresh();
    });
  };

  const fmtGBP = (n: number) => `£${(Number(n) || 0).toFixed(2)}`;

  const revenueByDay = useMemo(() => {
    const map = new Map<string, number>();

    bookings
      .filter((b) => b.status === "completed" && Number(b.price) > 0)
      .forEach((b) => {
        const k = b.date || "—";
        map.set(k, (map.get(k) || 0) + (Number(b.price) || 0));
      });

    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, total]) => ({ date, total }));
  }, [bookings]);

  const exportCSV = () => {
    const headers = [
      "client",
      "phone",
      "email",
      "service",
      "professional",
      "date_time",
      "price",
      "status",
    ];

    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const rows = filteredBookings.map((b) =>
      [
        b.name,
        b.phone,
        b.email,
        serviceName(b.service),
        b.barber,
        `${b.date} ${b.time}`,
        fmtGBP(b.price),
        b.status || "confirmed",
      ]
        .map(esc)
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "elpunty-admin.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const clearLocalOnly = () => {
    if (!confirm("¿Limpiar solo datos locales del navegador?")) return;

    localStorage.removeItem(BK);
    localStorage.removeItem(WK);
    localStorage.removeItem("elpunty_myqueue");
    refresh();
  };
  const statusBadge = (s?: string) => {
    const raw = s || "confirmed";
    const cls =
      raw === "completed" || raw === "sent" || raw === "served"
        ? "bg-green-100 text-green-700"
        : raw === "cancelled" || raw === "failed"
          ? "bg-red-100 text-red-700"
          : raw === "confirmed"
            ? "bg-blue-100 text-blue-700"
            : "bg-yellow-100 text-yellow-800";

    return (
      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cls}`}>
        {raw}
      </span>
    );
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/40">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }
  if (!profile || !profile.business_id || !isAdminProfile(profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/40 px-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-card p-8 text-center space-y-4">
          <h1 className="text-lg font-bold text-brand-blue">
            Acceso restringido
          </h1>

          <p className="text-sm text-muted-foreground">
            {authError || "Esta página es solo para administradores."}
          </p>

          <button
            onClick={logout}
            className="text-xs font-semibold px-4 py-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <img
            src={logo}
            alt="El Punty"
            className="w-10 h-10 rounded-lg object-cover"
          />

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-brand-blue leading-tight">
              Panel admin
            </h1>

            <p className="text-xs text-muted-foreground">
              Gestión interna · datos en vivo · Fuente: {source}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end leading-tight mr-1">
              <span className="text-xs font-semibold text-brand-blue">
                {profile.full_name || profile.email}
              </span>

              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {profile.role || "admin"}
              </span>
            </div>

            <button
              onClick={() => {
                const nextLang = lang === "es" ? "en" : "es";
                setLang(nextLang);
                localStorage.setItem("elpunty_lang", nextLang);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/70"
            >
              {lang.toUpperCase()}
            </button>

            <Link
              to="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-brand text-white shadow-soft"
            >
              ← Volver al sitio
            </Link>

            <button
              onClick={logout}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {notice && (
          <div className="bg-white rounded-2xl shadow-card p-4 text-sm font-semibold text-brand-blue">
            {notice}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { k: "Reservas", v: stats.bookings, c: "text-brand-blue" },
            { k: "Walk-ins activos", v: stats.walkins, c: "text-brand-blue" },
            { k: "Recordatorios", v: stats.reminders, c: "text-yellow-700" },
            { k: "Confirmadas", v: stats.confirmed, c: "text-blue-600" },
            { k: "Pendientes", v: stats.pending, c: "text-yellow-700" },
            { k: "Completadas", v: stats.completed, c: "text-green-600" },
            { k: "Canceladas", v: stats.cancelled, c: "text-red-600" },
            { k: "Ingresos reales", v: fmtGBP(stats.revenue), c: "text-brand-red" },
          ].map((item) => (
            <div key={item.k} className="bg-card rounded-2xl p-4 shadow-card">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                {item.k}
              </div>

              <div className={`text-2xl font-bold mt-1 ${item.c}`}>
                {item.v}
              </div>
            </div>
          ))}
        </div>

        <section className="bg-card rounded-2xl shadow-card p-5">
          <h2 className="text-base font-bold text-brand-blue mb-3">
            Ingresos por día
          </h2>

          {revenueByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos.</p>
          ) : (
            <ul className="divide-y">
              {revenueByDay.map((r) => (
                <li
                  key={r.date}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="font-medium">{r.date}</span>
                  <span className="font-bold text-brand-red">
                    {fmtGBP(r.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          <form
            onSubmit={submitBooking}
            className="bg-card rounded-2xl shadow-card p-5 grid sm:grid-cols-2 gap-3"
          >
            <div className="sm:col-span-2 flex items-center justify-between">
              <h2 className="font-bold text-brand-blue">
                {editingBooking ? "Editar reserva" : "Nueva reserva"}
              </h2>

              {editingBooking && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingBooking(null);
                    setBookingForm(emptyBookingForm());
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-secondary"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <input
              required
              value={bookingForm.name}
              onChange={(e) =>
                setBookingForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Nombre"
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            />

            <input
              required
              value={bookingForm.phone}
              onChange={(e) =>
                setBookingForm((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="Teléfono"
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            />

            <input
              value={bookingForm.email}
              onChange={(e) =>
                setBookingForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="Email"
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm sm:col-span-2"
            />

            <select
              value={bookingForm.service}
              onChange={(e) => selectServiceForForm(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {lang === "es" ? s.name_es : s.name_en}
                </option>
              ))}
            </select>

            <input
              value={bookingForm.barber}
              onChange={(e) =>
                setBookingForm((p) => ({ ...p, barber: e.target.value }))
              }
              placeholder="Profesional"
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            />

            <input
              required
              type="date"
              value={bookingForm.date}
              onChange={(e) =>
                setBookingForm((p) => ({ ...p, date: e.target.value }))
              }
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            />

            <input
              required
              type="time"
              value={bookingForm.time}
              onChange={(e) =>
                setBookingForm((p) => ({ ...p, time: e.target.value }))
              }
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            />

            <input
              value={bookingForm.price}
              onChange={(e) =>
                setBookingForm((p) => ({ ...p, price: e.target.value }))
              }
              placeholder="Precio"
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            />

            <input
              value={bookingForm.duration}
              onChange={(e) =>
                setBookingForm((p) => ({ ...p, duration: e.target.value }))
              }
              placeholder="Duración"
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            />

            <select
              value={bookingForm.status || "confirmed"}
              onChange={(e) =>
                setBookingForm((p) => ({
                  ...p,
                  status: e.target.value as Booking["status"],
                }))
              }
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            >
              <option value="confirmed">Confirmada</option>
              <option value="pending">Pendiente</option>
              <option value="completed">Completada</option>
              <option value="cancelled">Cancelada</option>
            </select>

            <textarea
              value={bookingForm.comments}
              onChange={(e) =>
                setBookingForm((p) => ({ ...p, comments: e.target.value }))
              }
              placeholder="Comentarios"
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm sm:col-span-2"
            />

            <button
              disabled={busyIds.has(
                editingBooking ? busyKey(editingBooking) : "new-booking",
              )}
              className="sm:col-span-2 bg-gradient-brand text-white rounded-full py-3 text-sm font-semibold disabled:opacity-50"
            >
              Guardar reserva
            </button>
        </form>

          <form
            onSubmit={submitWalkin}
            className="bg-card rounded-2xl shadow-card p-5 grid sm:grid-cols-2 gap-3"
          >
            <div className="sm:col-span-2 flex items-center justify-between">
              <h2 className="font-bold text-brand-blue">
                {editingWalkin ? "Editar walk-in" : "Nuevo walk-in"}
              </h2>

              {editingWalkin && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingWalkin(null);
                    setWalkinForm(emptyWalkinForm());
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-secondary"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            <input
              required
              value={walkinForm.name}
              onChange={(e) =>
                setWalkinForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Nombre"
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            />

            <input
              value={walkinForm.phone}
              onChange={(e) =>
                setWalkinForm((p) => ({ ...p, phone: e.target.value }))
              }
              placeholder="Teléfono"
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            />

            <input
              value={walkinForm.estimated_wait_minutes}
              onChange={(e) =>
                setWalkinForm((p) => ({
                  ...p,
                  estimated_wait_minutes: e.target.value,
                }))
              }
              placeholder="Espera min"
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            />

            <select
              value={walkinForm.status || "waiting"}
              onChange={(e) =>
                setWalkinForm((p) => ({
                  ...p,
                  status: e.target.value as Walkin["status"],
                }))
              }
              className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
            >
              <option value="waiting">En cola</option>
              <option value="served">Atendido</option>
              <option value="cancelled">Cancelado</option>
            </select>

            <button
              disabled={busyIds.has(
                editingWalkin ? busyKey(editingWalkin) : "new-walkin",
              )}
              className="sm:col-span-2 bg-gradient-brand text-white rounded-full py-3 text-sm font-semibold disabled:opacity-50"
            >
              Guardar walk-in
            </button>
          </form>
        </section>

        <div className="bg-white rounded-2xl shadow-card p-4 grid md:grid-cols-4 gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente, teléfono, email o profesional..."
            className="md:col-span-2 px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="confirmed">Confirmada</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
            <option value="waiting">En cola</option>
            <option value="served">Atendido</option>
            <option value="sent">Enviado</option>
            <option value="failed">Fallido</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-secondary/60 text-sm"
          >
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>

            {[...new Set(bookings.map((b) => b.date).filter(Boolean))]
              .sort()
              .reverse()
              .map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white rounded-full p-1 shadow-card">
            {(["bookings", "walkins", "reminders"] as const).map((id) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${
                  tab === id
                    ? "bg-gradient-brand text-white shadow-soft"
                    : "text-muted-foreground"
                }`}
              >
                {id === "bookings"
                  ? "Reservas"
                  : id === "walkins"
                    ? "Walk-ins"
                    : "Recordatorios"}
              </button>
            ))}
          </div>

          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              onClick={() => refresh()}
              disabled={loading}
              className="text-xs font-semibold px-3 py-2 rounded-full bg-white shadow-card disabled:opacity-50"
            >
              🔄 {loading ? "Cargando…" : "Actualizar"}
            </button>

            <button
              onClick={exportCSV}
              className="text-xs font-semibold px-3 py-2 rounded-full bg-white shadow-card"
            >
              ⬇️ Exportar CSV
            </button>

            <button
              onClick={clearLocalOnly}
              className="text-xs font-semibold px-3 py-2 rounded-full bg-yellow-50 text-yellow-800"
            >
              🧹 Limpiar datos locales
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-card overflow-hidden">
          {tab === "bookings" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Servicio</th>
                    <th className="p-3">Profesional</th>
                    <th className="p-3">Fecha/Hora</th>
                    <th className="p-3">Precio</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Sin datos.
                      </td>
                    </tr>
                  )}

                  {filteredBookings.map((b) => {
                    const key = busyKey(b);
                    const isBusy = busyIds.has(key);

                    return (
                      <tr key={b.id || b.createdAt} className="border-t">
                        <td className="p-3">
                          <div className="font-semibold">{b.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {b.phone}
                          </div>

                          {b.email && (
                            <div className="text-xs text-muted-foreground">
                              {b.email}
                            </div>
                          )}
                        </td>

                        <td className="p-3">{serviceName(b.service)}</td>

                        <td className="p-3">{b.barber || "—"}</td>

                        <td className="p-3 whitespace-nowrap">
                          {b.date} · {b.time}
                        </td>

                        <td className="p-3 font-semibold">
                          {fmtGBP(b.price)}
                        </td>

                        <td className="p-3">{statusBadge(b.status)}</td>

                        <td className="p-3">
                          <div className="flex gap-1.5 justify-end flex-wrap">
                            <button
                              disabled={isBusy}
                              onClick={() => startEditBooking(b)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue disabled:opacity-50"
                            >
                              ✎ Editar
                            </button>

                            <button
                              disabled={isBusy}
                              onClick={() => setBookingStatus(b, "confirmed")}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 disabled:opacity-50"
                            >
                              ✓ Confirmar
                            </button>

                            <button
                              disabled={isBusy}
                              onClick={() => setBookingStatus(b, "completed")}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 disabled:opacity-50"
                            >
                              ✓ Completar
                            </button>

                            <button
                              disabled={isBusy}
                              onClick={() => setBookingStatus(b, "cancelled")}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-800 disabled:opacity-50"
                            >
                              ✕ Cancelar
                            </button>

                            <button
                              disabled={isBusy}
                              onClick={() => resendReminder(b)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 disabled:opacity-50"
                            >
                              📨 Reenviar recordatorio
                            </button>

                            <button
                              disabled={isBusy}
                              onClick={() => removeBooking(b)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 disabled:opacity-50"
                            >
                              🗑 Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "walkins" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3">Pos.</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Entrada</th>
                    <th className="p-3">Espera</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredWalkins.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Sin datos.
                      </td>
                    </tr>
                  )}

                  {filteredWalkins.map((w) => {
                    const key = busyKey(w);

                    const isBusy = busyIds.has(key);

                    const wstatus =
                      w.status ||
                      (w.attended ? "served" : "waiting");

                    const position =
                      sortedWalkins
                        .filter(
                          (x) =>
                            (x.status || "waiting") === "waiting",
                        )
                        .findIndex((x) => x.id === w.id) + 1;

                    return (
                      <tr key={w.id} className="border-t">
                        <td className="p-3 font-bold">
                          {wstatus === "waiting"
                            ? `#${position}`
                            : "—"}
                        </td>

                        <td className="p-3">
                          <div className="font-semibold">
                            {w.name || `Walk-in ${w.id}`}
                          </div>

                          {w.phone && (
                            <div className="text-xs text-muted-foreground">
                              {w.phone}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-xs text-muted-foreground">
                          {w.createdAt
                            ? new Date(w.createdAt).toLocaleString(
                                lang === "es"
                                  ? "es-ES"
                                  : "en-GB",
                              )
                            : "—"}
                        </td>

                        <td className="p-3">
                          {w.estimated_wait_minutes
                            ? `~${w.estimated_wait_minutes}m`
                            : "—"}
                        </td>

                        <td className="p-3">
                          {statusBadge(wstatus)}
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex gap-1.5 justify-end flex-wrap">
                            <button
                              disabled={isBusy}
                              onClick={() => startEditWalkin(w)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-brand-blue/10 text-brand-blue disabled:opacity-50"
                            >
                              ✎ Editar
                            </button>

                            {wstatus === "waiting" && (
                              <>
                                <button
                                  disabled={isBusy}
                                  onClick={() => attendWalkin(w)}
                                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 disabled:opacity-50"
                                >
                                  ✓ Atendido
                                </button>

                                <button
                                  disabled={isBusy}
                                  onClick={() => cancelWalkin(w)}
                                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 disabled:opacity-50"
                                >
                                  ✕ Cancelar
                                </button>
                              </>
                            )}

                            <button
                              disabled={isBusy}
                              onClick={() => removeWalkin(w)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 disabled:opacity-50"
                            >
                              🗑 Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "reminders" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Fecha/Hora</th>
                    <th className="p-3">Canal</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Mensaje</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReminders.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Sin datos.
                      </td>
                    </tr>
                  )}

                  {filteredReminders.map((r) => (
                    <tr
                      key={
                        r.id ||
                        `${r.customer_name}-${r.created_at}`
                      }
                      className="border-t"
                    >
                      <td className="p-3">
                        <div className="font-semibold">
                          {r.customer_name}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {r.email || r.phone}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {r.sent_at || r.created_at
                          ? new Date(
                              r.sent_at ||
                                r.created_at ||
                                "",
                            ).toLocaleString(
                              lang === "es"
                                ? "es-ES"
                                : "en-GB",
                            )
                          : "—"}
                      </td>

                      <td className="p-3 capitalize">
                        {r.channel || "—"}
                      </td>

                      <td className="p-3">
                        {statusBadge(r.status)}
                      </td>

                      <td className="p-3 max-w-md">
                        {r.message || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {barbers.length} profesionales · {services.length} servicios
        </p>
      </main>
    </div>
  );
}
