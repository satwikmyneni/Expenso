import { resolveBankBrand, type BankBrand } from "./bank-brands";

export type AccountVisualKind = "bank" | "card" | "cash" | "wallet" | "loan" | "investment" | "asset" | "liability" | "generic";
export type AccountVisualIcon = "landmark" | "credit-card" | "banknote" | "wallet" | "hand-coins" | "chart" | "gem" | "receipt" | "circle-dollar";
export type CardNetwork = "Visa" | "Mastercard" | "American Express" | "RuPay";

export interface AccountVisual {
  kind: AccountVisualKind;
  icon: AccountVisualIcon;
  accessibleLabel: string;
  showEmvChip: boolean;
  showContactless: boolean;
  cardNetwork: CardNetwork | null;
  bankBrand: BankBrand;
}

export interface AccountVisualInput {
  type: string;
  institution?: string | null;
  cardNetwork?: string | null;
}

const normalizeType = (value: string) => value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

function resolveCardNetwork(value: string | null | undefined): CardNetwork | null {
  const normalized = normalizeType(value ?? "");
  if (normalized === "visa") return "Visa";
  if (normalized === "mastercard" || normalized === "master card") return "Mastercard";
  if (normalized === "american express" || normalized === "amex") return "American Express";
  if (normalized === "rupay" || normalized === "ru pay") return "RuPay";
  return null;
}

export function resolveAccountVisual(account: AccountVisualInput): AccountVisual {
  const bankBrand = resolveBankBrand(account.institution);
  const type = normalizeType(account.type);
  const physicalCard = ["credit card", "debit card", "prepaid card", "payment card"].includes(type);

  if (physicalCard) {
    return {
      kind: "card",
      icon: "credit-card",
      accessibleLabel: "Physical payment card",
      showEmvChip: true,
      showContactless: true,
      cardNetwork: resolveCardNetwork(account.cardNetwork),
      bankBrand,
    };
  }

  const treatments: Record<string, Pick<AccountVisual, "kind" | "icon" | "accessibleLabel">> = {
    bank: { kind: "bank", icon: "landmark", accessibleLabel: "Bank account" },
    "bank account": { kind: "bank", icon: "landmark", accessibleLabel: "Bank account" },
    savings: { kind: "bank", icon: "landmark", accessibleLabel: "Savings account" },
    "savings account": { kind: "bank", icon: "landmark", accessibleLabel: "Savings account" },
    current: { kind: "bank", icon: "landmark", accessibleLabel: "Current account" },
    "current account": { kind: "bank", icon: "landmark", accessibleLabel: "Current account" },
    checking: { kind: "bank", icon: "landmark", accessibleLabel: "Checking account" },
    "checking account": { kind: "bank", icon: "landmark", accessibleLabel: "Checking account" },
    cash: { kind: "cash", icon: "banknote", accessibleLabel: "Cash account" },
    wallet: { kind: "wallet", icon: "wallet", accessibleLabel: "Digital wallet" },
    "digital wallet": { kind: "wallet", icon: "wallet", accessibleLabel: "Digital wallet" },
    loan: { kind: "loan", icon: "hand-coins", accessibleLabel: "Loan account" },
    investment: { kind: "investment", icon: "chart", accessibleLabel: "Investment account" },
    asset: { kind: "asset", icon: "gem", accessibleLabel: "Asset account" },
    liability: { kind: "liability", icon: "receipt", accessibleLabel: "Liability account" },
  };
  const treatment = treatments[type] ?? { kind: "generic" as const, icon: "circle-dollar" as const, accessibleLabel: "Financial account" };

  return {
    ...treatment,
    showEmvChip: false,
    showContactless: false,
    cardNetwork: null,
    bankBrand,
  };
}

