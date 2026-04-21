# Narrative Content Plan — What Belongs in the Output

**Status:** Planning draft — 2026-04-21. Research synthesis for deciding what content the tool should generate, across two output formats. Companion to `mvp-spec.md`.

---

## 1. Why this plan

The MVP produces a multi-page narrative PDF. Two things have shifted the target:

1. **LP-16-22 exists as the governing standard.** ANSI/IES LP-16-22 is the authoritative answer to "what belongs in a lighting control narrative." It splits the document into a CIN (general intent, owner-facing) and an SOO (specific, contractually enforceable). Most of what we output today is already on the CIN side; the gap is on the SOO side, where settings and functional tests live.
2. **A second deliverable is needed.** The user needs an output that pastes onto a lighting drawing — the "Electrical Lighting Controls Schedule" sheet that shows up as E-601 or similar. This is a compact matrix plus keyed paragraphs, not a paginated submittal document.

This plan reconciles both targets against one data model.

## 2. The two deliverables

| | Submittal PDF (today) | Drawing Schedule (new) |
|---|---|---|
| **Audience** | Owner, AHJ, GC, commissioning agent | Electrical engineer, installer |
| **Format** | Letter portrait, multi-page, full prose | Landscape Tabloid / Arch-D, single sheet |
| **Structure** | Cover + narrative sections + room schedule + glossary | Matrix (rows = groups, cols = strategies) + keyed SOO paragraphs below |
| **Emphasis** | "What we designed and why" | "Exactly how to program each space" |
| **LP-16 role** | Primarily the **CIN** | Primarily the **SOO** |

Both deliverables read the same project data. The drawing schedule is a new output format, not a replacement.

## 3. Content requirements — synthesized

Combining LP-16-22, ASHRAE 90.1 §9.4.3 turnover, IECC, the LCA Design Express template, and the E-601 example provided by the user.

### 3.1 Required by energy code (ASHRAE 90.1 within 90 days of acceptance)

- Narrative describing each control system's operation **with recommended settings**
- **Recalibration / inspection schedule**
- O&M manuals
- Equipment warranties
- As-built drawings of lighting + controls

### 3.2 LP-16-22 CIN elements (required)

1. General description of project goals
2. Control strategies that satisfy the goals
3. Description of the lighting control system
4. Basic SOO per space type

### 3.3 LP-16-22 topics to address (best-practice)

Overall goals · project/system scale · control strategies · system topology · integration with other building systems · user interfaces and control methods · sensor specifications · scene controls · settings guidance · emergency lighting · night lighting.

### 3.4 Drawing-schedule columns (from E-601)

Matrix columns required to match the industry-standard on-sheet format:

| Column group | Fields |
|---|---|
| Occupancy sensor | Vacancy mode (manual-on) · Occupancy mode (auto-on) · Sensor timeout (min) · Dual technology · Occupied level (%) · Unoccupied level (%) |
| Time clock | Schedule on time · Schedule off time · Schedule override switch |
| Wall switch | Manual on/off · Manual dimming · Key switch · Scene control · Graphic touchscreen |
| Other | Exterior location · Plug load control (§8.4.2) · Networked · Notes |
| Key | A, B, C, … matching narrative paragraphs below the matrix |

Plus a keyed paragraph per space type beneath the matrix, same keys (A, B, C, …).

## 4. Gap analysis — current tool vs the two deliverables

### 4.1 Already covered well

Cover · disclaimer · prepared-by · project facts · Basis of Design · System Architecture · per-group sequence prose · requirement-by-requirement "how met" · room schedule · outdoor (§9.4.2) · glossary · branded footer · revision watermarks.

### 4.2 Content gaps (submittal PDF)

