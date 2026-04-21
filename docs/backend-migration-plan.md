# Backend Migration Plan — Moving from localStorage to Supabase

**Status:** Planning draft — 2026-04-21. Companion to `mvp-spec.md` (premium-tier plan) and `narrative-content-plan.md` / `phase-1-data-model-sketch.md` (expanding data model). No code changes yet.

---

## 1. Why this plan

The app today keeps every project in the browser (Zustand + localStorage). That was fine for MVP but blocks almost everything on the roadmap:

- No login → can't gate a premium tier behind "A+ customer"
- No cross-device sync → close laptop, open phone, your project is gone
- No sharing → can't send a customer/EE a link to a schedule
- No team accounts → A+ internal users can't collaborate on the same project
- No audit history → can't show "when was this narrative last updated"

A real backend unblocks all of that. This doc proposes the move in one coherent shot rather than retrofitting it piecemeal.

## 2. Why Supabase

Plain-language comparison:

| Option | What it is | Why / why not |
|---|---|---|
| **Supabase** *(recommended)* | Postgres + login + access rules + file storage, one product | Fastest path from localStorage to a real backend. Covers auth, DB, and file uploads (PDF exports, logos) with one vendor. Generous free tier. |
| Neon | Just Postgres, very fast | Great DB, but no auth — you'd need a second vendor (Clerk, Auth.js, etc.). More moving parts. |
| Firebase | Google's real-time DB + auth | Document store, not SQL. Harder to query complex relationships (project → rooms → groups → settings). |
| Convex / PlanetScale / etc. | Various niches | Overkill or awkward fit for a small SaaS with a premium gate. |
| Self-hosted Postgres | Maximum control | You become the DBA. No thanks. |

**Recommendation: Supabase.** A+ gets a vendor that handles 90% of backend needs out of the box. If we ever outgrow it, Supabase uses plain Postgres — migration to Neon or self-hosted is straightforward because the schema is portable.

## 3. What Supabase gives us

- **Auth** — email/password, magic links, Google sign-in, GitHub, etc. Pick any combination.
- **Postgres database** — full SQL, indexes, joins, foreign keys.
- **Row-level security (RLS)** — access rules written as SQL policies, enforced by the DB itself. A user's SELECT `SELECT * FROM projects` automatically only returns rows they own, regardless of what the client-side code tries.
- **File storage** — upload logos, PDF exports, attachments with the same auth.
- **Realtime subscriptions** — live project edits (optional, nice-to-have).
- **Edge functions** — run server-side code without a separate Node host (for premium-only logic, Stripe webhooks, etc.).

## 4. Auth strategy

### 4.1 Methods to enable

- **Email + magic link** (primary) — simplest for contractors/designers who won't remember another password. No password management complexity.
- **Google sign-in** (secondary) — many A+ customers will have Gmail or Google Workspace; one-click.
- **Email + password** — kept disabled unless needed; more support surface.

### 4.2 Account tiers

Everyone gets an account. Tier lives on the user record:

```
users
  id              uuid (Supabase auth.uid)
  email           text
  display_name    text
  company         text
  phone           text
  tier            text  CHECK (tier IN ('free', 'a_plus_customer', 'a_plus_staff'))
  tier_granted_at timestamptz
  tier_granted_by uuid references users(id)
```

- `free` — default for any new signup
- `a_plus_customer` — granted by A+ staff via admin UI or an invite code
- `a_plus_staff` — internal; full access, admin UI, grant/revoke customer tier

Tier controls which features the client shows AND what RLS policies allow.

### 4.3 Invite codes (vs. Stripe for premium)

For the near term, **invite codes are simpler than billing integration**. You share a code with a customer; they redeem it at signup; their tier flips to `a_plus_customer`. No payment processing, no Stripe webhooks, no cards on file.

If/when premium becomes paid rather than relationship-gated, Stripe can be bolted on without schema changes — add `subscription_id`, `subscription_status`, `current_period_end` to `users`.

## 5. Data schema

Translating the existing TypeScript types (`src/lib/types.ts`) to Postgres. Kept close to the in-memory shape so the migration is mostly JSON → table rows, not a rethink.

