import { describe, expect, it } from "vitest";
import { loadedAccountDeleteBlocker } from "@/features/accounts/account-deletion";
import type { FinanceData } from "@/features/finance/types";

const base = { accounts: [], transactions: [], goalContributions: [], recurring: [] } satisfies Pick<FinanceData, "accounts" | "transactions" | "goalContributions" | "recurring">;

describe("account deletion safety", () => {
  it("allows an account with no loaded dependencies", () => expect(loadedAccountDeleteBlocker(base, "account")).toBeNull());
  it("identifies transaction, contribution, recurring, and repayment dependencies", () => {
    expect(loadedAccountDeleteBlocker({ ...base, transactions: [{ accountId: "account" } as never] }, "account")).toBe("transaction history");
    expect(loadedAccountDeleteBlocker({ ...base, goalContributions: [{ sourceAccountId: "account" } as never] }, "account")).toBe("goal contribution history");
    expect(loadedAccountDeleteBlocker({ ...base, recurring: [{ accountId: "account" } as never] }, "account")).toContain("recurring");
    expect(loadedAccountDeleteBlocker({ ...base, accounts: [{ paymentAccountId: "account" } as never] }, "account")).toContain("repayment");
  });
});
