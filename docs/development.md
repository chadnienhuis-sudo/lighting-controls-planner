# Development Setup

How to get the Lighting Controls Planner running locally, including the
Supabase backend scaffolded in
[`backend-migration-plan.md`](backend-migration-plan.md) §10 step 1.

This doc covers:

1. Prerequisites
2. Pick your Supabase workflow
3. **Option A:** Hosted Supabase dashboard (recommended — no Docker, no CLI)
4. **Option B:** Local Supabase stack via the CLI (Docker required)
5. Configure `.env.local`
6. Running migrations going forward
7. Seed data
8. Next.js dev loop
9. Vercel deployment notes
10. Troubleshooting

---

## 1. Prerequisites

- **Node.js** 20+ (matches the `@types/node` dev dep). Check with `node --version`.
- **npm** — the repo ships `package-lock.json`. Don't swap in pnpm/yarn; they'll rewrite the lockfile and cause drift.
- **Git**.

**Docker Desktop** and the **Supabase CLI** are only needed if you choose Option B (fully local backend). Skip them for the recommended hosted workflow.

Clone and install:

```bash
git clone https://github.com/chadnienhuis-sudo/lighting-controls-planner
cd lighting-controls-planner
npm install
```

## 2. Pick your Supabase workflow

|  | A · Hosted dashboard | B · Local CLI |
|---|---|---|
| Setup effort | ~5 min | ~20 min |
| Needs Docker + CLI | No | Yes |
| Offline dev | No | Yes |
| Magic-link emails | Real inbox | Inbucket at `localhost:54324` |
| `supabase db reset` | Manual (drop tables / recreate project) | One command |
| Match to production | Same infra | Close but not identical |
| Cost | Free tier is plenty for dev | Free |

**Default to Option A.** This is what this repo is actually set up for — the dev Supabase project lives at <https://supabase.com/dashboard>, and the `.env.local` values are read straight from there. Pick Option B only if you need offline development or want a sandbox where you can run `supabase db reset` freely while prototyping migrations.

## 3. Option A: Hosted Supabase dashboard (recommended)

### 3.1 Create a dev Supabase project

One-time setup, only needed for a fresh environment (the project already exists for this repo; ask Chad for access credentials instead of creating a new one).

1. Go to <https://supabase.com/dashboard> and sign in (Google sign-in is simplest).
2. Click **New project**. Fill in:
   - **Name**: `lighting-controls-planner-dev`
   - **Database Password**: click **Generate password**, then **copy** it to your password manager. You won't use it daily but you need it to reset the DB or connect direct.
   - **Region**: closest to you (`East US (North Virginia)` is a good default).
   - **Plan**: Free.
3. Click **Create new project** and wait ~2 min for provisioning.

### 3.2 Run migrations via the SQL Editor

All three migrations in [`supabase/migrations/`](../supabase/migrations) need to be applied in timestamp order. The CLI isn't involved; you paste each file into the dashboard.

1. In the left sidebar, click **SQL Editor**.
2. Click **+ New query**.
3. Open `supabase/migrations/20260423120001_init_users.sql` in your code editor, select all, copy, paste into the SQL Editor, click **Run**. Expect `Success. No rows returned.`.
4. Repeat for `20260423120002_init_projects.sql` in a new query tab.
5. Repeat for `20260423120003_init_invite_codes.sql` in a new query tab.

**Going forward** — any new migration follows the same flow:

1. Add the `.sql` file under `supabase/migrations/` with a fresh timestamp prefix (`YYYYMMDDHHMMSS_short_name.sql`).
2. Paste it into the SQL Editor → **Run**.
3. Commit the file to git.

Keep migrations additive: once one has been applied against the hosted DB or merged to `main`, don't edit it — write a new migration to evolve the schema. The repo files are the **reference copy**; the hosted DB is the authoritative live state. If they drift, re-apply from the repo.

### 3.3 Get your env var values

1. In the left sidebar, click the **⚙️ gear icon** (Project Settings) at the bottom.
2. Click **API**.
3. Copy three values:
   - **Project URL** — `https://<project-ref>.supabase.co`
   - **`anon` `public`** key — long string starting with `eyJ...`
   - **`service_role` `secret`** key — click **Reveal** first. Also starts with `eyJ...`. Never share or commit this; it's the master key that bypasses RLS.

