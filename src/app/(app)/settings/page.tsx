"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Bot, Database, Download, KeyRound, LogOut, Moon, RotateCcw, Shield, Sun, Upload, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { useFinance } from "@/features/finance/finance-provider";
import type { Profile, ProfileDraft } from "@/features/finance/types";
import { downloadBackup, readBackup } from "@/features/exports/backup";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearDemoMode } from "@/features/finance/demo-mode";
import { initials } from "@/lib/utils";

const sections = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "ai", label: "AI & privacy", icon: Bot },
  { id: "data", label: "Your data", icon: Database },
];

export default function SettingsPage() {
  const { data, resetDemo, updateProfile, setPushNotifications, exportTransactions } = useFinance();
  const [section, setSection] = useState("profile");
  const [theme, setTheme] = useState("system");
  const file = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(localStorage.getItem("expenso-theme") ?? "system"));
    return () => cancelAnimationFrame(frame);
  }, []);

  const setThemeValue = (value: string) => {
    setTheme(value);
    localStorage.setItem("expenso-theme", value);
    const dark = value === "dark" || (value === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    toast.success("Appearance updated.");
  };

  const logout = async () => {
    const client = getSupabaseBrowserClient();
    if (client && !data.demo) {
      const { error } = await client.auth.signOut();
      if (error) return toast.error("We couldn't sign you out. Please try again.");
    }
    clearDemoMode();
    router.replace("/login");
  };

  const validateBackup = async (chosen?: File) => {
    if (!chosen) return;
    try {
      await readBackup(chosen);
      toast.success("Backup file validated. No data was changed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid backup file.");
    } finally {
      if (file.current) file.current.value = "";
    }
  };

  return <>
    <PageHeading eyebrow="Personalize Expenso" title="Settings" description="Profile, privacy, appearance, security, and data controls." />
    <div className="grid min-w-0 gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
      <Card className="h-fit min-w-0 overflow-hidden p-2"><nav className="scrollbar-none flex max-w-full gap-1 overflow-x-auto lg:block" aria-label="Settings sections">{sections.map((item) => <button key={item.id} onClick={() => setSection(item.id)} className={`flex min-h-11 shrink-0 items-center gap-3 rounded-[14px] px-3 text-sm font-semibold transition lg:w-full ${section === item.id ? "bg-secondary text-info" : "text-muted-foreground hover:bg-elevated"}`}><item.icon className="size-4" />{item.label}</button>)}</nav></Card>
      <Card className="min-w-0 overflow-hidden"><CardContent className="min-w-0 p-5 sm:p-7">
        {section === "profile" && <SettingsSection title="Profile" description="The personal details associated with your private workspace.">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-canvas p-4 sm:flex-row sm:items-center">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand font-bold text-white" aria-hidden="true">{initials(data.profile.displayName)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold" data-testid="profile-name">{data.profile.displayName}</p>
              <p className="mt-1 truncate text-xs text-muted" data-testid="profile-email">{data.profile.email}</p>
            </div>
            <Button variant="danger" onClick={() => void logout()}><LogOut className="size-4" />Sign out</Button>
          </div>
          <ProfileForm key={data.profile.id} profile={data.profile} onSave={updateProfile} />
        </SettingsSection>}

        {section === "appearance" && <SettingsSection title="Appearance" description="Choose how Expenso looks on this device.">
          <div className="grid gap-3 sm:grid-cols-3">{[{ value: "light", label: "Light", icon: Sun }, { value: "dark", label: "Dark", icon: Moon }, { value: "system", label: "System", icon: RotateCcw }].map((item) => <button key={item.value} onClick={() => setThemeValue(item.value)} className={`rounded-2xl border p-5 text-left transition ${theme === item.value ? "border-brand bg-accent/40" : "hover:bg-canvas"}`}><item.icon className="size-5 text-brand" /><p className="mt-5 text-sm font-bold">{item.label}</p></button>)}</div>
        </SettingsSection>}

        {section === "notifications" && <SettingsSection title="Notifications" description="Control browser delivery. Card and loan reminders remain visible in Expenso even when browser notifications are off.">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-canvas p-4 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warning/10 text-warning"><Bell className="size-5" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">Payment reminders</p><p className="mt-1 text-xs leading-5 text-muted">Browser delivery is {data.notificationPreferences.pushEnabled ? "enabled" : "off"}. Configure lead times on each card or loan.</p></div><Button variant={data.notificationPreferences.pushEnabled ? "secondary" : "primary"} onClick={() => void setPushNotifications(!data.notificationPreferences.pushEnabled).then(() => toast.success(data.notificationPreferences.pushEnabled ? "Browser notifications turned off." : "Browser notifications enabled.")).catch((error) => toast.error(error instanceof Error ? error.message : "Could not update notifications."))}>{data.notificationPreferences.pushEnabled ? "Turn off" : "Enable notifications"}</Button></div>
        </SettingsSection>}

        {section === "security" && <SettingsSection title="Security" description="Manage your credentials.">
          <div className="flex items-center gap-4 rounded-2xl bg-canvas p-4"><span className="grid size-10 place-items-center rounded-xl bg-surface"><KeyRound className="size-4 text-brand" /></span><div className="flex-1"><p className="text-sm font-bold">Password</p><p className="text-xs text-muted">Reset through a secure email link</p></div><Button variant="secondary" onClick={() => router.push("/forgot-password")}>Reset</Button></div>
        </SettingsSection>}

        {section === "ai" && <SettingsSection title="AI & privacy" description="AI features are intentionally disabled in this release.">
          <div className="rounded-2xl border bg-canvas p-5"><p className="text-sm font-bold">Deterministic finance only</p><p className="mt-2 text-xs leading-5 text-muted">No transaction, balance, or profile data is sent to an AI provider. Reports and insights continue to use exact calculations over your user-scoped records.</p></div>
        </SettingsSection>}

        {section === "data" && <SettingsSection title="Your data" description="Export a portable copy or validate a structured backup.">
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => void exportTransactions().then((transactions)=>downloadBackup({...data,transactions})).catch((error)=>toast.error(error.message))} className="rounded-2xl border p-5 text-left transition hover:bg-canvas"><Download className="size-5 text-brand" /><p className="mt-5 text-sm font-bold">Download backup</p><p className="mt-1 text-xs leading-5 text-muted">All supported records in a versioned JSON file</p></button>
            <button onClick={() => file.current?.click()} className="rounded-2xl border p-5 text-left transition hover:bg-canvas"><Upload className="size-5 text-brand" /><p className="mt-5 text-sm font-bold">Validate backup file</p><p className="mt-1 text-xs leading-5 text-muted">Check its structure without changing your data</p></button>
            <input ref={file} type="file" accept="application/json" className="sr-only" onChange={(event) => void validateBackup(event.target.files?.[0])} />
          </div>
          {data.demo && <Button variant="secondary" className="mt-5" onClick={() => { resetDemo(); toast.success("Sample workspace reset."); }}><RotateCcw className="size-4" />Reset sample data</Button>}
        </SettingsSection>}
      </CardContent></Card>
    </div>
  </>;
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section><h2 className="text-xl font-bold">{title}</h2><p className="mb-7 mt-1 text-sm text-muted">{description}</p><div className="space-y-4">{children}</div></section>;
}

function ProfileForm({ profile, onSave }: { profile: Profile; onSave: (draft: ProfileDraft) => Promise<void> }) {
  const [draft, setDraft] = useState({ displayName: profile.displayName, currency: profile.currency, timezone: profile.timezone });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (draft.displayName.trim().length < 2) return toast.error("Enter your display name.");
    setBusy(true);
    try {
      await onSave(draft);
      toast.success("Profile preferences saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile preferences.");
    } finally {
      setBusy(false);
    }
  };
  return <>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Display name"><Input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></Field>
      <Field label="Email address"><Input value={profile.email} disabled /></Field>
      <Field label="Currency"><Select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })}><option value="INR">Indian Rupee (INR)</option><option value="USD">US Dollar (USD)</option><option value="EUR">Euro (EUR)</option><option value="GBP">British Pound (GBP)</option></Select></Field>
      <Field label="Timezone"><Input value={draft.timezone} onChange={(event) => setDraft({ ...draft, timezone: event.target.value })} placeholder="Asia/Kolkata" /></Field>
    </div>
    <Button className="mt-5" onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
  </>;
}
