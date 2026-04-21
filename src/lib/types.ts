// ─────────────────────────────────────────────────────────────────────────────
// Reference library types (seeded data — loaded from src/data/*)
// ─────────────────────────────────────────────────────────────────────────────

export type CodeVersion = "ASHRAE-90.1-2019";

export type IesSource = "IES-RP-1" | "IES-RP-3" | "IES-RP-28" | "IES-RP-5" | "IES-Handbook";

export type SpaceCategory =
  | "office"
  | "conference"
  | "classroom"
  | "restroom"
  | "corridor"
  | "stairwell"
  | "lobby"
  | "breakroom"
  | "mechanical"
  | "storage"
  | "warehouse"
  | "retail"
  | "assembly"
  | "healthcare"
  | "food-service"
  | "other";

export type OutdoorZoneType =
  | "parking"
  | "facadeWallPacks"
  | "canopy"
  | "grounds"
  | "signage"
  | "loadingDock";

export type LightingZone = "LZ0" | "LZ1" | "LZ2" | "LZ3" | "LZ4";

/**
 * The nine control requirement columns of ASHRAE 90.1-2019 / Michigan
 * Commercial Energy Code 2019 Table 9.6.1 (columns a–i in §9.4.1.1).
 * Per space type, each column is either REQ, ADD1, ADD2, or blank.
 */
export type ControlColumnId =
  | "local_control" // a  §9.4.1.1(a)
  | "restricted_manual_on" // b  §9.4.1.1(b)
  | "restricted_partial_auto_on" // c  §9.4.1.1(c)
  | "bilevel" // d  §9.4.1.1(d)
  | "daylight_sidelighting" // e  §9.4.1.1(e)
  | "daylight_toplighting" // f  §9.4.1.1(f)
  | "auto_partial_off" // g  §9.4.1.1(g)
  | "auto_full_off" // h  §9.4.1.1(h)
  | "scheduled_shutoff"; // i  §9.4.1.1(i)

export type ControlApplicability = "REQ" | "ADD1" | "ADD2" | null;

/**
 * A single ASHRAE control requirement (column from Table 9.6.1 or other
 * standalone requirement like §8.4.2 plug load). Requirements are data, not
 * code — paraphrased per fair use, with the section citation so users can
 * verify against the standard.
 */
export interface Requirement {
  id: string;
  source: CodeVersion;
  section: string; // e.g., "9.4.1.1(d)" or "8.4.2"
  shortName: string; // e.g., "Bilevel control"
  description: string; // paraphrased requirement text
  applicabilityNotes?: string;
  exceptionReferences?: string[]; // deferred — just the references for the MVP
}

/**
 * IES illumination recommendations for a given space/activity.
 * Free tier exposes horizontal fc + uniformity; premium unlocks vertical/UGR/cylindrical.
 */
export interface IesTarget {
  id: string;
  source: IesSource;
  horizontalFc: number;
  uniformityRatio: number; // max:min or avg:min depending on source — note in `notes`
  verticalFc?: number;
  ugr?: number;
  cylindricalFc?: number;
  notes?: string;
}

/**
 * An ASHRAE 90.1 / MI 2019 space type (Table 9.6.1 for interior).
 * This is library/reference data, not per-project.
 *
 * `controls` maps each of the nine §9.4.1.1 control columns to REQ / ADD1 /
 * ADD2 / null (blank) per Table 9.6.1. `plugLoadControl842` flags whether
 * §8.4.2 automatic receptacle control applies to this space type (offices,
 * conference, print/copy, break, classrooms, workstations per Chapter 8).
 */
