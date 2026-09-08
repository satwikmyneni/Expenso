"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccountFormDialog } from "@/features/accounts/account-form-dialog";
import { ManagedAccountCard } from "@/features/accounts/managed-account-card";
import { accountBalance, netWorth } from "@/features/finance/calculations";
import { useFinance } from "@/features/finance/finance-provider";
import { formatMoney } from "@/features/finance/money";
import type { AccountDraft } from "@/features/finance/types";

export default function AccountsPage() {
  return <Suspense fallback={<p role="status">Loading accounts…</p>}><AccountsContent /></Suspense>;
}

function AccountsContent() {
  const params = useSearchParams();
  const { data, addAccount } = useFinance();
  const [open, setOpen] = useState(false);
  const worth = netWorth(data.accounts, data.transactions);

  const create = async (draft: AccountDraft) => {
    try {
      await addAccount(draft);
      toast.success("Account added");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add account");
    }
  };

  return <>
    <PageHeading eyebrow="Your money, in one place" title="Accounts" description="Balances update automatically as you add, import, or edit transactions." action={<Button className="rounded-full px-5" onClick={() => setOpen(true)}><Plus className="size-4" /> Add account</Button>} />
    <Card className="relative mb-6 overflow-hidden border-border bg-primary text-primary-foreground">
      <span className="absolute -right-14 -top-24 size-72 rounded-full border border-white/[.06]" aria-hidden="true" />
      <CardContent className="relative grid gap-8 p-7 sm:grid-cols-[1fr_auto] sm:items-end lg:p-9">
        <div><p className="eyebrow text-primary-foreground/55">Personal net worth</p><p className="amount mt-4 text-4xl font-semibold tracking-[-.055em] sm:text-5xl">{formatMoney(worth, data.profile.currency)}</p><p className="mt-3 text-sm text-primary-foreground/60">Assets minus liabilities across included accounts</p></div>
        <span className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/[.04]"><WalletCards className="size-6 text-info" /></span>
      </CardContent>
    </Card>
    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {data.accounts.filter((account) => !account.archived).map((account) => <ManagedAccountCard key={`${account.id}-${params.get("manage") === account.id}`} initiallyEditing={params.get("manage") === account.id} account={account} balance={accountBalance(account, data.transactions)} />)}
    </div>
    <AccountFormDialog open={open} onClose={() => setOpen(false)} accounts={data.accounts} currency={data.profile.currency} onSave={create} />
  </>;
}
