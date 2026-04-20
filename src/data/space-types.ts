import type { ControlApplicability, ControlColumnId, SpaceType } from "@/lib/types";

/**
 * Table 9.6.1 — ASHRAE 90.1-2019 / Michigan Commercial Energy Code 2019.
 *
 * Transcribed from the Michigan UpCodes PDF (reference/michigan-code-2019/).
 * Each entry carries the table's LPD (W/ft²) and the REQ/ADD1/ADD2/blank
 * value for each of the nine control columns a–i in §9.4.1.1. The
 * `plugLoadControl842` flag is set from §8.4.2 (Chapter 8) Applicability list:
 * private offices, conference rooms, print/copy rooms, break rooms,
 * classrooms, and individual workstations.
 *
 * RCR thresholds from Table 9.6.1 are out of scope for the MVP per Chad.
 * Footnote references kept in `note` where they materially affect applicability.
 *
 * Review & edit as you find errors — this is a one-shot transcription.
 */

// Compact row constructor: controls given in table order a,b,c,d,e,f,g,h,i.
// Use "R"/"1"/"2"/"." shorthand so the matrix stays readable at a glance.
type Short = "R" | "1" | "2" | ".";
const CODE_MAP: Record<Short, ControlApplicability> = {
  R: "REQ",
  "1": "ADD1",
  "2": "ADD2",
  ".": null,
};
function ctrls(s: string): Record<ControlColumnId, ControlApplicability> {
  const parts = s.replace(/\s+/g, "").split("") as Short[];
  if (parts.length !== 9) throw new Error(`ctrls expects 9 chars, got ${parts.length}: "${s}"`);
  const keys: ControlColumnId[] = [
    "local_control",
    "restricted_manual_on",
    "restricted_partial_auto_on",
    "bilevel",
    "daylight_sidelighting",
    "daylight_toplighting",
    "auto_partial_off",
    "auto_full_off",
    "scheduled_shutoff",
  ];
  const out = {} as Record<ControlColumnId, ControlApplicability>;
  parts.forEach((p, i) => (out[keys[i]] = CODE_MAP[p]));
  return out;
}

