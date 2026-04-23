-- Invite codes — used to grant A+ customer (or staff) tier without billing.
-- Aligns with docs/backend-migration-plan.md §4.3 (auth strategy) and
-- §11 resolution 2 (single-use default + reusable codes with a redemption cap).
--
-- A redeem RPC is deliberately NOT included here; it lands with the invite
-- redemption UI (a later phase) so the contract between client and server
-- is designed once, against the real flow. For now the table is write-only
-- from the staff admin path and read-only from the redemption lookup.

create table public.invite_codes (
  code              text primary key,
  grants_tier       text not null
                      check (grants_tier in ('a_plus_customer', 'a_plus_staff')),
  notes             text,
  max_redemptions   integer not null default 1 check (max_redemptions > 0),
  redemption_count  integer not null default 0 check (redemption_count >= 0),
  expires_at        timestamptz,
  created_by        uuid not null references public.users(id) on delete cascade,
  created_at        timestamptz not null default now(),
  constraint invite_codes_redemption_cap_ck
    check (redemption_count <= max_redemptions)
);

create index invite_codes_created_by_idx on public.invite_codes (created_by);

-- ---------------------------------------------------------------------------
-- RLS for invite_codes.
-- Creation / listing / revocation is staff-only.
-- Redemption (insert into a yet-to-exist invite_redemptions table, or a
-- redeem RPC) will use SECURITY DEFINER so the client never reads arbitrary
-- codes — they only submit a candidate code and the server validates it.
-- Consequently, no SELECT policy is opened to ordinary users.
-- ---------------------------------------------------------------------------
alter table public.invite_codes enable row level security;

create policy invite_codes_staff_all
  on public.invite_codes
  for all
  using (public.is_staff())
  with check (public.is_staff());
