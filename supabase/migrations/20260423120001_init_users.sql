-- Initial users table + tier helper + auto-provisioning trigger.
-- Aligns with docs/backend-migration-plan.md §4.2 (account tiers) and §6 (RLS).
--
-- public.users.id == auth.users.id so every application row is keyed directly
-- to the Supabase auth identity. A trigger populates public.users whenever a
-- new auth.users row appears so the app never has to INSERT into this table
-- from the client.

create table public.users (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  display_name      text,
  company           text,
  phone             text,
  tier              text not null default 'free'
                      check (tier in ('free', 'a_plus_customer', 'a_plus_staff')),
  tier_granted_at   timestamptz,
  tier_granted_by   uuid references public.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index users_tier_idx on public.users (tier);

-- ---------------------------------------------------------------------------
-- is_staff(): SECURITY DEFINER so it can read public.users without being
-- blocked by the very RLS policies that will reference it. Without the
-- definer context, a policy that calls is_staff() against public.users would
-- recurse into itself. `stable` lets the planner cache the result per row.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users
    where id = uid
      and tier = 'a_plus_staff'
  );
$$;

revoke all on function public.is_staff(uuid) from public;
grant execute on function public.is_staff(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Auto-provision a public.users row when a new auth.users row is created.
-- Service role (or the auth system itself) writes auth.users; this trigger
-- mirrors the minimal fields into public.users with the default 'free' tier.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Keep updated_at fresh on every row update.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: a signed-in user can read their own row; staff can read any row.
-- Writes are tightly constrained — clients can update self-profile fields but
-- NOT tier. Tier changes go through server-side/admin flows (service role).
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;

create policy users_self_select
  on public.users
  for select
  using (auth.uid() = id);

create policy users_staff_select
  on public.users
  for select
  using (public.is_staff());

create policy users_self_update
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Prevent self-escalation: a client-side UPDATE that tries to change tier or
-- tier_granted_* is rejected. Staff grant/revoke happens via a server-side
-- RPC (added in a later migration) that runs with elevated privileges.
create or replace function public.prevent_tier_self_escalation()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and auth.uid() = new.id
     and not public.is_staff(auth.uid())
     and (
       new.tier is distinct from old.tier
       or new.tier_granted_at is distinct from old.tier_granted_at
       or new.tier_granted_by is distinct from old.tier_granted_by
     )
  then
    raise exception 'tier can only be changed by A+ staff';
  end if;
  return new;
end;
$$;

create trigger users_prevent_self_tier_escalation
  before update on public.users
  for each row execute function public.prevent_tier_self_escalation();
