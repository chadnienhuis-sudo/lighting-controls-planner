# Phase 1 — Data Model Sketch: Per-Group Control Settings

**Status:** Planning draft — 2026-04-21. Companion to `narrative-content-plan.md` §5 (proposed data-model additions) and §7 (phased roadmap). No code changes yet.

---

## 1. Goal

Phase 1 of the narrative-content-plan roadmap: unblock ASHRAE 90.1's "recommended settings" turnover requirement by surfacing per-group setpoints (timeouts, occupied/unoccupied levels, sensor tech, schedule times, UI capabilities) on `FunctionalGroup`. Same data also feeds the Phase 2 drawing-schedule matrix — one data change, two payoffs.

Scope of this doc: types, resolution rules, defaults lookup, UI touchpoints, and submittal-PDF integration. Drawing-schedule renderer is **out of scope** (Phase 2).

## 2. Proposed types

### 2.1 New nested object on `FunctionalGroup`

```ts
// src/lib/types.ts — new interface
export interface GroupControlSettings {
  // Occupancy sensor
  /** "vacancy" = manual-on + auto-off (§9.4.1.1(b)); "occupancy" = auto-on
   *  + auto-off; "partial-auto-on" = §9.4.1.1(c). Maps to existing
   *  add1Selection but exposed here for schedule-matrix readability. */
  occMode?: "vacancy" | "occupancy" | "partial-auto-on";
  sensorTech?: SensorType;                // reuse existing type
  /** Code-capped at 20 min in most spaces; 30 min in circulation. */
  timeoutMin?: number;
  occupiedLevelPct?: number;              // 0–100, default 100
  unoccupiedLevelPct?: number | null;     // null = full-off; number = partial-off
  fadeRateSec?: number;

  // Time clock
  /** "07:00", "DUSK", or undefined for no schedule. */
  scheduledOn?: string;
  scheduledOff?: string;
  overrideSwitch?: boolean;

  // Wall station capabilities — surface on drawing schedule matrix
  manualOnOff?: boolean;
  manualDimming?: boolean;
  keySwitch?: boolean;
  sceneControl?: boolean;
  graphicTouchscreen?: boolean;

  // Trims & daylight
  highEndTrimPct?: number;
  lowEndTrimPct?: number;
  daylightSetpointFc?: number;

  // Networking / other columns
  networked?: boolean;
  /** Notes column on drawing schedule; distinct from narrativeOverride. */
  scheduleNotes?: string;
}
```

### 2.2 Extension to `FunctionalGroup`

```ts
export interface FunctionalGroup {
  // …existing fields unchanged…
  /** Per-group control settings — user overrides of space-type seeded
   *  defaults. Read via `resolveGroupSettings(group)`, which layers the
   *  group's overrides on top of the space-type defaults. */
  controlSettings?: GroupControlSettings;
}
```

All fields optional. An undefined field means "no override — use the seeded default for this group's space type."

### 2.3 Resolution pattern

```ts
// src/lib/functional-groups.ts — new helper
export interface ResolvedGroupSettings extends Required<GroupControlSettings> {
  /** Which fields came from the space-type default vs. a group override.
   *  Drives the muted "suggested" vs. explicit styling in the editor + PDF. */
  sourceMap: Record<keyof GroupControlSettings, "default" | "override">;
}

export function resolveGroupSettings(group: FunctionalGroup): ResolvedGroupSettings;
```

Layering order (highest wins):
1. `group.controlSettings.X` — explicit override
2. `defaultsForSpaceType(group.spaceTypeId).X` — seeded default
3. Hard fallback (e.g., `timeoutMin = 10`, `occupiedLevelPct = 100`)

Mirrors the existing room→group inheritance pattern (`resolveRoomSettings`).

## 3. New defaults lookup

### 3.1 File

`src/data/control-settings-defaults.ts` — new file, sibling to `space-types.ts`. Keeps `SpaceType` focused on code-table data; keeps defaults separately editable.

### 3.2 Shape

Category-level baseline with per-id overrides — most space types inherit from their category, but a handful (stairwells, 24/7 corridors, parking garages) need bilevel-specific values.

