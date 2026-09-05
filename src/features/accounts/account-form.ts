import { z } from "zod";
import { parseMoney } from "@/features/finance/money";
import type { Account, AccountDraft, AccountType } from "@/features/finance/types";
import { financeColors } from "@/lib/theme";

export const accountTypeOptions: ReadonlyArray<{ value: AccountType; label: string }> = [
  { value: "bank", label: "Bank account" },
  { value: "savings", label: "Savings account" },
  { value: "current", label: "Current account" },
  { value: "checking", label: "Checking account" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit card" },
  { value: "debit_card", label: "Debit card" },
  { value: "prepaid_card", label: "Prepaid card" },
  { value: "wallet", label: "Digital wallet" },
  { value: "investment", label: "Investment" },
  { value: "loan", label: "Loan" },
  { value: "asset", label: "Other asset" },
  { value: "liability", label: "Other liability" },
];

const accountTypes = accountTypeOptions.map((item) => item.value) as [AccountType, ...AccountType[]];

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Account name is required.").max(100, "Account name must be 100 characters or fewer."),
  institution: z.string().trim().min(1, "Institution name is required.").max(120, "Institution name must be 120 characters or fewer."),
  type: z.enum(accountTypes),
  opening: z.string().trim().min(1, "Opening balance is required.").superRefine((value, context) => {
    try { parseMoney(value); }
    catch { context.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid amount with up to two decimal places." }); }
  }),
  cardNetwork: z.enum(["", "visa", "mastercard", "american_express", "rupay"]),
  creditLimit: z.string(),
  statementDay: z.string(),
  paymentDueDay: z.string(),
  minimumPayment: z.string(),
  paymentAccountId: z.string(),
  originalPrincipal: z.string(),
  interestRate: z.string(),
  emi: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  nextPaymentDate: z.string(),
  liabilityStatus: z.enum(["active", "paused", "closed"]),
  reminderSchedule: z.enum(["7,3,0", "3,0", "0", "off"]),
}).superRefine((value, context) => {
  const positiveMoney = (field: "creditLimit" | "originalPrincipal" | "emi", message: string) => {
    if (!value[field]) {
      context.addIssue({ code: "custom", path: [field], message });
      return;
    }
    try {
      if (parseMoney(value[field]) <= 0n) context.addIssue({ code: "custom", path: [field], message });
    } catch { context.addIssue({ code: "custom", path: [field], message: "Enter a valid amount with up to two decimal places." }); }
  };
  const optionalNonNegativeMoney = (field: "minimumPayment") => {
    if (!value[field]) return;
    try {
      if (parseMoney(value[field]) < 0n) context.addIssue({ code: "custom", path: [field], message: "Amount cannot be negative." });
    } catch { context.addIssue({ code: "custom", path: [field], message: "Enter a valid amount with up to two decimal places." }); }
  };
  const day = (field: "statementDay" | "paymentDueDay", label: string) => {
    const number = Number(value[field]);
    if (!Number.isInteger(number) || number < 1 || number > 31) context.addIssue({ code: "custom", path: [field], message: `${label} must be from 1 to 31.` });
  };

  if (value.type === "credit_card" || value.type === "loan" || value.type === "liability") {
    try {
      if (parseMoney(value.opening) < 0n) context.addIssue({ code: "custom", path: ["opening"], message: "Outstanding amount cannot be negative." });
    } catch { /* The base field validator reports malformed money. */ }
  }

  if (value.type === "credit_card") {
    positiveMoney("creditLimit", "Credit limit must be greater than zero.");
    day("statementDay", "Statement day");
    day("paymentDueDay", "Payment due day");
    optionalNonNegativeMoney("minimumPayment");
  }
  if (value.type === "loan") {
    positiveMoney("originalPrincipal", "Original principal must be greater than zero.");
    positiveMoney("emi", "EMI amount must be greater than zero.");
    const rate = Number(value.interestRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) context.addIssue({ code: "custom", path: ["interestRate"], message: "Interest rate must be between 0 and 100." });
    if (!value.nextPaymentDate) context.addIssue({ code: "custom", path: ["nextPaymentDate"], message: "Next payment date is required." });
    if (value.startDate && value.endDate && value.endDate < value.startDate) context.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date." });
  }
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;

export const emptyAccountForm: AccountFormValues = {
  name: "", institution: "", type: "bank", opening: "0", cardNetwork: "", creditLimit: "", statementDay: "", paymentDueDay: "", minimumPayment: "", paymentAccountId: "", originalPrincipal: "", interestRate: "", emi: "", startDate: "", endDate: "", nextPaymentDate: "", liabilityStatus: "active", reminderSchedule: "7,3,0",
};

const moneyInput = (value?: bigint) => value === undefined ? "" : `${value / 100n}.${String(value < 0n ? -(value % 100n) : value % 100n).padStart(2, "0")}`;

export function accountToForm(account?: Account): AccountFormValues {
  if (!account) return emptyAccountForm;
  const value = account.openingBalanceMinor;
  const absolute = value < 0n ? -value : value;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return {
    name: account.name,
    institution: account.institution ?? "",
    type: account.type,
    opening: `${value < 0n ? "-" : ""}${absolute / 100n}.${fraction}`,
    cardNetwork: account.cardNetwork ?? "",
    creditLimit: moneyInput(account.creditLimitMinor),
    statementDay: account.statementDay?.toString() ?? "",
    paymentDueDay: account.paymentDueDay?.toString() ?? "",
    minimumPayment: moneyInput(account.minimumPaymentMinor),
    paymentAccountId: account.paymentAccountId ?? "",
    originalPrincipal: moneyInput(account.originalPrincipalMinor),
    interestRate: account.interestRate?.toString() ?? "",
    emi: moneyInput(account.emiMinor),
    startDate: account.startDate ?? "",
    endDate: account.endDate ?? "",
    nextPaymentDate: account.nextPaymentDate ?? "",
    liabilityStatus: account.liabilityStatus ?? "active",
    reminderSchedule: account.remindersEnabled === false ? "off" : (account.reminderDays ?? [7, 3, 0]).join(",") as AccountFormValues["reminderSchedule"],
  };
}

export function accountFormToDraft(values: AccountFormValues, currency: string, existing?: Account): AccountDraft {
  return {
    name: values.name.trim(),
    institution: values.institution.trim(),
    type: values.type,
    currency,
    openingBalanceMinor: parseMoney(values.opening),
    color: existing?.color ?? financeColors.accent,
    lastFour: existing?.lastFour,
    includeInNetWorth: existing?.includeInNetWorth ?? true,
    includeInAnalytics: existing?.includeInAnalytics ?? true,
    cardNetwork: ["credit_card", "debit_card", "prepaid_card"].includes(values.type) && values.cardNetwork ? values.cardNetwork : undefined,
    creditLimitMinor: values.type === "credit_card" ? parseMoney(values.creditLimit) : undefined,
    statementDay: values.type === "credit_card" ? Number(values.statementDay) : undefined,
    paymentDueDay: values.type === "credit_card" ? Number(values.paymentDueDay) : undefined,
    minimumPaymentMinor: values.type === "credit_card" && values.minimumPayment ? parseMoney(values.minimumPayment) : undefined,
    paymentAccountId: (values.type === "credit_card" || values.type === "loan") && values.paymentAccountId ? values.paymentAccountId : undefined,
    originalPrincipalMinor: values.type === "loan" ? parseMoney(values.originalPrincipal) : undefined,
    interestRate: values.type === "loan" ? Number(values.interestRate) : undefined,
    emiMinor: values.type === "loan" ? parseMoney(values.emi) : undefined,
    startDate: values.type === "loan" && values.startDate ? values.startDate : undefined,
    endDate: values.type === "loan" && values.endDate ? values.endDate : undefined,
    nextPaymentDate: values.type === "loan" ? values.nextPaymentDate : undefined,
    liabilityStatus: values.type === "credit_card" || values.type === "loan" ? values.liabilityStatus : undefined,
    remindersEnabled: (values.type === "credit_card" || values.type === "loan") && values.reminderSchedule !== "off",
    reminderDays: values.reminderSchedule === "off" ? [] : values.reminderSchedule.split(",").map(Number),
  };
}
