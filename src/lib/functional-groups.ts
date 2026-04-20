import { nanoid } from "nanoid";
import { spaceTypeById } from "@/data/space-types";
import type {
  FunctionalGroup,
  OccupancyStrategy,
  Project,
  Room,
} from "@/lib/types";

const LABEL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface AutoGroupDefaults {
  occupancyStrategy: OccupancyStrategy;
}

/**
 * MVP grouping rule: one functional group per ASHRAE space type.
 * Splitting factors (daylightZone, plugLoadControl, occupancyStrategy) default
 * to false/project-default and the user adjusts them per group afterwards.
 * Spec §3 hints at further splitting (daylight vs interior etc.) but that
 * requires per-room info we don't collect yet — deferred.
 */
export function autoGenerateGroups(rooms: Room[], defaults: AutoGroupDefaults): FunctionalGroup[] {
  const byType = new Map<string, Room[]>();
  const orderedSpaceTypeIds: string[] = [];
  for (const r of rooms) {
    if (!byType.has(r.spaceTypeId)) {
      byType.set(r.spaceTypeId, []);
      orderedSpaceTypeIds.push(r.spaceTypeId);
    }
    byType.get(r.spaceTypeId)!.push(r);
  }

  return orderedSpaceTypeIds.map((spaceTypeId, i) => {
    const st = spaceTypeById(spaceTypeId);
    return {
      id: `fg_${nanoid(8)}`,
      label: LABEL_ALPHABET[i] ?? `G${i + 1}`,
      description: st?.name ?? spaceTypeId,
      spaceTypeId,
      daylightZone: false,
      plugLoadControl: false,
      occupancyStrategy: defaults.occupancyStrategy,
      waivers: [],
      additions: [],
      designerChoices: {},
    };
  });
}

/**
 * Regenerate groups from the current room set, preserving user overrides
 * (waivers, additions, designer choices, narrative edits, splitting factors)
 * for groups whose space type still has at least one room.
 *
 * Returns the new groups AND a mapping of roomId → groupId so the caller can
 * update rooms with their group assignment.
 */
export function regenerateFunctionalGroups(
  project: Project,
): { groups: FunctionalGroup[]; roomGroupIds: Record<string, string> } {
  const fresh = autoGenerateGroups(project.rooms, { occupancyStrategy: "auto-on" });

  // Existing groups keyed by spaceTypeId so we can merge overrides.
  const existingByType = new Map(project.functionalGroups.map((g) => [g.spaceTypeId, g]));

  const merged = fresh.map((f) => {
    const prev = existingByType.get(f.spaceTypeId);
    if (!prev) return f;
    return {
      ...f,
      id: prev.id, // keep stable id for React keys and narrative references
      label: prev.label,
      daylightZone: prev.daylightZone,
      plugLoadControl: prev.plugLoadControl,
      occupancyStrategy: prev.occupancyStrategy,
      waivers: prev.waivers,
      additions: prev.additions,
      designerChoices: prev.designerChoices,
      narrativeOverride: prev.narrativeOverride,
    };
  });

  const roomGroupIds: Record<string, string> = {};
  for (const g of merged) {
    for (const r of project.rooms) {
      if (r.spaceTypeId === g.spaceTypeId) roomGroupIds[r.id] = g.id;
    }
  }
  return { groups: merged, roomGroupIds };
}

export function roomsForGroup(project: Project, group: FunctionalGroup): Room[] {
  return project.rooms.filter((r) => r.spaceTypeId === group.spaceTypeId);
}
