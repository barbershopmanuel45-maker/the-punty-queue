import { supabase } from "./supabase";

export type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  business_id: string | null;
  email?: string | null;
};

export async function fetchProfile(): Promise<Profile | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("[profile] fetch failed", error);
      return {
        id: user.id,
        full_name: user.email ?? null,
        role: null,
        business_id: null,
        email: user.email ?? null,
      };
    }

    return {
      id: user.id,
      full_name: data?.full_name ?? user.email ?? null,
      role: data?.role ?? null,
      business_id: data?.business_id ?? null,
      email: user.email ?? null,
    };
  } catch (e) {
    console.warn("[profile] error", e);
    return {
      id: user.id,
      full_name: user.email ?? null,
      role: null,
      business_id: null,
      email: user.email ?? null,
    };
  }
}
