-- Standalone LifeMate schema; no Supabase functions or auth schema required.
-- Applied automatically during server startup. Existing data is never dropped.
create table if not exists lm_users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  recovery_hash text not null,
  created_at timestamptz not null default now()
);
create table if not exists lm_sessions (
  token_hash text primary key,
  user_id uuid not null references lm_users(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists lm_sessions_expiry on lm_sessions(expires_at);
create table if not exists lm_data (
  user_id uuid primary key references lm_users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  revision integer not null check (revision>0),
  updated_at timestamptz not null default now(),
  check (octet_length(payload::text) <= 5242880)
);
create table if not exists lm_auth_limits (
  bucket text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);
