import type { Requirement } from "@/lib/types";

/**
 * ASHRAE 90.1-2019 control requirements library.
 *
 * TODO: seed from the ASHRAE 90.1-2019 standard once Chad drops the PDF.
 * Requirement text is paraphrased per fair use; section citations link back.
 * Full Table 9.6.1 and §9.4.2 coverage planned; exceptions deferred with references only.
 *
 * Starter entries below exist to exercise the data shape and UI early.
 */
export const REQUIREMENTS: Requirement[] = [
  {
    id: "req_manual_on",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(a)",
    shortName: "Manual on",
    description:
      "Lighting shall be controlled by a manual control device that allows occupants to turn lighting off at all times.",
  },
  {
    id: "req_auto_off",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.1(d)",
    shortName: "Automatic full-off",
    description:
      "Lighting shall automatically turn off within 20 minutes of all occupants leaving the space.",
  },
  {
    id: "req_multilevel_dimming",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.2",
    shortName: "Multi-level dimming",
    description:
      "Lighting shall have at least one intermediate control step between fully on and fully off (e.g., continuous dimming or at least one intermediate step with not more than 70% of full power).",
  },
  {
    id: "req_daylight_responsive",
    source: "ASHRAE-90.1-2019",
    section: "9.4.1.4",
    shortName: "Daylight-responsive control",
    description:
      "Luminaires in primary daylighted areas shall be controlled by daylight-responsive controls that reduce lighting power as daylight contribution increases, maintaining a minimum setpoint.",
    applicabilityNotes:
      "Applies to primary daylight zones (typically within 1 window-head-height of exterior glazing); check §9.4.1.4 for precise zone geometry.",
  },
  {
    id: "req_plug_load_control",
    source: "ASHRAE-90.1-2019",
    section: "8.4.2",
    shortName: "Automatic receptacle control",
    description:
      "At least 50% of 125V 15- and 20-amp receptacles in offices, conference rooms, and similar spaces shall be automatically controlled to turn off during unoccupied periods.",
  },
  // TODO: seed full Table 9.6.1 requirements + §9.4.2 outdoor requirements.
];

export function requirementById(id: string): Requirement | undefined {
  return REQUIREMENTS.find((r) => r.id === id);
}
