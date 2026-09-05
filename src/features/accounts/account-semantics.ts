import type { Account, AccountType } from "@/features/finance/types";

const assetTypes = new Set<AccountType>(["bank", "savings", "current", "checking", "cash", "wallet", "debit_card", "prepaid_card", "investment", "asset"]);
const cashTypes = new Set<AccountType>(["bank", "savings", "current", "checking", "cash", "wallet", "debit_card", "prepaid_card"]);
const liabilityTypes = new Set<AccountType>(["credit_card", "loan", "liability"]);

export const isAssetAccountType = (type: AccountType) => assetTypes.has(type);
export const isCashAccountType = (type: AccountType) => cashTypes.has(type);
export const isLiabilityAccountType = (type: AccountType) => liabilityTypes.has(type);

export function creditCardMetrics(account: Account, outstandingMinor: bigint) {
  const usedMinor = outstandingMinor > 0n ? outstandingMinor : 0n;
  const limitMinor = account.creditLimitMinor ?? 0n;
  const availableMinor = limitMinor - usedMinor;
  const usedPercent = limitMinor > 0n ? Number((usedMinor * 10_000n) / limitMinor) / 100 : 0;
  return { limitMinor, usedMinor, availableMinor, usedPercent, overLimit: limitMinor > 0n && usedMinor > limitMinor };
}

export function loanMetrics(account: Account, outstandingMinor: bigint) {
  return {
    originalMinor: account.originalPrincipalMinor ?? account.openingBalanceMinor,
    outstandingMinor: outstandingMinor > 0n ? outstandingMinor : 0n,
    emiMinor: account.emiMinor ?? 0n,
    interestRate: account.interestRate ?? 0,
    nextPaymentDate: account.nextPaymentDate,
  };
}
