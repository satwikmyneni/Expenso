import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
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
  Profile,
  ProfileDraft,
  RecurringDraft,
  RecurringItem,
  TransactionDraft,
} from "./types";
import { minorToDecimal, parseMoney } from "./money";
import type { LiabilityReminderCandidate } from "./liability-reminders";

type AccountRow = Tables<"accounts">;
type AccountBalanceRow = Tables<"account_balances">;
type CategoryRow = Tables<"categories">;
type TransactionRow = Tables<"transactions">;
type BudgetRow = Tables<"budgets">;
type GoalRow = Tables<"goals">;
type GoalContributionRow = Tables<"goal_contributions">;
type NotificationRow = Tables<"notifications">;
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
  return { id: row.id, name: row.name, icon: row.icon, color: row.color, kind, parentId: row.parent_id ?? undefined, archived: row.archived_at !== null, isDefault: row.is_default };
}

function mapTransaction(row: TransactionRow): FinanceTransaction {
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
    date: row.occurred_at.slice(0, 10),
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

function recurringFrequency(value: string): RecurringItem["frequency"] {
  return value === "daily" || value === "weekly" || value === "quarterly" || value === "yearly" || value === "custom" ? value : "monthly";
}

function mapRecurring(row: RecurringRow): RecurringItem {
  return { id: row.id, title: row.title, amountMinor: decimalMinor(row.amount), type: row.type === "income" ? "income" : "expense", accountId: row.account_id, categoryId: row.category_id ?? undefined, frequency: recurringFrequency(row.frequency), nextDate: row.next_date, kind: "recurring", status: row.active ? "active" : "paused" };
}

function mapSubscription(row: SubscriptionRow): RecurringItem {
  return { id: row.id, title: row.title, amountMinor: decimalMinor(row.estimated_amount), type: "expense", accountId: row.account_id ?? undefined, categoryId: row.category_id ?? undefined, frequency: recurringFrequency(row.frequency), nextDate: row.next_expected_date ?? row.last_payment_date ?? "", kind: "subscription", status: row.status === "paused" ? "paused" : "active" };
}

function mapBill(row: BillRow): RecurringItem {
  return { id: row.id, title: row.title, amountMinor: decimalMinor(row.amount), type: "expense", accountId: row.account_id ?? undefined, categoryId: row.category_id ?? undefined, frequency: recurringFrequency(row.frequency ?? "monthly"), nextDate: row.due_date, kind: "bill", status: row.status === "overdue" || row.status === "due" ? "due" : "active" };
}

function mapProfile(row: Tables<"profiles">, email: string, firstName?: string): Profile {
  const theme = row.theme === "light" || row.theme === "dark" ? row.theme : "system";
  return { id: row.id, email, displayName: row.display_name || email.split("@")[0], firstName, currency: row.currency, locale: row.locale, timezone: row.timezone, theme };
}

export class FinanceRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  private async loadTransactions(): Promise<LoadResult<TransactionRow[]>> {
    const pageSize = 1000;
    const rows: TransactionRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const result = await this.client.from("transactions").select("*").order("occurred_at", { ascending: false }).range(from, from + pageSize - 1);
      if (result.error) return { data: rows, error: result.error };
      rows.push(...result.data);
      if (result.data.length < pageSize) return { data: rows, error: null };
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
      const [profile, accounts, balances, categories, transactions, budgets, goals, goalContributions, recurring, subscriptions, bills, notifications, notificationPreferences] = await Promise.all([
        this.client.from("profiles").select("*").eq("id", userId).single(),
        this.client.from("accounts").select("*").order("created_at"),
        this.client.from("account_balances").select("*"),
        this.client.from("categories").select("*").order("sort_order"),
        this.loadTransactions(),
        this.client.from("budgets").select("*, budget_categories(category_id)").eq("active", true),
        this.client.from("goals").select("*"),
        this.client.from("goal_contributions").select("*").order("contributed_at", { ascending: false }),
        this.client.from("recurring_transactions").select("*").eq("active", true),
        this.client.from("subscriptions").select("*").eq("status", "active"),
        this.client.from("bills").select("*").in("status", ["upcoming", "overdue", "due"]),
        this.client.from("notifications").select("*").order("created_at", { ascending: false }).limit(100),
        this.client.from("notification_preferences").select("*").eq("user_id", userId).single(),
      ]);
      const firstError = [profile, accounts, balances, categories, transactions, budgets, goals, goalContributions, recurring, subscriptions, bills, notifications, notificationPreferences].find((result) => result.error)?.error;
      return { profile, accounts, balances, categories, transactions, budgets, goals, goalContributions, recurring, subscriptions, bills, notifications, notificationPreferences, firstError };
    };

    const loaded = await retryJwtIssuedAtFuture(loadOnce, (result) => result.firstError);
    const { profile, accounts, balances, categories, transactions, budgets, goals, goalContributions, recurring, subscriptions, bills, notifications, notificationPreferences, firstError } = loaded;
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
    };
  }

  async createTransaction(userId: string, draft: TransactionDraft, currency: string) {
    const payload: TablesInsert<"transactions"> = {
      user_id: userId,
      account_id: draft.accountId,
      transfer_account_id: draft.transferAccountId || null,
      category_id: draft.categoryId || null,
      type: draft.type,
      amount: databaseNumber(parseMoney(draft.amount)),
      currency,
      occurred_at: new Date(`${draft.date}T12:00:00`).toISOString(),
      merchant: draft.merchant.trim(),
      notes: draft.notes?.trim() || null,
      tags: draft.tags ?? [],
      payment_method: draft.paymentMethod || null,
      source: draft.source ?? "manual",
      refund_of_id: draft.type === "refund" ? draft.refundOfId || null : null,
      metadata: draft.type === "transfer" && draft.loanPrincipal && draft.loanInterest ? { loan_principal: minorToDecimal(parseMoney(draft.loanPrincipal)), loan_interest: minorToDecimal(parseMoney(draft.loanInterest)) } : {},
    };
    const result = await this.client.from("transactions").insert(payload).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapTransaction(result.data);
  }

  async updateTransaction(id: string, draft: TransactionDraft) {
    const payload: TablesUpdate<"transactions"> = {
      account_id: draft.accountId,
      transfer_account_id: draft.transferAccountId || null,
      category_id: draft.categoryId || null,
      type: draft.type,
      amount: databaseNumber(parseMoney(draft.amount)),
      occurred_at: new Date(`${draft.date}T12:00:00`).toISOString(),
      merchant: draft.merchant.trim(),
      notes: draft.notes?.trim() || null,
      payment_method: draft.paymentMethod || null,
      tags: draft.tags ?? [],
      refund_of_id: draft.type === "refund" ? draft.refundOfId || null : null,
      metadata: draft.type === "transfer" && draft.loanPrincipal && draft.loanInterest ? { loan_principal: minorToDecimal(parseMoney(draft.loanPrincipal)), loan_interest: minorToDecimal(parseMoney(draft.loanInterest)) } : {},
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
    const payload: TablesInsert<"categories"> = { user_id: userId, name: category.name.trim(), kind: category.kind, icon: category.icon, color: category.color };
    const result = await this.client.from("categories").insert(payload).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapCategory(result.data);
  }

  async archiveCategory(id: string) {
    const result = await this.client.from("categories").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (result.error) throw dataError(result.error, "delete");
  }

  async createBudget(userId: string, budget: Omit<Budget, "id">): Promise<Budget> {
    const payload: TablesInsert<"budgets"> = { user_id: userId, name: budget.name.trim(), limit_amount: databaseNumber(budget.limitMinor), period: budget.period, alert_threshold: budget.alertThreshold, rollover: budget.rollover };
    const result = await this.client.from("budgets").insert(payload).select("*").single();
    if (result.error) throw dataError(result.error);
    if (budget.categoryIds.length) {
      const categoryLinks: TablesInsert<"budget_categories">[] = budget.categoryIds.map((categoryId) => ({ user_id: userId, budget_id: result.data.id, category_id: categoryId }));
      const categories = await this.client.from("budget_categories").insert(categoryLinks);
      if (categories.error) throw dataError(categories.error);
    }
    return { ...mapBudget({ ...result.data, budget_categories: [] }), categoryIds: budget.categoryIds };
  }

  async createGoal(userId: string, goal: Omit<Goal, "id">): Promise<Goal> {
    const payload: TablesInsert<"goals"> = { user_id: userId, name: goal.name.trim(), target_amount: databaseNumber(goal.targetMinor), current_amount: databaseNumber(goal.currentMinor), opening_amount: databaseNumber(goal.openingMinor ?? goal.currentMinor), target_date: goal.targetDate || null, color: goal.color, icon: goal.icon };
    const result = await this.client.from("goals").insert(payload).select("*").single();
    if (result.error) throw dataError(result.error);
    return mapGoal(result.data);
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
      const payload: TablesInsert<"bills"> = { user_id: userId, title: draft.title.trim(), amount: databaseNumber(draft.amountMinor), category_id: draft.categoryId || null, account_id: draft.accountId || null, currency, due_date: draft.nextDate, frequency: draft.frequency, status: "upcoming" };
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
    const payload: TablesInsert<"recurring_transactions"> = { user_id: userId, title: draft.title.trim(), merchant: draft.title.trim(), amount: databaseNumber(draft.amountMinor), type: draft.type, category_id: draft.categoryId || null, account_id: draft.accountId, currency, frequency: draft.frequency, start_date: draft.nextDate, next_date: draft.nextDate };
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
}
