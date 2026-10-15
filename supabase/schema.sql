-- Run the entire file in Supabase Dashboard → SQL Editor → New query → Run.
-- Re-runnable. Each authenticated user can read only their own row.
begin;
create table if not exists public.lifemate_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint lifemate_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint lifemate_payload_size check (octet_length(payload::text) <= 5242880)
);
alter table public.lifemate_data enable row level security;
revoke all on public.lifemate_data from public, anon, authenticated;
grant select on public.lifemate_data to authenticated;
drop policy if exists "Read own LifeMate data" on public.lifemate_data;
create policy "Read own LifeMate data" on public.lifemate_data
  for select to authenticated using ((select auth.uid()) = user_id);

-- Writes go through this function. It never accepts a user ID from the browser.
-- Compare-and-swap prevents a stale tab/device from overwriting a newer save.
create or replace function public.save_lifemate_data(new_payload jsonb, expected_revision integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved_revision integer;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if expected_revision is null or expected_revision < 0 then
    raise exception 'Invalid revision' using errcode = '22023';
  end if;
  if new_payload is null or jsonb_typeof(new_payload) <> 'object'
    or new_payload->>'version' is distinct from '1'
    or jsonb_typeof(new_payload->'records') is distinct from 'object'
    or jsonb_typeof(new_payload->'habits') is distinct from 'array'
    or octet_length(new_payload::text) > 5242880 then
    raise exception 'Invalid payload' using errcode = '22023';
  end if;
  if expected_revision = 0 then
    insert into public.lifemate_data(user_id,payload,revision)
      values(owner_id,new_payload,1)
      on conflict (user_id) do nothing
      returning revision into saved_revision;
  else
    update public.lifemate_data
      set payload=new_payload, revision=revision+1, updated_at=now()
      where user_id=owner_id and revision=expected_revision
      returning revision into saved_revision;
  end if;
  if saved_revision is null then
    raise exception 'Data changed on another device; reload before saving' using errcode = '40001';
  end if;
  return saved_revision;
end;
$$;
revoke all on function public.save_lifemate_data(jsonb,integer) from public, anon;
grant execute on function public.save_lifemate_data(jsonb,integer) to authenticated;
commit;
