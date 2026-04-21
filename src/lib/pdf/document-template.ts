// ─────────────────────────────────────────────────────────────────────────────
// DocumentTemplate — the settings object that drives both the on-screen
// preview and the react-pdf renderer. Inspired by quoting-superapp's
// PDFTemplate (side-by-side live preview + sidebar knobs pattern) but
// redesigned around this tool's content: a narrative document with
// heterogeneous sections (cover, prose, group sequences, room schedule,
// outdoor, glossary) instead of one tabular body.
//
// Data flow:
//   User toggles/reorders in <SettingsSidebar> → setTemplate() →
//   <PDFPreview> regenerates blob via pdf(<ControlsNarrativePdf template/>) →
//   iframe updates. LocalStorage persists last-used template.
//
// Chad's ask: "reorder, add or remove sections, see them in the live preview"
// — so `sections` is a reorderable array with `enabled` toggles, plus a
// custom-prose kind that users can instantiate with user-supplied heading + body.
// Built-in sections can't be deleted (just hidden); custom-prose sections can.
// ─────────────────────────────────────────────────────────────────────────────

import type { RequirementsLayout } from "./requirements-layout";

/**
 * Every section rendered in the document has a `kind` that selects the
 * renderer and determines what options it carries. Cover is always first,
 * always enabled, never reorderable (a "fixed" section at the top of the
 * array); everything else is user-controllable.
 */
export type SectionKind =
  | "cover" // title + prepared-by + project facts + cover disclaimer
  | "basisOfDesign" // §1
  | "systemArchitecture" // §2
  | "commissioning" // §3
  | "groupSequences" // §4 — per-group narrative prose
  | "roomSchedule" // §5 — grouped schedule + Section-5 layout variants
  | "outdoor" // §6 — only rendered when at least one outdoor zone is enabled
  | "glossary" // §7
  | "customProse"; // user-authored free-text block inserted anywhere

export interface SectionBase {
  /** Stable id used for dnd reordering + localStorage hydration. */
  id: string;
  kind: SectionKind;
  /** When false the section is skipped. Greys out in the editor. */
  enabled: boolean;
}

export interface CoverSection extends SectionBase {
  kind: "cover";
  /** Override title ("Lighting Controls Narrative") with something like "Permit Set — Revision 2". */
  titleOverride?: string;
  /** Include the cover-page disclaimer box. Off for minimal/clean looks. */
  showDisclaimer: boolean;
  /** Include project facts (location, code version, room count, etc.). */
  showFacts: boolean;
}

export interface BasisOfDesignSection extends SectionBase { kind: "basisOfDesign"; }
export interface SystemArchitectureSection extends SectionBase { kind: "systemArchitecture"; }
export interface CommissioningSection extends SectionBase { kind: "commissioning"; }
export interface GroupSequencesSection extends SectionBase { kind: "groupSequences"; }

export interface RoomScheduleSection extends SectionBase {
  kind: "roomSchedule";
  /** Section-5 layout variant — was a top-of-preview tab; now lives here. */
  requirementsLayout: RequirementsLayout;
  /** Render the Installed LPD math block below the schedule. */
  showLpdMath: boolean;
}

export interface OutdoorSection extends SectionBase { kind: "outdoor"; }
export interface GlossarySection extends SectionBase { kind: "glossary"; }

export interface CustomProseSection extends SectionBase {
  kind: "customProse";
  /** Heading rendered like "1. Basis of Design" — numbering is auto. */
  heading: string;
  /** Body text — paragraphs separated by blank lines. */
  body: string;
}

export type DocumentSection =
  | CoverSection
  | BasisOfDesignSection
  | SystemArchitectureSection
  | CommissioningSection
  | GroupSequencesSection
  | RoomScheduleSection
  | OutdoorSection
  | GlossarySection
  | CustomProseSection;

/** Templates are ordered: sections[0] must be the cover. */
export interface DocumentTemplate {
  id: string;
  name: string;
  isPreset: boolean;

  // Page
  /** Global font size offset in pt — body text stays readable; headings scale with it. */
  fontSize: 9 | 10 | 11;
  /** Watermark diagonally across every page. "none" disables. */
  watermark: "none" | "draft" | "budgetary" | "preliminary";

  // Branding
  /** Show A+ logo on cover. Off for public / white-label exports. */
  showLogo: boolean;
  /** Show full A+ contact info in page footer vs. just the short credit line. */
  showBrandFooter: boolean;