export interface SpaceType {
  id: string;
  name: string;
  category: SpaceCategory;
  interiorOrOutdoor: "interior" | "outdoor";
  lpdWattsPerSqft: number; // Table 9.6.1 "LPD Allowance (W/ft²)"
  controls: Record<ControlColumnId, ControlApplicability>;
  plugLoadControl842: boolean; // §8.4.2 applies
  iesTargetId: string;
  description?: string;
  note?: string; // footnote or caveat from Table 9.6.1
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-project types (user-created, held in memory for Phase 1 free tier)
// ─────────────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  location?: string;
  /** Name of the person who prepared this narrative — shown on the cover. */
  preparedBy?: string;
  codeVersion: CodeVersion;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  // Interior rooms
  rooms: Room[];
  // Outdoor scope: project-level (not per-zone rooms)
  outdoorScope: OutdoorScope;
  // Groups derived from rooms (and optionally outdoor zones)
  functionalGroups: FunctionalGroup[];
  // Structured inputs driving auto-gen sections
  basisOfDesign: BasisOfDesignInputs;
  systemArchitecture: SystemArchitectureInputs;
  commissioning: CommissioningInputs;
  // User-edited overrides to auto-gen section text
  sectionOverrides: SectionOverrides;
}

export interface Room {
  id: string;
  number: string; // "101"
  name: string; // "Dave's Office"
  sizeSqft: number;
  spaceTypeId: string;
  functionalGroupId?: string;
  notes?: string;
  /**
   * Per-room overrides of the functional group's settings. Any field set here
   * wins over the group's corresponding field when resolving the room's
   * effective behavior. Use `resolveRoomSettings(room, group)` to read.
   */
  overrides?: RoomOverrides;
  /**
   * Connected lighting — one entry per fixture type in the room. Used to
   * compute installed LPD (W/ft²) and compare against the space type's
   * allowance from Table 9.6.1. A room may have multiple types (e.g. 20×
   * linear strip @ 40 W plus 5× recessed can @ 15 W). Read via
   * `resolveRoomFixtures(room)` which also handles the legacy single-type
   * fields below.
   */
  fixtures?: RoomFixture[];
  /** @deprecated Legacy single-type fixture count — use `fixtures[]`. Read via
   *  `resolveRoomFixtures`, which synthesizes a single-entry array when only
   *  the legacy fields are present. Kept optional for back-compat with
   *  projects in localStorage from earlier sessions. */
  fixtureCount?: number;
  /** @deprecated Legacy single-type wattage per fixture. See `fixtureCount`. */
  fixtureWattage?: number;
}

/**
 * One fixture type in a room. `model` is a free-text tag the designer types
 * in (catalog number, fixture schedule ID, etc.) — no catalog lookup in MVP.
 */
export interface RoomFixture {
  id: string;
  /** Free-text identifier — catalog #, fixture tag, description. May be blank. */
  model: string;
  /** Watts per fixture. */
  wattage: number;
  /** How many of this fixture type are installed in the room. */
  count: number;
}

export interface RoomOverrides {
  daylightZone?: boolean;
  add1Selection?: ControlColumnId | null;
  add2Selections?: ControlColumnId[];
  add2Stacked?: boolean;
  /** Room-specific waivers (merged with group waivers when resolving). */
  waivers?: Waiver[];
  /** Free-text note that appears as a per-room annotation in the schedule. */
  roomNote?: string;
}

export interface OutdoorScope {
  // Each outdoor zone type may or may not apply to the project.
  // When `enabled` is true the config is populated; otherwise the key may be absent.
  zones: Partial<Record<OutdoorZoneType, OutdoorZoneConfig>>;
}

export interface OutdoorZoneConfig {
  enabled: boolean;
  sizeValue?: number;
  sizeUnit?: "sf" | "acre" | "lf";
  count?: number; // fixture count or zone count depending on type
  lightingZone: LightingZone;
  notes?: string;
}

/**
 * A functional group: a set of rooms that operate the same way.
 * Defined by ASHRAE space type + splitting factors. Carries base requirements
 * (inherited from Table 9.6.1) + ADD-set selections + waivers + additions +
 * designer choices.
 *
 * Plug-load applicability is derived from the space type's §8.4.2 flag — not
 * a splitting factor, since the code is the authority on whether §8.4.2 applies.
 */
