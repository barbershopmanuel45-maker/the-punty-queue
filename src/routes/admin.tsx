import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type AppointmentRow = {
  id?: string;
  customer_name?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  service_name?: string | null;
  service?: string | null;
  service_price?: number | null;
  service_duration?: number | null;
  barber?: string | null;
  appointment_date?: string | null;
  appointment_time?: string | null;
  date?: string | null;
  time?: string | null;
  status?: string | null;
  created_at?: string | null;
  source?: "appointments" | "bookings";
};

type ReviewRow = {
  id?: string;
  name: string | null;
  role: string | null;
  rating: number | null;
  comment: string | null;
  type?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type WalkinRow = {
  id?: string;
  customer_name?: string | null;
  name?: string | null;
  phone?: string | null;
  joined_at?: string | null;
  estimated_wait_minutes?: number | null;
  status?: string | null;
};

type ProfileRow = {
  id: string;
  role: string;
  email?: string;
};

const SERVICES = [
  { name: "Corte al ras / Buzz cut", price: 14, duration: 20 },
  { name: "Niños / Kids", price: 16, duration: 25 },
  { name: "Jubilados +60 / OAP", price: 10, duration: 25 },
  { name: "Corte de pelo / Haircut", price: 20, duration: 30 },
  { name: "Degradado / Skin fade", price: 22, duration: 35 },
  { name: "Recorte de barba con navaja / Beard trim with razor", price: 16, duration: 25 },
  { name: "Degradado y barba / Skin fade and beard", price: 26, duration: 45 },
  { name: "Recorte de barba / Beard trim", price: 6, duration: 15 },
  { name: "Depilación de cejas / Eyebrow waxing", price: 5, duration: 15 },
  { name: "Cejas hombre / Men's eyebrows", price: 2, duration: 10 },
  { name: "⭐ Servicio VIP completo ROYAL / ROYAL Full VIP Service", price: 36, duration: 60 },
];

const STAFF = ["Junior"];

function StatCard({
  label,
  value,
  colorClass,
  borderClass,
}: {
  label: string;
  value: string | number;
  colorClass?: string;
  borderClass?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 shadow-sm border-l-4 ${
        borderClass || "border-l-brand-blue"
      }`}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${colorClass || "text-brand-blue"}`}>
        {value}
      </p>
    </div>
  );
}

function statusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === "confirmed" || s === "pending") return "Pendiente / Pending";
  if (s === "completed") return "Completada / Completed";
  if (s === "cancelled") return "Cancelada / Cancelled";
  return status;
}

