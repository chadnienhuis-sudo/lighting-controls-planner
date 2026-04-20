import { nanoid } from "nanoid";
import { spaceTypeById } from "@/data/space-types";
import type {
  ControlColumnId,
  FunctionalGroup,
  Project,
  Room,
  SpaceType,
} from "@/lib/types";

const LABEL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Preferred default pick order for each ADD set.
// ADD1: manual-on preferred over partial-auto-on per Chad's design direction.
// ADD2: auto-full-off preferred over scheduled-shutoff over auto-partial-off.
const ADD1_PREFERENCE: ControlColumnId[] = ["restricted_manual_on", "restricted_partial_auto_on"];
const ADD2_PREFERENCE: ControlColumnId[] = ["auto_full_off", "scheduled_shutoff", "auto_partial_off"];

function pickDefault(st: SpaceType | undefined, preference: ControlColumnId[], applicability: "ADD1" | "ADD2"): ControlColumnId | null {
  if (!st) return null;
  for (const col of preference) {
    if (st.controls[col] === applicability) return col;
  }
  // Fallback: any column marked with the requested applicability
  for (const col of Object.keys(st.controls) as ControlColumnId[]) {
    if (st.controls[col] === applicability) return col;
  }
  return null;
}

/**
 * MVP grouping rule: one functional group per ASHRAE space type.
 * ADD1/ADD2 selections default to the preferred control per Chad's design
 * direction (manual-on, auto-full-off). For space types with no ADD1
 * columns (e.g. restroom, mechanical), add1Selection is null and the code
 * permits any occupancy strategy.
 */
export function autoGenerateGroups(rooms: Room[]): FunctionalGroup[] {
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
    const add1 = pickDefault(st, ADD1_PREFERENCE, "ADD1");
    const add2 = pickDefault(st, ADD2_PREFERENCE, "ADD2");
    return {
      id: `fg_${nanoid(8)}`,
      label: LABEL_ALPHABET[i] ?? `G${i + 1}`,
      description: st?.name ?? spaceTypeId,
      spaceTypeId,
      daylightZone: false,
      add1Selection: add1,
      add2Selections: add2 ? [add2] : [],
      add2Stacked: false,
      waivers: [],
      additions: [],
      designerChoices: {},
    };
  });
}

/**
 * Regenerate groups from the current room set, preserving user overrides
 * (waivers, additions, designer choices, ADD selections, splitting factors)
 * for groups whose space type still has at least one room.
 */
export function regenerateFunctionalGroups(
  project: Project,
): { groups: FunctionalGroup[]; roomGroupIds: Record<string, string> } {
  const fresh = autoGenerateGroups(project.rooms);
  const existingByType = new Map(project.functionalGroups.map((g) => [g.spaceTypeId, g]));

  const merged = fresh.map((f) => {
    const prev = existingByType.get(f.spaceTypeId);
    if (!prev) return f;
    return {
      ...f,
      id: prev.id,
      label: prev.label,
      daylightZone: prev.daylightZone,
      add1Selection: prev.add1Selection ?? f.add1Selection,
      add2Selections: prev.add2Selections ?? f.add2Selections,
      add2Stacked: prev.add2Stacked ?? f.add2Stacked,
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

/**
 * Effective settings for a room — per-room overrides win over group defaults.
 * Use this whenever you render a room's behavior (schedule table, SOO, narrative).
 */
export interface ResolvedRoomSettings {
  daylightZone: boolean;
  add1Selection: ControlColumnId | null;
  add2Selections: ControlColumnId[];
  add2Stacked: boolean;
  /** All waivers that apply to the room — group-level + room-level combined. */
  waivers: Array<{ requirementId: string; reason: string; authority?: string; dateIso?: string; scope: "group" | "room" }>;
  /** True if any override field is set (used for the "customized" badge). */
  hasOverrides: boolean;
}

export function resolveRoomSettings(room: Room, group: FunctionalGroup): ResolvedRoomSettings {
  const o = room.overrides;
  const groupWaivers = group.waivers.map((w) => ({ ...w, scope: "group" as const }));
  const roomWaivers = (o?.waivers ?? []).map((w) => ({ ...w, scope: "room" as const }));
  return {
    daylightZone: o?.daylightZone ?? group.daylightZone,
    add1Selection: o?.add1Selection !== undefined ? o.add1Selection : group.add1Selection,
    add2Selections: o?.add2Selections ?? group.add2Selections,
    add2Stacked: o?.add2Stacked ?? group.add2Stacked,
    waivers: [...groupWaivers, ...roomWaivers],
    hasOverrides: hasRoomOverrides(room),
  };
}

export function hasRoomOverrides(room: Room): boolean {
  const o = room.overrides;
  if (!o) return false;
  return (
    o.daylightZone !== undefined ||
    o.add1Selection !== undefined ||
    o.add2Selections !== undefined ||
    o.add2Stacked !== undefined ||
    (o.waivers?.length ?? 0) > 0 ||
    (o.roomNote?.trim().length ?? 0) > 0
  );
}
