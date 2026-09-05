import { describe, expect, it, vi } from "vitest";
import { FinanceRepository } from "@/features/finance/repository";
import type { AccountDraft } from "@/features/finance/types";

const draft: AccountDraft = {
  name: "Salary account",
  institution: "HDFC Bank",
  type: "savings",
  currency: "INR",
  openingBalanceMinor: 10000n,
  color: "#123456",
  includeInNetWorth: true,
  includeInAnalytics: true,
};

describe("account repository boundaries", () => {
  it("updates the existing account through both id and authenticated owner predicates", async () => {
    const row = { id: "account-1", user_id: "user-a", name: draft.name, institution: draft.institution, type: draft.type, currency: draft.currency, opening_balance: 100, color: draft.color, last_four: null, include_in_net_worth: true, include_in_analytics: true, archived_at: null, created_at: "2026-01-01", updated_at: "2026-01-01" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn(() => ({ single }));
    const ownerEq = vi.fn(() => ({ select }));
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const update = vi.fn(() => ({ eq: idEq }));
    const repository = new FinanceRepository({ from: vi.fn(() => ({ update })) } as never);

    const result = await repository.updateAccount("user-a", "account-1", { ...draft, institution: "SBI" });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ institution: "SBI" }));
    expect(idEq).toHaveBeenCalledWith("id", "account-1");
    expect(ownerEq).toHaveBeenCalledWith("user_id", "user-a");
    expect(result.id).toBe("account-1");
  });

  it("queries account history on the server with user and account predicates", async () => {
    const range = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn(() => ({ range }));
    const or = vi.fn(() => ({ order }));
    const ownerEq = vi.fn(() => ({ or }));
    const select = vi.fn(() => ({ eq: ownerEq }));
    const repository = new FinanceRepository({ from: vi.fn(() => ({ select })) } as never);

    await expect(repository.loadAccountTransactions("user-a", "account-1")).resolves.toEqual([]);
    expect(ownerEq).toHaveBeenCalledWith("user_id", "user-a");
    expect(or).toHaveBeenCalledWith("account_id.eq.account-1,transfer_account_id.eq.account-1");
  });

  it("converts restrictive foreign-key failures into a safe history warning", async () => {
    const ownerEq = vi.fn().mockResolvedValue({ error: { code: "23503", message: "private constraint details" } });
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const remove = vi.fn(() => ({ eq: idEq }));
    const repository = new FinanceRepository({ from: vi.fn(() => ({ delete: remove })) } as never);

    await expect(repository.deleteAccount("user-a", "account-1")).rejects.toThrow("linked financial history");
    expect(idEq).toHaveBeenCalledWith("id", "account-1");
    expect(ownerEq).toHaveBeenCalledWith("user_id", "user-a");
  });

  it("owner-scopes archive fallback without deleting the account", async () => {
    const ownerEq = vi.fn().mockResolvedValue({ error: null });
    const idEq = vi.fn(() => ({ eq: ownerEq }));
    const update = vi.fn(() => ({ eq: idEq }));
    const repository = new FinanceRepository({ from: vi.fn(() => ({ update })) } as never);
    await expect(repository.archiveAccount("user-a", "account-1")).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({ archived_at: expect.any(String) });
    expect(ownerEq).toHaveBeenCalledWith("user_id", "user-a");
  });
});
