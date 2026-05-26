import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Appointment = {
  id?: string;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  service_name: string | null;
  service_price: number | null;
  service_duration: number | null;
  appointment_date: string | null;
  appointment_time: string | null;
  barber: string | null;
  status: string | null;
  created_at?: string | null;
};

type Review = {
  id?: string;
  name: string | null;
  role: string | null;
  rating: number | null;
  comment: string | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  role: string;
  email?: string;
};

function AdminPage() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
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

      await Promise.all([loadAppointments(), loadReviews()]);
    }

    validateAdminAccess();
  }, [navigate]);

  async function loadAppointments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, customer_name, phone, email, service_name, service_price, service_duration, appointment_date, appointment_time, barber, status, created_at",
      )
      .order("appointment_date", { ascending: false });

    if (error) {
      console.error("Error loading appointments:", error);
      setAppointments([]);
    } else {
      setAppointments(data || []);
    }

    setLoading(false);
  }

  async function loadReviews() {
    setReviewsLoading(true);

    const { data, error } = await supabase
      .from("reviews")
      .select("id, name, role, rating, comment, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reviews:", error);
      setReviews([]);
    } else {
      setReviews(data || []);
    }

    setReviewsLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  async function deleteAppointment(id?: string) {
    if (!id) return;

    const ok = confirm("¿Eliminar esta reserva?");
    if (!ok) return;

    await supabase.from("appointments").delete().eq("id", id);

    await loadAppointments();
  }

  const filteredAppointments = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return appointments;

    return appointments.filter((appointment) => {
      return (
        appointment.customer_name?.toLowerCase().includes(q) ||
        appointment.phone?.toLowerCase().includes(q) ||
        appointment.email?.toLowerCase().includes(q) ||
        appointment.service_name?.toLowerCase().includes(q) ||
        appointment.barber?.toLowerCase().includes(q) ||
        appointment.status?.toLowerCase().includes(q)
      );
    });
  }, [appointments, query]);

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

            <p className="mt-2 text-muted-foreground">
              El Punty Barber Shop
            </p>

            {profile && (
              <div className="mt-2 text-sm text-muted-foreground">
                Logged as:
                <span className="ml-2 font-semibold text-brand-blue">
                  {profile.role}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
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
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="p-4 text-left">Cliente</th>
                  <th className="p-4 text-left">Servicio</th>
                  <th className="p-4 text-left">Precio</th>
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">Hora</th>
                  <th className="p-4 text-left">Barbero</th>
                  <th className="p-4 text-left">Estado</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center">
                      Cargando reservas...
                    </td>
                  </tr>
                ) : filteredAppointments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-10 text-center text-muted-foreground"
                    >
                      No hay reservas.
                    </td>
                  </tr>
                ) : (
                  filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="border-t">
                      <td className="p-4">
                        <div className="font-semibold">
                          {appointment.customer_name || "Sin nombre"}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {appointment.phone || ""}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {appointment.email || ""}
                        </div>
                      </td>

                      <td className="p-4">{appointment.service_name || "-"}</td>

                      <td className="p-4 font-semibold">
                        {appointment.service_price !== null &&
                        appointment.service_price !== undefined
                          ? `£${appointment.service_price}`
                          : "-"}
                      </td>

                      <td className="p-4">
                        {appointment.appointment_date || "-"}
                      </td>

                      <td className="p-4">
                        {appointment.appointment_time || "-"}
                      </td>

                      <td className="p-4">{appointment.barber || "-"}</td>

                      <td className="p-4">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                          {appointment.status || "confirmed"}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteAppointment(appointment.id)}
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

        <div className="mt-10 rounded-2xl border bg-card p-6 shadow-sm">
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
                      <h3 className="font-bold">{review.name || "Cliente"}</h3>

                      <p className="text-sm text-muted-foreground">
                        {review.role || "Cliente"}
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