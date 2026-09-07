# AI status

AI and AI-assisted image OCR are intentionally disabled in this release. There is no outbound model-provider implementation. The reserved OCR API refuses file uploads because receipt recognition runs locally in the browser.

All totals, balances, budgets, cash flow, savings rate, duplicate signals, transfers, net worth, insights, merchant normalization, and categorization are deterministic. PDF/CSV/TXT/XLS/XLSX statements are parsed locally and remain review-first. Receipt images use non-generative Tesseract.js OCR in a browser Web Worker; extracted text is interpreted with explicit regular expressions and registries, never a model prompt.

The `AI_*` environment names are reserved so a future implementation can be introduced behind an explicit privacy review. Keep `AI_PROVIDER=disabled` and leave the remaining values blank.
