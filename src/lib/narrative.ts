import type {
  ControlColumnId,
  FunctionalGroup,
  OutdoorZoneConfig,
  OutdoorZoneType,
  Project,
  Room,
  SpaceType,
  Waiver,
} from "@/lib/types";
import { spaceTypeById, applicableRequirements } from "@/data/space-types";
import { requirementById, REQUIREMENTS } from "@/data/requirements";
import { iesTargetById } from "@/data/ies-targets";
import { roomsForGroup } from "@/lib/functional-groups";

/**
 * Output for a single functional group — everything the document renderer
 * needs to lay out the group's sequence-of-operation section.
 */
export interface GroupNarrative {
  group: FunctionalGroup;
  spaceType: SpaceType | undefined;
  rooms: Room[];
  totalSqft: number;
  /** Plain-English paragraph composed from the group's selections + additions. */
  sequenceParagraph: string;
  /** Bullet-form requirement list, with a "waived" flag per item. */
  requirementLines: Array<{
    requirementId: string;
    shortName: string;
    section: string;
    description: string;
    status: "active" | "waived" | "addition";
    /** If waived, footnote number to show after the line. */
    footnoteNumber?: number;
    /** If this is an addition, note beyond-code context. */
    additionNote?: string;
  }>;
  /** Designer choices bullet list. */
  designerLines: string[];
  /** IES target summary for the group. */
  iesSummary: string | null;
  /** Footnotes referenced by requirementLines, in order. */
  footnotes: Array<{ number: number; text: string }>;
}

const COLUMN_NAMES: Record<ControlColumnId, string> = {
  local_control: "local manual control",
  restricted_manual_on: "manual-on (auto-off only)",
  restricted_partial_auto_on: "partial auto-on (≤50%)",
  bilevel: "bilevel or continuous dimming",
  daylight_sidelighting: "daylight-responsive sidelighting controls",
  daylight_toplighting: "daylight-responsive toplighting controls",
  auto_partial_off: "automatic partial-off to ≤50% after 20-minute vacancy",
  auto_full_off: "automatic full-off after 20-minute vacancy",
  scheduled_shutoff: "scheduled shutoff with occupant override",
};

function formatWaiver(w: Waiver, fallbackName?: string): string {
  const parts: string[] = [];
  const req = w.requirementId === "add1_set" || w.requirementId === "add2_set"
    ? fallbackName ?? w.requirementId
    : requirementById(w.requirementId)?.shortName ?? fallbackName ?? w.requirementId;
  parts.push(`${req} waived — ${w.reason.trim()}`);
  const meta: string[] = [];
  if (w.authority) meta.push(w.authority);
  if (w.dateIso) meta.push(new Date(w.dateIso).toISOString().slice(0, 10));
  if (meta.length > 0) parts.push(`(${meta.join(" · ")})`);
  return parts.join(" ");
}

