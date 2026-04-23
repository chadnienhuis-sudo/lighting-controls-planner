# Development Setup

How to get the Lighting Controls Planner running locally, including the
Supabase backend scaffolding introduced in
[`backend-migration-plan.md`](backend-migration-plan.md) §10 step 1.

This doc covers:

1. Prerequisites
2. Install the Supabase CLI
3. Run the local Supabase stack
4. Configure `.env.local` for Next.js
5. Apply / reset migrations
6. Seed data
7. Everyday Next.js dev loop

---

## 1. Prerequisites

- **Node.js** 20+ (matches the `@types/node` dev dep). Check with `node --version`.
- **npm** — the repo ships `package-lock.json`. Don't swap in pnpm/yarn; they'll rewrite the lockfile and cause drift.
- **Docker Desktop** running. The Supabase CLI spins up Postgres + Auth + Storage + Studio as local containers. On Windows, make sure WSL 2 integration is enabled for the distro you use.
- **Git**.

Clone and install:

```bash
git clone https://github.com/chadnienhuis-sudo/lighting-controls-planner
cd lighting-controls-planner
npm install
```

## 2. Install the Supabase CLI

The CLI is not bundled via npm; install per your platform.

- **Windows (Scoop)**
  ```powershell
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```
- **Windows (direct binary)** — download the latest `supabase_windows_amd64.tar.gz` from <https://github.com/supabase/cli/releases>, extract, and put the binary on your `PATH`.
- **macOS** — `brew install supabase/tap/supabase`
- **Linux** — download the tarball from the releases page, or use the install script linked there.

Confirm it's on your path:

```bash
supabase --version
```

## 3. Run the local Supabase stack

From the repo root:

```bash
supabase start
```

On first run, Docker pulls the Postgres / GoTrue / PostgREST / Studio images (few hundred MB). Subsequent starts are fast. Once it's up you get:

- Postgres on `localhost:54322`
- REST API + Auth on `http://127.0.0.1:54321`
- Supabase Studio (DB/UI browser) on <http://127.0.0.1:54323>
- Inbucket (local email inbox for magic-link testing) on <http://127.0.0.1:54324>

The command prints the API URL, anon key, service role key, and JWT secret. **Copy the three URL/key values** into your `.env.local` — they regenerate per stack but are stable across starts.

Stop the stack any time with:

```bash
supabase stop         # preserves DB contents between runs
supabase stop --no-backup  # full teardown
```

## 4. Configure `.env.local`

Copy the template and fill it in with the values `supabase start` printed:

```bash
cp .env.example .env.local
```

The three keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are documented in [`.env.example`](../.env.example). The service role key is server-only; never log it or expose it to the browser.

For staging / production, create a hosted Supabase project at <https://supabase.com>, open **Project Settings → API**, and copy the same three values from there into your deployment environment.

## 5. Apply / reset migrations

Migration files live in [`supabase/migrations/`](../supabase/migrations) and run in timestamp order. `supabase start` applies them all on first launch, so typically you don't run them manually.

Common operations:

- **Re-apply a migration you just edited** (wipes the DB — safe locally, destructive against a shared DB):
  ```bash
  supabase db reset
  ```
  Drops the local DB, re-applies every migration in order, then re-runs `supabase/seed.sql`.

- **Create a new migration** (edits the file with a timestamp prefix):
  ```bash
  supabase migration new <short_name>
  ```
  Writes `supabase/migrations/<timestamp>_<short_name>.sql` — hand-edit it to add DDL.

- **Push migrations to a remote project** (after linking):
  ```bash
  supabase link --project-ref <your-ref>
  supabase db push
  ```

Keep migrations additive: once a migration has shipped to any shared environment, don't edit it — write a new one to evolve the schema.

## 6. Seed data

[`supabase/seed.sql`](../supabase/seed.sql) runs after every `supabase db reset`. It's empty in Phase 1. Add starter data there when you need:

- A fixed `a_plus_staff` account for local admin flows.
- Starter `invite_codes` for testing the redemption UI when it lands.
- Fixture projects for manual QA.

Keep the SQL idempotent (use `on conflict do nothing` or equivalent) so repeated resets don't fail.

## 7. Next.js dev loop

```bash
npm run dev
```

Dev server runs on <http://localhost:3200> (see `package.json`). Make sure `supabase start` is running in another terminal before touching any backend-dependent UI so the browser client has something to call.

Other common scripts:

```bash
npm run lint    # eslint
npm run build   # production build — run before opening a PR if you changed non-trivial code
```

## Troubleshooting

- **`supabase start` hangs or fails** — confirm Docker Desktop is running and its WSL integration is enabled. On Windows, the first boot of Docker after login takes a minute; give it time.
- **Port conflicts** — another local Postgres or dev server on 54321–54324. Either stop the other service or adjust the ports in [`supabase/config.toml`](../supabase/config.toml).
- **Magic-link email didn't arrive** — in local dev, it lands in Inbucket (<http://127.0.0.1:54324>), not your real inbox. In production, check the Supabase dashboard's **Auth → Logs**.
- **"permission denied for table" errors** — the client is hitting an RLS policy. Re-read the relevant migration in `supabase/migrations/` and make sure the caller's tier / ownership matches the policy's `using` clause.
