import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FinanceData } from "@/features/finance/types";

const mocks = vi.hoisted(() => ({ useFinance: vi.fn() }));

vi.mock("@/features/finance/finance-provider", () => ({ useFinance: mocks.useFinance }));
vi.mock("@/features/finance/use-finance-query", () => ({
  usePeriodReport: () => ({ result: { income: 0n, expenses: 0n, transfers: 0n, categories: [], months: [], days: [], budgets: [], count: 0 } }),
  useTransactions: () => ({ result: { rows: [], total: 0 } }),
}));
vi.mock("@/features/dashboard/cashflow-chart", () => ({ BalanceTrendChart: () => <div data-testid="balance-chart" /> }));
vi.mock("@/features/dashboard/spending-ring", () => ({ SpendingRing: () => <div data-testid="spending-ring" /> }));
vi.mock("@/features/transactions/transaction-row", () => ({ TransactionRow: () => null }));
vi.mock("@/features/accounts/managed-account-card", () => ({ ManagedAccountCard: () => null }));

import DashboardPage from "@/app/(app)/dashboard/page";

const data: FinanceData = {
  demo: false,
  profile: { id: "user-a", displayName: "", email: "", currency: "INR", locale: "en-IN", timezone: "Asia/Kolkata", theme: "system" },
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  goals: [],
  goalContributions: [],
  recurring: [],
  notifications: [],
  notificationPreferences: { pushEnabled: false },
  merchantRules: [],
  imports: [],
};

describe("dashboard greeting rendering", () => {
  beforeEach(() => mocks.useFinance.mockReturnValue({ data, loading: false }));
  afterEach(cleanup);

  it("renders the dashboard with a generic greeting when profile identity is temporarily unavailable", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: /^Good (morning|afternoon|evening), there$/ })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("renders the current profile's name when it becomes available", () => {
    mocks.useFinance.mockReturnValue({ data: { ...data, profile: { ...data.profile, displayName: "Nisha Rao", email: "nisha@example.com" } }, loading: false });
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: /^Good (morning|afternoon|evening), Nisha$/ })).toBeVisible();
  });
});
