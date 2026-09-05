export const MINOR_SCALE = 2;

export function parseMoney(value: string): bigint {
  const normalized = value.trim().replace(/[₹$€£,\s]/g, "");
  if (!/^-?\d+(?:\.\d{0,2})?$/.test(normalized)) throw new Error("Enter a valid amount with up to two decimal places");
  const negative = normalized.startsWith("-");
  const [wholeRaw, fractionRaw = ""] = normalized.replace("-", "").split(".");
  const minor = BigInt(wholeRaw) * 100n + BigInt(fractionRaw.padEnd(2, "0"));
  return negative ? -minor : minor;
}

export function decimalToMinor(value: string | number): bigint {
  return parseMoney(String(value));
}

export function minorToDecimal(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function formatMoney(value: bigint, currency = "INR", locale = "en-IN", compact = false): string {
  // Intl is presentation-only. All arithmetic stays in integer minor units.
  const asNumber = Number(value) / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    maximumFractionDigits: compact || value % 100n === 0n ? 0 : 2,
    notation: compact ? "compact" : "standard",
  }).format(asNumber);
}

export function sumMoney(values: readonly bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n);
}

export function percentage(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return Number((part * 10_000n) / whole) / 100;
}
