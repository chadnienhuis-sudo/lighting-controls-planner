import type { ControlColumnId, Requirement } from "@/lib/types";

/**
 * Control requirements from ASHRAE 90.1-2019 / Michigan Commercial Energy
 * Code 2019. Table 9.6.1 defines nine control columns (a–i) referenced in
 * §9.4.1.1. §8.4.2 (Chapter 8) adds a separate automatic receptacle control
 * requirement that applies to certain space types.
 *
 * Requirement text is paraphrased per fair use — short descriptions keyed to
 * the code sections so users can verify against the standard. Chad should
 * review/edit descriptions for accuracy against the full rule text.
 */
export const REQUIREMENTS: Record<ControlColumnId | "plug_load_842", Requirement> = {
  local_control: {
    id: "local_control",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(a)",
    shortName: "Local control",
    description:
      "A readily accessible manual control device within the space allows occupants to turn lighting off at any time.",
  },
  restricted_manual_on: {
    id: "restricted_manual_on",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(b)",
    shortName: "Restricted to manual-on",
    description:
      "Lighting turns on only by manual action. Automatic-on is not permitted; occupancy sensors may only turn lighting off.",
  },
  restricted_partial_auto_on: {
    id: "restricted_partial_auto_on",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(c)",
    shortName: "Restricted to partial auto-on",
    description:
      "Occupancy may auto-activate up to 50% of lighting power. The remainder requires manual action by the occupant.",
  },
  bilevel: {
    id: "bilevel",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(d)",
    shortName: "Bilevel lighting control",
    description:
      "Lighting is continuously dimmable or has at least one intermediate step between fully on and off (typically 30–70% of full power).",
  },
  daylight_sidelighting: {
    id: "daylight_sidelighting",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(e)",
    shortName: "Daylight-responsive — sidelighting",
    description:
      "Luminaires within the primary sidelit daylight zone (adjacent to vertical fenestration) are controlled by daylight-responsive controls that reduce lighting power as daylight contribution increases.",
    applicabilityNotes:
      "Required only where the sidelit zone thresholds of §9.4.1.1(e) are met. See §9.4.1.1 Footnote 6 in Table 9.6.1.",
  },
  daylight_toplighting: {
    id: "daylight_toplighting",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(f)",
    shortName: "Daylight-responsive — toplighting",
    description:
      "Luminaires within daylit zones under skylights or other toplighting are controlled by daylight-responsive controls that reduce lighting power as daylight contribution increases.",
    applicabilityNotes:
      "Required only where the toplit zone thresholds of §9.4.1.1(f) are met. See §9.4.1.1 Footnote 6 in Table 9.6.1.",
  },
  auto_partial_off: {
    id: "auto_partial_off",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(g)",
    shortName: "Automatic partial-off",
    description:
      "Within 20 minutes of all occupants leaving the space, lighting automatically reduces to 50% or less of full power (not fully off).",
  },
  auto_full_off: {
    id: "auto_full_off",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(h)",
    shortName: "Automatic full-off",
    description:
      "Within 20 minutes of all occupants leaving the space, lighting automatically turns fully off.",
  },
  scheduled_shutoff: {
    id: "scheduled_shutoff",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(i)",
    shortName: "Scheduled shutoff",
    description:
      "A time-of-day schedule automatically shuts lighting off during unoccupied hours. Occupants can override to restore lighting for a limited period.",
  },
  plug_load_842: {
    id: "plug_load_842",
    source: "ASHRAE-90.1-2019",
    section: "8.4.2",
    shortName: "Automatic receptacle control",
    description:
      "At least 50% of 125V 15- and 20-A receptacles in the space (and 25% of branch-circuit feeders for modular furniture) are automatically controlled by time-of-day schedule, occupancy sensor, or another automated signal — within 20 minutes of vacancy. Controlled receptacles are permanently marked to distinguish them.",
    applicabilityNotes:
      "Per §8.4.2, applies to private offices, conference rooms, print/copy rooms, break rooms, classrooms, and individual workstations. Exceptions: 24/7 continuous-operation equipment; spaces where auto-shutoff would affect safety or security.",
  },
};

/** Array form — stable enumeration order for UI rendering. */
export const CONTROL_COLUMN_ORDER: ControlColumnId[] = [
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

export function requirementById(id: string): Requirement | undefined {
  return REQUIREMENTS[id as keyof typeof REQUIREMENTS];
}
