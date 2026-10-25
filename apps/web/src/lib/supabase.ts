import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  // No reventamos la app: mostramos un aviso claro en consola.
  console.error("Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (ver .env.example)");
}

export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const MAP_STYLE =
  (import.meta.env.VITE_MAP_STYLE as string) ||
  "https://demotiles.maplibre.org/style.json";
