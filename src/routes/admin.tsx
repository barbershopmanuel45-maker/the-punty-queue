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
  { name: "Acondicionado de Barba", price: 15, duration: 20 },
  { name: "Corte de Pelo", price: 25, duration: 30 },
  { name: "Corte + Barba", price: 35, duration: 45 },
  { name: "Fade", price: 30, duration: 35 },
  { name: "Skin Fade", price: 35, duration: 40 },
  { name: "Corte Niño", price: 18, duration: 25 },
  { name: "Peinado / Styling", price: 20, duration: 25 },
];

const STAFF = ["Junior", "Manuel", "Barbero", "Peluquera"];

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

      if (error || !profileData) {
        await supabase.auth.signOut();
        navigate({ to: "/login" });
        return;
      }

      const role = String(profileData.role || "").toLowerCase();

      if (role !== "admin" && role !== "owner") {
        await supabase.auth.signOut();
        navigate({ to: "/login" });
        return;
      }

      setProfile(profileData);
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

  const filteredAppointments = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return appointments;

    return appointments.filter((item) => {
      const customer = item.customer_name || item.name || "";
      const service = item.service_name || item.service || "";
      const phone = item.phone || "";
      const barber = item.barber || "";
      const status = item.status || "";

      return (
        customer.toLowerCase().includes(q) ||
        service.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        barber.toLowerCase().includes(q) ||
        status.toLowerCase().includes(q)
      );
    });
  }, [appointments, query]);

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-brand-blue">Admin Panel</h1>
            <p className="mt-2 text-muted-foreground">El Punty Barber Shop</p>

            {profile && (
              <p className="mt-2 text-sm text-muted-foreground">
                Logged as:
                <span className="ml-2 font-semibold text-brand-blue">
                  {profile.role}
                </span>
              </p>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="mb-6 rounded-2xl border bg-card p-5 shadow-sm">
          <input
            type="text"
            placeholder="Buscar reservas..."
            className="w-full rounded-xl border p-3"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="mb-10 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-4 text-left">Cliente</th>
                  <th className="p-4 text-left">Teléfono</th>
                  <th className="p-4 text-left">Email</th>
                  <th className="p-4 text-left">Servicio</th>
                  <th className="p-4 text-left">Precio</th>
                  <th className="p-4 text-left">Duración</th>
                  <th className="p-4 text-left">Barbero / Peluquera</th>
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">Hora</th>
                  <th className="p-4 text-left">Estado</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center">
                      Cargando reservas...
                    </td>
                  </tr>
                ) : filteredAppointments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="p-10 text-center text-muted-foreground"
                    >
                      No hay reservas.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((item) => (
                    <tr key={`${item.source}-${item.id}`} className="border-t">
                      <td className="p-4 font-semibold">{getCustomerName(item)}</td>
                      <td className="p-4">{item.phone || "—"}</td>
                      <td className="p-4">{item.email || "—"}</td>
                      <td className="p-4">{getServiceName(item)}</td>
                      <td className="p-4">{getServicePrice(item)}</td>
                      <td className="p-4">{getServiceDuration(item)}</td>
                      <td className="p-4">{item.barber || "—"}</td>
                      <td className="p-4">{getDate(item)}</td>
                      <td className="p-4">{getTime(item)}</td>
                      <td className="p-4">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                          {item.status || "confirmed"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteAppointment(item)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

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
                  Barbero / Peluquera
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
    </div>
  );
}
