import type { BuildingTemplate } from "@/lib/types";

/**
 * MVP building templates. Per §4.3 of the spec: 5 templates covering A+'s
 * core design-build customer base.
 *
 * TODO: flesh out typical rooms for each template with realistic counts/sizes
 * once the full space-type library is seeded. These stubs exist to exercise
 * the UI and the "start from template" flow.
 */
export const BUILDING_TEMPLATES: BuildingTemplate[] = [
  {
    id: "tpl_warehouse",
    name: "Warehouse / Distribution",
    description:
      "Distribution center or storage warehouse. Bulk storage aisles, loading docks, limited office space.",
    typicalRooms: [
      { name: "Warehouse Storage", typicalCount: 1, typicalSizeSqft: 40000, spaceTypeId: "warehouse_bulk" },
      { name: "Shipping/Receiving Office", typicalCount: 1, typicalSizeSqft: 200, spaceTypeId: "office_enclosed_small" },
      { name: "Breakroom", typicalCount: 1, typicalSizeSqft: 300, spaceTypeId: "lounge_breakroom_all_other" },
      { name: "Restroom", typicalCount: 2, typicalSizeSqft: 120, spaceTypeId: "restroom_all_other" },
    ],
    typicalOutdoorZones: {
      parking: { lightingZone: "LZ2" },
      facadeWallPacks: { lightingZone: "LZ2" },
      loadingDock: { lightingZone: "LZ2" },
    },
    defaults: {
      systemArchitecture: {
        systemType: "networked-wired",
        wiringApproach: "Room-by-room panels with occupancy + multi-level dimming.",
      },
      commissioning: { defaultVacancyTimerMin: 20 },
      occupancyStrategy: "auto-on",
    },
  },
  {
    id: "tpl_light_industrial",
    name: "Light Industrial / Manufacturing",
    description:
      "Light manufacturing, assembly, or fabrication. Mix of production floor, support offices, and storage.",
    typicalRooms: [
      // TODO: seed typical rooms
    ],
    typicalOutdoorZones: {},
    defaults: {
      systemArchitecture: { systemType: "networked-wired" },
      commissioning: { defaultVacancyTimerMin: 20 },
      occupancyStrategy: "auto-on",
    },
  },
  {
    id: "tpl_office",
    name: "Office",
    description: "Commercial office building with private offices, open work areas, conferences, and support spaces.",
    typicalRooms: [
      // TODO: seed typical rooms
    ],
    typicalOutdoorZones: {},
    defaults: {
      systemArchitecture: { systemType: "networked-wireless" },
      commissioning: { defaultVacancyTimerMin: 20 },
      occupancyStrategy: "manual-on",
    },
  },
  {
    id: "tpl_k12_school",
    name: "K-12 School",
    description: "Elementary, middle, or high school with classrooms, labs, gymnasium, cafeteria, and administration.",
    typicalRooms: [
      // TODO: seed typical rooms
    ],
    typicalOutdoorZones: {},
    defaults: {
      systemArchitecture: { systemType: "networked-wired" },
      commissioning: { defaultVacancyTimerMin: 20 },
      occupancyStrategy: "manual-on",
    },
  },
  {
    id: "tpl_retail",
    name: "Retail",
    description: "Storefront or big-box retail. Sales floor, back-of-house, fitting rooms, restrooms.",
    typicalRooms: [
      // TODO: seed typical rooms
    ],
    typicalOutdoorZones: {},
    defaults: {
      systemArchitecture: { systemType: "networked-wired" },
      commissioning: { defaultVacancyTimerMin: 15 },
      occupancyStrategy: "auto-on",
    },
  },
];

export function buildingTemplateById(id: string): BuildingTemplate | undefined {
  return BUILDING_TEMPLATES.find((t) => t.id === id);
}
