import { describe, expect, it } from "vitest";
import { bankBrandAliases, bankBrands, getBankBrandCoverageReport, institutionCatalog, normalizeInstitutionName, resolveBankBrand } from "@/features/accounts/bank-brands";

describe("bank brand resolver", () => {
  it.each([
    ["SBI", "sbi"],
    ["State Bank of India", "sbi"],
    ["State Bank of India Limited", "sbi"],
    ["ICICI", "icici"],
    ["ICICI Bank", "icici"],
    ["ICICI BANK LTD", "icici"],
    ["HDFC Bank", "hdfc"],
    ["Axis Bank", "axis"],
    ["Kotak Mahindra Bank", "kotak"],
    ["Bank of Baroda", "bank-of-baroda"],
    ["Canara Bank", "canara"],
    ["IDFC FIRST Bank", "idfc-first"],
    ["IndusInd Bank", "indusind"],
    ["YES BANK", "yes-bank"],
    ["Federal Bank", "federal"],
    ["Slice Card", "slice"],
  ])("resolves %s to %s", (institution, expected) => {
    expect(resolveBankBrand(institution).key).toBe(expected);
  });

  it("normalizes case, punctuation, corporate suffixes, and harmless whitespace", () => {
    expect(normalizeInstitutionName("  State Bank Of India, LTD.  ")).toBe("state bank of india");
    expect(resolveBankBrand("  iCiCi   BANK, limited ").key).toBe("icici");
  });

  it("does not guess when an institution is unknown or only looks similar", () => {
    expect(resolveBankBrand("Unknown Bank").key).toBe("default");
    expect(resolveBankBrand("State Finance of India").key).toBe("default");
    expect(resolveBankBrand(undefined).key).toBe("default");
  });

  it("keeps the primary reference themes visually distinct", () => {
    const sbi = resolveBankBrand("SBI");
    const indusind = resolveBankBrand("IndusInd Bank");
    const icici = resolveBankBrand("ICICI Bank");
    expect(new Set([sbi.primaryColor, indusind.primaryColor, icici.primaryColor]).size).toBe(3);
    expect(sbi.backgroundGradient).not.toBe(indusind.backgroundGradient);
    expect(indusind.backgroundGradient).not.toBe(icici.backgroundGradient);
  });

  it("covers every source-of-truth institution and every declared alias", () => {
    expect(institutionCatalog).toHaveLength(Object.keys(bankBrands).length);
    for (const brand of institutionCatalog) expect(resolveBankBrand(brand.displayName).key).toBe(brand.key);
    for (const [key, aliases] of Object.entries(bankBrandAliases)) {
      for (const alias of aliases) expect(resolveBankBrand(alias).key).toBe(key);
    }
  });

  it("reports verified logos, explicit text fallbacks, and no missing classifications", () => {
    const report = getBankBrandCoverageReport();
    expect(report.total).toBe(institutionCatalog.length);
    expect(report.verifiedLogos).toHaveLength(9);
    expect(report.textOnlyFallbacks).toHaveLength(report.total - 9);
    expect(report.missing).toHaveLength(0);
    expect(report.verifiedLogos.every((brand) => brand.logo.source === "Simple Icons via react-icons")).toBe(true);
  });

  it("never assigns a guessed logo to unsupported or similarly named institutions", () => {
    expect(resolveBankBrand("SBI").logo.status).toBe("TEXT_ONLY_FALLBACK");
    expect(resolveBankBrand("Unknown Bank").logo.status).toBe("TEXT_ONLY_FALLBACK");
    expect(resolveBankBrand("HDFC Finance Lookalike").logo.status).toBe("TEXT_ONLY_FALLBACK");
    expect(resolveBankBrand("HDFC Bank").logo).toMatchObject({ status: "VERIFIED_LOGO", id: "hdfc-bank" });
  });
});
