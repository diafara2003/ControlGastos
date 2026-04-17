export type EmailProvider = "gmail" | "outlook" | "other";

export interface EmailAccount {
  id: string;
  user_id: string;
  provider: EmailProvider;
  email: string;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  // IMAP fields (not exposed to client in full)
  imap_host?: string;
  imap_port?: number;
}

export const IMAP_PRESETS: Record<
  string,
  { host: string; port: number; provider: EmailProvider }
> = {
  "gmail.com": { host: "imap.gmail.com", port: 993, provider: "gmail" },
  "googlemail.com": { host: "imap.gmail.com", port: 993, provider: "gmail" },
  "outlook.com": { host: "outlook.office365.com", port: 993, provider: "outlook" },
  "hotmail.com": { host: "outlook.office365.com", port: 993, provider: "outlook" },
  "live.com": { host: "outlook.office365.com", port: 993, provider: "outlook" },
  "yahoo.com": { host: "imap.mail.yahoo.com", port: 993, provider: "other" },
};

export function detectImapSettings(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  return IMAP_PRESETS[domain] ?? { host: `imap.${domain}`, port: 993, provider: "other" as EmailProvider };
}
