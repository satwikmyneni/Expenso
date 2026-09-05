import { differenceInCalendarDays, parseISO } from "date-fns";
import type { FinanceTransaction, TransactionDraft } from "./types";
import { parseMoney } from "./money";

export interface DuplicateMatch { transaction: FinanceTransaction; confidence: "likely" | "possible"; reasons: string[] }

function normalizeText(value = "") { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }

export function detectDuplicates(draft: TransactionDraft, existing: FinanceTransaction[]): DuplicateMatch[] {
  const amount = parseMoney(draft.amount);
  return existing.flatMap((transaction) => {
    const reasons: string[] = [];
    if (transaction.amountMinor === amount) reasons.push("same amount");
    if (differenceInCalendarDays(parseISO(transaction.date), parseISO(draft.date)) === 0) reasons.push("same date");
    if (normalizeText(transaction.merchant) && normalizeText(transaction.merchant) === normalizeText(draft.merchant)) reasons.push("same merchant");
    if (draft.accountId === transaction.accountId) reasons.push("same account");
    if (reasons.length < 3) return [];
    return [{ transaction, confidence: reasons.length === 4 ? "likely" as const : "possible" as const, reasons }];
  });
}

const transferTerms = ["transfer", "self transfer", "credit card payment", "cash withdrawal", "atm withdrawal", "neft", "imps"];
export function looksLikeTransfer(description: string, counterpart?: FinanceTransaction) {
  const normalized = description.toLowerCase();
  const keyword = transferTerms.some((term) => normalized.includes(term));
  const pair = counterpart ? Math.abs(differenceInCalendarDays(parseISO(counterpart.date), new Date())) <= 2 : false;
  return { likely: keyword || pair, reason: keyword ? "Transfer-like description" : pair ? "Matching movement between accounts" : "No transfer signal" };
}

export function categorizeMerchant(merchant: string) {
  const value = merchant.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/swiggy|zomato|restaurant|cafe|coffee|biryani/, "food"],
    [/uber|ola|rapido|metro|fuel|petrol/, "transport"],
    [/amazon|flipkart|myntra|ikea/, "shopping"],
    [/netflix|spotify|prime|hotstar/, "entertainment"],
    [/electric|bescom|water|airtel|jio/, "utilities"],
    [/salary|payroll/, "income"],
  ];
  return rules.find(([pattern]) => pattern.test(value))?.[1];
}
