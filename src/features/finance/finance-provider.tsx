"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { demoData } from "./demo-data";
import type { Account, AccountDraft, Budget, Category, CategoryDraft, FinanceData, FinanceTransaction, Goal, GoalContribution, GoalContributionDraft, ProfileDraft, RecurringDraft, TransactionDraft } from "./types";
import { parseMoney } from "./money";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { supabaseConfigState } from "@/lib/supabase/config";
import { FinanceRepository } from "./repository";
import { enqueue, failOperation, pendingOperations, removeOperation } from "@/lib/offline/queue";
import { isDemoMode } from "./demo-mode";
import { buildLiabilityReminderCandidates } from "./liability-reminders";
import { loadedAccountDeleteBlocker } from "@/features/accounts/account-deletion";

type ConnectionState = "loading" | "demo" | "live" | "cached" | "unavailable";

interface FinanceContextValue {
  data: FinanceData;
  loading: boolean;
  syncStatus: "offline" | "syncing" | "synced" | "failed";
  connectionState: ConnectionState;
  connectionError: string | null;
  reload: () => Promise<void>;
  addTransaction: (draft: TransactionDraft) => Promise<FinanceTransaction>;
  updateTransaction: (id: string, draft: TransactionDraft) => Promise<FinanceTransaction>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (account: AccountDraft) => Promise<void>;
  updateAccount: (id: string, account: AccountDraft) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  loadAccountTransactions: (accountId: string) => Promise<FinanceTransaction[]>;
  addCategory: (category: CategoryDraft) => Promise<void>;
  archiveCategory: (id: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, "id">) => Promise<void>;
  addGoal: (goal: Omit<Goal, "id">) => Promise<void>;
  addGoalContribution: (draft: GoalContributionDraft) => Promise<void>;
  updateGoalContribution: (id: string, draft: GoalContributionDraft) => Promise<void>;
  deleteGoalContribution: (id: string) => Promise<void>;
  setPushNotifications: (enabled: boolean) => Promise<void>;
  addRecurringItem: (item: RecurringDraft) => Promise<void>;
  updateProfile: (profile: ProfileDraft) => Promise<void>;
  resetDemo: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);
