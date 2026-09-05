import { NextResponse } from "next/server";
import { callbackError } from "@/features/auth/callback";
import { safeAppPath } from "@/features/auth/errors";
import { DEMO_COOKIE } from "@/features/finance/demo-mode";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function redirect(origin: string, path: string, error?: string) {
  const destination = new URL(path, origin);
  if (error) destination.searchParams.set("error", error);
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const callbackFailure = callbackError(url.searchParams);
  if (callbackFailure) return redirect(url.origin, "/login", callbackFailure);

  const code = url.searchParams.get("code");
  const flowId = url.searchParams.get("sb_flow_id");
  let authHeaders: Record<string, string> = {};
  const client = await getSupabaseServerClient((headers) => { authHeaders = headers; });

  if (!code || !client) {
    return redirect(url.origin, "/login", client ? "auth_callback" : "supabase_unavailable");
  }

  const { error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  if (error) {
    return redirect(url.origin, "/login", "auth_callback");
  }

  const response = redirect(url.origin, safeAppPath(url.searchParams.get("next")));
  Object.entries(authHeaders).forEach(([name, value]) => response.headers.set(name, value));
  response.cookies.delete(DEMO_COOKIE);
  return response;
}
