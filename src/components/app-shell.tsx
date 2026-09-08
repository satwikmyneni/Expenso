"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  CircleDollarSign,
  Cloud,
  CloudOff,
  CreditCard,
  FileUp,
  Gauge,
  Menu,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  Tags,
  Target,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "@/features/transactions/transaction-modal";
import { TransactionEntryMenu } from "@/features/transactions/transaction-entry-menu";
import { useFinance } from "@/features/finance/finance-provider";
import { isSupabaseConfigAbsent } from "@/lib/supabase/config";

type NavigationItem = { href: string; label: string; icon: LucideIcon };

const primary: NavigationItem[] = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/accounts", label: "Accounts", icon: WalletCards },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/budgets", label: "Budgets", icon: CircleDollarSign },
  { href: "/goals", label: "Goals", icon: Target },
];

const planning: NavigationItem[] = [
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/recurring", label: "Recurring", icon: CreditCard },
  { href: "/imports", label: "Import statement", icon: FileUp },
];

const mobile: NavigationItem[] = [
  primary[0],
  primary[1],
  { href: "#add", label: "Add", icon: Plus },
  planning[0],
  { href: "/more", label: "More", icon: Menu },
];

function NavItem({ item }: { item: NavigationItem }) {
  const path = usePathname();
  const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
  return <Link
    href={item.href}
    aria-label={item.label}
    title={item.label}
    className={cn(
      "group relative grid size-11 shrink-0 place-items-center rounded-[14px] transition duration-200",
      active
        ? "bg-foreground text-background shadow-float"
        : "text-muted-foreground hover:bg-elevated hover:text-foreground",
    )}
  >
    <item.icon className="size-[19px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
    <span className="sr-only">{item.label}</span>
    {active && <span className="absolute -left-[18px] h-5 w-1 rounded-r-full bg-brand" aria-hidden="true" />}
  </Link>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, loading, syncStatus, connectionState, connectionError, reload } = useFinance();
  const [entryOpen, setEntryOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [voicePrompt, setVoicePrompt] = useState(false);
  const status = { offline: [CloudOff, "Offline"], syncing: [Cloud, "Syncing"], synced: [Cloud, "Synced"], failed: [CloudOff, "Sync failed"] } as const;
  const [StatusIcon, statusLabel] = status[syncStatus];
  const unreadNotifications = data.notifications?.filter((item) => !item.readAt).length ?? 0;

  if (loading) return <main className="grid min-h-screen place-items-center bg-background px-5" aria-busy="true" aria-label="Loading your financial workspace">
    <div className="grid place-items-center text-center">
      <span className="grid size-12 animate-pulse place-items-center rounded-2xl bg-brand text-xl font-extrabold text-white">E</span>
      <p className="mt-5 text-sm font-bold">Opening your private workspace…</p>
      <p className="mt-1 text-xs text-muted-foreground">Checking your secure session and synced records</p>
    </div>
  </main>;

  if (connectionState === "unavailable") return <main className="grid min-h-screen place-items-center bg-background px-5 py-12">
    <section className="card w-full max-w-lg p-7 text-center" role="alert">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning/10 text-warning"><AlertTriangle className="size-6" /></span>
      <p className="eyebrow mt-6 text-warning">Connection unavailable</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your data was not replaced with samples</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{connectionError}</p>
      <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row"><Button onClick={() => void reload()}><RefreshCw className="size-4" />Try again</Button><Link href="/login" className="pill-control min-h-11">Return to sign in</Link></div>
      {isSupabaseConfigAbsent && <Link href="/demo" className="mt-5 inline-flex min-h-11 items-center py-3 text-xs font-semibold text-muted-foreground underline underline-offset-4">Open the explicit sample workspace</Link>}
    </section>
  </main>;

  return <div className="min-h-screen bg-background lg:grid lg:grid-cols-[88px_minmax(0,1fr)]">
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[88px] flex-col items-center border-r border-border/80 bg-primary px-3 py-5 lg:flex">
      <Link href="/dashboard" className="grid size-12 place-items-center rounded-2xl bg-brand text-lg font-extrabold text-white shadow-float" aria-label="Expenso home">E</Link>
      <nav className="scrollbar-none mt-7 flex w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto py-1" aria-label="Main navigation">
        {primary.map((item) => <NavItem key={item.href} item={item} />)}
        <span className="my-2 h-px w-7 bg-border" aria-hidden="true" />
        {planning.map((item) => <NavItem key={item.href} item={item} />)}
      </nav>
      <NavItem item={{ href: "/settings", label: "Settings", icon: Settings }} />
      <Link href="/settings" className="relative mt-3 grid size-11 place-items-center rounded-full border border-border bg-elevated text-xs font-bold text-foreground" aria-label={`${data.profile.displayName}, ${statusLabel}`} title={`${data.profile.displayName} · ${statusLabel}`}>
        {initials(data.profile.displayName)}
        <span className={cn("absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-primary", syncStatus === "failed" || syncStatus === "offline" ? "bg-warning" : "bg-income")} aria-hidden="true" />
      </Link>
    </aside>

    <div className="min-w-0 lg:col-start-2">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/80 bg-background/92 px-4 backdrop-blur-xl sm:px-7 lg:h-[78px] lg:px-8 xl:px-10">
        <Link href="/dashboard" className="flex items-center gap-2.5 lg:hidden"><span className="grid size-9 place-items-center rounded-xl bg-brand font-extrabold text-white">E</span><span className="text-lg font-extrabold tracking-[-.04em]">expenso</span></Link>
        <Link href="/transactions" className="hidden h-11 w-full max-w-md items-center gap-3 rounded-full border border-border bg-surface px-4 text-sm text-muted-foreground transition hover:border-ring/45 hover:text-foreground lg:flex">
          <Search className="size-4" aria-hidden="true" />
          <span className="flex-1">Search transactions</span>
          <kbd className="rounded-full border border-border bg-elevated px-2 py-1 text-[10px] font-bold tracking-wide text-muted-foreground">Ctrl K</kbd>
        </Link>
        <div className="flex items-center gap-2">
          {data.demo && <Link href="/login" className="rounded-full border border-income/15 bg-income/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-income"><span className="sm:hidden">Sample</span><span className="hidden sm:inline">Sample workspace · Use my data</span></Link>}
          <Link href="/calendar" className="relative hidden size-11 place-items-center rounded-full border border-border bg-surface text-muted-foreground transition hover:border-ring/40 hover:text-foreground sm:grid" aria-label={`Open upcoming reminders${unreadNotifications ? `, ${unreadNotifications} unread` : ""}`}><Bell className="size-[18px]" />{unreadNotifications > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-expense" aria-hidden="true" />}</Link>
          <Link href="/settings" className="hidden size-11 place-items-center rounded-full border border-border bg-elevated text-xs font-bold sm:grid" aria-label={`Open settings for ${data.profile.displayName}`}><span>{initials(data.profile.displayName)}</span><StatusIcon className="sr-only" /></Link>
          <Button className="hidden rounded-full px-5 sm:inline-flex" onClick={() => setEntryOpen(true)}><Plus className="size-4" /> Add transaction</Button>
        </div>
      </header>
      {connectionState === "cached" && <div className="border-b border-warning/25 bg-warning/10 px-4 py-2.5 text-center text-xs font-semibold text-warning" role="status">{connectionError}</div>}
      <main className="mx-auto min-w-0 w-full max-w-[1660px] px-4 pb-28 pt-7 sm:px-7 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">{children}</main>
    </div>

    <nav className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-5 border-t border-border bg-primary/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
      {mobile.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        if (item.href === "#add") return <button key={item.href} onClick={() => setEntryOpen(true)} className="relative flex min-h-11 flex-col items-center justify-end gap-1 pb-2 text-[10px] font-bold text-info" aria-label="Add transaction"><span className="absolute -top-5 grid size-14 place-items-center rounded-full border-[5px] border-background bg-brand text-white shadow-float"><Plus className="size-6" /></span><span>Add</span></button>;
        return <Link key={item.href} href={item.href} className={cn("flex min-h-11 flex-col items-center justify-end gap-1 pb-2 text-[10px] font-bold transition", active ? "text-info" : "text-muted-foreground")}><item.icon className="size-5" aria-hidden="true" /><span>{item.label}</span></Link>;
      })}
    </nav>

    <TransactionEntryMenu open={entryOpen} onClose={() => setEntryOpen(false)} onManual={() => { setEntryOpen(false); setVoicePrompt(false); setAddOpen(true); }} onVoice={() => { setEntryOpen(false); setVoicePrompt(true); setAddOpen(true); }} />
    <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} voicePrompt={voicePrompt} />
  </div>;
}