export function groupNarrative(project: Project, group: FunctionalGroup): GroupNarrative {
  const spaceType = spaceTypeById(group.spaceTypeId);
  const rooms = roomsForGroup(project, group);
  const totalSqft = rooms.reduce((s, r) => s + (r.sizeSqft || 0), 0);
  const applicable = spaceType ? applicableRequirements(spaceType) : [];
  const waivedIds = new Set(group.waivers.map((w) => w.requirementId));

  // Build the narrative paragraph.
  const sentences: string[] = [];
  if (rooms.length > 0 && spaceType) {
    sentences.push(
      `This group covers ${rooms.length} ${rooms.length === 1 ? "room" : "rooms"} totaling ${totalSqft.toLocaleString()} ft² of ${spaceType.name.toLowerCase()} at an allowable LPD of ${spaceType.lpdWattsPerSqft.toFixed(2)} W/ft².`,
    );
  } else if (spaceType) {
    sentences.push(`${spaceType.name} — allowable LPD ${spaceType.lpdWattsPerSqft.toFixed(2)} W/ft².`);
  }

  const reqSet = new Set(
    applicable.filter((a) => a.applicability === "REQ").map((a) => a.requirementId),
  );

  // Local control is almost always REQ
  if (reqSet.has("local_control") && !waivedIds.has("local_control")) {
    sentences.push(
      "Each space provides a readily accessible manual control allowing occupants to turn lighting off at any time.",
    );
  }

  // Occupancy behavior (ADD1 selection, or waived)
  if (group.waivers.some((w) => w.requirementId === "add1_set")) {
    sentences.push(
      "Per AHJ / owner ruling, the code's restricted-on occupancy requirement is waived for this group — see footnote.",
    );
  } else if (group.add1Selection) {
    sentences.push(
      `Occupancy strategy: ${COLUMN_NAMES[group.add1Selection]}. Occupancy or vacancy sensors detect presence; lighting does not auto-activate above the permitted threshold.`,
    );
  } else if (applicable.some((a) => a.applicability === "ADD1")) {
    sentences.push(
      "Occupancy strategy: none selected — pick one in the Groups page before exporting.",
    );
  } else {
    sentences.push(
      "Code does not restrict occupancy behavior for this space type — automatic-on operation is acceptable.",
    );
  }

  // Shutoff behavior (ADD2)
  if (group.waivers.some((w) => w.requirementId === "add2_set")) {
    sentences.push(
      "Per AHJ / owner ruling, the code's automatic shutoff requirement is waived for this group — see footnote.",
    );
  } else if (group.add2Selections.length > 0) {
    const names = group.add2Selections.map((c) => COLUMN_NAMES[c]);
    if (group.add2Stacked && names.length > 1) {
      sentences.push(`Shutoff: ${names.join(" plus ")} are both implemented together.`);
    } else {
      sentences.push(`Shutoff: ${names.join(" or ")}.`);
    }
  }

  // Bilevel
  if (reqSet.has("bilevel") && !waivedIds.has("bilevel")) {
    sentences.push("Luminaires support bilevel or continuous dimming per §9.4.1.1(d).");
  }

  // Daylight
  const hasSide = reqSet.has("daylight_sidelighting") && !waivedIds.has("daylight_sidelighting");
  const hasTop = reqSet.has("daylight_toplighting") && !waivedIds.has("daylight_toplighting");
  if (group.daylightZone && (hasSide || hasTop)) {
    const zones: string[] = [];
    if (hasSide) zones.push("primary sidelit zone");
    if (hasTop) zones.push("toplit zone");
    sentences.push(
      `Daylight-responsive controls automatically reduce power in the ${zones.join(" and ")} as daylight contribution increases.`,
    );
  } else if (hasSide || hasTop) {
    sentences.push(
      "Daylight-responsive controls are required by Table 9.6.1 where sidelit or toplit zone thresholds are met; verify against the project's fenestration.",
    );
  }

  // Plug load
  if (spaceType?.plugLoadControl842 && !waivedIds.has("plug_load_842")) {
    sentences.push(
      "At least 50% of 125V 15/20-A receptacles are automatically controlled by occupancy sensor or time-of-day schedule per §8.4.2, with controlled outlets permanently marked.",
    );
  }

  // Designer choices
  const dc = group.designerChoices;
  if (dc.sensorType) {
    const mount = dc.sensorMounting ? `${dc.sensorMounting}-mounted ` : "";
    sentences.push(`Sensor technology: ${mount}${dc.sensorType.replace("-", " ")}.`);
  }
  if (dc.dimmingProtocol) {
    sentences.push(`Dimming protocol: ${dc.dimmingProtocol}.`);
  }
  if (dc.plugLoadStrategy) {
    const strat = dc.plugLoadStrategy === "receptacle-level" ? "receptacle-level" : "room controller";
    sentences.push(`Plug-load strategy: ${strat}.`);
  }

  // Additions
  for (const add of group.additions) {
    sentences.push(`Beyond-code: ${add.featureName}${add.description && add.description !== add.featureName ? ` — ${add.description}` : ""}.`);
  }

  // Build requirement lines + footnotes
  const requirementLines: GroupNarrative["requirementLines"] = [];
  const footnotes: GroupNarrative["footnotes"] = [];
  let footnoteCounter = 0;

  function waiverFootnote(waiver: Waiver, label?: string): number {
    footnoteCounter += 1;
    footnotes.push({ number: footnoteCounter, text: formatWaiver(waiver, label) });
    return footnoteCounter;
  }

  // Subsumption: Auto full-off (h) satisfies Auto partial-off (g). When h is
  // REQ or the user has picked it as an ADD2, annotate g as "satisfied by
  // full-off" so a reviewer sees the partial-off was acknowledged but no
  // duplicate control device is implied.
  const fullOffActive =
    spaceType?.controls.auto_full_off === "REQ" ||
    group.add2Selections.includes("auto_full_off");

  // REQ items
  for (const a of applicable.filter((x) => x.applicability === "REQ")) {
    const req = requirementById(a.requirementId);
    if (!req) continue;
    const waiver = group.waivers.find((w) => w.requirementId === a.requirementId);
    if (waiver) {
      requirementLines.push({
        requirementId: req.id,
        shortName: req.shortName,
        section: req.section,
        description: req.description,
        status: "waived",
        footnoteNumber: waiverFootnote(waiver),
      });
    } else if (req.id === "auto_partial_off" && fullOffActive) {
      // Partial-off requirement is satisfied by full-off — log for transparency.
      requirementLines.push({
        requirementId: req.id,
        shortName: req.shortName,
        section: req.section,
        description: `${req.description} Satisfied by the Auto full-off control — turning off is a 100% reduction, which meets §9.4.1.1(g)'s ≥50% threshold.`,
        status: "active",
      });
    } else {
      requirementLines.push({
        requirementId: req.id,
        shortName: req.shortName,
        section: req.section,
        description: req.description,
        status: "active",
      });
    }
  }

  // Selected ADD1
  const add1Waiver = group.waivers.find((w) => w.requirementId === "add1_set");
  if (add1Waiver) {
    requirementLines.push({
      requirementId: "add1_set",
      shortName: "Occupancy strategy (ADD1)",
      section: "9.4.1.1(b)/(c)",
      description: "AHJ / owner override — restricted-on occupancy requirement waived for this group.",
      status: "waived",
      footnoteNumber: waiverFootnote(add1Waiver, "ADD1 occupancy strategy"),
    });
  } else if (group.add1Selection) {
    const req = requirementById(group.add1Selection);
    if (req) {
      requirementLines.push({
        requirementId: req.id,
        shortName: req.shortName,
        section: req.section,
        description: req.description,
        status: "active",
      });
    }
  }

  // Selected ADD2
  const add2Waiver = group.waivers.find((w) => w.requirementId === "add2_set");
  if (add2Waiver) {
    requirementLines.push({
      requirementId: "add2_set",
      shortName: "Shutoff behavior (ADD2)",
      section: "9.4.1.1(g)/(h)/(i)",
      description: "AHJ / owner override — automatic shutoff requirement waived for this group.",
      status: "waived",
      footnoteNumber: waiverFootnote(add2Waiver, "ADD2 shutoff behavior"),
    });
  } else {
    for (const col of group.add2Selections) {
      const req = requirementById(col);
      if (req) {
        requirementLines.push({
          requirementId: req.id,
          shortName: req.shortName,
          section: req.section,
          description: req.description,
          status: "active",
        });
      }
    }
  }

  // Plug load
  if (spaceType?.plugLoadControl842) {
    const waiver = group.waivers.find((w) => w.requirementId === "plug_load_842");
    const req = REQUIREMENTS.plug_load_842;
    if (waiver) {
      requirementLines.push({
        requirementId: req.id,
        shortName: req.shortName,
        section: req.section,
        description: req.description,
        status: "waived",
        footnoteNumber: waiverFootnote(waiver),
      });
    } else {
      requirementLines.push({
        requirementId: req.id,
        shortName: req.shortName,
        section: req.section,
        description: req.description,
        status: "active",
      });
    }
  }

  // Additions
  for (const add of group.additions) {
    requirementLines.push({
      requirementId: `add_${add.id}`,
      shortName: add.featureName,
      section: "Beyond code",
      description: add.description,
      status: "addition",
      additionNote: add.reason,
    });
  }

  // Designer-choice summary lines
  const designerLines: string[] = [];
  if (dc.sensorType) {
    const parts = [dc.sensorType];
    if (dc.sensorMounting) parts.push(`${dc.sensorMounting}-mount`);
    designerLines.push(`Sensor: ${parts.join(", ")}`);
  }
  if (dc.dimmingProtocol) designerLines.push(`Dimming: ${dc.dimmingProtocol}`);
  if (dc.plugLoadStrategy) designerLines.push(`Plug-load: ${dc.plugLoadStrategy}`);

  // IES summary
  const ies = spaceType ? iesTargetById(spaceType.iesTargetId) : undefined;
  const iesSummary = ies
    ? `${ies.horizontalFc} fc horizontal · uniformity ${ies.uniformityRatio.toFixed(1)}${ies.source ? ` (${ies.source})` : ""}`
    : null;

  return {
    group,
    spaceType,
    rooms,
    totalSqft,
    sequenceParagraph: sentences.join(" "),
    requirementLines,
    designerLines,
    iesSummary,
    footnotes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Outdoor narrative
// ─────────────────────────────────────────────────────────────────────────────

export const OUTDOOR_ZONE_LABELS: Record<OutdoorZoneType, string> = {
  parking: "Parking lots and drives",
  facadeWallPacks: "Façade / wall packs",
  canopy: "Entrance canopies",
  grounds: "Grounds / landscape",
  signage: "Signage",
  loadingDock: "Loading docks",
};

/**
 * §9.4.2 narrative snippet for an outdoor zone. Includes photocell + astro
 * time clock + LZ-driven reductions and curfew, as applicable to the zone type.
 */
export function outdoorZoneNarrative(type: OutdoorZoneType, cfg: OutdoorZoneConfig): string {
  const lz = cfg.lightingZone;
  const parts: string[] = [];

  // Base: §9.4.2.1 automatic control
  parts.push(
    "All lighting is automatically controlled by a photocell in series with an astronomical time clock, keeping lighting off during daylight hours and off overnight during unoccupied periods.",
  );

  // Curfew and reductions (§9.4.2.2) — not applicable to LZ0 (off) or signage
  if (type === "signage") {
    parts.push(
      `Signage lighting is automatically turned off from ~1 hour after business closing until ~1 hour before business opening, per §9.4.2 signage requirements for ${lz}.`,
    );
  } else if (lz === "LZ0") {
    parts.push("LZ0 permits no outdoor lighting. Temporary or emergency use only.");
  } else {
    parts.push(
      `Between the time of business closure and 6 a.m. (or as defined for ${lz}), lighting power is automatically reduced by at least 30% via step-dimming or occupancy sensing at low-activity fixtures, except where required for safety. Full restoration occurs at dawn via the photocell.`,
    );
  }

  // Type-specific notes
  if (type === "parking") {
    parts.push(
      "Parking lot luminaires include motion-based reduction: fixtures dim to ≤50% within 15 minutes of no detected motion within their control zone.",
    );
  }
  if (type === "facadeWallPacks") {
    parts.push("Façade / wall-pack fixtures follow the same astro-time and curfew schedule, with manual override only for maintenance.");
  }
  if (type === "canopy") {
    parts.push(
      `Canopy luminaires automatically reduce by at least 50% within 15 minutes of no detected activity under the canopy, consistent with ${lz} requirements.`,
    );
  }
  if (type === "grounds") {
    parts.push("Grounds / landscape lighting shuts off at curfew and is not operated during daylight hours.");
  }
  if (type === "loadingDock") {
    parts.push(
      "Loading dock lighting is occupancy-controlled; lighting automatically shuts off within 15 minutes of the last detected occupancy event at the dock.",
    );
  }

  // Project-specific notes (user-entered)
  if (cfg.notes?.trim()) parts.push(`Project note: ${cfg.notes.trim()}`);

  return parts.join(" ");
}

export function formatOutdoorSize(cfg: OutdoorZoneConfig): string | null {
  if (cfg.sizeValue && cfg.sizeValue > 0) {
    const unit = cfg.sizeUnit ?? "sf";
    return `${cfg.sizeValue.toLocaleString()} ${unit}`;
  }
  return null;
}
