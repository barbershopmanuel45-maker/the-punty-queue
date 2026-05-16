import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo.jpeg";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — El Punty" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) navigate({ to: "/admin", replace: true });
      else setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/admin", replace: true });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [navigate]);

  const friendly = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes("invalid login")) return "Email o contraseña incorrectos.";
    if (m.includes("email not confirmed")) return "Debes confirmar el email antes de entrar.";
    if (m.includes("too many requests")) return "Demasiados intentos. Espera unos minutos.";
    return "No se pudo iniciar sesión. Revisa los datos e inténtalo de nuevo.";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword) {
      setError("Introduce email y contraseña.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    });
    setLoading(false);
    if (error) {
      setError(friendly(error.message));
      return;
    }
    navigate({ to: "/admin", replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/40">
        <p className="text-sm text-muted-foreground">Comprobando sesión…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-card p-8">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="El Punty" className="w-16 h-16 rounded-xl object-cover mb-3 shadow-soft" />
          <h1 className="text-xl font-bold text-brand-blue">Iniciar sesión</h1>
          <p className="text-xs text-muted-foreground text-center">
            Accede al panel de gestión de El Punty.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              placeholder="admin@elpunty.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Contraseña</label>
            <div className="mt-1 flex rounded-lg border bg-white overflow-hidden focus-within:ring-2 focus-within:ring-brand-blue/30">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm focus:outline-none"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="px-3 text-xs font-semibold text-brand-blue hover:bg-secondary/60"
                disabled={loading}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs font-semibold bg-red-50 text-red-600 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-semibold px-4 py-2.5 rounded-full bg-gradient-brand text-white shadow-soft disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
