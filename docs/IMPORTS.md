# Statement import and receipt OCR

Both workflows are review-first and use the normal Expenso transaction repository. Parsing or OCR never inserts a transaction. Only rows the user explicitly confirms reach Supabase.

## Statement workflow

```text
PDF / CSV / TXT / XLS / XLSX
  -> local parse and header detection
  -> normalized rows
  -> transaction-type and merchant rules
  -> deterministic category suggestion
  -> owner-scoped duplicate query
  -> editable desktop table or mobile cards
  -> explicit selection and confirmation
  -> batched transaction inserts and import history
```

The parser recognizes date/value date, description/narration/particulars, debit/withdrawal/DR, credit/deposit/CR, amount/type, balance, and reference/UTR headings. It scans the first 40 lines for a header, joins only safe text-only continuation lines, and never uses the balance column as the transaction amount. Indian grouping such as `1,25,000.00` is normalized as an exact decimal string without floating-point money arithmetic.

Debit means money left the selected statement account; credit means money entered it. Refund/reversal credits are refunds. ATM cash withdrawals and credit-card payments are transfer signals and remain deselected until the user chooses a counterpart account. Generic NEFT/IMPS/RTGS activity is not guessed to be a transfer.

PDF.js first extracts selectable text. If a PDF has no meaningful text, its pages are rendered locally and passed to the same OCR worker used for receipts. Scanned PDFs are limited to 12 pages; all statements are limited to 20 MB and 5,000 review rows. XLS/XLSX parsing uses SheetJS in the browser.

## UPI and deterministic categories

UPI descriptions are split into optional direction, transaction/reference, merchant, bank code, UPI ID, and suffix fields while retaining the complete original narration in `transactions.description`. Merchant aliases normalize stable names such as `MC DONALDS` to `McDonald's` and `TATASKY` to `Tata Sky`.

Category priority is fixed:

1. Enabled exact personal merchant rule for the current user/account/type.
2. Built-in exact merchant registry.
3. Narrow keyword rule.
4. At least two consistent confirmed historical merchant matches.
5. Protected user-owned `Uncategorized`, with low confidence and review required.

Names of unknown people are never assigned a guessed category. A category correction can optionally be stored as an owner-scoped exact merchant rule. Rules can be edited or deleted on the Categories page; deleting one only stops future matching and never deletes transactions.

Every profile has a protected `Uncategorized` category. Archiving another custom category uses `archive_category_safely`: existing transactions are reassigned to that user's Uncategorized category, affected merchant rules are disabled, and financial history remains intact.

## Duplicate handling

Duplicate checks compare the selected account, historical date, exact amount, normalized merchant, original narration, and reference/UTR. The same fingerprint is also detected inside one uploaded statement. A reference match or a sufficiently strong multi-field match is displayed as possible/likely; duplicate rows start deselected and require Skip, Review, or Import anyway. Import anyway records `duplicate_of_id` when an existing transaction is known.

Only the imported date range and selected owner account are queried for database duplicate candidates. Transactions are written in batches of 50 with progress. If a later batch fails, earlier committed batches are reloaded and marked in the review so retrying cannot silently duplicate them.

## Receipt and UPI screenshot workflow

The Add Transaction menu exposes Manual, Voice, Scan receipt, and Import statement. Scan receipt supports camera capture, a photo picker, and file selection for JPG/JPEG/PNG/WEBP/PDF up to 10 MB.

Tesseract.js performs non-generative OCR in a browser Web Worker. PDF.js handles text-first PDFs and renders scanned PDF pages. No model, prompt, OCR API, API key, or server upload is involved in recognition. Runtime worker/core/English language assets are fetched from versioned jsDelivr packages on first use and can then be browser-cached. The selected image bytes remain local during OCR.

Deterministic text extraction looks for merchant, total/paid amount (preferring grand total over subtotal/tax), date, time, UPI ID, UTR/reference/transaction ID, payment method, invoice number, and order number. Missing or uncertain fields remain editable. OCR has a 90-second per-image timeout and never auto-saves.

The confirmation form uses the same category and duplicate engines as statements. Transfers require a counterpart, refunds require the original purchase, unknown merchants require an explicit category (including Uncategorized), and a detected duplicate requires an explicit Import anyway choice.

After the transaction is successfully created, the user may attach the original. Files are validated by MIME plus extension, hashed, and uploaded to the private `receipts` bucket under `user-id/receipts/<random-id>.<extension>`. Attachment metadata is owner-scoped. No public URL or service-role key is used. If attachment storage fails, the already-saved transaction is retained and the UI offers an attachment-only retry.

## Deployment and privacy

Apply `supabase/migrations/202609060001_add_deterministic_import_workflow.sql`. Existing forced RLS and owner policies remain in force for transactions, imports, import rows, merchant rules, attachment records, and private Storage objects.

No new environment variable is required. Keep `AI_PROVIDER=disabled`; the other reserved `AI_*` values remain blank. This browser-only OCR architecture works on Vercel, Netlify, and equivalent Next.js hosts. Internet access is required for the first Tesseract runtime/language download unless those static assets are self-hosted in a future deployment.

All committed fixtures under `tests/fixtures/imports` are synthetic and sanitized. Never add a real statement, receipt, account number, UPI address, or personal financial record to the repository.
