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
 * A single ASHRAE control requirement, identified by its section reference.
 * Requirements are data, not code — paraphrased per fair use, with the section
 * citation so users can verify against the standard.
 */
export interface Requirement {
  id: string;
  source: CodeVersion;
  section: string; // e.g., "9.4.1.1(d)"
  shortName: string; // e.g., "Manual on"
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
 * An ASHRAE 90.1 space type (Table 9.6.1 for interior; §9.4.2 for outdoor).
 * This is library/reference data, not per-project.
 */
export interface SpaceType {
  id: string; // e.g., "office_enclosed"
  name: string; // e.g., "Office — Enclosed (private)"
  category: SpaceCategory;
  interiorOrOutdoor: "interior" | "outdoor";
  baseRequirementIds: string[];
  iesTargetId: string;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-project types (user-created, held in memory for Phase 1 free tier)
// ─────────────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  location?: string;
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
 * Defined by ASHRAE space type + splitting factors (daylight, plug load, occupancy strategy).
 * Carries base requirements (inherited) + waivers + additions + designer choices.
 */
export interface FunctionalGroup {
  id: string;
  label: string; // short tag — "A", "B", "C" or "PO-DL"
  description: string; // human-readable — "Private Office w/ Daylight Harvesting"
  spaceTypeId: string;
  // splitting factors
  daylightZone: boolean;
  plugLoadControl: boolean;
  occupancyStrategy: OccupancyStrategy;
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
