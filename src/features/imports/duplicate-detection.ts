import type { FinanceTransaction } from "@/features/finance/types";
import { parseMoney } from "@/features/finance/money";
import { normalizeMerchantKey } from "./merchant-normalization";
import type { DuplicateCandidate, NormalizedTransaction } from "./types";

const normalizedDescription = (value?: string) => normalizeMerchantKey(value ?? "");

export function duplicateAgainstExisting(row: NormalizedTransaction, existing: FinanceTransaction[]): DuplicateCandidate | undefined {
  if (!row.accountId || !row.date || !row.amount) return undefined;
  let amountMinor: bigint;
  try { amountMinor = parseMoney(row.amount); }
  catch { return undefined; }
  const merchant = normalizeMerchantKey(row.merchant);
  const description = normalizedDescription(row.description);

  const candidates = existing.flatMap((transaction) => {
    if (transaction.accountId !== row.accountId || transaction.amountMinor !== amountMinor || transaction.date !== row.date) {
      if (!(row.reference && transaction.reference && row.reference === transaction.reference && transaction.accountId === row.accountId)) return [];
    }
    const reasons: string[] = [];
    if (transaction.accountId === row.accountId) reasons.push("same account");
    if (transaction.date === row.date) reasons.push("same date");
    if (transaction.amountMinor === amountMinor) reasons.push("same amount");
    if (merchant && normalizeMerchantKey(transaction.merchant) === merchant) reasons.push("same merchant");
    if (description && normalizedDescription(transaction.description) === description) reasons.push("same original description");
    if (row.reference && transaction.reference && row.reference === transaction.reference) reasons.push("same reference");
    if (!reasons.includes("same reference") && reasons.length < 4) return [];
    return [{
      transactionId: transaction.id,
      confidence: reasons.includes("same reference") || reasons.length >= 5 ? "likely" as const : "possible" as const,
      reasons,
      source: "existing" as const,
    }];
  });
  return candidates.sort((left, right) => right.reasons.length - left.reasons.length)[0];
}

function sameStatementFingerprint(row: NormalizedTransaction) {
  return [row.accountId, row.date, row.amount, normalizeMerchantKey(row.merchant), row.reference ?? ""].join("|");
}

export function applyDuplicateDetection(rows: NormalizedTransaction[], existing: FinanceTransaction[]) {
  const firstByFingerprint = new Map<string, NormalizedTransaction>();
  return rows.map((row) => {
    if (row.status === "invalid") return row;
    const fingerprint = sameStatementFingerprint(row);
    const previous = firstByFingerprint.get(fingerprint);
    const duplicate = previous
      ? { rowId: previous.id, confidence: "likely" as const, reasons: ["same account", "same date", "same amount", "same merchant", ...(row.reference ? ["same reference"] : [])], source: "statement" as const }
      : duplicateAgainstExisting(row, existing);
    if (!previous) firstByFingerprint.set(fingerprint, row);
    if (!duplicate) return row;
    return { ...row, duplicate, status: "duplicate" as const, selected: false, issueCodes: [...new Set([...row.issueCodes, "possible_duplicate"])] };
  });
}
