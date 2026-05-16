import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://icteqntznovzbmgclfik.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljdGVxbnR6bm92emJtZ2NsZmlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4Mzg3MDksImV4cCI6MjA5MzQxNDcwOX0.Z8JA6SrYyvquLbDPrSgXyqUJAUajK8DJm4amL1WQslQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "elpunty_auth" },
});
