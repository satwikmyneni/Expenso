import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { dataError } from "@/lib/data-error";
import type {
  Account,
  AccountDraft,
  Budget,
  Category,
  CategoryDraft,
  FinanceData,
  FinanceNotification,
  FinanceTransaction,
  Goal,
  GoalContribution,
  GoalContributionDraft,
  ImportCompletion,
  ImportHistoryDraft,
  ImportHistoryItem,
  MerchantRule,
  MerchantRuleDraft,
  Profile,
  ProfileDraft,
  RecurringDraft,
  RecurringItem,
  TransactionDraft,
} from "./types";
import { minorToDecimal, parseMoney } from "./money";
import type { LiabilityReminderCandidate } from "./liability-reminders";
import type { TransactionPage, TransactionQuery } from "@/features/transactions/query";
import { decodeReport } from "@/features/insights/reports";

type AccountRow = Tables<"accounts">;
type AccountBalanceRow = Tables<"account_balances">;
type CategoryRow = Tables<"categories">;
type TransactionRow = Tables<"transactions">;
type BudgetRow = Tables<"budgets">;
type GoalRow = Tables<"goals">;
type GoalContributionRow = Tables<"goal_contributions">;
type NotificationRow = Tables<"notifications">;
type MerchantRuleRow = Tables<"merchant_rules">;
type ImportRow = Tables<"imports">;
type RecurringRow = Tables<"recurring_transactions">;
type SubscriptionRow = Tables<"subscriptions">;
type BillRow = Tables<"bills">;
type BudgetWithCategories = BudgetRow & { budget_categories: Array<{ category_id: string }> | null };
type RepositoryFailure = { code?: string; message?: string };
type LoadResult<T> = { data: T; error: RepositoryFailure | null };

const POSTGREST_CLOCK_RETRY_MS = 1_500;

export function isJwtIssuedAtFuture(error: RepositoryFailure | null | undefined) {
  return error?.code === "PGRST303" && error.message?.toLowerCase().includes("jwt issued at future") === true;
}

export async function retryJwtIssuedAtFuture<T>(
  operation: () => Promise<T>,
  failureFrom: (result: T) => RepositoryFailure | null | undefined,
  wait: () => Promise<void> = () => new Promise((resolve) => setTimeout(resolve, POSTGREST_CLOCK_RETRY_MS)),
) {
  let result = await operation();
  if (!isJwtIssuedAtFuture(failureFrom(result))) return result;
  await wait();
  result = await operation();
  return result;
}

// PostgREST accepts exact decimal strings for NUMERIC columns, while generated
// schema types describe NUMERIC as number. Keep the wire value exact here.
const databaseNumber = (minor: bigint) => minorToDecimal(minor) as unknown as number;
const optionalDatabaseNumber = (minor: bigint | undefined) => minor === undefined ? null : databaseNumber(minor);
const decimalMinor = (value: number | null | undefined) => parseMoney(String(value ?? 0));
const optionalDecimalMinor = (value: number | null | undefined) => value == null ? undefined : decimalMinor(value);

function transactionMetadata(draft: TransactionDraft): Json {
  const metadata = { ...(draft.metadata ?? {}) } as Record<string, Json | undefined>;
  if (draft.type === "transfer" && draft.loanPrincipal && draft.loanInterest) {
    metadata.loan_principal = minorToDecimal(parseMoney(draft.loanPrincipal));
    metadata.loan_interest = minorToDecimal(parseMoney(draft.loanInterest));
  }
  return Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, Json] => entry[1] !== undefined));
}

function transactionInsert(userId: string, draft: TransactionDraft, currency: string): TablesInsert<"transactions"> {
  return {
    user_id: userId,
    account_id: draft.accountId,
    transfer_account_id: draft.transferAccountId || null,
    category_id: draft.categoryId || null,
    type: draft.type,
    amount: databaseNumber(parseMoney(draft.amount)),
    currency,
    occurred_at: draft.occurredAt ?? new Date(`${draft.date}T12:00:00`).toISOString(),
    merchant: draft.merchant.trim(),
    description: draft.description?.trim() || null,
    notes: draft.notes?.trim() || null,
    tags: draft.tags ?? [],
    payment_method: draft.paymentMethod || null,
    source: draft.source ?? "manual",
    reference: draft.reference?.trim() || null,
    import_id: draft.importId || null,
    duplicate_of_id: draft.duplicateOfId || null,
    review_status: draft.reviewStatus ?? "confirmed",
    refund_of_id: draft.type === "refund" ? draft.refundOfId || null : null,
    metadata: transactionMetadata(draft),
  };
}

