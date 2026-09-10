export type TransactionType = "expense" | "income" | "transfer" | "refund" | "adjustment";
export type AccountType = "bank" | "savings" | "current" | "checking" | "cash" | "credit_card" | "debit_card" | "prepaid_card" | "loan" | "investment" | "wallet" | "asset" | "liability";
export type TransactionSource = "manual" | "voice" | "csv" | "xlsx" | "pdf" | "ocr" | "recurring";
export type CardNetwork = "visa" | "mastercard" | "american_express" | "rupay";
export type LiabilityStatus = "active" | "paused" | "closed";

export interface Profile {
  id: string;
  displayName: string;
  firstName?: string;
  email: string;
  currency: string;
  locale: string;
  timezone: string;
  theme: "light" | "dark" | "system";
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  currency: string;
  openingBalanceMinor: bigint;
  currentBalanceMinor?: bigint;
  color: string;
  lastFour?: string;
  includeInNetWorth: boolean;
  includeInAnalytics: boolean;
  archived: boolean;
  isActive?: boolean;
  cardNetwork?: CardNetwork;
  creditLimitMinor?: bigint;
  statementDay?: number;
  paymentDueDay?: number;
  minimumPaymentMinor?: bigint;
  paymentAccountId?: string;
  originalPrincipalMinor?: bigint;
  interestRate?: number;
  emiMinor?: bigint;
  startDate?: string;
  endDate?: string;
  nextPaymentDate?: string;
  liabilityStatus?: LiabilityStatus;
  remindersEnabled?: boolean;
  reminderDays?: number[];
}

export type AccountDraft = Omit<Account, "id" | "archived" | "currentBalanceMinor" | "institution"> & {
  institution: string;
};

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: "expense" | "income" | "both";
  parentId?: string;
  archived?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface FinanceTransaction {
  id: string;
  accountId: string;
  transferAccountId?: string;
  categoryId?: string;
  type: TransactionType;
  amountMinor: bigint;
  currency: string;
  date: string;
  merchant: string;
  occurredAt?: string;
  importedAt?: string;
  description?: string;
  notes?: string;
  tags: string[];
  paymentMethod?: string;
  source: TransactionSource;
  reference?: string;
  recurringId?: string;
  subscriptionId?: string;
  refundOfId?: string;
  duplicateOfId?: string;
  loanPrincipalMinor?: bigint;
  loanInterestMinor?: bigint;
  importId?: string;
  reviewStatus?: "confirmed" | "needs_review" | "ignored" | "duplicate";
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantRule {
  id: string;
  pattern: string;
  merchantNormalized: string;
  matchType: "exact" | "contains" | "regex";
  categoryId?: string;
  accountId?: string;
  transactionType?: TransactionType;
  priority: number;
  enabled: boolean;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantRuleDraft {
  pattern: string;
  merchantNormalized: string;
  categoryId: string;
  accountId?: string;
  transactionType?: TransactionType;
}

export interface ImportHistoryItem {
  id: string;
  accountId?: string;
  fileName: string;
  fileType: string;
  fileHash?: string;
  sourceKind: "statement" | "receipt_ocr";
  status: "uploaded" | "parsing" | "review" | "imported" | "failed" | "cancelled";
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  duplicateRows: number;
  failedRows: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportHistoryDraft {
  accountId: string;
  fileName: string;
  fileType: string;
  fileHash: string;
  sourceKind?: ImportHistoryItem["sourceKind"];
  totalRows: number;
}

export interface ImportCompletion {
  importedRows: number;
  skippedRows: number;
  duplicateRows: number;
  failedRows: number;
  errorMessage?: string;
}

export interface Budget {
  id: string;
  name: string;
  categoryIds: string[];
  limitMinor: bigint;
  period: "weekly" | "monthly" | "yearly";
  alertThreshold: number;
  rollover: boolean;
}

export interface Goal {
  id: string;
  name: string;
  targetMinor: bigint;
  currentMinor: bigint;
  openingMinor?: bigint;
  targetDate: string;
  color: string;
  icon: string;
  description?: string;
  linkedAccountId?: string;
  status?: "active" | "completed" | "paused" | "archived";
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amountMinor: bigint;
  date: string;
  sourceAccountId?: string;
  linkedTransactionId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalContributionDraft {
  goalId: string;
  amount: string;
  date: string;
  sourceAccountId: string;
  note?: string;
}

export interface FinanceNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  actionUrl?: string;
  dedupeKey?: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
}

export interface RecurringItem {
  id: string;
  title: string;
  amountMinor: bigint;
  type: "expense" | "income";
  categoryId?: string;
  accountId?: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  nextDate: string;
  kind: "subscription" | "bill" | "recurring";
  status: "active" | "paused" | "due" | "paid" | "cancelled" | "archived";
  notes?: string;
  reminderDays?: number[];
}

export interface FinanceData {
  profile: Profile;
  accounts: Account[];
  categories: Category[];
  transactions: FinanceTransaction[];
  budgets: Budget[];
  goals: Goal[];
  goalContributions: GoalContribution[];
  recurring: RecurringItem[];
  notifications: FinanceNotification[];
  notificationPreferences: NotificationPreferences;
  merchantRules: MerchantRule[];
  imports: ImportHistoryItem[];
  demo: boolean;
}

export interface TransactionDraft {
  accountId: string;
  transferAccountId?: string;
  categoryId?: string;
  type: TransactionType;
  amount: string;
  date: string;
  occurredAt?: string;
  merchant: string;
  notes?: string;
  paymentMethod?: string;
  refundOfId?: string;
  loanPrincipal?: string;
  loanInterest?: string;
  tags?: string[];
  source?: TransactionSource;
  description?: string;
  reference?: string;
  importId?: string;
  duplicateOfId?: string;
  reviewStatus?: FinanceTransaction["reviewStatus"];
  metadata?: Record<string, unknown>;
}

export interface CategoryDraft {
  name: string;
  icon: string;
  color: string;
  kind: Category["kind"];
  parentId?: string;
  sortOrder?: number;
}

export interface ProfileDraft {
  displayName: string;
  currency: string;
  timezone: string;
}

export interface RecurringDraft {
  title: string;
  amountMinor: bigint;
  type: "expense" | "income";
  categoryId?: string;
  accountId?: string;
  frequency: RecurringItem["frequency"];
  nextDate: string;
  kind: RecurringItem["kind"];
  notes?: string;
  reminderDays?: number[];
}
