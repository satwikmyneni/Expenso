import Link from "next/link";
import { ArrowRight, BarChart3, Check, CreditCard, LockKeyhole, ReceiptText, ShieldCheck, Tags, Target, WifiOff } from "lucide-react";
import { isSupabaseConfigAbsent } from "@/lib/supabase/config";

const features = [
  { icon: ReceiptText, title: "Effortless tracking", text: "Quick add, voice entry, smart categories, historical editing, and powerful search." },
  { icon: BarChart3, title: "Honest insights", text: "Exact calculations for cash flow, spending, savings, budgets, and net worth." },
  { icon: Tags, title: "Your own system", text: "Private custom categories keep every report useful without sharing your data." },
  { icon: WifiOff, title: "Useful offline", text: "Keep recording expenses without a connection and sync safely later." },
  { icon: LockKeyhole, title: "Private by default", text: "Database-level isolation ensures every user can access only their own records." },
  { icon: Target, title: "Plan ahead", text: "Budgets, goals, subscriptions, recurring payments, bills, and reminders." },
];

export default function HomePage() {
  return <main className="min-h-screen overflow-hidden">
    <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-primary text-lg font-black text-primary-foreground">E</span><span className="text-xl font-extrabold tracking-[-.04em]">expenso</span></Link>
      <nav className="hidden items-center gap-8 text-sm font-semibold text-muted md:flex"><a href="#features">Features</a><a href="#privacy">Privacy</a></nav>
      <div className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-4 py-2.5 text-sm font-bold text-foreground">Sign in</Link><Link href="/sign-up" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white">Get started</Link></div>
    </header>

    <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:pb-28 lg:pt-24">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border bg-surface px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-brand"><ShieldCheck className="size-3.5" />Private personal finance</span>
        <h1 className="mt-7 max-w-2xl text-5xl font-extrabold leading-[.98] tracking-[-.06em] sm:text-6xl lg:text-7xl">Your money,<br /><span className="font-display font-medium italic text-brand">beautifully clear.</span></h1>
        <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg">Expenses, accounts, budgets, goals, and net worth in one calm place—private to you and synced across your devices.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/sign-up" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white">Start for free <ArrowRight className="size-4" /></Link>{isSupabaseConfigAbsent && <Link href="/demo" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface px-6 text-sm font-bold">Explore sample workspace</Link>}</div>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-muted"><span className="flex items-center gap-1.5"><Check className="size-3.5 text-income" />No bank password needed</span><span className="flex items-center gap-1.5"><Check className="size-3.5 text-income" />Works on iPhone & Windows</span></div>
      </div>
      <div className="relative">
        <div className="absolute -inset-4 -z-10 rounded-[2.4rem] border border-secondary bg-secondary/50" />
        <div className="rounded-[2rem] border border-border bg-surface p-4 shadow-card sm:p-6">
          <div className="mb-6 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your private overview</p><p className="mt-1 text-xl font-semibold">Everything in its place</p></div><span className="grid size-10 place-items-center rounded-full bg-secondary font-bold text-info">E</span></div>
          <div className="rounded-3xl bg-primary p-6 text-primary-foreground"><p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/60">Personal net worth</p><p className="amount mt-3 text-4xl font-semibold">••••••</p><p className="mt-2 text-xs text-income">Visible only inside your workspace</p><svg viewBox="0 0 500 90" className="mt-4 w-full" aria-hidden><path d="M0 70 C60 65 65 42 120 51 S200 75 250 43 S330 38 380 25 S440 24 500 4" fill="none" stroke="rgb(var(--income))" strokeWidth="4" strokeLinecap="round" /><path d="M0 70 C60 65 65 42 120 51 S200 75 250 43 S330 38 380 25 S440 24 500 4 L500 90 L0 90Z" fill="rgb(var(--income) / .12)" /></svg></div>
          <div className="mt-4 grid grid-cols-2 gap-3"><Mini label="Transactions" value="Clearly tracked" icon={ReceiptText} /><Mini label="Savings goals" value="Progress visible" icon={Target} /></div>
          <div className="mt-4 rounded-2xl border p-4"><p className="mb-3 text-xs font-bold">Workspace essentials</p>{[["Accounts", "Balances stay connected"], ["Budgets", "Plan with real totals"], ["Insights", "Deterministic analysis"]].map((row) => <div key={row[0]} className="flex items-center border-t py-2.5 text-xs first:border-0"><span className="grid size-8 place-items-center rounded-lg bg-muted-surface"><CreditCard className="size-3.5 text-info" /></span><div className="ml-3 flex-1"><p className="font-bold">{row[0]}</p><p className="text-[10px] text-muted-foreground">{row[1]}</p></div><Check className="size-4 text-income" /></div>)}</div>
        </div>
      </div>
    </section>

    <section id="features" className="border-y bg-surface py-24"><div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="max-w-xl"><p className="eyebrow text-brand">The whole picture</p><h2 className="mt-4 text-4xl font-extrabold tracking-[-.045em]">A finance app built around clarity.</h2><p className="mt-4 leading-7 text-muted">Strong enough for detailed financial review, simple enough for a ten-second daily habit.</p></div><div className="mt-14 grid gap-px overflow-hidden rounded-3xl border bg-line md:grid-cols-3">{features.map((item) => <div className="bg-surface p-7 sm:p-9" key={item.title}><span className="grid size-11 place-items-center rounded-2xl bg-accent text-brand"><item.icon className="size-5" /></span><h3 className="mt-7 text-lg font-bold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{item.text}</p></div>)}</div></div></section>

    <section id="privacy" className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:items-center"><div><p className="eyebrow text-brand">Privacy is architecture</p><h2 className="mt-4 text-4xl font-extrabold tracking-[-.045em]">One app. Completely separate personal accounts.</h2><p className="mt-5 max-w-xl leading-7 text-muted">Every account, transaction, budget, receipt, and setting is owned by one authenticated user. Supabase Row Level Security enforces that boundary in the database—not just in the interface.</p></div><div className="grid gap-3">{["No shared family workspace or combined finances", "No UPI PIN, OTP, bank password, CVV, or ATM PIN", "AI is disabled; finance calculations remain deterministic", "Exports, backups, and storage stay scoped to the signed-in user"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border bg-surface p-4 text-sm font-semibold"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-income/10"><Check className="size-4 text-income" /></span>{item}</div>)}</div></section>

    <footer className="border-t py-10"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 text-xs text-muted sm:flex-row sm:px-8"><p>© 2026 Expenso. Personal finance, clearly.</p><div className="flex gap-5"><a href="#privacy">Privacy</a><Link href="/login">Sign in</Link></div></div></footer>
  </main>;
}

function Mini({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ReceiptText }) {
  return <div className="rounded-2xl bg-canvas p-4"><Icon className="size-4 text-brand" /><p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p><p className="amount mt-1 text-lg font-extrabold">{value}</p></div>;
}
