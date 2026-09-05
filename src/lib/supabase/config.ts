export type SupabaseConfigState = "absent" | "invalid" | "configured";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

export function getSupabasePublicKey(anonKey: string | undefined, publishableKey: string | undefined) {
  return anonKey?.trim() || publishableKey?.trim();
}

export const supabaseAnonKey = getSupabasePublicKey(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export function hasValidSupabaseConfig(url: string | undefined, key: string | undefined) {
  const normalizedUrl = url?.trim();
  const normalizedKey = key?.trim();
  if (!normalizedUrl || !normalizedKey || /your-(project|anon|publishable)/i.test(`${normalizedUrl} ${normalizedKey}`)) return false;
  try {
    const parsed = new URL(normalizedUrl);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && Boolean(parsed.hostname) && normalizedKey.length > 20;
  } catch {
    return false;
  }
}

export function getSupabaseConfigState(url: string | undefined, key: string | undefined): SupabaseConfigState {
  if (!url?.trim() && !key?.trim()) return "absent";
  return hasValidSupabaseConfig(url, key) ? "configured" : "invalid";
}

export const supabaseConfigState = getSupabaseConfigState(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = supabaseConfigState === "configured";
export const isSupabaseConfigAbsent = supabaseConfigState === "absent";
