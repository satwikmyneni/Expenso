import { format, isValid, parse, parseISO } from "date-fns";

export function normalizeIndianAmount(raw: string) {
  const clean = raw
    .replace(/[₹,\s]/g, "")
    .replace(/^(?:rs\.?|inr)/i, "")
    .replace(/\((.+)\)/, "-$1");
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(clean)) throw new Error("Invalid monetary amount");
  const negative = clean.startsWith("-");
  const unsigned = clean.replace("-", "");
  const [whole, fraction = ""] = unsigned.split(".");
  return `${negative ? "-" : ""}${whole}.${fraction.padEnd(2, "0")}`;
}

export function normalizeStatementDate(raw: string) {
  const cleaned = raw.trim().replace(/,/g, " ").replace(/\s+/g, " ");
  if (!cleaned) return "";
  const direct = parseISO(cleaned);
  if (isValid(direct)) return format(direct, "yyyy-MM-dd");
  for (const pattern of ["dd/MM/yyyy", "dd-MM-yyyy", "dd MMM yyyy", "dd MMMM yyyy", "MM/dd/yyyy", "dd/MM/yy", "dd-MM-yy"]) {
    const value = parse(cleaned, pattern, new Date());
    if (isValid(value)) return format(value, "yyyy-MM-dd");
  }
  return "";
}
