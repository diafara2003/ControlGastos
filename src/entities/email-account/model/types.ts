export type EmailProvider = "gmail" | "outlook";

export interface EmailAccount {
  id: string;
  user_id: string;
  provider: EmailProvider;
  email: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}
