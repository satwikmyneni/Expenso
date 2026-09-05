import Papa from "papaparse";
import { format, parse, parseISO, isValid } from "date-fns";
import type { Importer, NormalizedTransaction } from "./types";

type InputRow = Record<string, unknown>;
const DATE_KEYS = ["date", "transaction date", "txn date", "value date", "posted date"];
const DESCRIPTION_KEYS = ["description", "narration", "details", "transaction details", "merchant", "remarks"];
const DEBIT_KEYS = ["debit", "withdrawal", "withdrawal amount", "dr", "debit amount"];
const CREDIT_KEYS = ["credit", "deposit", "deposit amount", "cr", "credit amount"];
const AMOUNT_KEYS = ["amount", "transaction amount"];
const TYPE_KEYS = ["type", "dr/cr", "debit/credit"];
const REF_KEYS = ["reference", "ref no", "transaction id", "utr", "cheque/ref no"];

function normalizedObject(row: InputRow) { return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value])); }
function first(row: InputRow, keys: string[]) { const value = keys.map((key) => row[key]).find((item) => item !== undefined && String(item).trim() !== ""); return value === undefined ? "" : String(value).trim(); }
export function normalizeIndianAmount(raw: string) { const clean = raw.replace(/[₹,\s]/g, "").replace(/\((.+)\)/, "-$1"); if (!/^-?\d+(?:\.\d{1,2})?$/.test(clean)) throw new Error(`Invalid amount: ${raw}`); const unsigned=clean.replace("-",""); const [whole,fraction=""]=unsigned.split("."); return `${whole}.${fraction.padEnd(2,"0")}`; }
function normalizeDate(raw: string) {
  const direct = parseISO(raw); if (isValid(direct)) return format(direct, "yyyy-MM-dd");
  for (const pattern of ["dd/MM/yyyy", "dd-MM-yyyy", "dd MMM yyyy", "MM/dd/yyyy"]) { const value = parse(raw, pattern, new Date()); if (isValid(value)) return format(value, "yyyy-MM-dd"); }
  return "";
}
function merchantFromDescription(description: string) { return description.replace(/\b(UPI|IMPS|NEFT|RTGS|POS|ATM|DR|CR)\b/gi, "").split(/[\/-]/).map((part) => part.trim()).filter(Boolean)[0]?.slice(0, 80) || "Imported transaction"; }

export function normalizeRow(input: InputRow, index: number, source: NormalizedTransaction["source"]): NormalizedTransaction {
  const row = normalizedObject(input); const debit = first(row, DEBIT_KEYS); const credit = first(row, CREDIT_KEYS); const generic = first(row, AMOUNT_KEYS); const type = first(row, TYPE_KEYS).toLowerCase(); const rawAmount = debit || credit || generic;
  const description = first(row, DESCRIPTION_KEYS) || "Imported transaction"; const date = normalizeDate(first(row, DATE_KEYS));
  let amount = ""; let issue: string | undefined;
  try { amount = normalizeIndianAmount(rawAmount); } catch { issue = "Missing or invalid amount"; }
  if (!date) issue = issue ? `${issue}; missing or invalid date` : "Missing or invalid date";
  const direction = credit || /\b(cr|credit|deposit)\b/.test(type) ? "credit" : "debit";
  return { id: `${source}-${index}-${crypto.randomUUID()}`, date, description, merchant: merchantFromDescription(description), amount, direction, reference: first(row, REF_KEYS) || undefined, selected: !issue, issue, source };
}

export const csvImporter: Importer = {
  supports: (file) => /\.(csv|txt)$/i.test(file.name),
  async parse(file) {
    const text = await file.text();
    const result = Papa.parse<InputRow>(text, { header: true, skipEmptyLines: true, transformHeader: (header) => header.trim().toLowerCase() });
    if (result.errors.length && !result.data.length) throw new Error(result.errors[0].message);
    return result.data.map((row, index) => normalizeRow(row, index, file.name.endsWith(".txt") ? "txt" : "csv"));
  },
};

export const xlsxImporter: Importer = {
  supports: (file) => /\.xlsx$/i.test(file.name),
  async parse(file) {
    const { readSheet } = await import("read-excel-file/browser");
    const sheet = await readSheet(file); const [header = [], ...body] = sheet;
    const headers = header.map((value) => String(value ?? "").trim());
    const rows = body.map((values) => Object.fromEntries(headers.map((key, index) => [key, values[index] ?? ""]))) as InputRow[];
    return rows.map((row, index) => normalizeRow(row, index, "xlsx"));
  },
};

export async function parseStatement(file: File) {
  const importer = [csvImporter, xlsxImporter].find((item) => item.supports(file));
  if (!importer) throw new Error("Use a CSV, TXT, or XLSX statement.");
  return importer.parse(file);
}
