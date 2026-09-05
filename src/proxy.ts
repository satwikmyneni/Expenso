import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE } from "@/features/finance/demo-mode";
import { getSupabaseConfigState, getSupabasePublicKey } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const protectedPaths = ["/dashboard", "/transactions", "/accounts", "/categories", "/budgets", "/goals", "/recurring", "/calendar", "/insights", "/imports", "/assistant", "/settings", "/more"];
const isWithinPath = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);
export const isProtectedPath = (pathname: string) => protectedPaths.some((path) => isWithinPath(pathname, path));

function redirectWithCookies(url: URL, response: NextResponse) {
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((header) => {
    const value = response.headers.get(header);
    if (value) redirect.headers.set(header, value);
  });
  return redirect;
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabasePublicKey(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const configState = getSupabaseConfigState(url, key);
  const isProtected = isProtectedPath(request.nextUrl.pathname);
  const demoRequested = request.cookies.get(DEMO_COOKIE)?.value === "1";
  const isDemo = configState === "absent" && demoRequested;
  if (configState !== "configured" || !url || !key) {
    if (!isProtected || isDemo) {
      const next = NextResponse.next();
      if (demoRequested && !isDemo) next.cookies.delete(DEMO_COOKIE);
      return next;
    }
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("error", configState === "invalid" ? "supabase_misconfigured" : "supabase_unavailable");
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(login);
    if (demoRequested) redirect.cookies.delete(DEMO_COOKIE);
    return redirect;
  }

  let response = NextResponse.next({ request });
  if (demoRequested) response.cookies.delete(DEMO_COOKIE);
  const supabase = createServerClient<Database>(url.trim(), key.trim(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies: Array<{ name: string; value: string; options?: CookieOptions }>, headers: Record<string, string>) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
        if (demoRequested) response.cookies.delete(DEMO_COOKIE);
      },
    },
  });

  // Keep this immediately after client creation so an expired access token can
  // be refreshed before any route decision is made.
  const claimsResult = await supabase.auth.getClaims().catch(() => null);
  if (!claimsResult) {
    if (!isProtected) return response;
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("error", "supabase_connection");
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return redirectWithCookies(login, response);
  }
  const { data: claims, error: claimsError } = claimsResult;
  if (!claims && isProtected) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    if (claimsError) login.searchParams.set("error", "auth_session");
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return redirectWithCookies(login, response);
  }

  if (claims && ["/login", "/sign-up"].includes(request.nextUrl.pathname)) {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname = "/dashboard";
    dashboard.search = "";
    const redirect = redirectWithCookies(dashboard, response);
    redirect.cookies.delete(DEMO_COOKIE);
    return redirect;
  }

  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
