import { describe, expect, it } from "vitest";
import { resolveAccountVisual } from "@/features/accounts/account-visuals";

describe("account visual resolver", () => {
  it.each(["Savings account", "Current account", "Checking account", "bank"])("treats %s as a bank account without payment-card hardware", (type) => {
    const visual = resolveAccountVisual({ type, institution: "SBI" });
    expect(visual.kind).toBe("bank");
    expect(visual.icon).toBe("landmark");
    expect(visual.showEmvChip).toBe(false);
    expect(visual.showContactless).toBe(false);
    expect(visual.bankBrand.key).toBe("sbi");
  });

  it.each([
    ["cash", "cash", "banknote"],
    ["wallet", "wallet", "wallet"],
    ["loan", "loan", "hand-coins"],
    ["investment", "investment", "chart"],
    ["asset", "asset", "gem"],
  ])("resolves %s without an EMV chip", (type, kind, icon) => {
    const visual = resolveAccountVisual({ type });
    expect(visual).toMatchObject({ kind, icon, showEmvChip: false, showContactless: false, cardNetwork: null });
  });

  it.each(["Debit Card", "Credit Card", "Prepaid Card"])("treats %s as an explicit physical card", (type) => {
    const visual = resolveAccountVisual({ type, institution: "ICICI Bank" });
    expect(visual).toMatchObject({ kind: "card", showEmvChip: true, showContactless: true });
    expect(visual.bankBrand.key).toBe("icici");
  });

  it("does not fabricate a network or treat an unknown account type as a card", () => {
    expect(resolveAccountVisual({ type: "Credit Card" }).cardNetwork).toBeNull();
    expect(resolveAccountVisual({ type: "Credit Card", cardNetwork: "Visa" }).cardNetwork).toBe("Visa");
    expect(resolveAccountVisual({ type: "mystery" })).toMatchObject({ kind: "generic", showEmvChip: false, showContactless: false, cardNetwork: null });
  });
});

