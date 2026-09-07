import type { TransactionType } from "@/features/finance/types";

export type StatementSource = "csv" | "txt" | "xls" | "xlsx" | "pdf";
export type DeterministicConfidence = "high" | "medium" | "low";
export type ImportReviewStatus = "ready" | "needs_review" | "duplicate" | "invalid" | "skipped";

export interface UpiDetails {
  direction?: "debit" | "credit";
  reference?: string;
  merchant?: string;
  bankCode?: string;
  upiId?: string;
  suffix?: string;
}

export interface DuplicateCandidate {
  transactionId?: string;
  rowId?: string;
  confidence: "likely" | "possible";
  reasons: string[];
  source: "existing" | "statement";
}

export interface NormalizedTransaction {
  id: string;
  rowNumber: number;
  date: string;
  description: string;
  merchant: string;
  amount: string;
  direction: "debit" | "credit";
  type: TransactionType;
  reference?: string;
  valueDate?: string;
  bankCode?: string;
  upiId?: string;
  paymentMethod?: string;
  selected: boolean;
  status: ImportReviewStatus;
  issueCodes: string[];
  confidence: DeterministicConfidence;
  categoryId?: string;
  categoryReason?: string;
  accountId?: string;
  transferAccountId?: string;
  refundOfId?: string;
  duplicate?: DuplicateCandidate;
  importDuplicateAnyway?: boolean;
  reviewed?: boolean;
  rememberRule?: boolean;
  transferReason?: string;
  source: StatementSource;
}

export interface Importer {
  supports(file: File): boolean;
  parse(file: File, onProgress?: (progress: number, message: string) => void): Promise<NormalizedTransaction[]>;
}

export interface ReceiptExtraction {
  rawText: string;
  merchant: string;
  amount: string;
  date: string;
  time?: string;
  type: TransactionType;
  upiId?: string;
  reference?: string;
  invoiceNumber?: string;
  orderNumber?: string;
  paymentMethod?: string;
  confidence: DeterministicConfidence;
  issueCodes: string[];
}
