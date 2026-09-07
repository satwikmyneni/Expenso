import type { UpiDetails } from "./types";

const corporateSuffix = /\b(?:private|pvt|limited|ltd|llp|incorporated|inc|india)\b/gi;
const noiseOnly = /^(?:upi|imps|neft|rtgs|pos|atm|dr|cr|debit|credit|payment|paid|sent|received|successful|completed|no ref?)$/i;

const canonicalAliases: ReadonlyArray<[RegExp, string]> = [
  [/^mc ?donalds?$/, "McDonald's"],
  [/^mc ?donalds? india$/, "McDonald's"],
  [/^swiggy(?: instamart)?$/, "Swiggy"],
  [/^zomato(?: media)?$/, "Zomato"],
  [/^tata ?sky$/, "Tata Sky"],
  [/^tataplay$/, "Tata Play"],
  [/^amazon(?: seller services| pay)?$/, "Amazon"],
  [/^flipkart(?: payments)?$/, "Flipkart"],
  [/^netflix$/, "Netflix"],
  [/^uber(?: india)?$/, "Uber"],
  [/^ola(?: cabs)?$/, "Ola"],
  [/^airtel(?: payments bank)?$/, "Airtel"],
  [/^reliance jio|^jio$/, "Jio"],
  [/^bharat petroleum|^bpcl$/, "BPCL"],
  [/^hindustan petroleum|^hpcl$/, "HPCL"],
  [/^indian oil|^iocl$/, "IOCL"],
];

export function normalizeMerchantKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(corporateSuffix, " ")
    .toLowerCase()
    .replace(/[^a-z0-9@.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readableName(value: string) {
  const cleaned = value
    .replace(/[_]+/g, " ")
    .replace(/[.]+$/g, "")
    .replace(corporateSuffix, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (/^[A-Z0-9& .'-]{2,}$/.test(cleaned)) {
    return cleaned.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  return cleaned.slice(0, 1).toUpperCase() + cleaned.slice(1);
}

export function normalizeMerchant(value: string) {
  const key = normalizeMerchantKey(value);
  const canonical = canonicalAliases.find(([pattern]) => pattern.test(key))?.[1];
  return canonical ?? (readableName(value).slice(0, 100) || "Imported transaction");
}

export function parseUpiDescription(description: string): UpiDetails | null {
  const parts = description.split("/").map((part) => part.trim()).filter(Boolean);
  const upiIndex = parts.findIndex((part) => /^upi$/i.test(part));
  if (upiIndex < 0) return null;
  const directionPart = parts[upiIndex + 1]?.toUpperCase();
  const direction = directionPart === "DR" ? "debit" : directionPart === "CR" ? "credit" : undefined;
  const referencePart = parts[upiIndex + 2];
  const merchantPart = parts[upiIndex + 3];
  const bankCode = parts[upiIndex + 4];
  const upiId = parts[upiIndex + 5];
  const suffix = parts.slice(upiIndex + 6).join("/") || undefined;
  return {
    direction,
    reference: referencePart && /^\d{6,}$/.test(referencePart.replace(/\s/g, "")) ? referencePart.replace(/\s/g, "") : undefined,
    merchant: merchantPart && !noiseOnly.test(merchantPart) ? normalizeMerchant(merchantPart) : undefined,
    bankCode: bankCode && /^[a-z0-9]{3,12}$/i.test(bankCode) ? bankCode.toUpperCase() : undefined,
    upiId: upiId && (upiId.includes("@") || /^[a-z0-9._-]{3,}$/i.test(upiId)) ? upiId : undefined,
    suffix,
  };
}

export function merchantFromDescription(description: string) {
  const upi = parseUpiDescription(description);
  if (upi?.merchant) return upi.merchant;

  const starParts = description.split("*").map((part) => part.trim()).filter(Boolean);
  if (/^(?:neft|imps|rtgs)$/i.test(starParts[0] ?? "")) {
    const named = starParts.find((part, index) => index > 1 && /[a-z]{3}/i.test(part) && !noiseOnly.test(part));
    if (named) return normalizeMerchant(named);
  }

  const candidates = description
    .split(/[|/;-]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
    .filter((part) => !noiseOnly.test(part))
    .filter((part) => !/^\d{6,}$/.test(part))
    .filter((part) => !/^[a-z]{3,5}\d{4,}$/i.test(part));
  const named = candidates.find((part) => /[a-z]{2}/i.test(part));
  return normalizeMerchant(named ?? description);
}
