import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Booking = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  status?: string;
  created_at?: string;
};

type ProfileRow = {
  id: string;
  role: string;
  email?: string;
};

function AdminPage() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
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
      const allowed = role === "admin" || role === "owner";

      if (!allowed) {
        await supabase.auth.signOut();
        navigate({ to: "/login" });
        return;
      }

      setProfile(profileData);
      setAuthChecked(true);

      await loadBookings();
    }

    validateAdminAccess();
  }, [navigate]);

  async function loadBookings() {
    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBookings(
        data.map((item) => ({
          id: item.id,
          name: item.customer_name || "",
          phone: item.phone || "",
          email: item.email || "",
          service: item.service_name || "",
          barber: item.barber || item.barber_name || "",
          date: item.date || item.appointment_date || "",
          time: item.time || item.appointment_time || "",
          status: item.status || "confirmed",
          created_at: item.created_at,
        })),
      );
    }

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  async function deleteBooking(id?: string) {
    if (!id) return;

    const ok = confirm("¿Eliminar esta reserva?");
    if (!ok) return;

    await supabase.from("appointments").delete().eq("id", id);
    await loadBookings();
  }

  const filteredBookings = useMemo(() => {
    const q = query.toLowerCase();

    return bookings.filter((booking) => {
      return (
        booking.name?.toLowerCase().includes(q) ||
        booking.phone?.toLowerCase().includes(q) ||
        booking.email?.toLowerCase().includes(q) ||
        booking.service?.toLowerCase().includes(q)
      );
    });
  }, [bookings, query]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
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
                    <td colSpan={7} className="p-10 text-center">
                      Cargando reservas...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-10 text-center text-muted-foreground"
                    >
                      No hay reservas.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="border-t">
                      <td className="p-4">
                        <div className="font-semibold">{booking.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {booking.phone}
                        </div>
                        {booking.email && (
                          <div className="text-sm text-muted-foreground">
                            {booking.email}
                          </div>
                        )}
                      </td>

                      <td className="p-4">{booking.service}</td>
                      <td className="p-4">{booking.date}</td>
                      <td className="p-4">{booking.time}</td>
                      <td className="p-4">{booking.barber}</td>

                      <td className="p-4">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                          {booking.status || "confirmed"}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteBooking(booking.id)}
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
      </div>
    </div>
  );
}