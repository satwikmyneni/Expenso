import { describe, expect, it } from "vitest";
import { buildLiabilityReminderCandidates, nextMonthlyDueDate } from "@/features/finance/liability-reminders";
import type { Account } from "@/features/finance/types";

const account = (extra: Partial<Account>): Account => ({ id: "card", name: "HDFC Credit Card", institution: "HDFC Bank", type: "credit_card", currency: "INR", openingBalanceMinor: 0n, color: "#000", includeInAnalytics: true, includeInNetWorth: true, archived: false, remindersEnabled: true, reminderDays: [7, 3, 0], ...extra });

describe("liability reminders", () => {
  it("clamps monthly due days and moves a passed day into the next month", () => {
    const september = nextMonthlyDueDate(31, new Date("2026-09-05T12:00:00"));
    const october = nextMonthlyDueDate(3, new Date("2026-09-05T12:00:00"));
    expect([september.getFullYear(), september.getMonth() + 1, september.getDate()]).toEqual([2026, 9, 30]);
    expect([october.getFullYear(), october.getMonth() + 1, october.getDate()]).toEqual([2026, 10, 3]);
  });

  it("creates deterministic 7-day, 3-day, and due-day card reminders", () => {
    const card = account({ paymentDueDay: 12 });
    const seven = buildLiabilityReminderCandidates([card], new Date("2026-09-05T12:00:00"));
    expect(seven).toHaveLength(1);
    expect(seven[0]).toMatchObject({ leadDays: 7, kind: "credit_card_due", dedupeKey: "credit_card_due:card:2026-09-12:7" });
    expect(buildLiabilityReminderCandidates([card], new Date("2026-09-09T12:00:00"))[0].leadDays).toBe(3);
    expect(buildLiabilityReminderCandidates([card], new Date("2026-09-12T12:00:00"))[0].body).toContain("due today");
  });

  it("supports recurring loan dates and disabled reminders without duplicates", () => {
    const loan = account({ id: "loan", name: "Home Loan", type: "loan", nextPaymentDate: "2026-08-08", endDate: "2030-08-08", reminderDays: [3] });
    const reminders = buildLiabilityReminderCandidates([loan, loan], new Date("2026-09-05T12:00:00"));
    expect(reminders).toHaveLength(2);
    expect(new Set(reminders.map((item) => item.dedupeKey)).size).toBe(1);
    expect(buildLiabilityReminderCandidates([{ ...loan, remindersEnabled: false }], new Date("2026-09-05T12:00:00"))).toEqual([]);
  });
});
