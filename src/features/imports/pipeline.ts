import Papa from "papaparse";
import type { AccountType, TransactionType } from "@/features/finance/types";
import { extractPdfText } from "./pdf";
import { extractTextLocally } from "./ocr";
import { merchantFromDescription, parseUpiDescription } from "./merchant-normalization";
import { normalizeIndianAmount, normalizeStatementDate } from "./normalization";
import type { Importer, NormalizedTransaction, StatementSource } from "./types";

type InputRow = Record<string, unknown>;
type Matrix = unknown[][];

const DATE_KEYS = ["date", "transaction date", "txn date", "transaction dt", "posted date"];
const VALUE_DATE_KEYS = ["value date", "value dt"];
const DESCRIPTION_KEYS = ["description", "narration", "particulars", "details", "transaction details", "merchant", "remarks"];
const DEBIT_KEYS = ["debit", "withdrawal", "withdrawal amount", "dr", "debit amount"];
const CREDIT_KEYS = ["credit", "deposit", "deposit amount", "cr", "credit amount"];
const AMOUNT_KEYS = ["amount", "transaction amount"];
const TYPE_KEYS = ["type", "dr cr", "debit credit", "transaction type"];
const REF_KEYS = ["reference", "ref no", "reference no", "transaction id", "utr", "cheque ref no"];
const BALANCE_KEYS = ["balance", "closing balance", "running balance"];
const knownHeaders = [...DATE_KEYS, ...VALUE_DATE_KEYS, ...DESCRIPTION_KEYS, ...DEBIT_KEYS, ...CREDIT_KEYS, ...AMOUNT_KEYS, ...TYPE_KEYS, ...REF_KEYS, ...BALANCE_KEYS];

const normalizedHeader = (value: unknown) => String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/[./_-]+/g, " ")
  .replace(/\s+/g, " ");

function first(row: InputRow, keys: string[]) {
  const value = keys.map((key) => row[key]).find((item) => item !== undefined && item !== null && String(item).trim() !== "");
  return value === undefined ? "" : String(value).trim();
}

function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function headerScore(row: unknown[]) {
  const headers = row.map(normalizedHeader);
  return headers.filter((header) => knownHeaders.includes(header)).length
    + (headers.some((header) => DATE_KEYS.includes(header)) ? 2 : 0)
    + (headers.some((header) => DESCRIPTION_KEYS.includes(header)) ? 2 : 0)
    + (headers.some((header) => [...DEBIT_KEYS, ...CREDIT_KEYS, ...AMOUNT_KEYS].includes(header)) ? 2 : 0);
}

function matrixRows(matrix: Matrix) {
  const candidates = matrix.slice(0, 40).map((row, index) => ({ index, score: headerScore(row) }));
  const header = candidates.sort((left, right) => right.score - left.score)[0];
  if (!header || header.score < 6) throw new Error("The statement headers were not recognized. Include Date, Description, and Debit/Credit or Amount columns.");
  const headers = matrix[header.index].map(normalizedHeader);
  if (!headers.some((value) => DATE_KEYS.includes(value)) || !headers.some((value) => DESCRIPTION_KEYS.includes(value))) {
    throw new Error("The statement must include recognizable date and description columns.");
  }

  const rows: InputRow[] = [];
  for (const values of matrix.slice(header.index + 1)) {
    const row = Object.fromEntries(headers.map((key, index) => [key || `column ${index + 1}`, values[index] ?? ""]));
    const rawDate = first(row, DATE_KEYS);
    const description = first(row, DESCRIPTION_KEYS);
    const debit = first(row, DEBIT_KEYS);
    const credit = first(row, CREDIT_KEYS);
    const amount = first(row, AMOUNT_KEYS);
    if (normalizeStatementDate(rawDate)) {
      rows.push(row);
      continue;
    }
    // A text-only line immediately following a dated row is a wrapped
    // narration. Totals, page headers, and amount-bearing rows are never joined.
    if (rows.length && description && !debit && !credit && !amount && !/\b(?:page|opening balance|closing balance|total)\b/i.test(description)) {
      const previous = rows[rows.length - 1];
      const key = DESCRIPTION_KEYS.find((candidate) => previous[candidate] !== undefined) ?? "description";
      previous[key] = `${String(previous[key] ?? "").trim()} ${description}`.trim();
    }
  }
  if (!rows.length) throw new Error("No transaction rows with valid dates were found in this statement.");
  return rows;
}

function transferSignal(description: string, direction: "debit" | "credit", selectedAccountType?: AccountType) {
  if (/\b(?:atm cash withdrawal|cash withdrawal|atm wdl)\b/i.test(description)) return "Cash withdrawal — choose the cash account";
  if (/\b(?:self transfer|own account|fund transfer to self)\b/i.test(description)) return "Possible transfer between your accounts";
  if (/\b(?:credit card payment|card payment|payment to card)\b/i.test(description)) return "Credit-card payment — choose the card account";
  if (selectedAccountType === "credit_card" && direction === "credit" && /\b(?:payment received|payment thank|autopay payment)\b/i.test(description)) return "Credit-card payment received — choose the paying account";
  return undefined;
}

export function detectImportedTransactionType(description: string, direction: "debit" | "credit", selectedAccountType?: AccountType): { type: TransactionType; transferReason?: string } {
  if (/\b(?:refund|reversal|reversed|chargeback|cashback reversal)\b/i.test(description) && direction === "credit") return { type: "refund" };
  const reason = transferSignal(description, direction, selectedAccountType);
  if (reason) return { type: "transfer", transferReason: reason };
  return { type: direction === "credit" ? "income" : "expense" };
}

