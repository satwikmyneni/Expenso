import { describe, expect, it, vi } from "vitest";
import { FinanceRepository } from "@/features/finance/repository";

const row = { id: "contribution-1", user_id: "user-a", goal_id: "goal-1", amount: 50, contributed_at: "2026-09-05T12:00:00.000Z", source_account_id: "account-1", linked_transaction_id: null, notes: "Monthly allocation", created_at: "2026-09-05T12:00:00.000Z", updated_at: "2026-09-05T12:00:00.000Z" };
const draft = { goalId: "goal-1", amount: "50.00", date: "2026-09-05", sourceAccountId: "account-1", note: "Monthly allocation" };

describe("goal contribution repository", () => {
  it("persists amount, date, source account, and note as a real contribution row", async () => {
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const repository = new FinanceRepository({ from: vi.fn(() => ({ insert })) } as never);
    const result = await repository.createGoalContribution("user-a", draft);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-a", goal_id: "goal-1", amount: "50.00", source_account_id: "account-1", notes: "Monthly allocation" }));
    expect(result).toMatchObject({ id: "contribution-1", goalId: "goal-1", amountMinor: 5000n, sourceAccountId: "account-1" });
  });

  it("owner-scopes contribution edits and removals", async () => {
    const single = vi.fn().mockResolvedValue({ data: { ...row, amount: 75 }, error: null });
    const select = vi.fn(() => ({ single }));
    const ownerEqUpdate = vi.fn(() => ({ select }));
    const idEqUpdate = vi.fn(() => ({ eq: ownerEqUpdate }));
    const update = vi.fn(() => ({ eq: idEqUpdate }));
    const ownerEqDelete = vi.fn().mockResolvedValue({ error: null });
    const idEqDelete = vi.fn(() => ({ eq: ownerEqDelete }));
    const remove = vi.fn(() => ({ eq: idEqDelete }));
    const repository = new FinanceRepository({ from: vi.fn(() => ({ update, delete: remove })) } as never);

    await expect(repository.updateGoalContribution("user-a", "contribution-1", { ...draft, amount: "75" })).resolves.toMatchObject({ amountMinor: 7500n });
    await expect(repository.deleteGoalContribution("user-a", "contribution-1")).resolves.toBeUndefined();
    expect(ownerEqUpdate).toHaveBeenCalledWith("user_id", "user-a");
    expect(ownerEqDelete).toHaveBeenCalledWith("user_id", "user-a");
  });

  it("upserts reminders with an owner-scoped deterministic dedupe key", async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const upsert = vi.fn(() => ({ select }));
    const repository = new FinanceRepository({ from: vi.fn(() => ({ upsert })) } as never);
    await repository.syncLiabilityReminders("user-a", [{ accountId: "card", kind: "credit_card_due", title: "Card reminder", body: "Due in 3 days", dueDate: "2026-09-08", leadDays: 3, dedupeKey: "credit_card_due:card:2026-09-08:3", actionUrl: "/accounts?manage=card" }]);
    expect(upsert).toHaveBeenCalledWith([expect.objectContaining({ user_id: "user-a", dedupe_key: "credit_card_due:card:2026-09-08:3" })], { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
  });
});
