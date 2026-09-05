"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthShell } from "@/features/auth/auth-shell";
import { authErrorMessage } from "@/features/auth/errors";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 10 || password !== confirmation) return toast.error("Passwords must match and contain at least 10 characters.");
    const client = getSupabaseBrowserClient();
    if (!client) return toast.error("Supabase is not configured.");
    setBusy(true);
    const { error } = await client.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(authErrorMessage(error, "We couldn't update the password. Request a new recovery link and try again."));
    toast.success("Password updated.");
    router.replace("/dashboard");
  };

  return <AuthShell title="Choose a new password" description="Use a unique password you don't use on another service.">
    <form onSubmit={submit} className="space-y-4">
      <Field label="New password"><Input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
      <Field label="Confirm password"><Input type="password" autoComplete="new-password" minLength={10} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>
      <Button className="w-full" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
    </form>
  </AuthShell>;
}
