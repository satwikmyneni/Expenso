import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/features/auth/auth-shell";

export default function VerifyEmailPage() {
  return <AuthShell title="Check your email" description="Use the verification link we sent to finish creating your private workspace.">
    <div className="grid place-items-center text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-accent text-brand"><MailCheck className="size-7" /></span>
      <p className="mt-6 text-sm leading-6 text-muted">The link may take a minute to arrive. Check your spam folder too. You can safely close this tab after opening the email.</p>
      <Link href="/login" className="mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-line bg-surface px-4 text-sm font-semibold transition hover:bg-canvas">Back to sign in</Link>
    </div>
  </AuthShell>;
}
