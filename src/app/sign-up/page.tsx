"use client";

import Link from "next/link";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/features/auth/auth-shell";
import { authErrorMessage } from "@/features/auth/errors";
import { authCallbackUrl } from "@/features/auth/oauth";
import { SocialLoginButtons } from "@/features/auth/social-login-buttons";
import { clearDemoMode } from "@/features/finance/demo-mode";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter your name.");
    if (password.length < 10) return toast.error("Use at least 10 characters.");
    const client = getSupabaseBrowserClient();
    if (!client) return toast.error("Account creation is unavailable because Supabase is not configured. No sample account was created.");

    setBusy(true);
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: name.trim() }, emailRedirectTo: authCallbackUrl(location.origin) },
    });
    setBusy(false);

    if (error) return toast.error(authErrorMessage(error, "We couldn't create the account. Please try again."));
    if (data.session) {
      clearDemoMode();
      router.replace("/dashboard");
      return;
    }
    router.replace("/verify-email");
  };

  return <AuthShell title="Create your account" description="Your personal finance space is private to you and works across your devices.">
    <form onSubmit={submit} className="space-y-4">
      <Field label="Your name"><div className="relative"><UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="pl-10" /></div></Field>
      <Field label="Email address"><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="pl-10" /></div></Field>
      <Field label="Password" hint="At least 10 characters"><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input required minLength={10} type={visible ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="px-10" /><button type="button" onClick={() => setVisible(!visible)} className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:text-foreground" aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></Field>
      <label className="flex gap-2 text-xs leading-5 text-muted"><input type="checkbox" required className="mt-1" />I agree to keep my account secure and accept the privacy policy and terms.</label>
      <Button className="w-full" type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{busy ? "Creating…" : "Create secure account"}</Button>
    </form>
    <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground"><span className="h-px flex-1 bg-border"/><span>or continue with</span><span className="h-px flex-1 bg-border"/></div>
    <SocialLoginButtons />
    <p className="mt-7 text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-bold text-brand">Sign in</Link></p>
  </AuthShell>;
}
