-- Add IMAP fields to email_accounts
alter table public.email_accounts
  add column if not exists imap_host text,
  add column if not exists imap_port int default 993,
  add column if not exists imap_password_encrypted text;

-- Update provider check to include 'other'
alter table public.email_accounts drop constraint if exists email_accounts_provider_check;
alter table public.email_accounts add constraint email_accounts_provider_check
  check (provider in ('gmail', 'outlook', 'other'));
