import type { Account, Category, FinanceTransaction, MerchantRule, TransactionDraft } from "@/features/finance/types";
import { categorizeDeterministically } from "./categorization";
import { applyDuplicateDetection } from "./duplicate-detection";
import { detectImportedTransactionType } from "./pipeline";
import type { ImportReviewStatus, NormalizedTransaction } from "./types";

interface ReviewContext {
  account: Account;
  categories: Category[];
  merchantRules: MerchantRule[];
  history: FinanceTransaction[];
  duplicateCandidates?: FinanceTransaction[];
}

export function reviewStatus(row: NormalizedTransaction): ImportReviewStatus {
  if (!row.date || !/^\d+(?:\.\d{2})$/.test(row.amount) || !row.merchant.trim()) return "invalid" as const;
  if (row.duplicate && !row.importDuplicateAnyway) return "duplicate" as const;
  if (row.type === "transfer" && (!row.transferAccountId || row.transferAccountId === row.accountId)) return "needs_review" as const;
  if (row.type === "refund" && !row.refundOfId) return "needs_review" as const;
  if (row.type !== "transfer" && !row.categoryId) return "needs_review" as const;
  if (row.confidence === "low" && !row.reviewed) return "needs_review" as const;
  return "ready" as const;
}

export function normalizeReviewedRow(row: NormalizedTransaction): NormalizedTransaction {
  const status = row.status === "skipped" ? "skipped" : reviewStatus(row);
  return { ...row, status, selected: status === "ready" ? row.selected : false };
}

export function prepareRowsForReview(rows: NormalizedTransaction[], context: ReviewContext) {
  const prepared = rows.map((row) => {
    const detection = detectImportedTransactionType(row.description, row.direction, context.account.type);
    const category = detection.type === "transfer"
      ? undefined
      : categorizeDeterministically({ merchant: row.merchant, description: row.description, type: detection.type, accountId: context.account.id, categories: context.categories, personalRules: context.merchantRules, history: context.history });
    const issueCodes = row.issueCodes.filter((issue) => issue !== "transfer_account_required" && issue !== "refund_purchase_required");
    if (detection.type === "transfer") issueCodes.push("transfer_account_required");
    if (detection.type === "refund") issueCodes.push("refund_purchase_required");
    const next: NormalizedTransaction = {
      ...row,
      accountId: context.account.id,
      type: detection.type,
      transferReason: detection.transferReason,
      categoryId: category?.categoryId,
      categoryReason: category?.reason,
      confidence: category?.confidence ?? (detection.type === "transfer" ? "medium" : "low"),
      reviewed: false,
      issueCodes,
    };
    return normalizeReviewedRow(next);
  });
  return applyDuplicateDetection(prepared, context.duplicateCandidates ?? context.history).map(normalizeReviewedRow);
}

function sourceForTransaction(row: NormalizedTransaction): TransactionDraft["source"] {
  if (row.source === "xls") return "xlsx";
  if (row.source === "txt") return "csv";
  return row.source;
}

export function importRowToDraft(row: NormalizedTransaction, importId: string): TransactionDraft {
  if (!row.accountId) throw new Error(`Row ${row.rowNumber} has no destination account.`);
  let accountId = row.accountId;
  let transferAccountId: string | undefined;
  if (row.type === "transfer") {
    if (!row.transferAccountId) throw new Error(`Row ${row.rowNumber} needs a transfer account.`);
    if (row.direction === "credit") {
      accountId = row.transferAccountId;
      transferAccountId = row.accountId;
    } else {
      transferAccountId = row.transferAccountId;
    }
  }
  return {
    accountId,
    transferAccountId,
    categoryId: row.type === "transfer" ? undefined : row.categoryId,
    type: row.type,
    amount: row.amount,
    date: row.date,
    merchant: row.merchant,
    description: row.description,
    paymentMethod: row.paymentMethod,
    reference: row.reference,
    refundOfId: row.type === "refund" ? row.refundOfId : undefined,
    duplicateOfId: row.importDuplicateAnyway ? row.duplicate?.transactionId : undefined,
    reviewStatus: row.importDuplicateAnyway && row.duplicate?.transactionId ? "duplicate" : "confirmed",
    importId,
    source: sourceForTransaction(row),
    metadata: {
      import_row: row.rowNumber,
      categorization_confidence: row.confidence,
      categorization_reason: row.categoryReason ?? null,
      value_date: row.valueDate ?? null,
      upi_id: row.upiId ?? null,
      bank_code: row.bankCode ?? null,
    },
  };
}
