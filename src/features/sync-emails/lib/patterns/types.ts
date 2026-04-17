export interface ParsedTransaction {
  type: "expense" | "income";
  amount: number; // COP integer
  merchant: string;
  description: string | null;
  transactionDate: Date;
}

export interface BankPattern {
  /** Sender email(s) this pattern matches */
  senders: string[];
  /** Human-readable bank name */
  bankName: string;
  /** Try to parse email body text. Returns null if not recognized. */
  parse(bodyText: string, subject: string, date: string): ParsedTransaction | null;
}