function mapAccount(row: AccountRow, balance?: AccountBalanceRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution ?? undefined,
    currency: row.currency,
    openingBalanceMinor: decimalMinor(row.opening_balance),
    currentBalanceMinor: balance?.balance == null ? undefined : decimalMinor(balance.balance),
    color: row.color,
    lastFour: row.last_four ?? undefined,
    includeInNetWorth: row.include_in_net_worth,
    includeInAnalytics: row.include_in_analytics,
    archived: row.archived_at !== null,
    cardNetwork: row.card_network === "visa" || row.card_network === "mastercard" || row.card_network === "american_express" || row.card_network === "rupay" ? row.card_network : undefined,
    creditLimitMinor: optionalDecimalMinor(row.credit_limit),
    statementDay: row.statement_day ?? undefined,
    paymentDueDay: row.payment_due_day ?? undefined,
    minimumPaymentMinor: optionalDecimalMinor(row.minimum_payment),
    paymentAccountId: row.payment_account_id ?? undefined,
    originalPrincipalMinor: optionalDecimalMinor(row.original_principal),
    interestRate: row.interest_rate ?? undefined,
    emiMinor: optionalDecimalMinor(row.emi_amount),
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    nextPaymentDate: row.next_payment_date ?? undefined,
    liabilityStatus: row.liability_status === "paused" || row.liability_status === "closed" ? row.liability_status : "active",
    remindersEnabled: row.reminders_enabled,
    reminderDays: row.reminder_days,
  };
}

function mapCategory(row: CategoryRow): Category {
  const kind = row.kind === "income" || row.kind === "both" ? row.kind : "expense";
  return { id: row.id, name: row.name, icon: row.icon, color: row.color, kind, parentId: row.parent_id ?? undefined, sortOrder: row.sort_order, archived: row.archived_at !== null, isDefault: row.is_default };
}

function mapTransaction(row: TransactionRow & { uploaded_at?: string; local_date?: string }): FinanceTransaction {
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
  const loanPrincipal = metadata.loan_principal;
  const loanInterest = metadata.loan_interest;
  return {
    id: row.id,
    accountId: row.account_id,
    transferAccountId: row.transfer_account_id ?? undefined,
    categoryId: row.category_id ?? undefined,
    type: row.type,
    amountMinor: decimalMinor(row.amount),
    currency: row.currency,
    date: row.local_date ?? row.occurred_at.slice(0, 10),
    occurredAt: row.occurred_at,
    importedAt: row.uploaded_at,
    merchant: row.merchant,
    description: row.description ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags,
    paymentMethod: row.payment_method ?? undefined,
    source: row.source,
    reference: row.reference ?? undefined,
    recurringId: row.recurring_transaction_id ?? undefined,
    subscriptionId: row.subscription_id ?? undefined,
    refundOfId: row.refund_of_id ?? undefined,
    duplicateOfId: row.duplicate_of_id ?? undefined,
    loanPrincipalMinor: typeof loanPrincipal === "string" || typeof loanPrincipal === "number" ? parseMoney(String(loanPrincipal)) : undefined,
    loanInterestMinor: typeof loanInterest === "string" || typeof loanInterest === "number" ? parseMoney(String(loanInterest)) : undefined,
    importId: row.import_id ?? undefined,
    reviewStatus: row.review_status === "needs_review" || row.review_status === "ignored" || row.review_status === "duplicate" ? row.review_status : "confirmed",
    metadata: metadata as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBudget(row: BudgetWithCategories): Budget {
  const period = row.period === "weekly" || row.period === "yearly" ? row.period : "monthly";
  return {
    id: row.id,
    name: row.name,
    categoryIds: row.budget_categories?.map((item) => item.category_id) ?? [],
    limitMinor: decimalMinor(row.limit_amount),
    period,
    alertThreshold: row.alert_threshold,
    rollover: row.rollover,
  };
}

function mapGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetMinor: decimalMinor(row.target_amount),
    currentMinor: decimalMinor(row.current_amount),
    openingMinor: decimalMinor(row.opening_amount),
    targetDate: row.target_date ?? "",
    color: row.color,
    icon: row.icon,
    description: row.description ?? undefined,
    linkedAccountId: row.linked_account_id ?? undefined,
    status: row.status as Goal["status"],
  };
}