export const SPACE_TYPES: SpaceType[] = [
  // ── Atrium ────────────────────────────────────────────────────────────────
  { id: "atrium_lt20", name: "Atrium — <20 ft height", category: "lobby", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.39, controls: ctrls("R11.RR.22"), plugLoadControl842: false, iesTargetId: "ies_lobby" },
  { id: "atrium_20_40", name: "Atrium — 20–40 ft height", category: "lobby", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.48, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_lobby" },
  { id: "atrium_gt40", name: "Atrium — >40 ft height", category: "lobby", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.60, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_lobby" },

  // ── Audience Seating Area ─────────────────────────────────────────────────
  { id: "audience_auditorium", name: "Audience seating — Auditorium", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.61, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "audience_gymnasium", name: "Audience seating — Gymnasium", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.23, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "audience_motion_picture", name: "Audience seating — Motion picture theater", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.27, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "audience_penitentiary", name: "Audience seating — Penitentiary", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.67, controls: ctrls("R11.RR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "audience_performing_arts", name: "Audience seating — Performing arts theater", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.16, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "audience_religious", name: "Audience seating — Religious facility", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.72, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "audience_sports_arena", name: "Audience seating — Sports arena", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.33, controls: ctrls("R11.RR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "audience_other", name: "Audience seating — All other", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.23, controls: ctrls("R11.RR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },

  // ── Banking ───────────────────────────────────────────────────────────────
  { id: "banking_activity", name: "Banking activity area", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.61, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Classroom / Lecture Hall / Training Room ─────────────────────────────
  { id: "classroom_penitentiary", name: "Classroom — Penitentiary", category: "classroom", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.89, controls: ctrls("R11RRR.R."), plugLoadControl842: true, iesTargetId: "ies_classroom" },
  { id: "classroom_all_other", name: "Classroom / lecture hall / training — All other", category: "classroom", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.71, controls: ctrls("R11RRR.R."), plugLoadControl842: true, iesTargetId: "ies_classroom" },

  // ── Conference / Meeting / Multipurpose ──────────────────────────────────
  { id: "conference_meeting", name: "Conference / Meeting / Multipurpose room", category: "conference", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.97, controls: ctrls("R11RRR.R."), plugLoadControl842: true, iesTargetId: "ies_conference" },

  // ── Confinement Cells ────────────────────────────────────────────────────
  { id: "confinement_cells", name: "Confinement cells", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.70, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Copy / Print Room ─────────────────────────────────────────────────────
  { id: "copy_print_room", name: "Copy / Print room", category: "office", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.31, controls: ctrls("R11RRR.R."), plugLoadControl842: true, iesTargetId: "ies_office_open" },

  // ── Corridor ──────────────────────────────────────────────────────────────
  { id: "corridor_visually_impaired", name: "Corridor — Facility for the visually impaired", category: "corridor", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.71, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_corridor", note: "Corridors ≥8 ft wide; see Footnote 3 for VI facility definition." },
  { id: "corridor_hospital", name: "Corridor — Hospital", category: "corridor", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.71, controls: ctrls("R...RR222"), plugLoadControl842: false, iesTargetId: "ies_corridor" },
  { id: "corridor_all_other", name: "Corridor — All other", category: "corridor", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.41, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_corridor" },

  // ── Courtroom ─────────────────────────────────────────────────────────────
  { id: "courtroom", name: "Courtroom", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.20, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Computer Room ─────────────────────────────────────────────────────────
  { id: "computer_room", name: "Computer room", category: "office", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.94, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Dining Area ──────────────────────────────────────────────────────────
  { id: "dining_penitentiary", name: "Dining area — Penitentiary", category: "food-service", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.42, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_dining" },
  { id: "dining_visually_impaired", name: "Dining area — Facility for visually impaired", category: "food-service", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.27, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_dining" },
  { id: "dining_bar_lounge", name: "Dining area — Bar / lounge / leisure", category: "food-service", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.86, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_dining" },
  { id: "dining_cafeteria", name: "Dining area — Cafeteria / fast food", category: "food-service", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.40, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_dining" },
  { id: "dining_family", name: "Dining area — Family", category: "food-service", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.60, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_dining" },
  { id: "dining_all_other", name: "Dining area — All other", category: "food-service", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.43, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_dining" },

  // ── Electrical / Mechanical ─────────────────────────────────────────────
  { id: "electrical_mechanical", name: "Electrical / Mechanical room", category: "mechanical", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.43, controls: ctrls("R...RR..."), plugLoadControl842: false, iesTargetId: "ies_mechanical", note: "Footnote 7 — Table 9.6.1." },

  // ── Emergency Vehicle Garage ─────────────────────────────────────────────
  { id: "emergency_vehicle_garage", name: "Emergency vehicle garage", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.52, controls: ctrls("R11.RR.22"), plugLoadControl842: false, iesTargetId: "ies_mechanical" },

  // ── Food Preparation ─────────────────────────────────────────────────────
  { id: "food_prep", name: "Food preparation area", category: "food-service", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.09, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_food_prep" },

  // ── Guest Room ───────────────────────────────────────────────────────────
  { id: "guest_room", name: "Guest room (hotel / dormitory)", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.41, controls: ctrls("........."), plugLoadControl842: false, iesTargetId: "ies_office_open", note: "See Section 9.4.1.3(b) for controls — not governed by Table 9.6.1." },

  // ── Laboratory ────────────────────────────────────────────────────────────
  { id: "laboratory_classroom", name: "Laboratory — In or as a classroom", category: "classroom", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.11, controls: ctrls("R11RRR.22"), plugLoadControl842: true, iesTargetId: "ies_classroom" },
  { id: "laboratory_all_other", name: "Laboratory — All other", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.33, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Laundry ──────────────────────────────────────────────────────────────
  { id: "laundry_washing", name: "Laundry / Washing area", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.53, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_mechanical" },

  // ── Loading Dock (interior) ───────────────────────────────────────────────
  { id: "loading_dock_interior", name: "Loading dock — Interior", category: "warehouse", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.88, controls: ctrls("R11.RR.22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },

  // ── Lobby ─────────────────────────────────────────────────────────────────
  { id: "lobby_visually_impaired", name: "Lobby — Facility for visually impaired", category: "lobby", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.69, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_lobby" },
  { id: "lobby_elevator", name: "Lobby — Elevator", category: "lobby", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.65, controls: ctrls("R...RR.22"), plugLoadControl842: false, iesTargetId: "ies_lobby" },
  { id: "lobby_hotel", name: "Lobby — Hotel", category: "lobby", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.51, controls: ctrls("R...RR.22"), plugLoadControl842: false, iesTargetId: "ies_lobby" },
  { id: "lobby_motion_picture", name: "Lobby — Motion picture theater", category: "lobby", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.23, controls: ctrls("R...RR.22"), plugLoadControl842: false, iesTargetId: "ies_lobby" },
  { id: "lobby_performing_arts", name: "Lobby — Performing arts theater", category: "lobby", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.25, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_lobby" },
  { id: "lobby_all_other", name: "Lobby — All other", category: "lobby", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.84, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_lobby" },

  // ── Locker Room ──────────────────────────────────────────────────────────
  { id: "locker_room", name: "Locker room", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.52, controls: ctrls("R11RRR.R."), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Lounge / Breakroom ───────────────────────────────────────────────────
  { id: "lounge_breakroom_healthcare", name: "Lounge / Breakroom — Healthcare facility", category: "breakroom", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.42, controls: ctrls("R11RRR.R."), plugLoadControl842: true, iesTargetId: "ies_breakroom" },
  { id: "lounge_breakroom_all_other", name: "Lounge / Breakroom — All other", category: "breakroom", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.59, controls: ctrls("R11RRR.R."), plugLoadControl842: true, iesTargetId: "ies_breakroom" },

  // ── Office ────────────────────────────────────────────────────────────────
  { id: "office_enclosed_small", name: "Office — Enclosed, ≤250 ft²", category: "office", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.74, controls: ctrls("R11RRR.R."), plugLoadControl842: true, iesTargetId: "ies_office_private" },
  { id: "office_enclosed_large", name: "Office — Enclosed, >250 ft²", category: "office", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.66, controls: ctrls("R11RRR.22"), plugLoadControl842: true, iesTargetId: "ies_office_private" },
  { id: "office_open", name: "Office — Open plan", category: "office", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.61, controls: ctrls("R11RRR.22"), plugLoadControl842: true, iesTargetId: "ies_office_open" },

  // ── Parking Area (interior) ───────────────────────────────────────────────
  { id: "parking_interior", name: "Parking area — Interior", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.15, controls: ctrls("........."), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium", note: "Governed by §9.4.1.2 — not Table 9.6.1." },

  // ── Pharmacy ─────────────────────────────────────────────────────────────
  { id: "pharmacy_area", name: "Pharmacy area", category: "healthcare", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.66, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Restroom ─────────────────────────────────────────────────────────────
  { id: "restroom_visually_impaired", name: "Restroom — Facility for visually impaired", category: "restroom", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.26, controls: ctrls("....RR.R."), plugLoadControl842: false, iesTargetId: "ies_restroom" },
  { id: "restroom_all_other", name: "Restroom — All other", category: "restroom", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.63, controls: ctrls("....RR.R."), plugLoadControl842: false, iesTargetId: "ies_restroom" },

  // ── Retail ────────────────────────────────────────────────────────────────
  { id: "retail_sales_area", name: "Sales area", category: "retail", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.05, controls: ctrls("R11RR.R22"), plugLoadControl842: false, iesTargetId: "ies_office_open", note: "Additional 0.52 W/ft² for accent lighting allowed per Footnote 7 when controlled separately." },
  { id: "retail_seating_general", name: "Seating area — General", category: "retail", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.23, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Stairway / Stairwell ─────────────────────────────────────────────────
  { id: "stairway", name: "Stairway", category: "stairwell", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0, controls: ctrls("........."), plugLoadControl842: false, iesTargetId: "ies_corridor", note: "LPD and control requirements determined by the containing space." },
  { id: "stairwell", name: "Stairwell", category: "stairwell", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.49, controls: ctrls("...RRRR22"), plugLoadControl842: false, iesTargetId: "ies_corridor" },

  // ── Storage Room ─────────────────────────────────────────────────────────
  { id: "storage_lt50", name: "Storage room — <50 ft²", category: "storage", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.51, controls: ctrls("R......22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },
  { id: "storage_gte50", name: "Storage room — ≥50 ft²", category: "storage", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.38, controls: ctrls("R11.RR.R."), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },

  // ── Vehicular Maintenance ────────────────────────────────────────────────
  { id: "vehicular_maintenance", name: "Vehicular maintenance area", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.60, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },

  // ── Workshop ─────────────────────────────────────────────────────────────
  { id: "workshop", name: "Workshop", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.26, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },

  // ── Facility for the Visually Impaired ───────────────────────────────────
  { id: "vi_chapel", name: "Visually impaired — Chapel", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.70, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "vi_rec_room", name: "Visually impaired — Recreation / common living room", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.77, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Convention Center ────────────────────────────────────────────────────
  { id: "convention_exhibit", name: "Convention center — Exhibit space", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.61, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },

  // ── Dormitory ────────────────────────────────────────────────────────────
  { id: "dormitory_living", name: "Dormitory — Living quarters", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.50, controls: ctrls("R........"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Fire Station ─────────────────────────────────────────────────────────
  { id: "fire_station_sleeping", name: "Fire station — Sleeping quarters", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.23, controls: ctrls("R........"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Gymnasium / Fitness Center ───────────────────────────────────────────
  { id: "gym_exercise", name: "Gymnasium / Fitness — Exercise area", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.90, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "gym_playing", name: "Gymnasium / Fitness — Playing area", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.85, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },

  // ── Healthcare Facility ──────────────────────────────────────────────────
  { id: "healthcare_exam", name: "Healthcare — Exam / treatment room", category: "healthcare", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.40, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_healthcare" },
  { id: "healthcare_imaging", name: "Healthcare — Imaging room", category: "healthcare", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.94, controls: ctrls("R...R..22"), plugLoadControl842: false, iesTargetId: "ies_healthcare" },
  { id: "healthcare_medical_supply", name: "Healthcare — Medical supply room", category: "healthcare", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.62, controls: ctrls("........."), plugLoadControl842: false, iesTargetId: "ies_healthcare", note: "Use Storage Room control requirements." },
  { id: "healthcare_nursery", name: "Healthcare — Nursery", category: "healthcare", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.92, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_healthcare" },
  { id: "healthcare_nurse_station", name: "Healthcare — Nurse's station", category: "healthcare", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.17, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_healthcare" },
  { id: "healthcare_operating", name: "Healthcare — Operating room", category: "healthcare", interiorOrOutdoor: "interior", lpdWattsPerSqft: 2.26, controls: ctrls("R...R..22"), plugLoadControl842: false, iesTargetId: "ies_healthcare" },
  { id: "healthcare_patient", name: "Healthcare — Patient room", category: "healthcare", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.68, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_healthcare" },
  { id: "healthcare_physical_therapy", name: "Healthcare — Physical therapy room", category: "healthcare", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.91, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_healthcare" },
  { id: "healthcare_recovery", name: "Healthcare — Recovery room", category: "healthcare", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.25, controls: ctrls("R...RRR22"), plugLoadControl842: false, iesTargetId: "ies_healthcare" },

  // ── Library ──────────────────────────────────────────────────────────────
  { id: "library_reading", name: "Library — Reading area", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.96, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },
  { id: "library_stacks", name: "Library — Stacks", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.18, controls: ctrls("R11RRRR22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Manufacturing ────────────────────────────────────────────────────────
  { id: "manufacturing_detailed", name: "Manufacturing — Detailed area", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.80, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },
  { id: "manufacturing_equipment", name: "Manufacturing — Equipment room", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.76, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },
  { id: "manufacturing_extra_high_bay", name: "Manufacturing — Extra high bay (>50 ft)", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.42, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },
  { id: "manufacturing_high_bay", name: "Manufacturing — High bay (25–50 ft)", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.24, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },
  { id: "manufacturing_low_bay", name: "Manufacturing — Low bay (<25 ft)", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.86, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },

  // ── Museum ───────────────────────────────────────────────────────────────
  { id: "museum_exhibition", name: "Museum — General exhibition area", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.31, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "museum_restoration", name: "Museum — Restoration room", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.10, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Performing Arts Theater — Dressing Room ──────────────────────────────
  { id: "theater_dressing", name: "Performing arts theater — Dressing room", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.41, controls: ctrls("R11RRR.R."), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Post Office ──────────────────────────────────────────────────────────
  { id: "post_office_sorting", name: "Post office — Sorting area", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.76, controls: ctrls("R11RRRR22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Religious Facility ───────────────────────────────────────────────────
  { id: "religious_fellowship", name: "Religious facility — Fellowship hall", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.54, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly", note: "" },
  { id: "religious_worship", name: "Religious facility — Worship / pulpit / choir", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.85, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },

  // ── Retail (building-specific sub-types) ─────────────────────────────────
  { id: "retail_dressing_fitting", name: "Retail — Dressing / fitting room", category: "retail", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.51, controls: ctrls("R11RR.R.."), plugLoadControl842: false, iesTargetId: "ies_office_open" },
  { id: "retail_mall_concourse", name: "Retail — Mall concourse", category: "retail", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.82, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Sports Arena — Playing Area ──────────────────────────────────────────
  { id: "sports_class_i", name: "Sports arena — Playing area Class I", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 2.94, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "sports_class_ii", name: "Sports arena — Playing area Class II", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 2.01, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "sports_class_iii", name: "Sports arena — Playing area Class III", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 1.30, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },
  { id: "sports_class_iv", name: "Sports arena — Playing area Class IV", category: "assembly", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.86, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_assembly" },

  // ── Transportation Facility ──────────────────────────────────────────────
  { id: "transportation_baggage", name: "Transportation — Baggage / carousel area", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.39, controls: ctrls("R11.RR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },
  { id: "transportation_airport_concourse", name: "Transportation — Airport concourse", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.25, controls: ctrls("R11.RR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },
  { id: "transportation_ticket_counter", name: "Transportation — Ticket counter", category: "other", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.51, controls: ctrls("R11RRR.22"), plugLoadControl842: false, iesTargetId: "ies_office_open" },

  // ── Warehouse — Storage Area ─────────────────────────────────────────────
  { id: "warehouse_bulk", name: "Warehouse — Medium to bulky, palletized items", category: "warehouse", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.33, controls: ctrls("R11RRRR22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium", note: "Footnote 5 — sometimes called 'Picking Area.'" },
  { id: "warehouse_small", name: "Warehouse — Smaller, hand-carried items", category: "warehouse", interiorOrOutdoor: "interior", lpdWattsPerSqft: 0.69, controls: ctrls("R11RRRR22"), plugLoadControl842: false, iesTargetId: "ies_warehouse_medium" },
];

export function spaceTypeById(id: string): SpaceType | undefined {
  return SPACE_TYPES.find((s) => s.id === id);
}

export function interiorSpaceTypes(): SpaceType[] {
  return SPACE_TYPES.filter((s) => s.interiorOrOutdoor === "interior");
}

/**
 * List of requirement IDs that apply to this space type, flattened from
 * `controls` + plug-load flag. Preserves REQ/ADD1/ADD2 applicability so
 * the UI can render them in the right groupings.
 */
export function applicableRequirements(st: SpaceType): Array<{
  requirementId: string;
  applicability: ControlApplicability | "PLUG_LOAD";
}> {
  const out: Array<{ requirementId: string; applicability: ControlApplicability | "PLUG_LOAD" }> = [];
  for (const [col, app] of Object.entries(st.controls) as Array<[ControlColumnId, ControlApplicability]>) {
    if (app) out.push({ requirementId: col, applicability: app });
  }
  if (st.plugLoadControl842) out.push({ requirementId: "plug_load_842", applicability: "PLUG_LOAD" });
  return out;
}
