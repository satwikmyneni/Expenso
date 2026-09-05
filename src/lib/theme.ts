/**
 * Stable values used when a finance color must be stored as record data or
 * passed to a canvas/SVG API. Interface colors should use CSS theme tokens.
 */
export const financeColors = {
  primary: "#0c1525",
  accent: "#3b82f6",
  income: "#32d7a0",
  expense: "#ff6b6b",
  warning: "#f4d35e",
  info: "#38c7e8",
  slate: "#6f809d",
  neutral: "#7f8da4",
  sand: "#dca83f",
  coral: "#e85d8e",
} as const;

export const categoryPalette = [
  financeColors.coral,
  financeColors.neutral,
  financeColors.slate,
  financeColors.warning,
  financeColors.info,
  financeColors.expense,
  "#9a7b62",
  financeColors.income,
  "#38a9c7",
] as const;
