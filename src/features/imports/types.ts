export interface NormalizedTransaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: string;
  direction: "debit" | "credit";
  reference?: string;
  selected: boolean;
  issue?: string;
  source: "csv" | "xlsx" | "txt";
}

export interface Importer {
  supports(file: File): boolean;
  parse(file: File): Promise<NormalizedTransaction[]>;
}
