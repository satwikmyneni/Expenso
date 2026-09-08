"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  Banknote,
  ChartNoAxesCombined,
  CircleDollarSign,
  CreditCard,
  Gem,
  HandCoins,
  Landmark,
  MoreHorizontal,
  Pencil,
  ReceiptText,
  Trash2,
  Wallet,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { BankLogo } from "./bank-logo";
import { resolveAccountVisual, type AccountVisualIcon } from "./account-visuals";
import { creditCardMetrics, loanMetrics } from "./account-semantics";
import { accountDueDate } from "@/features/finance/liability-reminders";
import { formatMoney } from "@/features/finance/money";
import type { Account } from "@/features/finance/types";
import { cn } from "@/lib/utils";

const accountTypeLabel: Record<Account["type"], string> = {
  bank: "Bank account",
  savings: "Savings account",
  current: "Current account",
  checking: "Checking account",
  cash: "Cash",
  credit_card: "Credit card",
  debit_card: "Debit card",
  prepaid_card: "Prepaid card",
  loan: "Loan",
  investment: "Investment",
  wallet: "Digital wallet",
  asset: "Asset",
  liability: "Liability",
};

const accountIcons: Record<AccountVisualIcon, LucideIcon> = {
  landmark: Landmark,
  "credit-card": CreditCard,
  banknote: Banknote,
  wallet: Wallet,
  "hand-coins": HandCoins,
  chart: ChartNoAxesCombined,
  gem: Gem,
  receipt: ReceiptText,
  "circle-dollar": CircleDollarSign,
};

interface PremiumAccountCardProps {
  account: Account;
  balance: bigint;
  compact?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  lastPayment?: { date: string; amountMinor: bigint };
}

