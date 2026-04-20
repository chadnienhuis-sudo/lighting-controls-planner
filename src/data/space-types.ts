import type { SpaceType } from "@/lib/types";

/**
 * ASHRAE 90.1-2019 space types. MVP target is full Table 9.6.1 coverage
 * (~40 interior space types) plus the outdoor zone types used at project-level.
 *
 * TODO: seed complete Table 9.6.1 once Chad provides the standard reference.
 * Starter entries cover the most common types for UI scaffolding.
 */
export const SPACE_TYPES: SpaceType[] = [
  {
    id: "office_enclosed",
    name: "Office — Enclosed (private)",
    category: "office",
    interiorOrOutdoor: "interior",
    baseRequirementIds: ["req_manual_on", "req_auto_off", "req_multilevel_dimming"],
    iesTargetId: "ies_office_private",
    description: "Private office, typically under 250 sf, enclosed by walls.",
  },
  {
    id: "office_open",
    name: "Office — Open plan",
    category: "office",
    interiorOrOutdoor: "interior",
    baseRequirementIds: ["req_manual_on", "req_auto_off", "req_multilevel_dimming"],
    iesTargetId: "ies_office_open",
    description: "Open-plan office with multiple workstations.",
  },
  {
    id: "conference",
    name: "Conference / Meeting room",
    category: "conference",
    interiorOrOutdoor: "interior",
    baseRequirementIds: ["req_manual_on", "req_auto_off", "req_multilevel_dimming"],
    iesTargetId: "ies_conference",
  },
  {
    id: "corridor",
    name: "Corridor",
    category: "corridor",
    interiorOrOutdoor: "interior",
    baseRequirementIds: ["req_auto_off", "req_multilevel_dimming"],
    iesTargetId: "ies_corridor",
    description: "Circulation corridor connecting rooms within a building.",
  },
  {
    id: "restroom",
    name: "Restroom",
    category: "restroom",
    interiorOrOutdoor: "interior",
    baseRequirementIds: ["req_auto_off"],
    iesTargetId: "ies_restroom",
  },
  {
    id: "warehouse_storage",
    name: "Warehouse — Storage (medium to bulky material)",
    category: "warehouse",
    interiorOrOutdoor: "interior",
    baseRequirementIds: ["req_auto_off", "req_multilevel_dimming"],
    iesTargetId: "ies_warehouse_medium",
  },
  // TODO: seed remaining Table 9.6.1 entries (~35 more).
];

export function spaceTypeById(id: string): SpaceType | undefined {
  return SPACE_TYPES.find((s) => s.id === id);
}

export function interiorSpaceTypes(): SpaceType[] {
  return SPACE_TYPES.filter((s) => s.interiorOrOutdoor === "interior");
}
