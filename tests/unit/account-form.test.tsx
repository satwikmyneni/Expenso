import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountFormDialog } from "@/features/accounts/account-form-dialog";
import type { Account } from "@/features/finance/types";

const account: Account = {
  id: "account-1",
  name: "Salary account",
  institution: "HDFC Bank",
  type: "savings",
  currency: "INR",
  openingBalanceMinor: 10000n,
  color: "#123456",
  includeInNetWorth: true,
  includeInAnalytics: true,
  archived: false,
};

describe("account form", () => {
  afterEach(cleanup);

  it("blocks creation without a validated institution name", async () => {
    const onSave = vi.fn();
    render(<AccountFormDialog open onClose={vi.fn()} currency="INR" onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "Primary" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(await screen.findByText("Institution name is required.")).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits a valid account with trimmed identity values", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<AccountFormDialog open onClose={vi.fn()} currency="INR" onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "  Primary  " } });
    fireEvent.change(screen.getByLabelText("Institution name"), { target: { value: "  HDFC Bank  " } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: "Primary", institution: "HDFC Bank", type: "bank" })));
  });

  it("opens existing values and preserves account metadata when the institution changes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<AccountFormDialog open onClose={vi.fn()} account={account} currency="INR" onSave={onSave} />);
    expect(screen.getByLabelText("Account name")).toHaveValue("Salary account");
    expect(screen.getByLabelText("Institution name")).toHaveValue("HDFC Bank");
    fireEvent.change(screen.getByLabelText("Institution name"), { target: { value: "SBI" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ institution: "SBI", lastFour: undefined, color: "#123456", openingBalanceMinor: 10000n })));
  });

  it("validates and submits credit-card metadata only for credit cards", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<AccountFormDialog open onClose={vi.fn()} currency="INR" accounts={[account]} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "Travel card" } });
    fireEvent.change(screen.getByLabelText("Institution name"), { target: { value: "HDFC Bank" } });
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "credit_card" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(await screen.findByText("Credit limit must be greater than zero.")).toBeVisible();
    fireEvent.change(screen.getByLabelText(/Credit limit/), { target: { value: "100000" } });
    fireEvent.change(screen.getByLabelText(/Statement day/), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText(/Payment due day/), { target: { value: "25" } });
    fireEvent.change(screen.getByLabelText("Minimum payment (optional)"), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ type: "credit_card", creditLimitMinor: 10000000n, statementDay: 8, paymentDueDay: 25, minimumPaymentMinor: 500000n })));
  });

  it("requires loan principal, EMI, interest, and next payment date", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<AccountFormDialog open onClose={vi.fn()} currency="INR" accounts={[account]} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "Home loan" } });
    fireEvent.change(screen.getByLabelText("Institution name"), { target: { value: "SBI" } });
    fireEvent.change(screen.getByLabelText("Account type"), { target: { value: "loan" } });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(await screen.findByText("Original principal must be greater than zero.")).toBeVisible();
    expect(screen.getByText("Next payment date is required.")).toBeVisible();
  });
});