| Gap | Driver | Priority |
|---|---|---|
| Recommended settings table (per group: timeout, occupied %, unoccupied %, sensor tech, fade, trim, photocell target) | ASHRAE 90.1 explicit | **High** |
| Recalibration / inspection schedule | ASHRAE 90.1 explicit | **High** |
| Functional testing checklist (illuminance at 100 / tuned / daylit; timeout verification; daylight-reduction verification) | ASHRAE §9.4.3 + commissioning best-practice | **High** |
| Owner Project Requirements / project goals section (distinct from code-based Basis of Design) | LP-16 CIN element #1 | Medium |
| User interfaces & control methods (who drives the system: wall stations, keypads, app, scene recall) | LP-16 topic | Medium |
| Emergency / egress SOO (UL 924, fail-on behavior) | LP-16 topic | Medium |
| Night / after-hours behavior | LP-16 topic | Medium |
| Sensor specs (PIR/ultrasonic/dual-tech, coverage, mounting) | LP-16 topic | Medium |
| Demand response (ADR) behavior | LP-16 topic; CA mandatory, growing elsewhere | Low (project-dependent) |
| Tunable white / scene presets / color control | LP-16 topic | Low (project-dependent) |
| Integration points (shades, AV, HVAC occupancy share) | LP-16 topic | Low |

### 4.3 Structural gaps (drawing schedule)

| Gap | Notes |
|---|---|
| Per-group setpoint fields on the data model | Occ timeout (min), occupied %, unoccupied %, sensor technology, schedule on/off. Today only a project-wide `defaultVacancyTimerMin` exists in `commissioning`. |
| Per-group control-method flags | Key switch, scene control, graphic touchscreen, dual-tech, networked, manual dimming vs manual on/off. Not modeled. |
| New renderer: matrix + keyed paragraphs | Separate PDF `section` kind or a parallel document template. Landscape sheet size. |
| Title block strategy | Decide whether to emit a full drawing title block (revisions / sheet number / drawn by) or ship "naked" so the EE drops the content into their own titleblock. |

## 5. Proposed data-model additions

Additions to `FunctionalGroup` (or a nested `settings` object) — these feed both the submittal's "recommended settings" table *and* the schedule's matrix columns:

```ts
interface GroupControlSettings {
  // Occupancy sensor
  occMode: "vacancy" | "occupancy" | "partial-auto";  // manual-on vs auto-on vs partial
  sensorTech: "pir" | "ultrasonic" | "dual-tech";
  timeoutMin: number;                                   // default 10; code-capped at 20 (30 in circulation)
  occupiedLevelPct: number;                             // default 100
  unoccupiedLevelPct: number | null;                    // null = full-off; 0–50 for partial-off
  fadeRateSec?: number;

  // Time clock / schedule
  scheduledOn?: string;   // "07:00" or "DUSK"
  scheduledOff?: string;  // "18:00" or "DAWN"
  overrideSwitch?: boolean;

  // Wall station capabilities
  manualOnOff: boolean;
  manualDimming: boolean;
  keySwitch?: boolean;
  sceneControl?: boolean;
  graphicTouchscreen?: boolean;

  // Trims & daylight setpoints
  highEndTrimPct?: number;
  lowEndTrimPct?: number;
  daylightSetpointFc?: number;

  // Transport / networking
  networked?: boolean;
  plugLoadControl?: boolean;   // mirrors existing §8.4.2 logic

  // Notes column on schedule
  scheduleNotes?: string;
}
```

Most fields are optional; sensible defaults come from the space type. The tool should seed these when a group is created, then let the user override.

Project-level additions (under `commissioning`):

- `recalibrationIntervalMonths: number` (default 12)
- `functionalTestProcedure: string[]` (list of test steps; seeded from a library)

## 6. New output format — Drawing Schedule

A new `SectionKind` or sibling document template:

```ts
type DrawingScheduleOptions = {
  pageSize: "TABLOID" | "ARCH-D";    // 11×17 or 24×36
  orientation: "landscape";
  includeTitleBlock: boolean;        // when false, emit content-only for paste into EE titleblock
  keyStyle: "alpha" | "alpha-num";   // A, B, C… vs A, B, …, AA, BB (E-601 uses alpha-num for overflow)
  groupOrder: "label" | "spaceType"; // letter order vs grouped by space type parent
};
```