function AdminPage() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [walkins, setWalkins] = useState<WalkinRow[]>([]);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [walkinsLoading, setWalkinsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AppointmentRow | null>(null);
  const [editForm, setEditForm] = useState<AppointmentRow>({});
  const [saving, setSaving] = useState(false);

  function openEdit(item: AppointmentRow) {
    setEditing(item);
    setEditForm({
      customer_name: item.customer_name || item.name || "",
      phone: item.phone || "",
      email: item.email || "",
      service_name: item.service_name || item.service || "",
      service_price:
        typeof item.service_price === "number" ? item.service_price : null,
      service_duration:
        typeof item.service_duration === "number" ? item.service_duration : null,
      barber: item.barber || "",
      appointment_date: item.appointment_date || item.date || "",
      appointment_time: (item.appointment_time || item.time || "").slice(0, 5),
      status: item.status || "confirmed",
    });
  }

  function closeEdit() {
    setEditing(null);
    setEditForm({});
  }

  async function saveEdit() {
    if (!editing?.id) return;

    const name = String(editForm.customer_name || "").trim();
    const date = String(editForm.appointment_date || "").trim();
    const time = String(editForm.appointment_time || "").trim();

    if (!name) {
      alert("Nombre obligatorio / Name required");
      return;
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      alert("Fecha inválida (YYYY-MM-DD) / Invalid date");
      return;
    }
    if (time && !/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      alert("Hora inválida (HH:MM) / Invalid time");
      return;
    }

    const priceNum =
      editForm.service_price === null || editForm.service_price === undefined || (editForm.service_price as any) === ""
        ? null
        : Number(editForm.service_price);
    const durationNum =
      editForm.service_duration === null || editForm.service_duration === undefined || (editForm.service_duration as any) === ""
        ? null
        : Number(editForm.service_duration);

    if (priceNum !== null && Number.isNaN(priceNum)) {
      alert("Precio inválido / Invalid price");
      return;
    }
    if (durationNum !== null && Number.isNaN(durationNum)) {
      alert("Duración inválida / Invalid duration");
      return;
    }

    setSaving(true);

    try {
      if (editing.source === "appointments") {
        const payload: Record<string, any> = {
          customer_name: name,
          phone: editForm.phone || "",
          email: editForm.email || "",
          service_name: editForm.service_name || "",
          service_price: priceNum,
          service_duration: durationNum,
          barber: editForm.barber || "",
          appointment_date: date || null,
          appointment_time: time || null,
          status: editForm.status || "confirmed",
        };
        const { error } = await supabase
          .from("appointments")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const payload: Record<string, any> = {
          name,
          phone: editForm.phone || "",
          email: editForm.email || "",
          service: editForm.service_name || "",
          barber: editForm.barber || "",
          date: date || null,
          time: time || null,
          status: editForm.status || "confirmed",
        };
        const { error } = await supabase
          .from("bookings")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      }

      closeEdit();
      await loadAppointments();
    } catch (e: any) {
      console.error("[admin] saveEdit failed", e);
      alert("Error guardando: " + (e?.message || "unknown"));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item: AppointmentRow, status: string) {
    if (!item.id) return;
    const table = item.source === "appointments" ? "appointments" : "bookings";
    const { error } = await supabase
      .from(table)
      .update({ status })
      .eq("id", item.id);
    if (error) {
      console.error("[admin] changeStatus failed", error);
      alert("Error: " + error.message);
      return;
    }
    await loadAppointments();
  }

  function statusBadgeClass(status?: string | null) {
    const s = String(status || "confirmed").toLowerCase();
    if (s === "completed")
      return "bg-blue-100 text-blue-700 border border-blue-200";
    if (s === "cancelled")
      return "bg-red-100 text-red-700 border border-red-200";
    if (s === "pending")
      return "bg-amber-100 text-amber-800 border border-amber-200";
    return "bg-green-100 text-green-700 border border-green-200";
  }

  useEffect(() => {
    async function validateAdminAccess() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate({ to: "/login" });
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      const { data: roleRows, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesError || error || !profileData) {
        await supabase.auth.signOut();
        navigate({ to: "/login" });
        return;
      }

      const roles = (roleRows || []).map((item) => String(item.role || "").toLowerCase());
      const role = roles.includes("owner")
        ? "owner"
        : roles.includes("admin")
          ? "admin"
          : String(profileData.role || "").toLowerCase();

      if (role !== "admin" && role !== "owner") {
        await supabase.auth.signOut();
        navigate({ to: "/login" });
        return;
      }

      setProfile({ ...profileData, role });
      setAuthChecked(true);

      await Promise.all([loadAppointments(), loadReviews(), loadWalkins()]);
    }

    validateAdminAccess();
  }, [navigate]);

  async function loadAppointments() {
    setLoading(true);

    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from("appointments")
      .select(
        "id, customer_name, phone, email, service_name, service_price, service_duration, barber, appointment_date, appointment_time, status, created_at"
      )
      .order("appointment_date", { ascending: false });

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, name, phone, email, service, barber, date, time, status, created_at")
      .order("created_at", { ascending: false });

    const normalizedAppointments =
      appointmentsError || !appointmentsData
        ? []
        : appointmentsData.map((item) => ({
            ...item,
            source: "appointments" as const,
          }));

    const normalizedBookings =
      bookingsError || !bookingsData
        ? []
        : bookingsData.map((item) => ({
            ...item,
            source: "bookings" as const,
          }));

    setAppointments([...normalizedAppointments, ...normalizedBookings]);
    setLoading(false);
  }

  async function loadReviews() {
    setReviewsLoading(true);

    const { data, error } = await supabase
      .from("reviews")
      .select("id, name, role, rating, comment, type, is_active, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reviews:", error);
      setReviews([]);
    } else {
      setReviews(data || []);
    }

    setReviewsLoading(false);
  }

  async function loadWalkins() {
    setWalkinsLoading(true);

    const { data, error } = await supabase
      .from("walkins")
      .select("id, customer_name, name, phone, joined_at, estimated_wait_minutes, status")
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error loading walkins:", error);
      setWalkins([]);
    } else {
      setWalkins(data || []);
    }

    setWalkinsLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  async function deleteAppointment(item: AppointmentRow) {
    if (!item.id) return;

    const ok = confirm("¿Eliminar esta reserva?");
    if (!ok) return;

    if (item.source === "appointments") {
      await supabase.from("appointments").delete().eq("id", item.id);
    } else {
      await supabase.from("bookings").delete().eq("id", item.id);
    }

    await loadAppointments();
  }

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const dateA = getDate(a);
      const dateB = getDate(b);
      const timeA = getTime(a);
      const timeB = getTime(b);
      const aValid = dateA && dateA !== "—";
      const bValid = dateB && dateB !== "—";

      if (!aValid && !bValid) return 0;
      if (!aValid) return 1;
      if (!bValid) return -1;

      if (dateA !== dateB) return dateA.localeCompare(dateB);
      if (timeA === "—" && timeB === "—") return 0;
      if (timeA === "—") return 1;
      if (timeB === "—") return -1;
      return timeA.localeCompare(timeB);
    });
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return sortedAppointments;

    return sortedAppointments.filter((item) => {
      const customer = item.customer_name || item.name || "";
      const service = item.service_name || item.service || "";
      const phone = item.phone || "";
      const email = item.email || "";
      const barber = item.barber || "";
      const status = item.status || "";

      return (
        customer.toLowerCase().includes(q) ||
        service.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        barber.toLowerCase().includes(q) ||
        status.toLowerCase().includes(q)
      );
    });
  }, [sortedAppointments, query]);

  function getCustomerName(item: AppointmentRow) {
    return item.customer_name || item.name || "Cliente";
  }

  function getServiceName(item: AppointmentRow) {
    return item.service_name || item.service || "Servicio";
  }

  function getServicePrice(item: AppointmentRow) {
    const price = item.service_price;

    if (typeof price === "number") return `£${price}`;

    const match = SERVICES.find(
      (service) =>
        service.name.toLowerCase() === getServiceName(item).toLowerCase()
    );

    return match ? `£${match.price}` : "—";
  }

  function getNumericPrice(item: AppointmentRow) {
    const price = item.service_price;
    if (typeof price === "number") return price;

    const match = SERVICES.find(
      (service) =>
        service.name.toLowerCase() === getServiceName(item).toLowerCase()
    );

    return match ? match.price : null;
  }

  function getServiceDuration(item: AppointmentRow) {
    const duration = item.service_duration;

    if (typeof duration === "number") return `${duration} min`;

    const match = SERVICES.find(
      (service) =>
        service.name.toLowerCase() === getServiceName(item).toLowerCase()
    );

    return match ? `${match.duration} min` : "—";
  }

  function getDate(item: AppointmentRow) {
    return item.appointment_date || item.date || "—";
  }

  function getTime(item: AppointmentRow) {
    return item.appointment_time || item.time || "—";
  }

  function splitByDate(items: AppointmentRow[]) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const upcoming: AppointmentRow[] = [];
    const past: AppointmentRow[] = [];

    for (const item of items) {
      const dateStr = getDate(item);
      if (!dateStr || dateStr === "—") {
        upcoming.push(item);
        continue;
      }

      if (dateStr >= todayStr) {
        upcoming.push(item);
      } else {
        past.push(item);
      }
    }

    return { upcoming, past };
  }

  const { upcoming: allUpcoming, past: allPast } = useMemo(
    () => splitByDate(sortedAppointments),
    [sortedAppointments]
  );

  const { upcoming: upcomingAppointments, past: pastAppointments } = useMemo(
    () => splitByDate(filteredAppointments),
    [filteredAppointments]
  );

  const totalCount = appointments.length;

  const completedCount = useMemo(
    () => appointments.filter((item) => String(item.status || "confirmed").toLowerCase() === "completed").length,
    [appointments]
  );

  const cancelledCount = useMemo(
    () => appointments.filter((item) => String(item.status || "confirmed").toLowerCase() === "cancelled").length,
    [appointments]
  );

  const estimatedRevenue = useMemo(
    () =>
      appointments.reduce((sum, item) => {
        const status = String(item.status || "confirmed").toLowerCase();
        if (status === "cancelled") return sum;
        const price = getNumericPrice(item);
        return sum + (price || 0);
      }, 0),
    [appointments]
  );

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold text-brand-blue">
            Verificando acceso...
          </div>
          <p className="mt-2 text-muted-foreground">
            Validando permisos de administrador.
          </p>
        </div>
      </div>
    );
  }

  function exportCSV() {
    const headers = [
      "Cliente / Customer",
      "Telefono / Phone",
      "Email",
      "Servicio / Service",
      "Precio / Price",
      "Duracion / Duration",
      "Barbero / Barber",
      "Fecha / Date",
      "Hora / Time",
      "Estado / Status",
      "Origen / Source",
    ];

    const rows = filteredAppointments.map((item) => {
      const status = String(item.status || "confirmed").toLowerCase();
      return [
        getCustomerName(item),
        item.phone || "",
        item.email || "",
        getServiceName(item),
        getServicePrice(item),
        getServiceDuration(item),
        item.barber || "",
        getDate(item),
        getTime(item),
        statusLabel(status),
        item.source === "appointments" ? "Appointments" : "Bookings",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reservas-juniorfadefactory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function renderAppointmentsTable(
    items: AppointmentRow[],
    title: string,
    emptyMessage: string
  ) {
    return (
      <div className="mb-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-secondary px-4 py-3">
          <h2 className="text-lg font-bold text-brand-blue">{title}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-sm">
            <thead className="bg-secondary">
              <tr>
                <th className="w-[12%] px-3 py-2 text-left font-medium text-muted-foreground">
                  Cliente / Customer
                </th>
                <th className="w-[15%] px-3 py-2 text-left font-medium text-muted-foreground">
                  Contacto / Contact
                </th>
                <th className="w-[18%] px-3 py-2 text-left font-medium text-muted-foreground">
                  Servicio / Service
                </th>
                <th className="w-[8%] px-3 py-2 text-left font-medium text-muted-foreground">
                  Precio
                </th>
                <th className="w-[8%] px-3 py-2 text-left font-medium text-muted-foreground">
                  Duración
                </th>
                <th className="w-[8%] px-3 py-2 text-left font-medium text-muted-foreground">
                  Barbero
                </th>
                <th className="w-[11%] px-3 py-2 text-left font-medium text-muted-foreground">
                  Fecha / Date
                </th>
                <th className="w-[15%] px-3 py-2 text-left font-medium text-muted-foreground">
                  Estado / Status
                </th>
                <th className="sticky right-0 z-20 w-[10%] border-l border-border bg-secondary px-3 py-2 text-right font-medium text-muted-foreground">
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center">
                    Cargando reservas...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const status = String(item.status || "confirmed").toLowerCase();
                  return (
                    <tr
                      key={`${item.source}-${item.id}`}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2">
                        <div className="truncate font-semibold" title={getCustomerName(item)}>
                          {getCustomerName(item)}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate" title={item.phone || ""}>
                          {item.phone || "—"}
                        </div>
                        <div
                          className="truncate text-xs text-muted-foreground"
                          title={item.email || ""}
                        >
                          {item.email || "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate" title={getServiceName(item)}>
                          {getServiceName(item)}
                        </div>
                      </td>
                      <td className="px-3 py-2">{getServicePrice(item)}</td>
                      <td className="px-3 py-2">{getServiceDuration(item)}</td>
                      <td className="px-3 py-2 truncate">
                        {item.barber || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate">{getDate(item)}</div>
                        <div className="text-xs text-muted-foreground">
                          {getTime(item) !== "—" ? getTime(item) : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={status}
                          onChange={(e) => changeStatus(item, e.target.value)}
                          className={`w-full min-w-[120px] rounded-full px-2 py-1 text-xs font-semibold focus:outline-none ${statusBadgeClass(status)}`}
                        >
                          <option value="confirmed">
                            {statusLabel("confirmed")}
                          </option>
                          <option value="completed">
                            {statusLabel("completed")}
                          </option>
                          <option value="cancelled">
                            {statusLabel("cancelled")}
                          </option>
                        </select>
                      </td>
                      <td className="sticky right-0 z-10 border-l border-border bg-card px-3 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(item)}
                          className="mr-2 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteAppointment(item)}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-brand-blue">
              Panel admin / Admin panel
            </h1>
            <p className="text-sm text-muted-foreground">
              JuniorFADEfactory · Barber Shop
            </p>

            {profile && (
              <p className="mt-1 text-xs text-muted-foreground">
                Logged as:
                <span className="ml-1 font-semibold text-brand-blue">
                  {profile.role}
                </span>
              </p>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Total reservas / Total bookings"
            value={totalCount}
            colorClass="text-brand-blue"
            borderClass="border-l-brand-blue"
          />
          <StatCard
            label="Próximas reservas / Upcoming"
            value={allUpcoming.length}
            colorClass="text-brand-blue"
            borderClass="border-l-brand-blue"
          />
          <StatCard
            label="Reservas pasadas / Past"
            value={allPast.length}
            colorClass="text-brand-gray"
            borderClass="border-l-brand-gray"
          />
          <StatCard
            label="Completadas / Completed"
            value={completedCount}
            colorClass="text-brand-blue"
            borderClass="border-l-brand-blue"
          />
          <StatCard
            label="Canceladas / Cancelled"
            value={cancelledCount}
            colorClass="text-brand-red"
            borderClass="border-l-brand-red"
          />
          <StatCard
            label="Ingresos estimados / Est. revenue"
            value={`£${estimatedRevenue.toFixed(2)}`}
            colorClass="text-brand-blue"
            borderClass="border-l-brand-blue"
          />
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Buscar por cliente, teléfono, email, servicio o barbero..."
              className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <button
            onClick={exportCSV}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Exportar CSV
          </button>
        </div>

        {renderAppointmentsTable(
          upcomingAppointments,
          "Próximas reservas / Upcoming bookings",
          "No hay próximas reservas / No upcoming bookings."
        )}

        {renderAppointmentsTable(
          pastAppointments,
          "Reservas pasadas / Past bookings",
          "No hay reservas pasadas / No past bookings."
        )}

        <div className="mb-10 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-brand-blue">
            Servicios y precios
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <div key={service.name} className="rounded-xl border bg-white p-4">
                <h3 className="font-bold">{service.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Duración: {service.duration} minutos
                </p>
                <p className="mt-2 text-xl font-bold text-brand-blue">
                  £{service.price}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-brand-blue">
            Equipo
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            {STAFF.map((person) => (
              <div key={person} className="rounded-xl border bg-white p-4">
                <h3 className="font-bold">{person}</h3>
                <p className="text-sm text-muted-foreground">
                  Barbero / Barber
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-brand-blue">Walk-ins</h2>

            <button
              onClick={loadWalkins}
              className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-secondary"
            >
              Actualizar
            </button>
          </div>

          {walkinsLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              Cargando walk-ins...
            </div>
          ) : walkins.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No hay walk-ins.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="p-4 text-left">Cliente</th>
                    <th className="p-4 text-left">Teléfono</th>
                    <th className="p-4 text-left">Llegada</th>
                    <th className="p-4 text-left">Espera estimada</th>
                    <th className="p-4 text-left">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {walkins.map((walkin) => (
                    <tr key={walkin.id} className="border-t">
                      <td className="p-4 font-semibold">
                        {walkin.customer_name || walkin.name || "Cliente"}
                      </td>
                      <td className="p-4">{walkin.phone || "—"}</td>
                      <td className="p-4">{walkin.joined_at || "—"}</td>
                      <td className="p-4">
                        {walkin.estimated_wait_minutes
                          ? `${walkin.estimated_wait_minutes} min`
                          : "—"}
                      </td>
                      <td className="p-4">{walkin.status || "waiting"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-brand-blue">Reseñas</h2>

            <button
              onClick={loadReviews}
              className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-secondary"
            >
              Actualizar
            </button>
          </div>

          {reviewsLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              Cargando reseñas...
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No hay reseñas.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-xl border bg-white p-4">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold">
                        {review.name || "Cliente"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {review.role || review.type || "Cliente"}
                      </p>
                    </div>

                    <div className="font-bold text-brand-blue">
                      ⭐ {review.rating ?? 5}/5
                    </div>
                  </div>

                  <p className="text-muted-foreground">
                    {review.comment || ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeEdit}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-2xl font-bold text-brand-blue">
              Editar reserva / Edit booking
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Cliente / Customer
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border p-2"
                  value={editForm.customer_name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, customer_name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Teléfono / Phone
                </label>
                <input
                  type="tel"
                  className="w-full rounded-lg border p-2"
                  value={editForm.phone || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">Email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border p-2"
                  value={editForm.email || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold">
                  Servicio / Service
                </label>
                <select
                  className="w-full rounded-lg border p-2"
                  value={editForm.service_name || ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    const match = SERVICES.find((s) => s.name === name);
                    setEditForm({
                      ...editForm,
                      service_name: name,
                      service_price: match ? match.price : editForm.service_price,
                      service_duration: match
                        ? match.duration
                        : editForm.service_duration,
                    });
                  }}
                >
                  <option value="">—</option>
                  {SERVICES.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  {editForm.service_name &&
                    !SERVICES.find((s) => s.name === editForm.service_name) && (
                      <option value={editForm.service_name}>
                        {editForm.service_name}
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Precio (£) / Price
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full rounded-lg border p-2"
                  value={editForm.service_price ?? ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      service_price:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Duración (min) / Duration
                </label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  className="w-full rounded-lg border p-2"
                  value={editForm.service_duration ?? ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      service_duration:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Barbero / Barber
                </label>
                <select
                  className="w-full rounded-lg border p-2"
                  value={editForm.barber || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, barber: e.target.value })
                  }
                >
                  <option value="">—</option>
                  {STAFF.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {editForm.barber && !STAFF.includes(editForm.barber) && (
                    <option value={editForm.barber}>{editForm.barber}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Estado / Status
                </label>
                <select
                  className="w-full rounded-lg border p-2"
                  value={String(editForm.status || "confirmed").toLowerCase()}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Fecha / Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border p-2"
                  value={editForm.appointment_date || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      appointment_date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Hora / Time
                </label>
                <input
                  type="time"
                  className="w-full rounded-lg border p-2"
                  value={(editForm.appointment_time || "").slice(0, 5)}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      appointment_time: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="rounded-lg border px-5 py-2 font-semibold transition hover:bg-secondary"
              >
                Cancelar / Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="rounded-lg bg-brand-blue px-5 py-2 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar / Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
