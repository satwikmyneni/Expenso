import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

export async function getSupabaseServerClient(onAuthHeaders?: (headers: Record<string, string>) => void) {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseAnonKey) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values: Array<{ name: string; value: string; options?: CookieOptions }>, headers: Record<string, string>) {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { /* Server Component cookie writes are ignored. */ }
        onAuthHeaders?.(headers);
      },
    },
  });
}
