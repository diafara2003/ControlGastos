alter table public.email_accounts
  add column if not exists provider_refresh_token_encrypted text;
