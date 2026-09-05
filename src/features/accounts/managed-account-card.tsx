"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AccountFormDialog } from "./account-form-dialog";
import { PremiumAccountCard } from "./premium-account-card";
import { useFinance } from "@/features/finance/finance-provider";
import type { Account, AccountDraft } from "@/features/finance/types";
import { loadedAccountDeleteBlocker } from "./account-deletion";

export function ManagedAccountCard({ account, balance, compact = false }: { account: Account; balance: bigint; compact?: boolean }) {
  const { data, updateAccount, deleteAccount, archiveAccount } = useFinance();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteBlocker = loadedAccountDeleteBlocker(data, account.id);
  const lastPayment = [...data.transactions]
    .filter((transaction) => transaction.type === "transfer" && transaction.transferAccountId === account.id)
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  const save = async (draft: AccountDraft) => {
    try {
      await updateAccount(account.id, draft);
      setEditing(false);
      toast.success("Account updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update account");
    }
  };

  const remove = async () => {
    if (deleteBlocker) return;
    setDeleting(true);
    try {
      await deleteAccount(account.id);
      setConfirmingDelete(false);
      toast.success("Account deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete account");
    } finally {
      setDeleting(false);
    }
  };

  const archive = async () => {
    setDeleting(true);
    try {
      await archiveAccount(account.id);
      setConfirmingDelete(false);
      toast.success("Account archived; financial history was preserved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not archive account");
    } finally { setDeleting(false); }
  };

  return <>
    <PremiumAccountCard account={account} balance={balance} compact={compact} onEdit={() => setEditing(true)} onDelete={() => setConfirmingDelete(true)} lastPayment={lastPayment ? { date: lastPayment.date, amountMinor: lastPayment.amountMinor } : undefined} />
    <AccountFormDialog open={editing} onClose={() => setEditing(false)} account={account} accounts={data.accounts} currency={data.profile.currency} onSave={save} />
    <Modal
      open={confirmingDelete}
      onClose={() => setConfirmingDelete(false)}
      title={deleteBlocker ? "Account cannot be deleted" : "Delete account?"}
      description={deleteBlocker
        ? `This account has ${deleteBlocker}. Expenso will keep it intact so balances, reports, and financial records are not lost.`
        : "This permanently removes the account. Financial history linked elsewhere may prevent deletion."}
    >
      <div className="flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end sm:p-6">
        <Button type="button" variant="secondary" onClick={() => setConfirmingDelete(false)}>{deleteBlocker ? "Keep account" : "Cancel"}</Button>
        {deleteBlocker ? <Button type="button" onClick={() => void archive()} disabled={deleting}>{deleting ? "Archiving…" : "Archive account"}</Button> : <Button type="button" variant="danger" onClick={() => void remove()} disabled={deleting}>{deleting ? "Deleting…" : "Delete account"}</Button>}
      </div>
    </Modal>
  </>;
}