export function PremiumAccountCard({ account, balance, compact = false, onEdit, onDelete, lastPayment }: PremiumAccountCardProps) {
  const liability = ["credit_card", "loan", "liability"].includes(account.type);
  const visual = resolveAccountVisual(account);
  const { bankBrand } = visual;
  const AccountIcon = accountIcons[visual.icon];
  const formattedBalance = formatMoney(balance, account.currency);
  const institutionName = account.institution?.trim();
  const identityName = bankBrand.key === "default" ? institutionName || account.name : bankBrand.displayName;
  const metadataTitle = institutionName || account.name;
  const metadataSubtitle = account.name === metadataTitle ? "Personal" : account.name;
  const status = account.liabilityStatus ?? "active";
  const card = account.type === "credit_card" ? creditCardMetrics(account, balance) : null;
  const loan = account.type === "loan" ? loanMetrics(account, balance) : null;
  const dueDate = accountDueDate(account);
  const dueLabel = dueDate ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(dueDate).toUpperCase() : "Not set";

  return <article
    aria-label={`${account.name}, ${accountTypeLabel[account.type]}, ${liability ? "outstanding" : "balance"} ${formattedBalance}`}
    data-account-visual={visual.kind}
    data-bank-brand={bankBrand.key}
    className={cn(
      "panel-highlight relative isolate overflow-hidden rounded-[24px] border",
      compact ? "min-h-[226px] p-5" : "min-h-[246px] p-6",
    )}
    style={{ background: bankBrand.backgroundGradient, borderColor: bankBrand.borderColor, color: bankBrand.textColor }}
  >
    <span className="absolute -right-16 -top-20 size-56 rounded-full border" style={{ borderColor: bankBrand.decorationColor }} aria-hidden="true" />
    <span className="absolute -bottom-28 left-14 size-64 rounded-full border" style={{ borderColor: bankBrand.decorationColor }} aria-hidden="true" />
    <div className="relative flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <BankLogo brand={bankBrand} className="min-h-9 min-w-9 [&>svg]:size-6" />
        <div className="min-w-0">
          <Link href={`/transactions?accountId=${encodeURIComponent(account.id)}`} data-testid="account-identity" className="block min-h-9 truncate py-2 text-sm font-extrabold uppercase tracking-[-.035em]">{identityName}</Link>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.16em]" style={{ color: bankBrand.mutedTextColor }}>{accountTypeLabel[account.type]}</p>
        </div>
      </div>
      <span className="status-pill shrink-0 border" style={{ backgroundColor: bankBrand.statusBackgroundColor, borderColor: bankBrand.statusBorderColor, color: bankBrand.statusTextColor }}>{status}</span>
    </div>

    <div className="relative mt-6 flex min-h-11 items-center justify-between gap-4">
      {visual.showEmvChip ? <EmvChip /> : visual.kind === "bank" ? <span aria-hidden="true" /> : <span
        role="img"
        aria-label={visual.accessibleLabel}
        data-testid="account-symbol"
        className="grid size-11 place-items-center rounded-[14px] border bg-black/10"
        style={{ borderColor: bankBrand.borderColor, color: bankBrand.iconColor }}
      ><AccountIcon className="size-5" aria-hidden="true" /></span>}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-xs font-extrabold tracking-[-.02em]">EXPENSO</span>
        {visual.showContactless && <span role="img" aria-label="Contactless enabled" data-testid="contactless-symbol"><Wifi className="size-5 rotate-90" style={{ color: bankBrand.mutedTextColor }} aria-hidden="true" /></span>}
      </div>
    </div>

    {card ? <div className="relative mt-5" data-testid="credit-card-metrics">
      <div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-medium" style={{ color: bankBrand.mutedTextColor }}>Used</p><p className={cn("amount mt-1 truncate font-semibold tracking-[-.045em]", compact ? "text-[1.7rem]" : "text-[2rem]")}>{formatMoney(card.usedMinor, account.currency)}</p></div><div className="text-right"><p className="text-[10px]" style={{ color: bankBrand.mutedTextColor }}>Credit limit</p><p className="amount text-sm font-semibold">{formatMoney(card.limitMinor, account.currency)}</p></div></div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/20"><div className="h-full rounded-full bg-white/80" style={{ width: `${Math.min(Math.max(card.usedPercent, 0), 100)}%` }} /></div>
      <div className="mt-2 flex justify-between gap-3 text-[10px]"><span style={{ color: bankBrand.mutedTextColor }}>Available <strong className={card.overLimit ? "text-[#ffe3e3]" : "text-current"}>{formatMoney(card.availableMinor, account.currency)}</strong>{card.overLimit ? " · Over limit" : ""}</span><span className="text-right" style={{ color: bankBrand.mutedTextColor }}>Due {dueLabel}{account.minimumPaymentMinor !== undefined ? ` · Min ${formatMoney(account.minimumPaymentMinor, account.currency)}` : ""}{lastPayment ? ` · Last paid ${formatMoney(lastPayment.amountMinor, account.currency)} ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${lastPayment.date}T12:00:00`))}` : ""}</span></div>
    </div> : loan ? <div className="relative mt-5" data-testid="loan-metrics"><p className="text-[11px] font-medium" style={{ color: bankBrand.mutedTextColor }}>Outstanding</p><p className={cn("amount mt-1 truncate font-semibold tracking-[-.045em]", compact ? "text-[1.7rem]" : "text-[2rem]")}>{formatMoney(loan.outstandingMinor, account.currency)}</p><div className="mt-3 grid grid-cols-3 gap-2 text-[10px]" style={{ color: bankBrand.mutedTextColor }}><span>EMI<strong className="mt-0.5 block text-xs text-current">{formatMoney(loan.emiMinor, account.currency)}</strong></span><span>Next due<strong className="mt-0.5 block text-xs text-current">{dueLabel}</strong></span><span>Interest<strong className="mt-0.5 block text-xs text-current">{loan.interestRate.toFixed(2)}%</strong></span></div></div> : <div className="relative mt-7">
      <p className="text-[11px] font-medium" style={{ color: bankBrand.mutedTextColor }}>{liability ? "Outstanding" : "Balance"}</p>
      <p className={cn("amount mt-1 truncate font-semibold tracking-[-.045em]", compact ? "text-[2rem]" : "text-[2.35rem]")}>{formattedBalance}</p>
    </div>}

    <div className="relative mt-5 flex min-w-0 items-end justify-between gap-4 text-xs">
      <div className="min-w-0">
        <p className="truncate font-semibold">{metadataTitle}</p>
        <p className="mt-1 truncate text-[10px]" style={{ color: bankBrand.mutedTextColor }}>{metadataSubtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1" style={{ color: bankBrand.mutedTextColor }}>
        {visual.cardNetwork && <span className="mr-1 text-[10px] font-semibold tracking-normal">{visual.cardNetwork}</span>}
        <AccountCardActions account={account} onEdit={onEdit} onDelete={onDelete} />
        <Link
          href={`/transactions?accountId=${encodeURIComponent(account.id)}`}
          className="grid size-11 place-items-center rounded-full transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          aria-label={`Open transaction history for ${account.name}`}
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  </article>;
}

function AccountCardActions({ account, onEdit, onDelete }: { account: Account; onEdit?: () => void; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  if (!onEdit || !onDelete) {
    return <Link
      href={`/accounts?manage=${encodeURIComponent(account.id)}`}
      className="grid size-11 place-items-center rounded-full transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      aria-label={`Manage ${account.name}`}
    ><MoreHorizontal className="size-5" aria-hidden="true" /></Link>;
  }

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return <div className="relative">
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      className="grid size-11 place-items-center rounded-full transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      aria-label={`Manage ${account.name}`}
      aria-haspopup="menu"
      aria-expanded={open}
    ><MoreHorizontal className="size-5" aria-hidden="true" /></button>

    {open && <>
      <button type="button" className="fixed inset-0 z-40 hidden cursor-default sm:block" onClick={() => setOpen(false)} aria-label="Close account menu" />
      <div className="absolute bottom-12 right-0 z-50 hidden w-48 overflow-hidden rounded-2xl border border-border bg-elevated p-1.5 text-foreground shadow-float sm:grid" role="menu" aria-label={`Manage ${account.name}`}>
        <button type="button" role="menuitem" onClick={() => choose(onEdit)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"><Pencil className="size-4" aria-hidden="true" />Edit account</button>
        <button type="button" role="menuitem" onClick={() => choose(onDelete)} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"><Trash2 className="size-4" aria-hidden="true" />Delete account</button>
      </div>

      {createPortal(<div className="fixed inset-0 z-[60] flex items-end bg-background/75 backdrop-blur-sm sm:hidden" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
        <div className="w-full rounded-t-[26px] border border-border bg-elevated p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-foreground shadow-2xl" role="menu" aria-label={`Manage ${account.name}`}>
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-surface" aria-hidden="true" />
          <p className="px-2 pb-3 text-sm font-bold">{account.name}</p>
          <button type="button" role="menuitem" onClick={() => choose(onEdit)} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"><Pencil className="size-5" aria-hidden="true" />Edit account</button>
          <button type="button" role="menuitem" onClick={() => choose(onDelete)} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"><Trash2 className="size-5" aria-hidden="true" />Delete account</button>
        </div>
      </div>, document.body)}
    </>}
  </div>;
}

function EmvChip() {
  return <span data-testid="emv-chip" className="relative grid h-9 w-12 overflow-hidden rounded-lg border border-[#c9b87a]/60 bg-gradient-to-br from-[#f0e1a8] to-[#9f8c53]" aria-hidden="true">
    <i className="absolute inset-x-0 top-1/2 h-px bg-[#746739]/55" />
    <i className="absolute inset-y-0 left-1/3 w-px bg-[#746739]/55" />
    <i className="absolute inset-y-0 right-1/3 w-px bg-[#746739]/55" />
  </span>;
}