function mapGoalContribution(row: GoalContributionRow): GoalContribution {
  return {
    id: row.id,
    goalId: row.goal_id,
    amountMinor: decimalMinor(row.amount),
    date: row.contributed_at.slice(0, 10),
    sourceAccountId: row.source_account_id ?? undefined,
    linkedTransactionId: row.linked_transaction_id ?? undefined,
    note: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotification(row: NotificationRow): FinanceNotification {
  return { id: row.id, kind: row.kind, title: row.title, body: row.body, actionUrl: row.action_url ?? undefined, dedupeKey: row.dedupe_key ?? undefined, readAt: row.read_at ?? undefined, createdAt: row.created_at };
}

function mapMerchantRule(row: MerchantRuleRow): MerchantRule {
  return {
    id: row.id,
    pattern: row.pattern,
    merchantNormalized: row.merchant_normalized,
    matchType: row.match_type === "contains" || row.match_type === "regex" ? row.match_type : "exact",
    categoryId: row.category_id ?? undefined,
    accountId: row.account_id ?? undefined,
    transactionType: row.transaction_type ?? undefined,
    priority: row.priority,
    enabled: row.enabled,
    applicationCount: row.application_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapImport(row: ImportRow): ImportHistoryItem {
  return {
    id: row.id,
    accountId: row.account_id ?? undefined,
    fileName: row.file_name,
    fileType: row.file_type,
    fileHash: row.file_hash ?? undefined,
    sourceKind: row.source_kind === "receipt_ocr" ? "receipt_ocr" : "statement",
    status: row.status,
    totalRows: row.total_rows,
    importedRows: row.imported_rows,
    skippedRows: row.skipped_rows,
    duplicateRows: row.duplicate_rows,
    failedRows: row.failed_rows,
    errorMessage: row.error_message ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function recurringFrequency(value: string): RecurringItem["frequency"] {
  return value === "daily" || value === "weekly" || value === "quarterly" || value === "yearly" || value === "custom" ? value : "monthly";
}

function mapRecurring(row: RecurringRow): RecurringItem {
  return { id: row.id, title: row.title, amountMinor: decimalMinor(row.amount), type: row.type === "income" ? "income" : "expense", accountId: row.account_id, categoryId: row.category_id ?? undefined, frequency: recurringFrequency(row.frequency), nextDate: row.next_date, kind: "recurring", notes: row.notes ?? undefined, status: row.archived_at ? "archived" : row.active ? "active" : "paused" };
}

function mapSubscription(row: SubscriptionRow): RecurringItem {
  return { id: row.id, title: row.title, amountMinor: decimalMinor(row.estimated_amount), type: "expense", accountId: row.account_id ?? undefined, categoryId: row.category_id ?? undefined, frequency: recurringFrequency(row.frequency), nextDate: row.next_expected_date ?? row.last_payment_date ?? "", kind: "subscription", status: row.status === "cancelled" ? "cancelled" : "active" };
}

function mapBill(row: BillRow): RecurringItem {
  return { id: row.id, title: row.title, amountMinor: decimalMinor(row.amount), type: "expense", accountId: row.account_id ?? undefined, categoryId: row.category_id ?? undefined, frequency: recurringFrequency(row.frequency ?? "monthly"), nextDate: row.due_date, kind: "bill", status: row.status === "paid" ? "paid" : row.status === "overdue" ? "due" : "active", notes: row.notes ?? undefined, reminderDays: row.reminder_days };
}

function mapProfile(row: Tables<"profiles">, email: string, firstName?: string): Profile {
  const theme = row.theme === "light" || row.theme === "dark" ? row.theme : "system";
  return { id: row.id, email, displayName: row.display_name || email.split("@")[0], firstName, currency: row.currency, locale: row.locale, timezone: row.timezone, theme };
}

export class FinanceRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  private async loadTransactions(): Promise<LoadResult<TransactionRow[]>> {
    const result = await this.client.rpc("search_finance_transactions", { filters: { pageSize: 100 } });
    return { data: result.data ? (result.data as unknown as { rows: TransactionRow[] }).rows : [], error: result.error };
  }

  async queryTransactions(query: TransactionQuery): Promise<TransactionPage> {
    const result = await this.client.rpc("search_finance_transactions", { filters: { ...query } as Json });
    if (result.error) throw dataError(result.error, "load");
    const value = result.data as unknown as { total: number; rows: TransactionRow[] };
    return { total: value.total, rows: value.rows.map(mapTransaction) };
  }

  async periodReport(start: string, end: string, account?: string) {
    const result = await this.client.rpc("finance_period_report", { date_from: start, date_to: end, account_filter: account });
    if (result.error) throw dataError(result.error, "load");
    return decodeReport(result.data);
  }

  async exportTransactions(query: TransactionQuery = {}) {
    const rows: FinanceTransaction[] = [];
    for (let page = 0; ; page++) {
      const result = await this.queryTransactions({ ...query, page, pageSize: 100 });
      rows.push(...result.rows);
      if (rows.length >= result.total || !result.rows.length) return rows;
    }
  }

  async loadAccountTransactions(userId: string, accountId: string): Promise<FinanceTransaction[]> {
    const pageSize = 1000;
    const rows: TransactionRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const result = await this.client
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .or(`account_id.eq.${accountId},transfer_account_id.eq.${accountId}`)
        .order("occurred_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (result.error) throw dataError(result.error, "load");
      rows.push(...result.data);
      if (result.data.length < pageSize) return rows.map(mapTransaction);
    }
  }

  async load(userId: string, email: string, firstName?: string): Promise<FinanceData> {
    const loadOnce = async () => {
      const [profile, accounts, balances, categories, transactions, budgets, goals, goalContributions, recurring, subscriptions, bills, notifications, notificationPreferences, merchantRules, imports] = await Promise.all([
        this.client.from("profiles").select("*").eq("id", userId).single(),
        this.client.from("accounts").select("*").order("created_at"),
        this.client.from("account_balances").select("*"),
        this.client.from("categories").select("*").order("sort_order"),
        this.loadTransactions(),
        this.client.from("budgets").select("*, budget_categories(category_id)").eq("active", true),
        this.client.from("goals").select("*").neq("status", "archived"),
        this.client.from("goal_contributions").select("*").order("contributed_at", { ascending: false }),
        this.client.from("recurring_transactions").select("*").is("archived_at", null),
        this.client.from("subscriptions").select("*").neq("status", "dismissed"),
        this.client.from("bills").select("*").neq("status", "dismissed"),
        this.client.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
        this.client.from("notification_preferences").select("*").eq("user_id", userId).single(),
        this.client.from("merchant_rules").select("*").order("priority", { ascending: false }),
        this.client.from("imports").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      const firstError = [profile, accounts, balances, categories, transactions, budgets, goals, goalContributions, recurring, subscriptions, bills, notifications, notificationPreferences, merchantRules, imports].find((result) => result.error)?.error;
      return { profile, accounts, balances, categories, transactions, budgets, goals, goalContributions, recurring, subscriptions, bills, notifications, notificationPreferences, merchantRules, imports, firstError };
    };

    const loaded = await retryJwtIssuedAtFuture(loadOnce, (result) => result.firstError);
    const { profile, accounts, balances, categories, transactions, budgets, goals, goalContributions, recurring, subscriptions, bills, notifications, notificationPreferences, merchantRules, imports, firstError } = loaded;
    if (firstError) throw dataError(firstError, "load");

    const balanceById = new Map((balances.data ?? []).filter((row) => row.id).map((row) => [row.id as string, row]));
    return {
      demo: false,
      profile: mapProfile(profile.data!, email, firstName),
      accounts: (accounts.data ?? []).map((row) => mapAccount(row, balanceById.get(row.id))),
      categories: (categories.data ?? []).map(mapCategory),
      transactions: transactions.data.map(mapTransaction),
      budgets: ((budgets.data ?? []) as BudgetWithCategories[]).map(mapBudget),
      goals: (goals.data ?? []).map(mapGoal),
      goalContributions: (goalContributions.data ?? []).map(mapGoalContribution),
      recurring: [
        ...(recurring.data ?? []).map(mapRecurring),
        ...(subscriptions.data ?? []).map(mapSubscription),
        ...(bills.data ?? []).map(mapBill),
      ],
      notifications: (notifications.data ?? []).map(mapNotification),
      notificationPreferences: { pushEnabled: notificationPreferences.data?.push_enabled ?? false },
      merchantRules: (merchantRules.data ?? []).map(mapMerchantRule),
      imports: (imports.data ?? []).map(mapImport),
    };
  }

  async createTransaction(userId: string, draft: TransactionDraft, currency: string) {
    const [created] = await this.createTransactions(userId, [draft], currency);
    return created;
  }

  async createTransactions(userId: string, drafts: TransactionDraft[], currency: string, onProgress?: (completed: number, total: number) => void) {
    const created: FinanceTransaction[] = [];
    for (let index = 0; index < drafts.length; index += 50) {
      const payload = drafts.slice(index, index + 50).map((draft) => transactionInsert(userId, draft, currency));
      const result = await this.client.from("transactions").insert(payload).select("*");
      if (result.error) throw dataError(result.error);
      created.push(...(result.data ?? []).map(mapTransaction));
      onProgress?.(Math.min(index + payload.length, drafts.length), drafts.length);
    }
    return created;
  }

  async updateTransaction(id: string, draft: TransactionDraft) {
    const payload: TablesUpdate<"transactions"> = {
      account_id: draft.accountId,
      transfer_account_id: draft.transferAccountId || null,
      category_id: draft.categoryId || null,
      type: draft.type,
      amount: databaseNumber(parseMoney(draft.amount)),
      occurred_at: draft.occurredAt ?? new Date(`${draft.date}T12:00:00`).toISOString(),
      merchant: draft.merchant.trim(),
      description: draft.description?.trim() || null,
      notes: draft.notes?.trim() || null,
      payment_method: draft.paymentMethod || null,
      tags: draft.tags ?? [],
      source: draft.source ?? "manual",
      reference: draft.reference?.trim() || null,
      import_id: draft.importId || null,
      duplicate_of_id: draft.duplicateOfId || null,
      review_status: draft.reviewStatus ?? "confirmed",
      refund_of_id: draft.type === "refund" ? draft.refundOfId || null : null,
      metadata: transactionMetadata(draft),
    };
    const result = await this.client.from("transactions").update(payload).eq("id", id).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapTransaction(result.data);
  }

  async deleteTransaction(id: string) {
    const result = await this.client.from("transactions").delete().eq("id", id);
    if (result.error) throw dataError(result.error, "delete");
  }

  async createAccount(userId: string, account: AccountDraft): Promise<Account> {
    const payload: TablesInsert<"accounts"> = {
      user_id: userId, name: account.name.trim(), type: account.type, institution: account.institution.trim(), currency: account.currency,
      opening_balance: databaseNumber(account.openingBalanceMinor), color: account.color, last_four: account.lastFour || null,
      include_in_net_worth: account.includeInNetWorth, include_in_analytics: account.includeInAnalytics,
      card_network: account.cardNetwork ?? null, credit_limit: optionalDatabaseNumber(account.creditLimitMinor), statement_day: account.statementDay ?? null,
      payment_due_day: account.paymentDueDay ?? null, minimum_payment: optionalDatabaseNumber(account.minimumPaymentMinor), payment_account_id: account.paymentAccountId ?? null,
      original_principal: optionalDatabaseNumber(account.originalPrincipalMinor), interest_rate: account.interestRate ?? null, emi_amount: optionalDatabaseNumber(account.emiMinor),
      start_date: account.startDate ?? null, end_date: account.endDate ?? null, next_payment_date: account.nextPaymentDate ?? null,
      liability_status: account.liabilityStatus ?? "active", reminders_enabled: account.remindersEnabled ?? true, reminder_days: account.reminderDays ?? [7, 3, 0],
    };
    const result = await this.client.from("accounts").insert(payload).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapAccount(result.data);
  }

  async updateAccount(userId: string, id: string, account: AccountDraft): Promise<Account> {
    const payload: TablesUpdate<"accounts"> = {
      name: account.name.trim(), type: account.type, institution: account.institution.trim(), currency: account.currency,
      opening_balance: databaseNumber(account.openingBalanceMinor), color: account.color, last_four: account.lastFour || null,
      include_in_net_worth: account.includeInNetWorth, include_in_analytics: account.includeInAnalytics,
      card_network: account.cardNetwork ?? null, credit_limit: optionalDatabaseNumber(account.creditLimitMinor), statement_day: account.statementDay ?? null,
      payment_due_day: account.paymentDueDay ?? null, minimum_payment: optionalDatabaseNumber(account.minimumPaymentMinor), payment_account_id: account.paymentAccountId ?? null,
      original_principal: optionalDatabaseNumber(account.originalPrincipalMinor), interest_rate: account.interestRate ?? null, emi_amount: optionalDatabaseNumber(account.emiMinor),
      start_date: account.startDate ?? null, end_date: account.endDate ?? null, next_payment_date: account.nextPaymentDate ?? null,
      liability_status: account.liabilityStatus ?? "active", reminders_enabled: account.remindersEnabled ?? true, reminder_days: account.reminderDays ?? [7, 3, 0],
    };
    const result = await this.client.from("accounts").update(payload).eq("id", id).eq("user_id", userId).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapAccount(result.data);
  }

  async deleteAccount(userId: string, id: string): Promise<void> {
    const result = await this.client.from("accounts").delete().eq("id", id).eq("user_id", userId);
    if (result.error?.code === "23503") throw new Error("This account has linked financial history and cannot be deleted.");
    if (result.error) throw dataError(result.error, "delete");
  }

  async archiveAccount(userId: string, id: string): Promise<void> {
    const result = await this.client.from("accounts").update({ archived_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId);
    if (result.error) throw dataError(result.error);
  }

  async createCategory(userId: string, category: CategoryDraft): Promise<Category> {
    const payload: TablesInsert<"categories"> = { user_id: userId, name: category.name.trim(), kind: category.kind, icon: category.icon, color: category.color, parent_id: category.parentId ?? null, sort_order: category.sortOrder ?? 0 };
    const result = await this.client.from("categories").insert(payload).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapCategory(result.data);
  }

  async archiveCategory(id: string) {
    const result = await this.client.rpc("archive_category_safely", { target_category_id: id });
    if (result.error) throw dataError(result.error, "delete");
  }

  async updateCategory(userId: string, id: string, category: CategoryDraft) {
    const result = await this.client.from("categories").update({ name: category.name.trim(), kind: category.kind, icon: category.icon, color: category.color, parent_id: category.parentId ?? null, sort_order: category.sortOrder ?? 0 }).eq("id", id).eq("user_id", userId).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapCategory(result.data);
  }

  async findImportByHash(userId: string, fileHash: string) {
    const result = await this.client.from("imports").select("*").eq("user_id", userId).eq("file_hash", fileHash).neq("status", "failed").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (result.error) throw dataError(result.error, "load");
    return result.data ? mapImport(result.data) : undefined;
  }

  async createImport(userId: string, draft: ImportHistoryDraft) {
    const payload: TablesInsert<"imports"> = {
      user_id: userId,
      account_id: draft.accountId,
      file_name: draft.fileName.slice(0, 255),
      file_type: draft.fileType,
      file_hash: draft.fileHash,
      source_kind: draft.sourceKind ?? "statement",
      status: "review",
      total_rows: draft.totalRows,
    };
    const result = await this.client.from("imports").insert(payload).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapImport(result.data);
  }

  async completeImport(userId: string, id: string, completion: ImportCompletion) {
    const payload: TablesUpdate<"imports"> = {
      status: completion.errorMessage && completion.importedRows === 0 ? "failed" : "imported",
      imported_rows: completion.importedRows,
      skipped_rows: completion.skippedRows,
      duplicate_rows: completion.duplicateRows,
      failed_rows: completion.failedRows,
      error_message: completion.errorMessage ?? null,
    };
    const result = await this.client.from("imports").update(payload).eq("id", id).eq("user_id", userId).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapImport(result.data);
  }

  async loadImportCandidates(userId: string, accountId: string, startDate: string, endDate: string) {
    const pageSize = 1000;
    const rows: TransactionRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const result = await this.client
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .or(`account_id.eq.${accountId},transfer_account_id.eq.${accountId}`)
        .gte("occurred_at", `${startDate}T00:00:00.000Z`)
        .lte("occurred_at", `${endDate}T23:59:59.999Z`)
        .order("occurred_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (result.error) throw dataError(result.error, "load");
      rows.push(...(result.data ?? []));
      if ((result.data?.length ?? 0) < pageSize) return rows.map(mapTransaction);
    }
  }

  async saveMerchantRule(userId: string, draft: MerchantRuleDraft) {
    let existingQuery = this.client
      .from("merchant_rules")
      .select("id")
      .eq("user_id", userId)
      .eq("merchant_normalized", draft.merchantNormalized)
      .eq("match_type", "exact");
    existingQuery = draft.accountId ? existingQuery.eq("account_id", draft.accountId) : existingQuery.is("account_id", null);
    existingQuery = draft.transactionType ? existingQuery.eq("transaction_type", draft.transactionType) : existingQuery.is("transaction_type", null);
    const existing = await existingQuery
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing.error) throw dataError(existing.error, "load");
    const values = {
      pattern: draft.pattern,
      merchant_normalized: draft.merchantNormalized,
      match_type: "exact",
      category_id: draft.categoryId,
      account_id: draft.accountId ?? null,
      transaction_type: draft.transactionType ?? null,
      priority: 100,
      enabled: true,
    } satisfies TablesUpdate<"merchant_rules">;
    const result = existing.data
      ? await this.client.from("merchant_rules").update(values).eq("id", existing.data.id).eq("user_id", userId).select("*").single()
      : await this.client.from("merchant_rules").insert({ ...values, user_id: userId } satisfies TablesInsert<"merchant_rules">).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapMerchantRule(result.data);
  }

  async updateMerchantRule(userId: string, id: string, categoryId: string, draft?: MerchantRuleDraft) {
    const result = await this.client.from("merchant_rules").update({ category_id: categoryId, enabled: true, ...(draft ? { pattern: draft.pattern, merchant_normalized: draft.merchantNormalized, account_id: draft.accountId ?? null, transaction_type: draft.transactionType ?? null, match_type: "exact" } : {}) }).eq("id", id).eq("user_id", userId).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapMerchantRule(result.data);
  }

  async deleteMerchantRule(userId: string, id: string) {
    const result = await this.client.from("merchant_rules").delete().eq("id", id).eq("user_id", userId);
    if (result.error) throw dataError(result.error, "delete");
  }

  async uploadReceipt(userId: string, transactionId: string, file: File, extension: string, checksum: string, ocrResult: Json) {
    const storagePath = `${userId}/receipts/${crypto.randomUUID()}.${extension}`;
    const upload = await this.client.storage.from("receipts").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (upload.error) throw new Error("The transaction was saved, but its receipt could not be stored securely.");
    const attachment = await this.client.from("attachments").insert({
      user_id: userId,
      transaction_id: transactionId,
      storage_path: storagePath,
      file_name: file.name.slice(0, 255),
      content_type: file.type,
      size_bytes: file.size,
      checksum,
      ocr_status: "completed",
      ocr_result: ocrResult,
    }).select("id").single();
    if (attachment.error) {
      await this.client.storage.from("receipts").remove([storagePath]);
      throw new Error("The transaction was saved, but its receipt record could not be created.");
    }
    return attachment.data.id;
  }

  async createBudget(userId: string, budget: Omit<Budget, "id">): Promise<Budget> {
    void userId;
    return this.saveBudget(budget);
  }

  async saveBudget(budget: Omit<Budget,"id">, id?: string): Promise<Budget> {
    const result = await this.client.rpc("save_budget_details", { target_id: id ?? null, details: { name: budget.name.trim(), amount: minorToDecimal(budget.limitMinor), period: budget.period, threshold: budget.alertThreshold, rollover: budget.rollover }, category_ids: budget.categoryIds });
    if (result.error) throw dataError(result.error);
    return { ...budget, id: result.data };
  }

  async archiveBudget(userId: string, id: string) {
    const result = await this.client.from("budgets").update({ active: false }).eq("id", id).eq("user_id", userId).select("id").single();
    if (result.error) throw dataError(result.error);
  }

  async createGoal(userId: string, goal: Omit<Goal, "id">): Promise<Goal> {
    const payload: TablesInsert<"goals"> = { user_id: userId, name: goal.name.trim(), target_amount: databaseNumber(goal.targetMinor), current_amount: databaseNumber(goal.currentMinor), opening_amount: databaseNumber(goal.openingMinor ?? goal.currentMinor), target_date: goal.targetDate || null, color: goal.color, icon: goal.icon, description: goal.description ?? null, linked_account_id: goal.linkedAccountId ?? null };
    const result = await this.client.from("goals").insert(payload).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapGoal(result.data);
  }

  async updateGoal(userId: string, id: string, goal: Omit<Goal,"id">) {
    // Never write current_amount/opening_amount here: contribution history owns them.
    const result = await this.client.from("goals").update({ name: goal.name.trim(), target_amount: databaseNumber(goal.targetMinor), target_date: goal.targetDate || null, description: goal.description ?? null, linked_account_id: goal.linkedAccountId ?? null, color: goal.color, icon: goal.icon }).eq("id", id).eq("user_id", userId).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapGoal(result.data);
  }

  async archiveGoal(userId: string, id: string) {
    const result = await this.client.from("goals").update({ status: "archived" }).eq("id", id).eq("user_id", userId).select("id").single();
    if (result.error) throw dataError(result.error);
  }

  async receiptLinks(userId: string, transactionId: string) {
    const result = await this.client.from("attachments").select("id,file_name,storage_path").eq("user_id", userId).eq("transaction_id", transactionId);
    if (result.error) throw dataError(result.error, "load");
    return Promise.all(result.data.map(async (row) => {
      const signed = await this.client.storage.from("receipts").createSignedUrl(row.storage_path, 60);
      if (signed.error) throw new Error("Unable to open this private receipt.");
      return { id: row.id, name: row.file_name, url: signed.data.signedUrl };
    }));
  }

  async createGoalContribution(userId: string, draft: GoalContributionDraft): Promise<GoalContribution> {
    const payload: TablesInsert<"goal_contributions"> = { user_id: userId, goal_id: draft.goalId, amount: databaseNumber(parseMoney(draft.amount)), contributed_at: new Date(`${draft.date}T12:00:00`).toISOString(), source_account_id: draft.sourceAccountId, notes: draft.note?.trim() || null };
    const result = await this.client.from("goal_contributions").insert(payload).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapGoalContribution(result.data);
  }

  async updateGoalContribution(userId: string, id: string, draft: GoalContributionDraft): Promise<GoalContribution> {
    const payload: TablesUpdate<"goal_contributions"> = { amount: databaseNumber(parseMoney(draft.amount)), contributed_at: new Date(`${draft.date}T12:00:00`).toISOString(), source_account_id: draft.sourceAccountId, notes: draft.note?.trim() || null };
    const result = await this.client.from("goal_contributions").update(payload).eq("id", id).eq("user_id", userId).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapGoalContribution(result.data);
  }

  async deleteGoalContribution(userId: string, id: string): Promise<void> {
    const result = await this.client.from("goal_contributions").delete().eq("id", id).eq("user_id", userId);
    if (result.error) throw dataError(result.error, "delete");
  }

  async syncLiabilityReminders(userId: string, reminders: LiabilityReminderCandidate[]): Promise<FinanceNotification[]> {
    if (!reminders.length) return [];
    const payload: TablesInsert<"notifications">[] = reminders.map((reminder) => ({ user_id: userId, kind: reminder.kind, title: reminder.title, body: reminder.body, action_url: reminder.actionUrl, dedupe_key: reminder.dedupeKey }));
    const result = await this.client.from("notifications").upsert(payload, { onConflict: "user_id,dedupe_key", ignoreDuplicates: true }).select("*");
    if (result.error) throw dataError(result.error);
    return (result.data ?? []).map(mapNotification);
  }

  async updatePushNotifications(userId: string, enabled: boolean): Promise<void> {
    const result = await this.client.from("notification_preferences").update({ push_enabled: enabled }).eq("user_id", userId);
    if (result.error) throw dataError(result.error);
  }

  async createRecurringItem(userId: string, draft: RecurringDraft, currency: string): Promise<RecurringItem> {
    if (draft.kind === "bill") {
      const payload: TablesInsert<"bills"> = { user_id: userId, title: draft.title.trim(), amount: databaseNumber(draft.amountMinor), category_id: draft.categoryId || null, account_id: draft.accountId || null, currency, due_date: draft.nextDate, frequency: draft.frequency, notes: draft.notes ?? null, reminder_days: draft.reminderDays ?? [3,1], status: "upcoming" };
      const result = await this.client.from("bills").insert(payload).select("*").single();
      if (result.error) throw dataError(result.error);
      return mapBill(result.data);
    }
    if (draft.kind === "subscription") {
      const payload: TablesInsert<"subscriptions"> = { user_id: userId, title: draft.title.trim(), merchant: draft.title.trim(), estimated_amount: databaseNumber(draft.amountMinor), category_id: draft.categoryId || null, account_id: draft.accountId || null, currency, frequency: draft.frequency, next_expected_date: draft.nextDate, status: "active" };
      const result = await this.client.from("subscriptions").insert(payload).select("*").single();
      if (result.error) throw dataError(result.error);
      return mapSubscription(result.data);
    }
    if (!draft.accountId) throw new Error("Choose an account for the recurring transaction.");
    const payload: TablesInsert<"recurring_transactions"> = { user_id: userId, title: draft.title.trim(), merchant: draft.title.trim(), amount: databaseNumber(draft.amountMinor), type: draft.type, category_id: draft.categoryId || null, account_id: draft.accountId, currency, frequency: draft.frequency, start_date: draft.nextDate, next_date: draft.nextDate, notes: draft.notes ?? null };
    const result = await this.client.from("recurring_transactions").insert(payload).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapRecurring(result.data);
  }

  async updateProfile(userId: string, profile: ProfileDraft, email: string, firstName?: string): Promise<Profile> {
    const payload: TablesUpdate<"profiles"> = { display_name: profile.displayName.trim(), currency: profile.currency, timezone: profile.timezone };
    const result = await this.client.from("profiles").update(payload).eq("id", userId).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapProfile(result.data, email, firstName);
  }

  async updateRecurringItem(userId: string, item: RecurringItem) {
    const common = { title: item.title.trim(), account_id: item.accountId ?? null, category_id: item.categoryId ?? null, frequency: item.frequency };
    const result = item.kind === "bill"
      ? await this.client.from("bills").update({ ...common, amount: databaseNumber(item.amountMinor), due_date: item.nextDate, notes: item.notes ?? null, reminder_days: item.reminderDays ?? [3,1], status: item.status === "paid" ? "paid" : item.status === "archived" ? "dismissed" : item.status === "due" ? "overdue" : "upcoming" }).eq("id",item.id).eq("user_id",userId).select("id").single()
      : item.kind === "subscription"
        ? await this.client.from("subscriptions").update({ ...common, merchant: item.title.trim(), estimated_amount: databaseNumber(item.amountMinor), next_expected_date: item.nextDate, status: item.status === "cancelled" ? "cancelled" : item.status === "archived" ? "dismissed" : "active" }).eq("id",item.id).eq("user_id",userId).select("id").single()
        : await this.client.from("recurring_transactions").update({ ...common, account_id: item.accountId!, amount: databaseNumber(item.amountMinor), type: item.type, next_date: item.nextDate, notes: item.notes ?? null, active: item.status === "active", archived_at: item.status === "archived" ? new Date().toISOString() : null }).eq("id",item.id).eq("user_id",userId).select("id").single();
    if (result.error) throw dataError(result.error);
    return item;
  }
}