  // Sections — ordered, reorderable (except cover which stays at index 0)
  sections: DocumentSection[];
}

// ─── Human-readable labels ─────────────────────────────────────────────────

/** Label shown on the section row in the editor. Custom-prose uses its own heading. */
export const SECTION_KIND_LABELS: Record<Exclude<SectionKind, "customProse">, string> = {
  cover: "Cover",
  basisOfDesign: "Basis of Design",
  systemArchitecture: "System Architecture",
  commissioning: "Commissioning & Handoff",
  groupSequences: "Functional Group Sequences",
  roomSchedule: "Room Schedule / SoO",
  outdoor: "Outdoor Controls",
  glossary: "Glossary & Abbreviations",
};

/** One-line hint under each section row — explains what's in it. */
export const SECTION_KIND_HINTS: Record<Exclude<SectionKind, "customProse">, string> = {
  cover: "Title, prepared-by, project facts, and (optional) disclaimer box.",
  basisOfDesign: "Occupancy hours, design assumptions, local amendments.",
  systemArchitecture: "Standalone / networked / BMS-integrated, wiring approach.",
  commissioning: "Vacancy-timer defaults, daylight calibration, override behavior.",
  groupSequences: "Per-group plain-English sequence-of-operation narrative.",
  roomSchedule: "Group-hoisted schedule with every requirement and how it's met.",
  outdoor: "§9.4.2 — photocell + time clock + reductions per zone. Auto-hidden when no zones are active.",
  glossary: "AHJ, ASHRAE, LPD, REQ/ADD1/ADD2, etc.",
};

// ─── Section constructors — used to build presets and instantiate new rows ──

export function coverSection(overrides: Partial<CoverSection> = {}): CoverSection {
  return {
    id: "cover",
    kind: "cover",
    enabled: true,
    showDisclaimer: true,
    showFacts: true,
    ...overrides,
  };
}

export function customProseSection(overrides: Partial<CustomProseSection> = {}): CustomProseSection {
  return {
    id: `custom-${Math.random().toString(36).slice(2, 9)}`,
    kind: "customProse",
    enabled: true,
    heading: "Project Notes",
    body: "",
    ...overrides,
  };
}

/** Default ordered list of built-in sections — matches spec §4.5. */
function defaultBuiltInSections(): DocumentSection[] {
  return [
    coverSection(),
    { id: "basisOfDesign", kind: "basisOfDesign", enabled: true },
    { id: "systemArchitecture", kind: "systemArchitecture", enabled: true },
    { id: "groupSequences", kind: "groupSequences", enabled: true },
    {
      id: "roomSchedule",
      kind: "roomSchedule",
      enabled: true,
      requirementsLayout: "expanded",
      showLpdMath: true,
    },
    { id: "outdoor", kind: "outdoor", enabled: true },
    { id: "commissioning", kind: "commissioning", enabled: true },
    { id: "glossary", kind: "glossary", enabled: true },
  ];
}

// ─── Built-in presets ──────────────────────────────────────────────────────

export const DOCUMENT_PRESETS: DocumentTemplate[] = [
  {
    id: "aplus-standard",
    name: "A+ Standard",
    isPreset: true,
    fontSize: 10,
    watermark: "none",
    showLogo: true,
    showBrandFooter: true,
    sections: defaultBuiltInSections(),
  },
  {
    id: "permit-set",
    name: "Permit Set",
    isPreset: true,
    fontSize: 10,
    watermark: "none",
    showLogo: true,
    showBrandFooter: true,
    sections: (() => {
      // Permit set: compact Section 5, no commissioning narrative (AHJs want the schedule).
      const base = defaultBuiltInSections();
      return base.map((s) => {
        if (s.kind === "roomSchedule") return { ...s, requirementsLayout: "compact" as const };
        if (s.kind === "commissioning") return { ...s, enabled: false };
        return s;
      });
    })(),
  },
  {
    id: "public-unbranded",
    name: "Public (unbranded)",
    isPreset: true,
    fontSize: 10,
    watermark: "none",
    showLogo: false,
    showBrandFooter: false,
    sections: defaultBuiltInSections(),
  },
  {
    id: "draft",
    name: "Draft",
    isPreset: true,
    fontSize: 10,
    watermark: "draft",
    showLogo: true,
    showBrandFooter: true,
    sections: defaultBuiltInSections(),
  },
];

// ─── LocalStorage persistence ──────────────────────────────────────────────

const STORAGE_KEY = "planner-doc-template-last";
const CUSTOM_KEY = "planner-doc-template-custom";

