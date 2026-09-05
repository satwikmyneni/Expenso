"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/features/auth/auth-shell";
import { authErrorMessage } from "@/features/auth/errors";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { authCallbackUrl } from "@/features/auth/oauth";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const client = getSupabaseBrowserClient();
    if (!client) return toast.info("Password recovery is available after Supabase is configured.");
    setBusy(true);
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: authCallbackUrl(location.origin, "/reset-password") });
    setBusy(false);
    if (error) return toast.error(authErrorMessage(error));
    toast.success("If that account exists, a recovery link is on its way.");
  };

  return <AuthShell title="Reset your password" description="We'll send a secure recovery link to your verified email address.">
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email address"><Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
      <Button className="w-full" type="submit" disabled={busy}>{busy ? "Sending…" : "Send recovery link"}</Button>
    </form>
  </AuthShell>;
}
