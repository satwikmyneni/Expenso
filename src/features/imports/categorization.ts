import type { Category, FinanceTransaction, MerchantRule, TransactionType } from "@/features/finance/types";
import type { DeterministicConfidence } from "./types";
import { normalizeMerchant, normalizeMerchantKey } from "./merchant-normalization";

interface CategorySuggestionInput {
  merchant: string;
  description?: string;
  type: TransactionType;
  accountId?: string;
  categories: Category[];
  personalRules?: MerchantRule[];
  history?: FinanceTransaction[];
}

export interface CategorySuggestion {
  merchant: string;
  categoryId?: string;
  confidence: DeterministicConfidence;
  reason: string;
  needsReview: boolean;
  personalRuleId?: string;
}

const exactMerchantCategories: ReadonlyArray<[RegExp, string]> = [
  [/^mcdonalds$/, "food"],
  [/^(?:swiggy|zomato)$/, "food"],
  [/^(?:uber|ola|rapido)$/, "transport"],
  [/^(?:amazon|flipkart|myntra|ikea)$/, "shopping"],
  [/^(?:netflix|spotify|hotstar|prime video)$/, "entertainment"],
  [/^(?:tata sky|tata play|jio|airtel)$/, "utilities"],
];

const keywordCategories: ReadonlyArray<[RegExp, string]> = [
  [/\b(?:restaurant|cafe|coffee|food|pizza|biryani|burger|bakery)\b/i, "food"],
  [/\b(?:petrol|fuel|hpcl|bpcl|iocl|metro|cab|taxi)\b/i, "transport"],
  [/\b(?:electricity|water bill|gas bill|mobile recharge|internet|broadband|dth)\b/i, "utilities"],
  [/\b(?:hospital|pharmacy|medical|clinic|diagnostic)\b/i, "health"],
  [/\b(?:school|college|tuition|education|university)\b/i, "education"],
  [/\b(?:salary|payroll|wages)\b/i, "income"],
];

const categoryAliases: Record<string, string[]> = {
  food: ["food", "food dining", "food and dining", "dining"],
  transport: ["transport", "transportation", "travel local"],
  shopping: ["shopping"],
  entertainment: ["entertainment"],
  utilities: ["bills utilities", "bills and utilities", "utilities", "bills"],
  health: ["health", "healthcare", "medical"],
  education: ["education"],
  income: ["income", "salary"],
  uncategorized: ["uncategorized"],
};

function categoryForKey(categories: Category[], key: string) {
  const aliases = categoryAliases[key] ?? [key];
  return categories.find((category) => !category.archived && aliases.includes(normalizeMerchantKey(category.name)));
}

export function uncategorizedCategory(categories: Category[]) {
  return categoryForKey(categories, "uncategorized");
}

function personalRuleMatches(rule: MerchantRule, merchantKey: string, accountId: string | undefined, type: TransactionType) {
  if (!rule.enabled || !rule.categoryId) return false;
  if (rule.accountId && rule.accountId !== accountId) return false;
  if (rule.transactionType && rule.transactionType !== type) return false;
  const pattern = normalizeMerchantKey(rule.merchantNormalized || rule.pattern);
  if (!pattern) return false;
  if (rule.matchType === "exact") return merchantKey === pattern;
  if (rule.matchType === "contains") return merchantKey.includes(pattern);
  // The app only creates exact rules. Existing regex rules are accepted with a
  // strict size limit so an imported legacy rule cannot monopolize the UI.
  if (rule.pattern.length > 120) return false;
  try { return new RegExp(rule.pattern, "i").test(merchantKey); }
  catch { return false; }
}

function historicalCategory(merchantKey: string, history: FinanceTransaction[]) {
  const matches = history
    .filter((transaction) => transaction.categoryId && normalizeMerchantKey(transaction.merchant) === merchantKey)
    .slice(0, 20);
  if (matches.length < 2) return undefined;
  const counts = new Map<string, number>();
  for (const transaction of matches) counts.set(transaction.categoryId!, (counts.get(transaction.categoryId!) ?? 0) + 1);
  const ordered = [...counts].sort((left, right) => right[1] - left[1]);
  const [categoryId, count] = ordered[0];
  return count === matches.length ? categoryId : undefined;
}

export function categorizeDeterministically(input: CategorySuggestionInput): CategorySuggestion {
  const merchant = normalizeMerchant(input.merchant);
  const merchantKey = normalizeMerchantKey(merchant);
  const fallback = uncategorizedCategory(input.categories);
  const personal = [...(input.personalRules ?? [])]
    .sort((left, right) => right.priority - left.priority)
    .find((rule) => personalRuleMatches(rule, merchantKey, input.accountId, input.type));
  if (personal && input.categories.some((category) => category.id === personal.categoryId && !category.archived)) {
    return { merchant, categoryId: personal.categoryId, confidence: "high", reason: "Your merchant rule", needsReview: false, personalRuleId: personal.id };
  }

  const exactKey = exactMerchantCategories.find(([pattern]) => pattern.test(merchantKey))?.[1];
  if (exactKey) {
    const category = categoryForKey(input.categories, exactKey);
    if (category) return { merchant, categoryId: category.id, confidence: "high", reason: "Exact merchant match", needsReview: false };
  }

  const searchable = `${merchant} ${input.description ?? ""}`;
  const keywordKey = keywordCategories.find(([pattern]) => pattern.test(searchable))?.[1];
  if (keywordKey) {
    const category = categoryForKey(input.categories, keywordKey);
    if (category) return { merchant, categoryId: category.id, confidence: "medium", reason: "Specific keyword match", needsReview: false };
  }

  const historyCategoryId = historicalCategory(merchantKey, input.history ?? []);
  if (historyCategoryId && input.categories.some((category) => category.id === historyCategoryId && !category.archived)) {
    return { merchant, categoryId: historyCategoryId, confidence: "medium", reason: "Consistent confirmed history", needsReview: false };
  }

  return { merchant, categoryId: fallback?.id, confidence: "low", reason: "No reliable deterministic rule", needsReview: true };
}
