-- Store encrypted provider_token for Outlook Graph API access
alter table public.email_accounts
  add column if not exists provider_token_encrypted text;