const STORAGE_KEY = "expenso-demo-data-v2";
const userCacheKey = (userId: string) => `expenso-user-cache:${userId}`;
const emptyFinanceData: FinanceData = {
  demo: false,
  profile: { id: "", displayName: "", email: "", currency: "INR", locale: "en-IN", timezone: "UTC", theme: "system" },
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  goalContributions: [],
  recurring: [],
  notifications: [],
  notificationPreferences: { pushEnabled: false },
};
const encode = (data: FinanceData) => JSON.stringify(data, (_, value) => typeof value === "bigint" ? `${value}n` : value);
const decode = (raw: string): FinanceData => {
  const parsed = JSON.parse(raw, (_, value) => typeof value === "string" && /^-?\d+n$/.test(value) ? BigInt(value.slice(0, -1)) : value) as FinanceData;
  return {
    ...parsed,
    goals: (parsed.goals ?? []).map((goal) => ({ ...goal, openingMinor: goal.openingMinor ?? goal.currentMinor })),
    goalContributions: parsed.goalContributions ?? [],
    notifications: parsed.notifications ?? [],
    notificationPreferences: parsed.notificationPreferences ?? { pushEnabled: false },
  };
};
const withoutSyncedBalances = (accounts: Account[]) => accounts.map((account) => {
  const copy = { ...account };
  delete copy.currentBalanceMinor;
  return copy;
});
const authFailureMessage = (error: { code?: string } | null, fallback: string) => error?.code ? `${fallback} (${error.code})` : fallback;

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<FinanceData>(emptyFinanceData);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<FinanceContextValue["syncStatus"]>("synced");
  const [connectionState, setConnectionState] = useState<ConnectionState>("loading");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const demoMode = useMemo(() => isDemoMode(), []);
  const client = useMemo(() => getSupabaseBrowserClient(), []);
  const repository = useMemo(() => client && !demoMode ? new FinanceRepository(client) : null, [client, demoMode]);
  const authenticatedUserId = useRef<string | null>(null);
  const loadGeneration = useRef(0);
  const authReloadTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isCurrent = () => loadGeneration.current === generation;
    setConnectionError(null);
    if (demoMode) {
      const stored = localStorage.getItem(STORAGE_KEY);
      let nextData = demoData;
      if (stored) {
        try { nextData = { ...decode(stored), demo: true }; }
        catch { localStorage.removeItem(STORAGE_KEY); }
      }
      setData(nextData);
      setConnectionState("demo");
      setLoading(false);
      return;
    }

    if (!client || !repository) {
      setConnectionError(supabaseConfigState === "invalid"
        ? "Supabase is configured, but one or both public environment values are invalid. Correct the configuration and restart the application."
        : "Supabase is not configured. Return to sign in or open the sample workspace explicitly.");
      setConnectionState("unavailable");
      setLoading(false);
      return;
    }

    const sessionResult = await client.auth.getSession().catch(() => null);
    if (!isCurrent()) return;
    if (!sessionResult) {
      setConnectionError("Supabase could not be reached while reading your secure session. Check the connection and try again.");
      setConnectionState("unavailable");
      setLoading(false);
      return;
    }
    const { data: session, error: sessionError } = sessionResult;
    if (sessionError) {
      setConnectionError(authFailureMessage(sessionError, "Your secure session could not be read. Refresh the page or sign in again."));
      setConnectionState("unavailable");
      setLoading(false);
      return;
    }
    let user = session.session?.user;
    if (navigator.onLine) {
      try {
        const verified = await client.auth.getUser();
        if (!isCurrent()) return;
        if (verified.error) {
          setConnectionError(authFailureMessage(verified.error, "Supabase could not verify your authenticated session. Sign in again or retry the connection."));
          setConnectionState("unavailable");
          setLoading(false);
          return;
        }
        user = verified.data.user;
      } catch {
        if (!isCurrent()) return;
        setConnectionError("Supabase could not be reached while verifying your authenticated session. Check the connection and try again.");
        setConnectionState("unavailable");
        setLoading(false);
        return;
      }
    }
    if (!user) {
      authenticatedUserId.current = null;
      setConnectionError("Your session has expired. Sign in again to continue.");
      setConnectionState("unavailable");
      setLoading(false);
      return;
    }
    authenticatedUserId.current = user.id;

    try {
      const firstName = typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name.trim() || undefined : undefined;
      const fresh = firstName
        ? await repository.load(user.id, user.email ?? "", firstName)
        : await repository.load(user.id, user.email ?? "");
      if (!isCurrent()) return;
      let hydrated = fresh;
      const reminderCandidates = buildLiabilityReminderCandidates(fresh.accounts);
      if (reminderCandidates.length) {
        try {
          const createdNotifications = await repository.syncLiabilityReminders(user.id, reminderCandidates);
          if (createdNotifications.length) {
            hydrated = { ...fresh, notifications: [...createdNotifications, ...fresh.notifications] };
            if (fresh.notificationPreferences.pushEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
              for (const notification of createdNotifications) new Notification(notification.title, { body: notification.body, tag: notification.dedupeKey });
            }
          }
        } catch {
          toast.error("Payment reminders could not be synchronized. Your financial data is still available.");
        }
      }
      if (!isCurrent()) return;
      setData(hydrated);
      localStorage.setItem(userCacheKey(user.id), encode(hydrated));
      setConnectionState("live");
    } catch (error) {
      if (!isCurrent()) return;
      const cached = localStorage.getItem(userCacheKey(user.id));
      if (cached) {
        setData(decode(cached));
        setConnectionState("cached");
        setConnectionError("Live data is unavailable. You are viewing your last synced records; changes will not silently switch to sample data.");
        toast.info("Showing your last synced data while the service is unavailable.");
      } else {
        const message = error instanceof Error ? error.message : "Unable to load your finances.";
        setConnectionError(message);
        setConnectionState("unavailable");
        toast.error(message);
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [client, demoMode, repository]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [load]);

  useEffect(() => {
    if (!client || demoMode) return;
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        loadGeneration.current += 1;
        if (authReloadTimer.current !== null) window.clearTimeout(authReloadTimer.current);
        authReloadTimer.current = null;
        if (authenticatedUserId.current) localStorage.removeItem(userCacheKey(authenticatedUserId.current));
        authenticatedUserId.current = null;
        setData(emptyFinanceData);
        setSyncStatus("synced");
        setConnectionError("Your session has ended. Sign in again to continue.");
        setConnectionState("unavailable");
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" && session && session.user.id !== authenticatedUserId.current && authReloadTimer.current === null) {
        loadGeneration.current += 1;
        if (authenticatedUserId.current) localStorage.removeItem(userCacheKey(authenticatedUserId.current));
        authenticatedUserId.current = session.user.id;
        setData(emptyFinanceData);
        setSyncStatus("synced");
        setConnectionError(null);
        setConnectionState("loading");
        setLoading(true);
        authReloadTimer.current = window.setTimeout(() => {
          authReloadTimer.current = null;
          void load();
        }, 0);
      }
      // TOKEN_REFRESHED is persisted by the Supabase client. Finance state is
      // already user-scoped and should not be reset or needlessly reloaded.
    });

    return () => {
      if (authReloadTimer.current !== null) window.clearTimeout(authReloadTimer.current);
      authReloadTimer.current = null;
      subscription.unsubscribe();
    };
  }, [client, demoMode, load]);

  useEffect(() => {
    if (demoMode && connectionState === "demo") localStorage.setItem(STORAGE_KEY, encode({ ...data, demo: true }));
    else if (!data.demo && data.profile.id && authenticatedUserId.current === data.profile.id) localStorage.setItem(userCacheKey(data.profile.id), encode(data));
  }, [connectionState, data, demoMode]);

  useEffect(() => {
    const sync = async () => {
      if (!navigator.onLine) {
        setSyncStatus("offline");
        return;
      }
      if (!repository || data.demo || !data.profile.id) {
        setSyncStatus("synced");
        return;
      }
      const operations = await pendingOperations(data.profile.id);
      if (!operations.length) {
        setSyncStatus("synced");
        return;
      }
      setSyncStatus("syncing");
      for (const operation of operations) {
        try {
          if (operation.operation === "insert") await repository.createTransaction(operation.userId, operation.payload as unknown as TransactionDraft, data.profile.currency);
          await removeOperation(operation.id);
        } catch (error) {
          await failOperation(operation, error instanceof Error ? error.message : "Sync failed");
          setSyncStatus("failed");
          return;
        }
      }
      await load();
      setSyncStatus("synced");
    };
    const offline = () => setSyncStatus("offline");
    void sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", offline);
    };
  }, [data.demo, data.profile.currency, data.profile.id, load, repository]);

  useEffect(() => {
    if (!client || data.demo || !data.profile.id) return;
    const refresh = () => void load();
    const userFilter = `user_id=eq.${data.profile.id}`;
    const channel = client.channel(`finance:${data.profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: userFilter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts", filter: userFilter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets", filter: userFilter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals", filter: userFilter }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_contributions", filter: userFilter }, refresh)
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSyncStatus("failed");
          toast.error("Live updates are temporarily unavailable. Your saved data remains intact.");
        }
      });
    return () => { void client.removeChannel(channel); };
  }, [client, data.demo, data.profile.id, load]);

  const addTransaction = useCallback(async (draft: TransactionDraft) => {
    if (repository && !data.demo && navigator.onLine) {
      setSyncStatus("syncing");
      try {
        const created = await repository.createTransaction(data.profile.id, draft, data.profile.currency);
        setData((current) => ({ ...current, accounts: withoutSyncedBalances(current.accounts), transactions: [created, ...current.transactions] }));
        await load();
        setSyncStatus("synced");
        return created;
      } catch (error) {
        setSyncStatus("failed");
        throw error;
      }
    }

    const now = new Date().toISOString();
    const created: FinanceTransaction = { id: crypto.randomUUID(), accountId: draft.accountId, transferAccountId: draft.transferAccountId, categoryId: draft.categoryId, type: draft.type, amountMinor: parseMoney(draft.amount), currency: data.profile.currency, date: draft.date, merchant: draft.merchant, notes: draft.notes, tags: draft.tags ?? [], paymentMethod: draft.paymentMethod, source: draft.source ?? "manual", refundOfId: draft.refundOfId, loanPrincipalMinor: draft.loanPrincipal ? parseMoney(draft.loanPrincipal) : undefined, loanInterestMinor: draft.loanInterest ? parseMoney(draft.loanInterest) : undefined, createdAt: now, updatedAt: now };
    setData((current) => ({ ...current, accounts: withoutSyncedBalances(current.accounts), transactions: [created, ...current.transactions] }));
    if (repository && !navigator.onLine) {
      await enqueue({ id: crypto.randomUUID(), userId: data.profile.id, entity: "transaction", operation: "insert", payload: { ...draft }, createdAt: now });
      setSyncStatus("offline");
      toast.info("Saved offline. This transaction will sync when you reconnect.");
    }
    return created;
  }, [data.demo, data.profile.currency, data.profile.id, load, repository]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (repository && !data.demo) await repository.deleteTransaction(id);
    setData((current) => ({ ...current, accounts: withoutSyncedBalances(current.accounts), transactions: current.transactions.filter((transaction) => transaction.id !== id) }));
    if (repository && !data.demo) await load();
  }, [data.demo, load, repository]);

  const updateTransaction = useCallback(async (id: string, draft: TransactionDraft) => {
    const updated = repository && !data.demo
      ? await repository.updateTransaction(id, draft)
      : (() => {
          const current = data.transactions.find((item) => item.id === id);
          if (!current) throw new Error("Transaction not found.");
          return { ...current, ...draft, amountMinor: parseMoney(draft.amount), loanPrincipalMinor: draft.loanPrincipal ? parseMoney(draft.loanPrincipal) : undefined, loanInterestMinor: draft.loanInterest ? parseMoney(draft.loanInterest) : undefined, source: draft.source ?? current.source, updatedAt: new Date().toISOString() } as FinanceTransaction;
        })();
    setData((current) => ({ ...current, accounts: withoutSyncedBalances(current.accounts), transactions: current.transactions.map((item) => item.id === id ? updated : item) }));
    if (repository && !data.demo) await load();
    return updated;
  }, [data.demo, data.transactions, load, repository]);

  const addAccount = useCallback(async (account: AccountDraft) => {
    const created = repository && !data.demo ? await repository.createAccount(data.profile.id, account) : { ...account, id: crypto.randomUUID(), archived: false };
    setData((current) => ({ ...current, accounts: [...current.accounts, created] }));
    if (repository && !data.demo) await load();
  }, [data.demo, data.profile.id, load, repository]);

  const updateAccount = useCallback(async (id: string, account: AccountDraft) => {
    const updated = repository && !data.demo
      ? await repository.updateAccount(data.profile.id, id, account)
      : (() => {
          const current = data.accounts.find((item) => item.id === id);
          if (!current) throw new Error("Account not found.");
          return { ...current, ...account };
        })();
    setData((current) => ({ ...current, accounts: current.accounts.map((item) => item.id === id ? { ...updated, currentBalanceMinor: item.currentBalanceMinor } : item) }));
    if (repository && !data.demo) await load();
  }, [data.accounts, data.demo, data.profile.id, load, repository]);

  const deleteAccount = useCallback(async (id: string) => {
    const blocker = loadedAccountDeleteBlocker(data, id);
    if (blocker) throw new Error(`This account has ${blocker} and cannot be deleted.`);
    if (repository && !data.demo) await repository.deleteAccount(data.profile.id, id);
    setData((current) => ({ ...current, accounts: current.accounts.filter((account) => account.id !== id) }));
    if (repository && !data.demo) await load();
  }, [data, load, repository]);

  const archiveAccount = useCallback(async (id: string) => {
    if (repository && !data.demo) await repository.archiveAccount(data.profile.id, id);
    setData((current) => ({ ...current, accounts: current.accounts.map((account) => account.id === id ? { ...account, archived: true } : account) }));
    if (repository && !data.demo) await load();
  }, [data.demo, data.profile.id, load, repository]);

  const loadAccountTransactions = useCallback(async (accountId: string) => {
    if (!data.accounts.some((account) => account.id === accountId)) return [];
    if (repository && !data.demo) return repository.loadAccountTransactions(data.profile.id, accountId);
    return data.transactions.filter((transaction) => transaction.accountId === accountId || transaction.transferAccountId === accountId);
  }, [data.accounts, data.demo, data.profile.id, data.transactions, repository]);

  const addCategory = useCallback(async (category: CategoryDraft) => {
    const created: Category = repository && !data.demo ? await repository.createCategory(data.profile.id, category) : { ...category, id: crypto.randomUUID(), archived: false };
    setData((current) => ({ ...current, categories: [...current.categories, created] }));
  }, [data.demo, data.profile.id, repository]);

  const archiveCategory = useCallback(async (id: string) => {
    if (repository && !data.demo) await repository.archiveCategory(id);
    setData((current) => ({ ...current, categories: current.categories.map((category) => category.id === id ? { ...category, archived: true } : category) }));
  }, [data.demo, repository]);

  const addBudget = useCallback(async (budget: Omit<Budget, "id">) => {
    const created = repository && !data.demo ? await repository.createBudget(data.profile.id, budget) : { ...budget, id: crypto.randomUUID() };
    setData((current) => ({ ...current, budgets: [...current.budgets, created] }));
  }, [data.demo, data.profile.id, repository]);

  const addGoal = useCallback(async (goal: Omit<Goal, "id">) => {
    const created = repository && !data.demo ? await repository.createGoal(data.profile.id, goal) : { ...goal, id: crypto.randomUUID() };
    setData((current) => ({ ...current, goals: [...current.goals, created] }));
  }, [data.demo, data.profile.id, repository]);

  const addGoalContribution = useCallback(async (draft: GoalContributionDraft) => {
    const amountMinor = parseMoney(draft.amount);
    if (amountMinor <= 0n) throw new Error("Contribution amount must be greater than zero.");
    const created: GoalContribution = repository && !data.demo
      ? await repository.createGoalContribution(data.profile.id, draft)
      : { id: crypto.randomUUID(), goalId: draft.goalId, amountMinor, date: draft.date, sourceAccountId: draft.sourceAccountId, note: draft.note, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setData((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === draft.goalId ? { ...goal, currentMinor: goal.currentMinor + amountMinor } : goal), goalContributions: [created, ...current.goalContributions] }));
    if (repository && !data.demo) await load();
  }, [data.demo, data.profile.id, load, repository]);

  const updateGoalContribution = useCallback(async (id: string, draft: GoalContributionDraft) => {
    const amountMinor = parseMoney(draft.amount);
    if (amountMinor <= 0n) throw new Error("Contribution amount must be greater than zero.");
    const previous = data.goalContributions.find((item) => item.id === id);
    if (!previous) throw new Error("Contribution not found.");
    const updated = repository && !data.demo
      ? await repository.updateGoalContribution(data.profile.id, id, draft)
      : { ...previous, amountMinor, date: draft.date, sourceAccountId: draft.sourceAccountId, note: draft.note, updatedAt: new Date().toISOString() };
    const difference = amountMinor - previous.amountMinor;
    setData((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === previous.goalId ? { ...goal, currentMinor: goal.currentMinor + difference } : goal), goalContributions: current.goalContributions.map((item) => item.id === id ? updated : item) }));
    if (repository && !data.demo) await load();
  }, [data.demo, data.goalContributions, data.profile.id, load, repository]);

  const deleteGoalContribution = useCallback(async (id: string) => {
    const previous = data.goalContributions.find((item) => item.id === id);
    if (!previous) throw new Error("Contribution not found.");
    if (repository && !data.demo) await repository.deleteGoalContribution(data.profile.id, id);
    setData((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === previous.goalId ? { ...goal, currentMinor: goal.currentMinor - previous.amountMinor } : goal), goalContributions: current.goalContributions.filter((item) => item.id !== id) }));
    if (repository && !data.demo) await load();
  }, [data.demo, data.goalContributions, data.profile.id, load, repository]);

  const setPushNotifications = useCallback(async (enabled: boolean) => {
    if (enabled) {
      if (typeof Notification === "undefined") throw new Error("Browser notifications are not available on this device.");
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission !== "granted") throw new Error("Notification permission was not granted. You can still see reminders inside Expenso.");
    }
    if (repository && !data.demo) await repository.updatePushNotifications(data.profile.id, enabled);
    setData((current) => ({ ...current, notificationPreferences: { ...current.notificationPreferences, pushEnabled: enabled } }));
  }, [data.demo, data.profile.id, repository]);

  const addRecurringItem = useCallback(async (item: RecurringDraft) => {
    const created = repository && !data.demo
      ? await repository.createRecurringItem(data.profile.id, item, data.profile.currency)
      : { ...item, id: crypto.randomUUID(), status: "active" as const };
    setData((current) => ({ ...current, recurring: [...current.recurring, created] }));
  }, [data.demo, data.profile.currency, data.profile.id, repository]);

  const updateProfile = useCallback(async (profile: ProfileDraft) => {
    const updated = repository && !data.demo
      ? await repository.updateProfile(data.profile.id, profile, data.profile.email, data.profile.firstName)
      : { ...data.profile, ...profile };
    setData((current) => ({ ...current, profile: updated }));
  }, [data.demo, data.profile, repository]);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(demoData);
  }, []);

  return <FinanceContext.Provider value={{ data, loading, syncStatus, connectionState, connectionError, reload: load, addTransaction, updateTransaction, deleteTransaction, addAccount, updateAccount, deleteAccount, archiveAccount, loadAccountTransactions, addCategory, archiveCategory, addBudget, addGoal, addGoalContribution, updateGoalContribution, deleteGoalContribution, setPushNotifications, addRecurringItem, updateProfile, resetDemo }}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error("useFinance must be used inside FinanceProvider");
  return value;
}
