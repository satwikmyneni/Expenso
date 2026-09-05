import type { FinanceData } from "@/features/finance/types";

export function loadedAccountDeleteBlocker(data: Pick<FinanceData, "accounts" | "transactions" | "goalContributions" | "recurring">, accountId: string) {
  if (data.transactions.some((transaction) => transaction.accountId === accountId || transaction.transferAccountId === accountId)) return "transaction history";
  if (data.goalContributions.some((contribution) => contribution.sourceAccountId === accountId)) return "goal contribution history";
  if (data.recurring.some((item) => item.accountId === accountId)) return "a bill, subscription, or recurring payment";
  if (data.accounts.some((account) => account.paymentAccountId === accountId)) return "a card or loan repayment setting";
  return null;
}