```sql
-- Top-level container
create table projects (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references users(id) on delete cascade,
  name            text not null,
  location        text,
  prepared_by     text,
  code_version    text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- The big chunks that don't benefit from normalization stay as jsonb for v1:
  outdoor_scope           jsonb not null default '{}'::jsonb,
  basis_of_design         jsonb not null default '{}'::jsonb,
  system_architecture     jsonb not null default '{}'::jsonb,
  commissioning           jsonb not null default '{}'::jsonb,
  section_overrides       jsonb not null default '{}'::jsonb,
  document_template       jsonb                            -- PDF editor state
);

create table rooms (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  number          text not null,
  name            text not null,
  size_sqft       numeric not null default 0,
  space_type_id   text not null,
  functional_group_id uuid references functional_groups(id) on delete set null,
  notes           text,
  overrides       jsonb not null default '{}'::jsonb,
  fixtures        jsonb not null default '[]'::jsonb,
  position        int not null default 0
);

create table functional_groups (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  label           text not null,
  description     text not null,
  space_type_id   text not null,
  has_windows     boolean,
  has_skylights   boolean,
  sidelight_over_150w boolean,
  toplight_over_150w  boolean,
  add1_selection  text,
  add2_selections text[] not null default '{}',
  add2_stacked    boolean not null default false,
  waivers         jsonb not null default '[]'::jsonb,
  additions       jsonb not null default '[]'::jsonb,
  designer_choices jsonb not null default '{}'::jsonb,
  control_settings jsonb not null default '{}'::jsonb,  -- ← the Phase 1 new field
  narrative_override text,
  position        int not null default 0
);

-- Sharing: optional link-based or user-based share tokens
create table project_shares (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  share_token     text unique,                     -- link-based viewing
  shared_with_user uuid references users(id),       -- or specific user grant
  access_level    text not null check (access_level in ('view','comment','edit')),
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  created_by      uuid not null references users(id)
);

-- Internal library overrides (premium) — A+ staff can override defaults per customer
create table customer_space_type_defaults (
  owner_id        uuid not null references users(id) on delete cascade,
  space_type_id   text not null,
  defaults        jsonb not null,                   -- GroupControlSettings-shaped
  primary key (owner_id, space_type_id)
);

-- Invite codes
create table invite_codes (
  code            text primary key,
  grants_tier     text not null check (grants_tier in ('a_plus_customer','a_plus_staff')),
  notes           text,
  redeemed_by     uuid references users(id),
  redeemed_at     timestamptz,
  expires_at      timestamptz,
  created_by      uuid not null references users(id),
  created_at      timestamptz not null default now()
);
```

Notes on the hybrid approach (columns + jsonb):
- Top-level identifiers, foreign keys, and fields we'd query by (label, name, `space_type_id`) become real columns.
- Free-form, polymorphic, or rarely-queried stuff (overrides, fixtures, waivers, additions, control settings) stays `jsonb` so the schema doesn't become a 50-column monster.
- Space types, IES targets, requirements, building templates stay as **seeded code constants** (not DB tables). They're library reference data, not per-project. Moving them to the DB is a Phase 3 decision.

## 6. Access rules (row-level security)

The actual enforcement is SQL policies on each table. Pseudocode:

```sql
-- projects
-- - owner can do anything
-- - shared users can do up to their access_level
-- - a_plus_staff can see everything (support access)
create policy projects_owner_full on projects
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy projects_shared_read on projects for select
  using (exists (
    select 1 from project_shares s
    where s.project_id = projects.id
      and (s.shared_with_user = auth.uid() or s.share_token = current_setting('request.share_token', true))
      and (s.expires_at is null or s.expires_at > now())
  ));

create policy projects_staff_read on projects for select
  using (exists (select 1 from users u where u.id = auth.uid() and u.tier = 'a_plus_staff'));
```