```ts
import type { GroupControlSettings, SpaceCategory } from "@/lib/types";

type DefaultsKey = SpaceCategory | `id:${string}`;

/** Baseline per SpaceCategory. ID-level entries override the category. */
export const CONTROL_SETTINGS_DEFAULTS: Record<DefaultsKey, Partial<GroupControlSettings>> = {
  // Category baselines
  office:    { occMode: "vacancy", sensorTech: "dual-tech", timeoutMin: 10, occupiedLevelPct: 100, unoccupiedLevelPct: null, manualOnOff: true, manualDimming: true },
  conference:{ occMode: "vacancy", sensorTech: "dual-tech", timeoutMin: 10, occupiedLevelPct: 100, unoccupiedLevelPct: null, manualOnOff: true, manualDimming: true, sceneControl: true },
  classroom: { occMode: "vacancy", sensorTech: "dual-tech", timeoutMin: 10, occupiedLevelPct: 100, unoccupiedLevelPct: null, manualOnOff: true, manualDimming: true },
  corridor:  { occMode: "occupancy", sensorTech: "dual-tech", timeoutMin: 15, occupiedLevelPct: 100, unoccupiedLevelPct: null, manualOnOff: false, manualDimming: false },
  stairwell: { occMode: "occupancy", sensorTech: "dual-tech", timeoutMin: 15, occupiedLevelPct: 100, unoccupiedLevelPct: 50,  manualOnOff: false, manualDimming: false, keySwitch: true },
  restroom:  { occMode: "vacancy", sensorTech: "ultrasonic", timeoutMin: 10, occupiedLevelPct: 100, unoccupiedLevelPct: null },
  breakroom: { occMode: "vacancy", sensorTech: "dual-tech", timeoutMin: 10, occupiedLevelPct: 100, unoccupiedLevelPct: null, manualOnOff: true, manualDimming: true },
  lobby:     { occMode: "occupancy", timeoutMin: 10, occupiedLevelPct: 100, unoccupiedLevelPct: 30, scheduledOn: "07:00", scheduledOff: "18:00", manualOnOff: true },
  storage:   { occMode: "vacancy", sensorTech: "pir", timeoutMin: 10, occupiedLevelPct: 100, unoccupiedLevelPct: null },
  warehouse: { occMode: "occupancy", sensorTech: "pir", timeoutMin: 15, occupiedLevelPct: 100, unoccupiedLevelPct: 50 },
  // …other categories…

  // ID-level overrides (only where a specific space type diverges)
  "id:corridor_hospital_24_7": { unoccupiedLevelPct: 30 },      // 24/7 reduction, not full-off
  "id:parking_garage":         { unoccupiedLevelPct: 30, occMode: "occupancy" },
  // …
};

export function defaultsForSpaceType(spaceTypeId: string): GroupControlSettings;
```

Resolution: lookup `id:<spaceTypeId>` first, then fall back to the space type's category, then to the hard fallback inside `resolveGroupSettings`.

## 4. UI surface

### 4.1 Group editor

Add a "Control Settings" panel to the existing group editor (wherever `add1Selection` / `add2Selections` / `designerChoices` are edited today). Fields render seeded defaults with the same muted "(from space type default)" treatment the tool already uses for room→group inheritance.

When the user edits a field, the value writes to `group.controlSettings.<field>` and switches to the explicit style. A "Reset to default" button clears the override.

Grouping in the UI: **Occupancy · Schedule · User controls · Trims/Daylight · Other**.

### 4.2 Feedback-loop consideration

One concern: too many fields can overwhelm a design-aid user. Most groups will never touch 80% of these fields. Mitigation: progressive disclosure — only "Occupancy" expanded by default; others collapsed with badges showing "3 defaults seeded" etc. Users who need precision click through.

## 5. Submittal PDF integration

Adds a **Recommended settings** block inside each `GroupSequence` in the submittal PDF. Compact — fits below the existing requirements table.

Rendered shape (per group):

```
Recommended settings
  Occupancy: Vacancy mode · Dual-tech · 10 min timeout · 100% on · off at vacancy
  Schedule:  —  (no schedule)
  User:      Manual on/off · Manual dimming
  Trim:      High-end 100% · Low-end 10%
```

