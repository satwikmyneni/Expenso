import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PremiumAccountCard } from "@/features/accounts/premium-account-card";
import type { Account } from "@/features/finance/types";

const account = (overrides: Partial<Account> = {}): Account => ({
  id: "account-1",
  name: "Primary account",
  type: "savings",
  institution: "State Bank of India",
  currency: "INR",
  openingBalanceMinor: 0n,
  color: "#195848",
  includeInNetWorth: true,
  includeInAnalytics: true,
  archived: false,
  ...overrides,
});

describe("premium account card", () => {
  afterEach(cleanup);

  it("renders an SBI savings account with an explicit text-only logo fallback and no card hardware", () => {
    render(<PremiumAccountCard account={account()} balance={600000n} />);
    const card = screen.getByRole("article", { name: /Primary account, Savings/ });
    expect(card).toHaveAttribute("data-bank-brand", "sbi");
    expect(card).toHaveAttribute("data-account-visual", "bank");
    expect(screen.getByTestId("account-identity")).toHaveTextContent("SBI");
    expect(screen.getByText("Savings account", { exact: true })).toHaveClass("uppercase");
    expect(screen.getAllByText("EXPENSO", { exact: true })).toHaveLength(1);
    expect(screen.getByText("State Bank of India", { exact: true })).toBeVisible();
    expect(screen.queryByRole("img", { name: /SBI logo/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("account-symbol")).not.toBeInTheDocument();
    expect(screen.queryByTestId("emv-chip")).not.toBeInTheDocument();
    expect(screen.queryByTestId("contactless-symbol")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open transaction history for Primary account" })).toHaveAttribute("href", "/transactions?accountId=account-1");
    expect(screen.getByRole("link", { name: "Manage Primary account" })).toHaveAttribute("href", "/accounts?manage=account-1");
  });

  it("renders a verified bundled logo when the registry has a confident match", () => {
    render(<PremiumAccountCard account={account({ institution: "HDFC Bank" })} balance={600000n} />);
    expect(screen.getByRole("img", { name: "HDFC Bank logo" })).toBeVisible();
    expect(document.querySelector('[data-bank-logo="hdfc-bank"]')).toBeInTheDocument();
    expect(screen.getByTestId("account-identity").parentElement?.parentElement).toContainElement(screen.getByRole("img", { name: "HDFC Bank logo" }));
  });

  it("renders an ICICI credit card with chip and contactless treatment", () => {
    render(<PremiumAccountCard account={account({ type: "credit_card", institution: "ICICI Bank", name: "Travel card" })} balance={50000n} />);
    const card = screen.getByRole("article", { name: /Travel card, Credit card/ });
    expect(card).toHaveAttribute("data-bank-brand", "icici");
    expect(card).toHaveAttribute("data-account-visual", "card");
    expect(screen.getByTestId("account-identity")).toHaveTextContent("ICICI Bank");
    expect(screen.getAllByText("ICICI Bank", { exact: true })).toHaveLength(2);
    expect(screen.getAllByText("EXPENSO", { exact: true })).toHaveLength(1);
    expect(screen.getByTestId("emv-chip")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Contactless enabled" })).toBeVisible();
    expect(screen.queryByText(/Visa|Mastercard|RuPay|American Express/)).not.toBeInTheDocument();
  });

  it("shows credit-card liability metrics rather than a cash balance", () => {
    render(<PremiumAccountCard account={account({ type: "credit_card", name: "HDFC Credit Card", creditLimitMinor: 10000000n, paymentDueDay: 15, minimumPaymentMinor: 500000n })} balance={3500000n} />);
    const metrics = screen.getByTestId("credit-card-metrics");
    expect(metrics).toHaveTextContent("Credit limit");
    expect(metrics).toHaveTextContent("Used");
    expect(metrics).toHaveTextContent("Available");
    expect(metrics).toHaveTextContent(/15 [A-Z]{3}/);
  });

  it("shows loan outstanding, EMI, next due, and interest as liability details", () => {
    render(<PremiumAccountCard account={account({ type: "loan", name: "Home Loan", institution: "SBI", originalPrincipalMinor: 500000000n, emiMinor: 4200000n, interestRate: 8.5, nextPaymentDate: "2026-09-05" })} balance={380000000n} />);
    const metrics = screen.getByTestId("loan-metrics");
    expect(metrics).toHaveTextContent("Outstanding");
    expect(metrics).toHaveTextContent("EMI");
    expect(metrics).toHaveTextContent("Interest");
    expect(metrics).toHaveTextContent("8.50%");
  });
});
