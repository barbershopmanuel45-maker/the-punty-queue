import { createClient } from "@supabase/supabase-js";
import { storageKey } from "./business";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const message =
    "[config] Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. " +
    "Configúralas para conectar la aplicación al nuevo proyecto Supabase.";

  if (import.meta.env.DEV) {
    console.error(message);
  } else {
    console.warn(message);
  }
}

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(
  SUPABASE_URL || "https://missing-config.supabase.co",
  SUPABASE_ANON_KEY || "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: storageKey("auth"),
    },
  },
);
