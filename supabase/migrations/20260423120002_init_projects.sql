-- Projects + project_shares tables.
-- Aligns with docs/backend-migration-plan.md §5 (schema), §6 (RLS),
-- §11 resolution 3 (soft-delete projects, cascade hard-delete for children).
--
-- Hybrid column strategy: identifiers + fields we'd query by (name, owner,
-- code_version, timestamps) are real columns. Free-form polymorphic state
-- (outdoor_scope, basis_of_design, system_architecture, commissioning,
-- section_overrides, document_template) stays as jsonb so the schema does
-- not balloon when those shapes evolve in userland.
--
-- Rooms + functional_groups are deliberately deferred to §10 step 3.

create table public.projects (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references public.users(id) on delete cascade,
  name                  text not null,
  location              text,
  prepared_by           text,
  code_version          text not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,  -- soft delete; cascade on hard delete
  outdoor_scope         jsonb not null default '{}'::jsonb,
  basis_of_design       jsonb not null default '{}'::jsonb,
  system_architecture   jsonb not null default '{}'::jsonb,
  commissioning         jsonb not null default '{}'::jsonb,
  section_overrides     jsonb not null default '{}'::jsonb,
  document_template     jsonb
);

create index projects_owner_id_idx on public.projects (owner_id);
create index projects_updated_at_idx on public.projects (updated_at desc);
-- Fast "list my not-deleted projects" path.
create index projects_owner_active_idx
  on public.projects (owner_id, updated_at desc)
  where deleted_at is null;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- project_shares: link-based share tokens and/or per-user grants.
-- share_token is opaque; the client passes it via a custom GUC
-- (request.share_token) that the RLS policy reads. See docs §6 for the
-- intended flow.
-- ---------------------------------------------------------------------------
create table public.project_shares (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  share_token       text unique,
  shared_with_user  uuid references public.users(id) on delete cascade,
  access_level      text not null check (access_level in ('view', 'comment', 'edit')),
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  created_by        uuid not null references public.users(id) on delete cascade,
  -- Exactly one of (token, user) must be set — a share is either a link or a
  -- user grant, never both.
  constraint project_shares_target_ck
    check ((share_token is not null) <> (shared_with_user is not null))
);

create index project_shares_project_id_idx on public.project_shares (project_id);
create index project_shares_user_idx on public.project_shares (shared_with_user)
  where shared_with_user is not null;

-- ---------------------------------------------------------------------------
-- Helper: does the current auth context (user or share token) have at least
-- `min_level` access to `proj_id`? Keeps the projects / project_shares
-- policies short and readable. access_level ordering: view < comment < edit.
-- ---------------------------------------------------------------------------
create or replace function public.project_has_access(
  proj_id uuid,
  min_level text default 'view'
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with ranked as (
    select unnest(array['view', 'comment', 'edit']) as lvl,
           generate_series(1, 3) as rank
  ),
  needed as (select rank from ranked where lvl = min_level),
  share_access as (
    select max(r.rank) as rank
    from public.project_shares s
    join ranked r on r.lvl = s.access_level
    where s.project_id = proj_id
      and (s.expires_at is null or s.expires_at > now())
      and (
        s.shared_with_user = auth.uid()
        or s.share_token = current_setting('request.share_token', true)
      )
  )
  select
    exists (
      select 1 from public.projects p
      where p.id = proj_id and p.owner_id = auth.uid()
    )
    or public.is_staff()
    or coalesce((select rank from share_access), 0) >= (select rank from needed);
$$;

revoke all on function public.project_has_access(uuid, text) from public;
grant execute on function public.project_has_access(uuid, text) to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- RLS for projects.
-- Owner has full access (including hard delete).
-- A+ staff can read any project for support access.
-- Shared users can read via project_has_access().
-- No INSERT policy needed beyond owner_id = auth.uid() — clients cannot write
-- on behalf of another user.
-- Soft-delete semantics: a soft-deleted row is still visible to its owner
-- (for recovery) and to staff (for support). Shared-link viewers stop seeing
-- it the moment it's soft-deleted.
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

create policy projects_owner_all
  on public.projects
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy projects_staff_select
  on public.projects
  for select
  using (public.is_staff());

create policy projects_shared_select
  on public.projects
  for select
  using (
    deleted_at is null
    and public.project_has_access(id, 'view')
  );

create policy projects_shared_update
  on public.projects
  for update
  using (
    deleted_at is null
    and public.project_has_access(id, 'edit')
  )
  with check (
    deleted_at is null
    and public.project_has_access(id, 'edit')
  );

-- ---------------------------------------------------------------------------
-- RLS for project_shares.
-- Only the project owner (or staff) can create/delete shares on their project.
-- Shared users can SELECT their own share row to know what they have.
-- ---------------------------------------------------------------------------
alter table public.project_shares enable row level security;

create policy project_shares_owner_all
  on public.project_shares
  for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_shares.project_id
        and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_shares.project_id
        and p.owner_id = auth.uid()
    )
    and created_by = auth.uid()
  );

create policy project_shares_staff_select
  on public.project_shares
  for select
  using (public.is_staff());

create policy project_shares_recipient_select
  on public.project_shares
  for select
  using (shared_with_user = auth.uid());
