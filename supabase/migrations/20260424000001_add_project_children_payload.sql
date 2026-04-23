-- Transitional columns so signed-in users' full projects (including the room
-- and functional-group arrays) can round-trip to the DB before the dedicated
-- rooms / functional_groups tables land in §10 step 3.
--
-- These two columns are TEMPORARY. Step 3's migration reads them, normalizes
-- the contents into the real tables, and drops the columns. Anything added
-- to the Project TypeScript type that isn't already a real column on
-- public.projects should ride in here until we make up our mind about the
-- final schema.

alter table public.projects
  add column rooms_json jsonb not null default '[]'::jsonb,
  add column functional_groups_json jsonb not null default '[]'::jsonb;

comment on column public.projects.rooms_json is
  'Transitional jsonb array of Room objects. Normalized into public.rooms in §10 step 3.';

comment on column public.projects.functional_groups_json is
  'Transitional jsonb array of FunctionalGroup objects. Normalized into public.functional_groups in §10 step 3.';
