import { nanoid } from "nanoid";
import { spaceTypeById } from "@/data/space-types";
import type {
  ControlColumnId,
  FunctionalGroup,
  Project,
  Room,
  RoomFixture,
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
      hasWindows: false,
      hasSkylights: false,
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

/**
 * Resolve per-group daylight flags. Prefers the new `hasWindows` /
 * `hasSkylights` fields; falls back to the legacy `daylightZone` boolean,
 * treating its `true` state as "both windows and skylights possibly apply"
 * (match the old behavior where daylightZone = true would activate any §e/§f
 * REQ from Table 9.6.1).
 */
export function resolveDaylight(group: {
  hasWindows?: boolean;
  hasSkylights?: boolean;
  daylightZone: boolean;
}): { hasWindows: boolean; hasSkylights: boolean } {
  if (group.hasWindows !== undefined || group.hasSkylights !== undefined) {
    return {
      hasWindows: !!group.hasWindows,
      hasSkylights: !!group.hasSkylights,
    };
  }
  return {
    hasWindows: !!group.daylightZone,
    hasSkylights: !!group.daylightZone,
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

// ─────────────────────────────────────────────────────────────────────────────
// Fixture resolution + LPD compliance helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the room's fixture list. Prefers the new `fixtures[]` array; falls
 * back to the legacy `fixtureCount` / `fixtureWattage` single-type pair for
 * projects saved before the multi-fixture refactor.
 */
export function resolveRoomFixtures(room: Room): RoomFixture[] {
  if (room.fixtures && room.fixtures.length > 0) return room.fixtures;
  if (room.fixtureCount && room.fixtureWattage) {
    return [
      {
        id: `legacy_${room.id}`,
        model: "",
        wattage: room.fixtureWattage,
        count: room.fixtureCount,
      },
    ];
  }
  return [];
}

/** Sum connected W across a room's fixtures. */
export function totalRoomWatts(room: Room): number {
  let w = 0;
  for (const f of resolveRoomFixtures(room)) {
    if (f.count > 0 && f.wattage > 0) w += f.count * f.wattage;
  }
  return w;
}

/** Sum fixture counts across all types in a room. */
export function totalRoomFixtureCount(room: Room): number {
  let n = 0;
  for (const f of resolveRoomFixtures(room)) {
    if (f.count > 0) n += f.count;
  }
  return n;
}

/** True when the room has at least one fixture entry with both count and wattage set. */
export function roomHasFixtures(room: Room): boolean {
  return totalRoomWatts(room) > 0;
}

/**
 * Plain-text per-room fixture breakdown for the Room Schedule.
 *   "20× LS-A8-4K @ 40 W; 5× RC-6 @ 15 W"
 * When a model tag is blank, falls back to `"20× @ 40 W"`. Returns "" when
 * the room has no usable fixtures (count or wattage missing).
 */
export function formatFixtureBreakdown(room: Room): string {
  const fixtures = resolveRoomFixtures(room);
  if (fixtures.length === 0) return "";
  const parts: string[] = [];
  for (const f of fixtures) {
    if (f.count <= 0 || f.wattage <= 0) continue;
    const model = f.model.trim();
    parts.push(
      model
        ? `${f.count}× ${model} @ ${f.wattage} W`
        : `${f.count}× @ ${f.wattage} W`,
    );
  }
  return parts.join("; ");
}

export interface LpdCheck {
  /** Total installed wattage, summed across all fixture types in the room. */
  installedWatts: number;
  /** Installed W/ft² for this room. null when area or fixtures are missing. */
  installedLpd: number | null;
  /** The Table 9.6.1 allowance for this room's space type. */
  allowance: number;
  /** "pass" | "fail" | "unknown" (missing inputs). */
  status: "pass" | "fail" | "unknown";
}

/** Per-room LPD compliance. Sums W across all fixture types. */
export function lpdCheckForRoom(room: Room, allowance: number): LpdCheck {
  const watts = totalRoomWatts(room);
  const lpd = room.sizeSqft > 0 && watts > 0 ? watts / room.sizeSqft : null;
  const hasInputs = watts > 0 && room.sizeSqft > 0;
  return {
    installedWatts: watts,
    installedLpd: lpd,
    allowance,
    status: !hasInputs ? "unknown" : lpd! <= allowance ? "pass" : "fail",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Switch / control-zone sizing (§9.4.1.1(a))
// ─────────────────────────────────────────────────────────────────────────────

export interface SwitchZoneInfo {
  /** Max ft² a single switch may control for this project. */
  zoneMaxSqft: number;
  /** Minimum number of zones required for this room (≥1). */
  minZonesRequired: number;
}

/**
 * Switch-zone sizing per §9.4.1.1(a):
 *   - Floors ≥10,000 ft² total → max 10,000 ft² per switch
 *   - Floors <10,000 ft² total → max 2,500 ft² per switch
 * A single room larger than the zone max needs multiple switches.
 */
export function switchZoneInfoForRoom(
  sizeSqft: number,
  projectTotalSqft: number,
): SwitchZoneInfo {
  const zoneMax = projectTotalSqft >= 10000 ? 10000 : 2500;
  return {
    zoneMaxSqft: zoneMax,
    minZonesRequired: sizeSqft > 0 ? Math.max(1, Math.ceil(sizeSqft / zoneMax)) : 0,
  };
}

/**
 * Group-level LPD rollup. Uses the space-building method: sum installed W,
 * divide by sum of room area, compare to the allowance. Only rooms with
 * fixture data contribute to the totals; rooms without data are left out and
 * the status is "unknown" until at least one room has inputs.
 */
export function lpdCheckForGroup(rooms: Room[], allowance: number): LpdCheck {
  let totalW = 0;
  let totalSf = 0;
  let anyFixtures = false;
  for (const r of rooms) {
    const w = totalRoomWatts(r);
    if (w > 0) {
      anyFixtures = true;
      totalW += w;
      totalSf += r.sizeSqft;
    }
  }
  const lpd = totalSf > 0 && totalW > 0 ? totalW / totalSf : null;
  return {
    installedWatts: totalW,
    installedLpd: lpd,
    allowance,
    status: !anyFixtures || lpd === null ? "unknown" : lpd <= allowance ? "pass" : "fail",
  };
}