export function normalizeRow(input: InputRow, index: number, source: StatementSource, selectedAccountType?: AccountType): NormalizedTransaction {
  const row = Object.fromEntries(Object.entries(input).map(([key, value]) => [normalizedHeader(key), value]));
  const debit = first(row, DEBIT_KEYS);
  const credit = first(row, CREDIT_KEYS);
  const generic = first(row, AMOUNT_KEYS);
  const rawType = first(row, TYPE_KEYS).toLowerCase();
  const rawDate = first(row, DATE_KEYS);
  const rawDescription = first(row, DESCRIPTION_KEYS) || "Imported transaction";
  const upi = parseUpiDescription(rawDescription);
  const issueCodes: string[] = [];
  let direction: "debit" | "credit";
  let rawAmount: string;
  if (debit && credit) {
    direction = "debit";
    rawAmount = debit;
    issueCodes.push("both_debit_and_credit");
  } else if (credit) {
    direction = "credit";
    rawAmount = credit;
  } else if (debit) {
    direction = "debit";
    rawAmount = debit;
  } else {
    direction = /\b(?:cr|credit|deposit)\b/.test(rawType) || generic.trim().startsWith("+") ? "credit" : "debit";
    rawAmount = generic.replace(/^[+-]/, "");
  }
  if (upi?.direction) direction = upi.direction;

  let amount = "";
  try {
    amount = normalizeIndianAmount(rawAmount);
    if (amount.startsWith("-") || amount === "0.00") issueCodes.push("invalid_amount");
  } catch { issueCodes.push("invalid_amount"); }
  const date = normalizeStatementDate(rawDate);
  if (!date) issueCodes.push("invalid_date");
  if (!rawDescription.trim()) issueCodes.push("missing_description");
  const detected = detectImportedTransactionType(rawDescription, direction, selectedAccountType);
  if (detected.type === "transfer") issueCodes.push("transfer_account_required");
  if (detected.type === "refund") issueCodes.push("refund_purchase_required");
  const invalid = issueCodes.some((issue) => ["invalid_amount", "invalid_date", "both_debit_and_credit", "missing_description"].includes(issue));
  const needsReview = !invalid && issueCodes.length > 0;
  return {
    id: `${source}-${index + 1}-${uuid()}`,
    rowNumber: index + 1,
    date,
    valueDate: normalizeStatementDate(first(row, VALUE_DATE_KEYS)) || undefined,
    description: rawDescription,
    merchant: upi?.merchant ?? merchantFromDescription(rawDescription),
    amount,
    direction,
    type: detected.type,
    reference: upi?.reference ?? (first(row, REF_KEYS) || undefined),
    bankCode: upi?.bankCode,
    upiId: upi?.upiId,
    paymentMethod: upi ? "UPI" : /\b(?:neft|imps|rtgs)\b/i.test(rawDescription) ? "Bank transfer" : /\batm\b/i.test(rawDescription) ? "Cash" : undefined,
    selected: !invalid && !needsReview,
    status: invalid ? "invalid" : needsReview ? "needs_review" : "ready",
    issueCodes,
    confidence: "low",
    transferReason: detected.transferReason,
    source,
  };
}

function delimitedMatrix(text: string) {
  const parsed = Papa.parse<unknown[]>(text, { skipEmptyLines: "greedy" });
  const rows = parsed.data as Matrix;
  if (rows.some((row) => row.length > 1)) return rows;
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => line.split(/\t|\s{2,}|\s*\|\s*/));
}

export function parseStatementText(text: string, source: Extract<StatementSource, "csv" | "txt" | "pdf">, selectedAccountType?: AccountType) {
  const rows = matrixRows(delimitedMatrix(text));
  return rows.map((row, index) => normalizeRow(row, index, source, selectedAccountType));
}

const delimitedImporter: Importer = {
  supports: (file) => /\.(csv|txt)$/i.test(file.name),
  async parse(file) {
    return parseStatementText(await file.text(), /\.txt$/i.test(file.name) ? "txt" : "csv");
  },
};

const spreadsheetImporter: Importer = {
  supports: (file) => /\.(xls|xlsx)$/i.test(file.name),
  async parse(file, onProgress) {
    onProgress?.(15, "Opening spreadsheet locally");
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error("The spreadsheet does not contain a readable worksheet.");
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: false, dateNF: "dd/MM/yyyy", blankrows: false }) as Matrix;
    const source = /\.xls$/i.test(file.name) ? "xls" : "xlsx";
    return matrixRows(matrix).map((row, index) => normalizeRow(row, index, source));
  },
};

const pdfImporter: Importer = {
  supports: (file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf",
  async parse(file, onProgress) {
    let text = await extractPdfText(file, onProgress);
    if (text.replace(/\s/g, "").length < 40) {
      onProgress?.(20, "No selectable text found; starting local OCR");
      text = (await extractTextLocally(file, onProgress)).text;
    }
    return parseStatementText(text, "pdf");
  },
};

export async function parseStatement(file: File, onProgress?: (progress: number, message: string) => void) {
  if (file.size === 0) throw new Error("This file is empty.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Statements must be 20 MB or smaller.");
  const importer = [delimitedImporter, spreadsheetImporter, pdfImporter].find((candidate) => candidate.supports(file));
  if (!importer) throw new Error("Use a PDF, CSV, XLS, XLSX, or TXT statement.");
  const rows = await importer.parse(file, onProgress);
  if (rows.length > 5_000) throw new Error("This statement has more than 5,000 rows. Split it into smaller files before importing.");
  onProgress?.(100, `${rows.length} rows prepared for review`);
  return rows;
}

export { normalizeIndianAmount, normalizeStatementDate } from "./normalization";
