# AI status

AI and AI-assisted image OCR are intentionally disabled in this release. There is no outbound model-provider implementation and the reserved API routes return an unavailable response without reading financial data.

All totals, balances, budgets, cash flow, savings rate, duplicate signals, transfers, net worth, and insights are deterministic. CSV, TXT, and XLSX imports are parsed locally and remain review-first.

The `AI_*` environment names are reserved so a future implementation can be introduced behind an explicit privacy review. Keep `AI_PROVIDER=disabled` and leave the remaining values blank.
