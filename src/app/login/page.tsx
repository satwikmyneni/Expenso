"use client";

import Link from "next/link";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/features/auth/auth-shell";
import { callbackErrorMessage } from "@/features/auth/callback";
import { authErrorMessage, safeAppPath } from "@/features/auth/errors";
import { replaceWithAuthenticatedRoute } from "@/features/auth/navigation";
import { authCallbackUrl } from "@/features/auth/oauth";
import { SocialLoginButtons } from "@/features/auth/social-login-buttons";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { clearDemoMode } from "@/features/finance/demo-mode";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigAbsent } from "@/lib/supabase/config";

const LOGIN_TIMEOUT_MS = 20_000;

class LoginTimeoutError extends Error {}

async function withLoginTimeout<T>(request: Promise<T>) {
  let timeout: number | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timeout = window.setTimeout(() => reject(new LoginTimeoutError()), LOGIN_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeout !== undefined) window.clearTimeout(timeout);
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const message = callbackErrorMessage(new URLSearchParams(location.search).get("error"));
    if (message) toast.error(message);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast.error("Secure sign-in is unavailable because Supabase is not configured. Open the sample workspace only if you want demo data.");
      return;
    }

    setBusy(true);
    let sessionReady = false;
    try {
      const result = await withLoginTimeout(client.auth.signInWithPassword({ email, password }));
      if (!result) {
        toast.error("Supabase did not return a sign-in result. Please try again.");
        return;
      }
      if (result.error) {
        toast.error(authErrorMessage(result.error, "We couldn't sign you in. Please try again."));
        return;
      }
      if (!result.data.session || !result.data.user) {
        toast.error("Supabase did not return a usable session. Please try again.");
        return;
      }

      sessionReady = true;
      clearDemoMode();
      const destination = safeAppPath(new URLSearchParams(location.search).get("next"));
      await replaceWithAuthenticatedRoute(destination);
    } catch (error) {
      toast.error(sessionReady
        ? "You're signed in, but Expenso couldn't open your workspace. Refresh the page to continue."
        : error instanceof LoginTimeoutError
          ? "Sign-in is taking too long. Check your connection and try again."
          : "We couldn't finish signing you in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const magic = async () => {
    if (!email) return toast.error("Enter your email first.");
    const client = getSupabaseBrowserClient();
    if (!client) return toast.error("Magic-link sign-in is unavailable because Supabase is not configured.");
    const next = safeAppPath(new URLSearchParams(location.search).get("next"));
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: authCallbackUrl(location.origin, next) } });
    if (error) toast.error(authErrorMessage(error));
    else toast.success("Check your inbox for the sign-in link.");
  };

  const nextPath = typeof location === "undefined" ? "/dashboard" : new URLSearchParams(location.search).get("next");

  return <AuthShell title="Welcome back" description="Sign in to your private Expenso account.">
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email address"><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="pl-10" /></div></Field>
      <Field label="Password"><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input type={visible ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="px-10" /><button type="button" onClick={() => setVisible(!visible)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:text-foreground" aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></Field>
      <div className="flex justify-end"><Link href="/forgot-password" className="min-h-11 py-3 text-xs font-bold text-brand">Forgot password?</Link></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{busy ? "Signing in…" : "Sign in"}</Button>
    </form>
    <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground"><span className="h-px flex-1 bg-border"/><span>or continue with</span><span className="h-px flex-1 bg-border"/></div>
    <SocialLoginButtons nextPath={nextPath} />
    <Button type="button" variant="ghost" className="mt-3 w-full text-xs" onClick={magic}>Email me a magic link</Button>
    <p className="mt-7 text-center text-sm text-muted">New to Expenso? <Link href="/sign-up" className="font-bold text-brand">Create an account</Link></p>
    {isSupabaseConfigAbsent && <Link href="/demo" className="mt-4 block min-h-11 py-3 text-center text-xs font-semibold text-muted-foreground underline underline-offset-4">Open the sample workspace</Link>}
  </AuthShell>;
}
