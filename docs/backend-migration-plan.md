# Backend Migration Plan — Moving from localStorage to Supabase

**Status:** Planning draft — 2026-04-21. Companion to `mvp-spec.md` (premium-tier plan) and `narrative-content-plan.md` / `phase-1-data-model-sketch.md` (expanding data model). No code changes yet. §11 decisions resolved 2026-04-21.

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

## 7. Tier gating (strategic direction: free is generous, premium is relational)

A+ makes money selling lighting and winning design/build jobs. Subscription revenue from small contractors is low-margin, high-support, and competes with manufacturer-free tools already in the market. The tool's strategic job is **lead generation, brand authority, and market intelligence for A+** — not software revenue. So free gets nearly everything; A+ customer tier unlocks relational / business-utility perks.

| Feature | Free (any signup) | A+ customer | A+ staff |
|---|---|---|---|
| Sign in, profile, cross-device sync | ✓ | ✓ | ✓ |
| Unlimited cloud-saved projects | ✓ | ✓ | ✓ |
| Full narrative + drawing-schedule exports (A+ branded) | ✓ | ✓ | ✓ |
| Share project via read-only link | ✓ | ✓ | ✓ |
| Share with edit access (multi-user collab) | — | ✓ | ✓ |
| Unbranded / white-label PDF exports | — | ✓ | ✓ |
| Saved project templates (reusable bid types, national accounts) | — | ✓ | ✓ |
| Per-company default overrides on top of A+ central library | — | ✓ | ✓ |
| Market-intel aggregate dashboard (space types, manufacturers, sizes across all users) | — | — | ✓ |
| Curate / edit the central defaults library | — | — | ✓ |
| Grant customer tier to other users | — | — | ✓ |
| View any project (support access) | — | — | ✓ |

Branded output travels with free users' exports on purpose — it's the lead-gen mechanism. White-label is a premium benefit for A+ customers who don't want A+ branding on *their* deliverables (they're already a customer).

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
2. **Projects table + migration prompt.** Signed-in users get their project saved to the cloud on first edit. Anonymous users unchanged. All signed-in users (free or A+) get unlimited projects — the gate is at features, not capacity.
3. **Rooms + groups tables.** Full project structure in the DB. Client becomes a thin editor over the DB state. Zustand store still exists but hydrates from the DB instead of localStorage.
4. **Sharing.** Share-link generation, shared-with-me list, access-level enforcement.
5. **Premium features.** White-label PDF, multiple saved projects, customer-scoped defaults. Invite-code redemption UI. A+ staff admin UI for granting tiers.
6. **Everything else over time.** Stripe integration (if going paid), team accounts, audit history, comments, version snapshots, etc.

Each step is independently testable and independently rollback-able.

## 11. Resolved decisions (2026-04-21)

1. **Free-tier capacity: unlimited projects.** Strategic call: A+ makes money on lighting sales and design/build jobs, not software subscriptions. Free gets unlimited cloud-saved projects + cross-device sync + branded PDF exports + read-only share links. The product's job is lead generation, brand authority, and market intelligence; capping free would undercut all three. Premium (A+ customer tier) is relational — unlocks white-label exports, saved project templates, per-company defaults, and edit-level sharing.

2. **Invite codes: single-use default + reusable codes with a redemption cap.** Single-use (`APLUS-2026-AC5X` → redeems once) is the primary flow for granting A+ customer tier. Reusable codes with a max-redemptions counter (`TRADESHOW-SPRING-2026` good for 50 signups) exist for events and launches. Simple admin screen for A+ staff: purpose + expiry + cap → code to paste into email.

3. **Soft-delete projects; cascade hard-delete for children.** Projects get a `deleted_at` column so "oops" recovery is trivial. Rooms, functional groups, and per-project jsonb state hard-delete via `on delete cascade` when the project is hard-deleted (purge step). A separate admin/settings action lets users purge their own soft-deleted projects permanently.

4. **Library stays in code for v1 of the backend migration; plan to move to DB in Phase 2b/3.** Rationale: if A+ stays Michigan-only, code works fine forever. If A+ commits to multi-state + local amendments, the library *has* to move to the DB — otherwise every new jurisdiction bottlenecks on developer time. The `Requirement` and `SpaceType` types already work unchanged whether they come from TS constants or a DB query, so the migration is additive. Trigger: when A+ commits to a second jurisdiction, fast-follow with the library-in-DB work.

5. **A+ staff centrally curate the defaults library; A+ customers override per-company.** The `users` and `customer_space_type_defaults` tables (§5) are shaped for this. A+ staff edits propagate to all users automatically; customer-scoped rows override the central defaults for that customer's projects only. Free-tier users always see the central A+ library.

## 12. What this plan does NOT do

- Does not implement payments (Stripe/subscriptions). Invite codes for premium until volume justifies billing.
- Does not migrate space types / IES targets / requirements to the DB. Those stay as seeded code constants.
- Does not build a public API or webhooks. Pure app-to-DB via Supabase client.
- Does not implement real-time collab (multiple users editing the same project simultaneously). Supabase can do it, but it's its own feature scope.
