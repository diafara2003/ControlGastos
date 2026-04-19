export type TransactionType = "expense" | "income";

export type ClassificationMethod = "rule" | "ai" | "manual" | "builtin" | "pattern";

export interface Transaction {
  id: string;
  user_id: string;
  email_account_id: string | null;
  type: TransactionType;
  amount: number;
  merchant: string;
  description: string | null;
  category_id: string | null;
  transaction_date: string;
  classification_method: ClassificationMethod | null;
  is_verified: boolean;
  notes: string | null;
  email_message_id: string | null;
  raw_email_snippet: string | null;
  card_last_four: string | null;
  bank_account_id: string | null;
  exclude_from_totals: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}