Drop them into your `.env.local` per [§5](#5-configure-envlocal).

### 3.4 Verify the schema

After migrations run, click **Table Editor** in the sidebar. You should see:

- `users`
- `projects`
- `project_shares`
- `invite_codes`

And under **Database → Functions**:

- `is_staff`
- `project_has_access`
- `handle_new_auth_user`
- `touch_updated_at`
- `prevent_tier_self_escalation`

If any are missing, the corresponding migration didn't run cleanly — scroll back through the SQL Editor tabs for the error.

## 4. Option B: Local Supabase stack via the CLI

Use this only if you need offline dev or a throwaway sandbox. Most contributors should stick with Option A.

### 4.1 Install Docker + the Supabase CLI

- **Docker Desktop** running. On Windows, make sure WSL 2 integration is enabled for the distro you use.
- **Supabase CLI** (not bundled via npm; install per platform):
  - **Windows (Scoop)**
    ```powershell
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
    scoop install supabase
    ```
  - **Windows (direct binary)** — download `supabase_windows_amd64.tar.gz` from <https://github.com/supabase/cli/releases>, extract, add to `PATH`.
  - **macOS** — `brew install supabase/tap/supabase`
  - **Linux** — tarball from the releases page, or the install script linked there.

Confirm:

```bash
supabase --version
```

### 4.2 Start the stack

From the repo root:

```bash
supabase start
```

First run pulls the Postgres / GoTrue / PostgREST / Studio images (few hundred MB). Once up:

- Postgres on `localhost:54322`
- REST API + Auth on `http://127.0.0.1:54321`
- Supabase Studio on <http://127.0.0.1:54323>
- Inbucket (local email inbox for magic-link testing) on <http://127.0.0.1:54324>

Copy the printed URL + anon key + service role key into `.env.local`.

Stop with `supabase stop` (preserves DB) or `supabase stop --no-backup` (full teardown).

### 4.3 Migration commands

- **Replay all migrations from scratch**: `supabase db reset` — drops the local DB, re-applies everything in `supabase/migrations/`, runs `supabase/seed.sql`.
- **New migration**: `supabase migration new <short_name>` — writes `supabase/migrations/<timestamp>_<short_name>.sql`.
- **Push local migrations to a hosted project** (after `supabase link --project-ref <ref>`): `supabase db push`.

## 5. Configure `.env.local`

Copy the template:

```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in the three values from either Option A §3.3 or Option B §4.2:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

The service role key is server-only; never log it or expose it to the browser. [`.env.example`](../.env.example) documents the same three vars.

## 6. Running migrations going forward

Which path you use depends on which workflow you chose:

- **Option A (hosted)** — paste the new `.sql` into the SQL Editor and click Run (see [§3.2](#32-run-migrations-via-the-sql-editor)).
- **Option B (local CLI)** — `supabase migration new` to scaffold, `supabase db reset` to replay.

In both cases, commit the migration file so the repo tracks schema history. The repo is the reference; the hosted DB is the live authority in Option A.

## 7. Seed data

[`supabase/seed.sql`](../supabase/seed.sql) is empty in Phase 1. Add starter data there when you need:

- A fixed `a_plus_staff` account for local admin flows.
- Starter `invite_codes` for testing the redemption UI when it lands.
- Fixture projects for manual QA.

Keep the SQL idempotent (`on conflict do nothing` or equivalent) so repeated resets don't fail.

**Applying seed data in Option A** — `seed.sql` isn't auto-run by the dashboard; paste its contents into the SQL Editor by hand after migrations if you want the starter rows. In Option B, `supabase db reset` re-runs it every time.

## 8. Next.js dev loop

```bash
npm run dev
```

Dev server runs on <http://localhost:3200> (see `package.json`). The hosted Supabase project doesn't need to be "running" — it's always on. (For Option B, keep `supabase start` going in another terminal.)

Other common scripts:

```bash
npm run lint    # eslint
npm run build   # production build — matches what Vercel runs
```

### Sign-in routes

Phase-1 auth UI (magic-link only) lives at:

- `/sign-in` — the entry page linked from the header and the landing page.
- `/auth/callback` — the landing URL Supabase redirects to after a user clicks their magic-link email. A client-side handler completes the session and forwards to the home page (or back to `/sign-in?error=...` if the link was bad).

## 9. Vercel deployment notes

Main branch auto-deploys to <https://lighting-controls-planner.vercel.app>. Pull requests get their own preview URLs.

- **Env vars** — set in **Vercel Project Settings → Environment Variables** for all three environments (Production, Preview, Development). Use the same three values as `.env.local`.
- **Single Supabase project for now** — localhost, Vercel previews, and production all talk to the same hosted Supabase dev project. Fine for MVP / trial-with-team volumes. Split into `-prod` and `-dev` Supabase projects once real customer data lands or user count justifies the overhead.
- **Auth redirect URLs** — the sign-in UI points magic-link callbacks at `${window.location.origin}/auth/callback`. Every origin that serves the app must be allow-listed on the Supabase dashboard under **Authentication → URL Configuration → Redirect URLs**:
  - `http://localhost:3200/**` (local dev)
  - `https://lighting-controls-planner.vercel.app/**` (production)
  - `https://lighting-controls-planner-*.vercel.app/**` (Vercel PR previews — each branch gets its own subdomain)

  Without these, Supabase drops the callback and the user lands on a Supabase-hosted error page instead of getting signed in.

## 10. Troubleshooting

- **"permission denied for table" errors** — the client is hitting an RLS policy. Re-read the relevant migration in `supabase/migrations/` and make sure the caller's tier / ownership matches the policy's `using` clause.
- **Magic-link email didn't arrive** —
  - Option A: check the **Authentication → Logs** tab in the Supabase dashboard. Real emails go to real inboxes; the Supabase free tier has a modest daily cap.
  - Option B: emails land in Inbucket at <http://127.0.0.1:54324>, not your real inbox.
- **Migration fails in SQL Editor** — usually because an earlier migration didn't run (later migrations depend on earlier tables/functions). Re-apply them in order from `20260423120001` onward. If you need to start fresh, drop all tables + functions first (SQL Editor: `drop schema public cascade; create schema public;` — destructive, wipes all rows) and re-run the migrations.
- **(Option B) `supabase start` hangs or fails** — confirm Docker Desktop is running and WSL 2 integration is enabled. First boot after Windows login takes a minute.
- **(Option B) Port conflicts** — another local service on 54321–54324. Either stop it or edit ports in [`supabase/config.toml`](../supabase/config.toml).
