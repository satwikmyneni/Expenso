import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck, TrendingUp, X } from "lucide-react";

export function AuthShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,.9fr)_minmax(520px,1.1fr)]">
    <section className="flex items-start justify-center px-5 py-5 sm:px-10 sm:py-10 lg:items-center lg:px-14 lg:py-12">
      <div className="w-full max-w-[430px]">
        <Link href="/" className="mb-10 inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-surface hover:text-foreground sm:mb-12 lg:w-auto lg:justify-start lg:gap-2 lg:pr-4" aria-label="Back to Expenso">
          <X className="size-5 lg:hidden" aria-hidden="true" />
          <ArrowLeft className="hidden size-4 lg:block" aria-hidden="true" />
          <span className="hidden text-sm font-semibold lg:inline">Back to Expenso</span>
        </Link>
        <div className="mb-7">
          <span className="mb-7 hidden size-11 place-items-center rounded-[15px] bg-brand text-lg font-extrabold text-white shadow-float sm:grid">E</span>
          <p className="eyebrow mb-3 hidden text-info sm:block">Private money workspace</p>
          <h1 className="text-[1.8rem] font-semibold leading-tight tracking-[-.045em] sm:text-[2.15rem]">{title}</h1>
          <p className="mt-2 max-w-md text-[13px] leading-6 text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </section>

    <aside className="relative hidden overflow-hidden border-l border-border bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
      <Link href="/" className="relative text-xl font-extrabold tracking-[-.04em]">expenso</Link>
      <div className="relative mx-auto w-full max-w-xl">
        <div className="panel-highlight overflow-hidden rounded-[28px] border border-white/10 bg-surface/35 p-5 xl:p-6">
          <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/45">Private overview</p><p className="mt-2 text-xl font-semibold">Your finances, clearly arranged</p></div><span className="grid size-11 place-items-center rounded-2xl bg-brand text-white"><TrendingUp className="size-5" /></span></div>
          <div className="mt-7 rounded-[22px] border border-white/[.07] bg-black/15 p-5">
            <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[.16em] text-white/40">Total balance</p><p className="mt-2 text-3xl font-semibold tracking-[-.05em]">Private by default</p></div><span className="status-pill bg-income text-[#05251d]">Synced</span></div>
            <svg viewBox="0 0 520 140" className="mt-7 w-full" aria-hidden="true"><defs><linearGradient id="auth-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgb(var(--income))" stopOpacity=".25" /><stop offset="1" stopColor="rgb(var(--income))" stopOpacity="0" /></linearGradient></defs><path d="M0 115 C55 107 82 84 128 91 S205 115 251 72 S322 63 365 51 S438 48 520 14 L520 140 L0 140Z" fill="url(#auth-chart-fill)" /><path d="M0 115 C55 107 82 84 128 91 S205 115 251 72 S322 63 365 51 S438 48 520 14" fill="none" stroke="rgb(var(--income))" strokeWidth="4" strokeLinecap="round" /></svg>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/[.06] bg-black/10 p-4"><p className="text-[10px] text-white/40">Ownership</p><p className="mt-2 text-sm font-semibold">One user ID</p></div><div className="rounded-2xl border border-white/[.06] bg-black/10 p-4"><p className="text-[10px] text-white/40">Protection</p><p className="mt-2 text-sm font-semibold">RLS enforced</p></div></div>
        </div>
        <p className="mt-9 max-w-lg text-3xl font-semibold leading-[1.2] tracking-[-.04em]">Clarity about your money should feel calm—not complicated.</p>
        <div className="mt-7 grid gap-3 text-xs text-white/55"><p className="flex items-center gap-3"><ShieldCheck className="size-4 text-income" />Every record remains isolated to its authenticated owner.</p><p className="flex items-center gap-3"><LockKeyhole className="size-4 text-info" />Your sign-in provider never changes that boundary.</p></div>
      </div>
      <p className="relative text-xs text-white/35">One personal workspace. Synced across your devices.</p>
    </aside>
  </main>;
}