Layout:

1. **Header strip** (optional) — project name, code version, date, revision.
2. **Matrix block** — rows = enabled functional groups, columns = the 3.4 matrix. X-marks for booleans, numbers for setpoints, blanks where N/A. Top header uses column groups (Occupancy Sensor · Time Clock · Wall Switch · Other) matching E-601.
3. **Keyed SOO paragraphs** — below the matrix, one paragraph per group, headed `A. BREAK ROOM` style. Body is the existing `groupNarrative().sequenceParagraph` tightened for drawing density.
4. **Footnotes** — any `[1]/[2]` footnotes already modeled on requirement lines carry through.

Reuses: `group.label`, `groupNarrative()`, requirement "how met" text — all exist. New work is (a) setpoint fields, (b) the matrix renderer, (c) landscape page + optional title block.

## 7. Phased roadmap

**Phase 1 — Unblock recommended-settings content.** Add the per-group setpoint fields (§5). Surface them in the existing UI group editor. Render them in the submittal PDF as a "Recommended settings" block inside each group sequence. *Single data change, two wins: submittal gains the ASHRAE-required settings; the schedule output gains the data it needs later.*

**Phase 2 — Drawing Schedule output.** Add the new section/template kind, matrix renderer, keyed paragraph list. Ship at Tabloid landscape first; Arch-D later if needed. Title block optional.

**Phase 3 — Functional testing + recalibration.** Add the project-level fields and render in a new "Commissioning & Testing" subsection. Seeded template library per strategy.

**Phase 4 — LP-16 gap topics.** OPR section · user interfaces · sensor specs · emergency / night lighting. Each is incremental; none are code-blocking for ASHRAE 90.1 narratives, but they're LP-16 best practice.

**Phase 5 — Project-dependent topics.** ADR, tunable white, scene/color control, integration points. Likely opt-in sections in the template editor rather than default.

## 8. Open decisions

1. **Schedule title block:** emit our own, or ship naked for the EE?
2. **Sheet size default:** Tabloid (11×17) or Arch-D (24×36)? Tabloid is easier to preview and print; Arch-D matches typical construction drawing sets.
3. **Alpha-num keying:** mirror E-601's A…Z, AA, BB overflow, or cap at 26 groups and warn?
4. **Setpoint defaults per space type:** do we seed from a lookup table, or leave blank and prompt?
5. **Does the drawing schedule replace or complement the submittal room schedule?** (I'd say complement — different audiences.)
6. **Unoccupied-level default:** blank (full-off) vs a mild partial-off like 20%? Code-driven per space type; worth a lookup.

## 9. References

- [Best Practices for Lighting Control Narratives — Lighting Controls Academy](https://lightingcontrolsacademy.org/best-practices-for-lighting-control-narratives/)
- [ANSI/IES LP-16-22 — IES Store](https://store.ies.org/product/lp-16-22-lighting-practice-documenting-control-intent-narratives-and-sequences-of-operations/)
- [IES Publishes LP-16 — LCA](https://lightingcontrolsassociation.org/2022/07/06/ies-publishes-standard-on-control-intent-narratives-and-sequences-of-operation/)
- [LCA Design Express CIN/SOO template](https://lightingcontrolsacademy.org/lighting-controls-academys-controls-intent-narrative-cin-sequence-of-operations-soo-template-design-express/)
- [How to Write a Smart Sequence of Operations — inside.lighting](https://inside.lighting/news/25-02/controls-how-write-smart-sequence-operations)
- [Practical Lighting Control Zones for ASHRAE 90.1 & IECC — Hyperlite](https://hi-hyperlite.com/blogs/comprehensive-guides/control-zoning-ashrae-iecc)
- Example drawing: T2 Construction E-601 *Electrical Schedules & Details* (Ability Engineering + WPF Engineering, 2025-01-22 Permit / 2025-02-14 Addendum #1) — user-provided.