export interface FunctionalGroup {
  id: string;
  label: string; // short tag — "A", "B", "C" or "PO-DL"
  description: string; // human-readable — "Private Office w/ Daylight Harvesting"
  spaceTypeId: string;
  // Physical daylight exposure. These drive whether §9.4.1.1(e) sidelighting
  // and §9.4.1.1(f) toplighting requirements actually activate. When both
  // are false/undefined the space type's REQ status still reads as REQ by code,
  // but the narrative treats those requirements as not-applicable.
  hasWindows?: boolean;
  hasSkylights?: boolean;
  /**
   * @deprecated Legacy single-flag splitting factor — `true` meant "group has
   * some daylight exposure" without distinguishing sidelit vs toplit. Kept for
   * back-compat with projects already in localStorage. Derived as
   * `hasWindows || hasSkylights` on write; readers should prefer the pair.
   */
  daylightZone: boolean;
  // ADD1 set encodes occupancy strategy (§9.4.1.1(b) restricted-to-manual-on
  // vs (c) restricted-to-partial-auto-on). ADD2 set encodes shutoff behavior
  // (§9.4.1.1(h) auto-full-off vs (i) scheduled-shutoff vs (g) auto-partial-off).
  // Table 9.6.1 requires at least one when present, so these behave as radios.
  // add2Stacked: opt-in escape hatch to implement both ADD2 controls together.
  add1Selection: ControlColumnId | null;
  add2Selections: ControlColumnId[];
  add2Stacked: boolean;
  // overrides (per §4.8 of the spec)
  waivers: Waiver[];
  additions: Addition[];
  designerChoices: DesignerChoices;
  // narrative — if user has edited, store their text; otherwise auto-generated at render time
  narrativeOverride?: string;
}

export type OccupancyStrategy = "auto-on" | "manual-on" | "partial-auto-on";

export interface Waiver {
  requirementId: string;
  reason: string; // e.g., "AHJ ruling: plug load not required"
  authority?: string; // e.g., "Grand Rapids BCD"
  dateIso?: string;
}

export interface Addition {
  id: string;
  featureName: string; // e.g., "Dimming"
  description: string; // e.g., "Add bi-level dimming to restrooms for ambience"
  reason?: string; // why the designer added this
}

export interface DesignerChoices {
  sensorType?: SensorType;
  sensorMounting?: "ceiling" | "wall" | "corner";
  dimmingProtocol?: DimmingProtocol;
  plugLoadStrategy?: "room-controller" | "receptacle-level";
}

export type SensorType = "PIR" | "dual-tech" | "ultrasonic" | "microwave";
export type DimmingProtocol = "0-10V" | "DALI" | "phase" | "wireless";

// ─────────────────────────────────────────────────────────────────────────────
// Auto-gen section inputs (structured data that drives generated text)
// ─────────────────────────────────────────────────────────────────────────────

export interface BasisOfDesignInputs {
  occupancyHours?: string; // e.g., "Mon–Fri 7am–6pm"
  additionalAssumptions?: string;
  localAmendments?: string;
}

export interface SystemArchitectureInputs {
  systemType: ControlSystemType;
  bmsIntegration?: boolean;
  bmsNotes?: string;
  wiringApproach?: string;
}

export type ControlSystemType =
  | "standalone"
  | "networked-wired"
  | "networked-wireless"
  | "bms-integrated"
  | "hybrid";

export interface CommissioningInputs {
  defaultVacancyTimerMin: number;
  daylightCalibrationNotes?: string;
  overrideBehavior?: string;
  postOccupancyAdjustmentNotes?: string;
}

export interface SectionOverrides {
  basisOfDesign?: string;
  systemArchitecture?: string;
  commissioning?: string;
  glossary?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Building templates (seeded data — user can start from one)
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildingTemplate {
  id: string;
  name: string; // "Warehouse / Distribution"
  description: string;
  typicalRooms: TemplateRoom[];
  typicalOutdoorZones: Partial<Record<OutdoorZoneType, Pick<OutdoorZoneConfig, "lightingZone" | "notes">>>;
  defaults: {
    systemArchitecture: SystemArchitectureInputs;
    commissioning: CommissioningInputs;
    occupancyStrategy: OccupancyStrategy;
  };
}

export interface TemplateRoom {
  name: string; // "Private Office"
  typicalCount: number;
  typicalSizeSqft: number;
  spaceTypeId: string;
  notes?: string;
}
