# Imports

The importer is intentionally review-first:

```text
CSV / TXT / XLSX
  -> NormalizedTransaction
  -> field validation
  -> duplicate signals
  -> deterministic category suggestion
  -> review queue
  -> explicit selection
  -> user-scoped database insert
```

CSV and spreadsheet parsing happens locally in the browser. Column aliases cover date/value date, narration/details, debit/withdrawal/DR, credit/deposit/CR, amount/type, and common reference/UTR headings. Indian grouping such as `1,25,000.00` is normalized as a decimal string without floating-point arithmetic.

Rows with invalid dates/amounts and duplicate signals are deselected and shown for review. The importer never silently removes duplicates or saves unreviewed rows. Transfer keywords are signals only; users must confirm the source/destination because a false transfer would corrupt spending.

AI-assisted OCR is intentionally disabled. PDF text extraction and institution-specific deterministic adapters can implement the `Importer` interface without changing later pipeline stages.