The pattern repeats for `rooms` and `functional_groups` (access follows the project's access level).

**Free vs. premium enforcement** lives in application code backed by the user's tier. RLS protects data ownership; it doesn't gate features.

## 7. Premium tier gating

What's "free" vs. "a_plus_customer" in the data model:

| Feature | Free | A+ customer | A+ staff |
|---|---|---|---|
| Create / edit 1 project in the browser | ✓ | ✓ | ✓ |
| Projects saved to the cloud | — (localStorage only) | ✓ | ✓ |
| Multiple saved projects | — (1 at a time) | unlimited | unlimited |
| Branded PDF export (A+ footer) | ✓ (default) | ✓ | ✓ |
| Unbranded / white-label PDF | — | ✓ | ✓ |
| Share via link | — | ✓ | ✓ |
| Custom default settings per user/company | — | ✓ | ✓ |
| Premium space-type library (future manufacturer product mapping) | — | ✓ | ✓ |
| Grant customer tier to other users | — | — | ✓ |
| View any project | — | — | ✓ (support) |

Default-tier users can still *use* the app fully — they just don't get cloud sync or sharing.

## 8. Migration from localStorage

What happens to projects currently in a user's browser? On first login (or when an anonymous user signs up):

1. Check localStorage for an existing project.
2. If found and the user is signed in, show a one-time prompt: "Save this project to your account?"
3. On confirm, POST the in-memory project to the backend → DB row creation → cleared from localStorage (or kept as a cache).
4. All subsequent edits go through the DB.

Anonymous users (no account) continue to use localStorage-only. It becomes the "free, ephemeral, try-it-out" path. Once they sign up, their project migrates in.

## 9. Deployment / env

- **Dev:** Supabase local development stack (`supabase start`) runs a local Postgres + auth + storage in Docker. Migrations live in `supabase/migrations/`. Seed data in `supabase/seed.sql`.
- **Staging:** Free-tier Supabase project, separate from production. Used for branch previews, integration testing.
- **Production:** Paid Supabase project once load warrants it. Custom domain for auth callbacks.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).

## 10. Phased rollout

Each slice is a shippable step:

1. **Auth + users table only.** Add sign in / sign up UI. Nothing else changes — app still uses localStorage. User's email shows in the nav bar. De-risks auth integration before any data moves.
2. **Projects table + migration prompt.** Signed-in users get their project saved to the cloud on first edit. Anonymous users unchanged. Free-tier user: 1 project cap; exceeding it requires premium or deleting the old one.
3. **Rooms + groups tables.** Full project structure in the DB. Client becomes a thin editor over the DB state. Zustand store still exists but hydrates from the DB instead of localStorage.
4. **Sharing.** Share-link generation, shared-with-me list, access-level enforcement.
5. **Premium features.** White-label PDF, multiple saved projects, customer-scoped defaults. Invite-code redemption UI. A+ staff admin UI for granting tiers.
6. **Everything else over time.** Stripe integration (if going paid), team accounts, audit history, comments, version snapshots, etc.

Each step is independently testable and independently rollback-able.

## 11. Open decisions

1. **Free-tier cloud sync — zero or one project?** One project in the cloud (even free) makes the product feel complete; zero (localStorage only) makes the premium upgrade more meaningful. Recommendation: **one** cloud project free; unlimited for A+ customers.
2. **Invite code scope — single-use or reusable?** Single-use is safer (one code = one seat); reusable "A+ launch 2026" style codes are easier to distribute. Recommendation: **single-use by default**, reusable codes with max-redemptions counter as a future option.
3. **Hard delete vs. soft delete.** Soft-delete with `deleted_at` makes "oops" recovery trivial; hard-delete is simpler. Recommendation: **soft-delete** for projects, hard for everything else (rooms, groups — always cascaded from project).
4. **Library data in DB or code?** Space types / requirements / IES targets are seeded constants today. Moving them to DB tables unlocks admin-UI editing but adds migration complexity for every library change. Recommendation: **keep as code constants for v1**; revisit when the library needs frequent non-developer edits.
5. **Seeded vs. curated defaults:** ties back to Phase 1 Q4 — is the space-type default lookup reviewed-by-Chad or generic? With a backend, A+ can curate *centrally* and everyone benefits automatically. Recommendation: **A+ staff curate a shared default library**; individual customers override per-company in `customer_space_type_defaults`.

## 12. What this plan does NOT do

- Does not implement payments (Stripe/subscriptions). Invite codes for premium until volume justifies billing.
- Does not migrate space types / IES targets / requirements to the DB. Those stay as seeded code constants.
- Does not build a public API or webhooks. Pure app-to-DB via Supabase client.
- Does not implement real-time collab (multiple users editing the same project simultaneously). Supabase can do it, but it's its own feature scope.
