export interface ParsedTransaction {
  type: "expense" | "income";
  amount: number; // COP integer
  merchant: string;
  description: string | null;
  transactionDate: Date;
  cardLastFour: string | null;
}

export interface BankPattern {
  /** Sender email(s) this pattern matches */
  senders: string[];
  /** Human-readable bank name */
  bankName: string;
  /** Try to parse email body text. Returns null if not recognized. */
  parse(bodyText: string, subject: string, date: string): ParsedTransaction | null;
}

/**
 * Extract last 4 digits of card number from email text.
 * Common patterns in Colombian bank emails:
 * - *4532, **4532, ***4532
 * - tarjeta ...4532
 * - terminada en 4532
 * - TC *4532, TD *4532
 */
export function extractCardLastFour(text: string): string | null {
  const patterns = [
    /\*{1,4}(\d{4})\b/,                           // *4532, **4532
    /tarjeta[^0-9]*(\d{4})\b/i,                    // tarjeta ...4532
    /terminad[ao]\s+en\s+(\d{4})\b/i,              // terminada en 4532
    /(?:TC|TD|TDB|TDC)\s*\*?\s*(\d{4})\b/i,       // TC *4532, TD 4532
    /(?:credito|crédito|debito|débito)[^0-9]*(\d{4})\b/i, // credito ...4532
    /\b\d{2}\*{2,8}(\d{4})\b/,                     // 45****4532
    /cuenta[^0-9]*(\d{4})\b/i,                     // cuenta ...4532
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
