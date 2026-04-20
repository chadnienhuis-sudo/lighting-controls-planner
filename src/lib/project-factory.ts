import { nanoid } from "nanoid";
import type { BuildingTemplate, Project, Room } from "@/lib/types";

export interface NewProjectInput {
  name: string;
  location?: string;
}

export function createBlankProject(input: NewProjectInput): Project {
  const now = new Date().toISOString();
  return {
    id: `proj_${nanoid(10)}`,
    name: input.name,
    location: input.location,
    codeVersion: "ASHRAE-90.1-2019",
    createdAt: now,
    updatedAt: now,
    rooms: [],
    outdoorScope: { zones: {} },
    functionalGroups: [],
    basisOfDesign: {},
    systemArchitecture: { systemType: "networked-wired" },
    commissioning: { defaultVacancyTimerMin: 20 },
    sectionOverrides: {},
  };
}

export function createProjectFromTemplate(template: BuildingTemplate, input: NewProjectInput): Project {
  const base = createBlankProject(input);
  const rooms: Room[] = template.typicalRooms.flatMap((tr) => {
    return Array.from({ length: tr.typicalCount }, (_, i) => ({
      id: `rm_${nanoid(8)}`,
      number: tr.typicalCount > 1 ? `${i + 1}` : "",
      name: tr.name,
      sizeSqft: tr.typicalSizeSqft,
      spaceTypeId: tr.spaceTypeId,
      notes: tr.notes,
    }));
  });
  return {
    ...base,
    rooms,
    outdoorScope: {
      zones: Object.fromEntries(
        Object.entries(template.typicalOutdoorZones).map(([k, v]) => [
          k,
          { enabled: true, lightingZone: v!.lightingZone, notes: v!.notes },
        ]),
      ),
    },
    systemArchitecture: template.defaults.systemArchitecture,
    commissioning: template.defaults.commissioning,
  };
}
