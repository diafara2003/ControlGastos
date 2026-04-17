export interface SyncLog {
  id: string;
  user_id: string;
  email_account_id: string;
  status: "success" | "error" | "partial";
  emails_processed: number;
  transactions_created: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}
