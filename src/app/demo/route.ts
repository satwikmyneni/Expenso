import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/features/finance/demo-mode";
import { getSupabaseConfigState, getSupabasePublicKey } from "@/lib/supabase/config";

export function GET() {
  const key = getSupabasePublicKey(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const configState = getSupabaseConfigState(process.env.NEXT_PUBLIC_SUPABASE_URL, key);
  const location = configState === "invalid" ? "/login?error=supabase_misconfigured" : "/dashboard";
  const response = new NextResponse(null, { status: 303, headers: { Location: location } });
  if (configState === "absent") {
    response.cookies.set(DEMO_COOKIE, "1", {
      httpOnly: false,
      maxAge: 60 * 60 * 8,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    response.cookies.delete(DEMO_COOKIE);
  }
  return response;
}