Lines whose values all came from defaults render muted; lines with any override render normal weight. This gives the AHJ/owner visibility into which settings are "we trust the defaults" vs. "we made a deliberate choice."

Implementation: new component in `controls-narrative-pdf.tsx`, drops into `GroupSequence` right after the footnotes block. Reads `resolveGroupSettings(group)`.

## 6. What Phase 1 does NOT include

- Drawing-schedule matrix renderer (Phase 2).
- Standalone Arch-D drawing-schedule output (Phase 2).
- Functional testing checklist + recalibration schedule (Phase 3).
- OPR section / user interfaces / emergency / night lighting (Phase 4).
- ADR / tunable white / integration points (Phase 5).

Intentional: Phase 1 ships a pure data + submittal-text change. No new page sizes, no new template section types, no matrix logic. Low-risk, high-value.

## 7. Back-compat and migration

- `controlSettings` is optional on `FunctionalGroup` — projects in `localStorage` without the field resolve 100% from space-type defaults. No migration needed.
- Existing `commissioning.defaultVacancyTimerMin` becomes a **project-wide override** at the lowest-priority position between the space-type default and the hard fallback. Documented in the resolver. Later we might deprecate it once `controlSettings` covers the ground.
- Existing `designerChoices.sensorType` is redundant with `controlSettings.sensorTech`. Strategy: during resolution, read `designerChoices.sensorType` as a secondary source if `controlSettings.sensorTech` is unset. Don't delete `designerChoices` — other fields (`sensorMounting`, `dimmingProtocol`, `plugLoadStrategy`) are still useful.

## 8. Phase 1 work breakdown

Rough slices, each independently shippable:

1. **Types + resolver** — add `GroupControlSettings`, extend `FunctionalGroup`, add `resolveGroupSettings` helper. No UI or rendering changes. Write tests.
2. **Defaults data** — create `control-settings-defaults.ts` with category baselines + key ID overrides. Write a coverage test that every `SpaceCategory` has a baseline.
3. **Group editor UI** — new "Control Settings" panel with progressive disclosure. Inherits the existing "(inherited)" muted styling.
4. **Submittal PDF block** — add the "Recommended settings" block to `GroupSequence`. Respect muted-vs-explicit styling.
5. **Narrative text weaving** — update the auto-generated per-group sequence paragraph in `narrative.ts` to reference the resolved values (e.g., "turns off 10 minutes after all occupants leave" uses the actual `timeoutMin`). This closes the loop where today the paragraph is hardcoded-ish.

## 9. Open questions to resolve before coding

1. **Field count vs. user friction:** do we ship all ~20 fields in Phase 1, or start with a thinner subset (occupancy + schedule + manual on/off/dimming) and expand in Phase 2? I'd vote for thin Phase 1 — ~8 fields covers 90% of what the submittal needs; Phase 2 expands for the drawing schedule.
2. **Where does the UI live?** The current group editor lives in [workspace-shell.tsx](src/components/planner/workspace-shell.tsx) and nearby — do we add a new tab, new modal, or expand inline? Probably inline with progressive disclosure, but worth a look at the current group-edit surface.
3. **Narrative text rewrite scope: deferred to Phase 3.** Resolved 2026-04-23. Phase 1 ships the "Recommended settings" block in the submittal and leaves the auto-generated sequence paragraph alone. The two will be slightly redundant (settings appear once as a block, once as generic prose), which is an acceptable trade for keeping `narrative.ts` out of scope during the backend migration. When Phase 3's functional-testing work materially changes the paragraph anyway, fold the resolved-setpoint weaving into that pass.
4. **Hard-coded space-type defaults table: ship a Chad-reviewed list.** Resolved 2026-04-23. The generic-template path undercuts the design-aid positioning (the whole point is that the tool encodes A+ taste on sensible defaults). The curation pass happens during the Phase 1 "defaults data" PR (§8 slice 2): I draft category baselines + known ID-level overrides from the space-type table we already have, Chad reviews and adjusts in-PR, then merge.