/**
 * Merge a persisted (maybe-stale) template with the current schema. If sections
 * were added to the default set since the template was saved, append them as
 * disabled at the end so the user isn't forced to reset. If sections were
 * removed (shouldn't happen in practice) strip them silently.
 */
function migrateTemplate(raw: unknown): DocumentTemplate {
  const fallback = DOCUMENT_PRESETS[0];
  if (!raw || typeof raw !== "object") return fallback;
  const t = raw as Partial<DocumentTemplate> & { sections?: DocumentSection[] };
  const sections = Array.isArray(t.sections) ? t.sections : [];

  // Ensure cover exists at index 0. If missing or not first, prepend a default.
  const hasCoverFirst = sections[0]?.kind === "cover";
  const migrated: DocumentSection[] = hasCoverFirst
    ? sections.slice()
    : [coverSection(), ...sections.filter((s) => s.kind !== "cover")];

  // Append any built-in kinds the saved template was missing (new additions
  // since the template was saved), all as disabled.
  const builtInKinds: SectionKind[] = [
    "basisOfDesign", "systemArchitecture", "commissioning",
    "groupSequences", "roomSchedule", "outdoor", "glossary",
  ];
  for (const kind of builtInKinds) {
    if (!migrated.some((s) => s.kind === kind)) {
      migrated.push(defaultSectionForKind(kind, false));
    }
  }

  return {
    id: t.id ?? fallback.id,
    name: t.name ?? fallback.name,
    isPreset: t.isPreset ?? false,
    fontSize: (t.fontSize === 9 || t.fontSize === 10 || t.fontSize === 11) ? t.fontSize : 10,
    watermark: ["none", "draft", "budgetary", "preliminary"].includes(t.watermark as string)
      ? (t.watermark as DocumentTemplate["watermark"])
      : "none",
    showLogo: t.showLogo ?? true,
    showBrandFooter: t.showBrandFooter ?? true,
    sections: migrated,
  };
}

/** Build a disabled-by-default section row when a saved template is missing a kind. */
function defaultSectionForKind(kind: SectionKind, enabled: boolean): DocumentSection {
  switch (kind) {
    case "cover":
      return coverSection({ enabled });
    case "roomSchedule":
      return { id: "roomSchedule", kind, enabled, requirementsLayout: "expanded", showLpdMath: true };
    case "customProse":
      return customProseSection({ enabled });
    default:
      return { id: kind, kind, enabled };
  }
}

export function loadLastTemplate(): DocumentTemplate {
  if (typeof window === "undefined") return DOCUMENT_PRESETS[0];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateTemplate(JSON.parse(raw));
  } catch {}
  return DOCUMENT_PRESETS[0];
}

export function saveLastTemplate(template: DocumentTemplate): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(template));
  } catch {}
}

export function loadCustomPresets(): DocumentTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) return (JSON.parse(raw) as unknown[]).map(migrateTemplate);
  } catch {}
  return [];
}

export function saveCustomPreset(template: DocumentTemplate): void {
  if (typeof window === "undefined") return;
  const all = loadCustomPresets();
  const idx = all.findIndex((t) => t.id === template.id);
  const stored = { ...template, isPreset: false };
  if (idx >= 0) all[idx] = stored;
  else all.push(stored);
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(all));
  } catch {}
}

export function deleteCustomPreset(id: string): void {
  if (typeof window === "undefined") return;
  const remaining = loadCustomPresets().filter((t) => t.id !== id);
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(remaining));
  } catch {}
}

// ─── Helpers the renderer uses ─────────────────────────────────────────────

/** Visible sections in order. Cover is always visible when `enabled`. */
export function visibleSections(template: DocumentTemplate): DocumentSection[] {
  return template.sections.filter((s) => s.enabled);
}

/** The "§1 / §2 …" numbering for content sections (excluding cover). */
export function sectionNumber(template: DocumentTemplate, section: DocumentSection): number | null {
  if (section.kind === "cover") return null;
  let n = 0;
  for (const s of template.sections) {
    if (s.kind === "cover") continue;
    if (!s.enabled) continue;
    n += 1;
    if (s.id === section.id) return n;
  }
  return null;
}

export const SECTION_KINDS_ORDER: SectionKind[] = [
  "cover",
  "basisOfDesign",
  "systemArchitecture",
  "groupSequences",
  "roomSchedule",
  "outdoor",
  "commissioning",
  "glossary",
  "customProse",
];
