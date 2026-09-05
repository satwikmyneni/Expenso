import { supabaseConfigState, type SupabaseConfigState } from "@/lib/supabase/config";

export const DEMO_COOKIE = "expenso-demo";

export function isDemoMode(configState: SupabaseConfigState = supabaseConfigState) {
  if (configState !== "absent" || typeof document === "undefined") return false;
  return document.cookie.split(";").some((item) => item.trim() === `${DEMO_COOKIE}=1`);
}

export function clearDemoMode() {
  if (typeof document === "undefined") return;
  document.cookie = `${DEMO_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
