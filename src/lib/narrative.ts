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
import {
  roomsForGroup,
  resolveDaylight,
  sidelightingTriggered,
  toplightingTriggered,
} from "@/lib/functional-groups";

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
    /** Plain-English requirement name — the headline a non-engineer reads first. */
    shortName: string;
    /** Code section reference (e.g. "9.4.1.1(a)") — rendered muted/secondary. */
    section: string;
    /** Original code description text. */
    description: string;
    /**
     * Plain-English sentence describing how this group meets the requirement
     * (or, when status is "na" / "waived", why it doesn't apply).
     */
    howMet: string;
    status: "active" | "waived" | "addition" | "na";
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

/**
 * Plain-English explanation of HOW the group meets a given requirement (or
 * why it doesn't apply). Keep these sentences concise — one per requirement
 * — so the Section 5 group cards can render a complete table on a portrait
 * page without bloating to multiple pages.
 */
function howMet(
  reqId: string,
  ctx: {
    status: "active" | "na" | "waived" | "addition";
    naReason?: string;
    waiverReason?: string;
    additionReason?: string;
    add1?: ControlColumnId | null;
    add2?: ControlColumnId[];
    add2Stacked?: boolean;
    fullOffActive?: boolean;
  },
): string {
  if (ctx.status === "waived") {
    return ctx.waiverReason
      ? `Waived by AHJ / owner — ${ctx.waiverReason}`
      : "Waived by AHJ / owner — see footnote.";
  }
  if (ctx.status === "na") {
    return ctx.naReason ?? "Not applicable to this group.";
  }
  if (ctx.status === "addition") {
    return ctx.additionReason
      ? `Beyond code — ${ctx.additionReason}`
      : "Beyond-code addition selected for this group.";
  }
  switch (reqId) {
    case "local_control":
      return "A wall switch at the room entry lets occupants turn lighting off at any time.";
    case "restricted_manual_on":
      return "Lighting only turns on by manual action — occupancy sensors only turn lighting off.";
    case "restricted_partial_auto_on":
      return "Occupancy sensors automatically turn on up to 50% of power; the rest needs manual action.";
    case "bilevel":
      return "Continuous dimming or stepped control with at least one intermediate level between full-on and off.";
    case "daylight_sidelighting":
      return "Daylight-responsive controls dim luminaires in the primary sidelit zone as window contribution increases.";
    case "daylight_toplighting":
      return "Daylight-responsive controls dim luminaires under skylights as toplighting contribution increases.";
    case "auto_partial_off":
      if (ctx.fullOffActive) {
        return "Met by Auto full-off — turning fully off exceeds the at-least-50% reduction this rule requires.";
      }
      return "Lighting automatically reduces to 50% or less of full power within 20 minutes of vacancy.";
    case "auto_full_off":
      return "Lighting automatically turns fully off within 20 minutes of vacancy.";
    case "scheduled_shutoff":
      return "A time-of-day schedule turns lighting off; occupants can override for a limited period.";
    case "plug_load_842":
      return "At least 50% of receptacles are automatically controlled (occupancy sensor or schedule) and permanently marked.";
  }
  return "Met per the controls strategy described above.";
}

/**
 * Cleaner, more "headline" labels for the Section 5 requirements list.
 * The `requirements.ts` shortNames are accurate but a little code-flavored
 * ("Restricted to partial auto-on", "Daylight-responsive — sidelighting"). For
 * the deliverable's first read we want them tighter and plainer. Falls back
 * to the original shortName when no override exists.
 */
const PLAIN_LABEL_OVERRIDES: Record<string, string> = {
  local_control: "Local manual control",
  restricted_manual_on: "Manual-on only (occupancy)",
  restricted_partial_auto_on: "Partial auto-on (occupancy)",
  bilevel: "Bilevel / dimming control",
  daylight_sidelighting: "Daylight-responsive sidelighting",
  daylight_toplighting: "Daylight-responsive toplighting",
  auto_partial_off: "Automatic partial-off",
  auto_full_off: "Automatic full-off",
  scheduled_shutoff: "Scheduled shutoff",
  plug_load_842: "Automatic receptacle control",
};
function plainLabel(reqId: string, fallback: string): string {
  return PLAIN_LABEL_OVERRIDES[reqId] ?? fallback;
}

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

  // Daylight — §9.4.1.1(e) and (f) only activate when the space type has the REQ
  // AND the group has the matching glazing AND the zone exceeds 150 W connected.
  const hasSideReq = reqSet.has("daylight_sidelighting") && !waivedIds.has("daylight_sidelighting");
  const hasTopReq = reqSet.has("daylight_toplighting") && !waivedIds.has("daylight_toplighting");
  const sideActive = hasSideReq && sidelightingTriggered(group, spaceType);
  const topActive = hasTopReq && toplightingTriggered(group, spaceType);
  const dl = resolveDaylight(group);

  if (sideActive || topActive) {
    const zones: string[] = [];
    if (sideActive) zones.push("primary sidelit zone");
    if (topActive) zones.push("toplit zone");
    sentences.push(
      `Daylight-responsive controls automatically reduce power in the ${zones.join(" and ")} as daylight contribution increases.`,
    );
  } else {
    // REQ exists but not triggered — explain why (so the narrative reads intentional, not incomplete).
    const reasons: string[] = [];
    if (hasSideReq && !dl.hasWindows) reasons.push("no windows");
    if (hasSideReq && dl.hasWindows && !group.sidelightPowerOver150W) {
      reasons.push("sidelit zone is below the 150 W §9.4.1.1(e) threshold");
    }
    if (hasTopReq && !dl.hasSkylights) reasons.push("no skylights");
    if (hasTopReq && dl.hasSkylights && !group.toplightPowerOver150W) {
      reasons.push("toplit zone is below the 150 W §9.4.1.1(f) threshold");
    }
    if (reasons.length > 0) {
      sentences.push(
        `Daylight-responsive controls are not triggered — ${reasons.join(" and ")}.`,
      );
    }
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
    // Daylight §e/§f stay on the list even when not triggered, but flip to
    // status "na" with a plain-English reason. Reviewers see we considered
    // the requirement and *why* it doesn't apply.
    if (req.id === "daylight_sidelighting" && !sidelightingTriggered(group, spaceType)) {
      requirementLines.push({
        requirementId: req.id,
        shortName: plainLabel(req.id, req.shortName),
        section: req.section,
        description: req.description,
        status: "na",
        howMet: howMet(req.id, {
          status: "na",
          naReason: !dl.hasWindows
            ? "No windows in this group, so daylight controls are not required here."
            : "Sidelit zone is below the 150 W threshold in §9.4.1.1(e), so controls are not required.",
        }),
      });
      continue;
    }
    if (req.id === "daylight_toplighting" && !toplightingTriggered(group, spaceType)) {
      requirementLines.push({
        requirementId: req.id,
        shortName: plainLabel(req.id, req.shortName),
        section: req.section,
        description: req.description,
        status: "na",
        howMet: howMet(req.id, {
          status: "na",
          naReason: !dl.hasSkylights
            ? "No skylights in this group, so toplighting controls are not required here."
            : "Toplit zone is below the 150 W threshold in §9.4.1.1(f), so controls are not required.",
        }),
      });
      continue;
    }
    const waiver = group.waivers.find((w) => w.requirementId === a.requirementId);
    if (waiver) {
      requirementLines.push({
        requirementId: req.id,
        shortName: plainLabel(req.id, req.shortName),
        section: req.section,
        description: req.description,
        status: "waived",
        howMet: howMet(req.id, { status: "waived", waiverReason: waiver.reason }),
        footnoteNumber: waiverFootnote(waiver),
      });
    } else if (req.id === "auto_partial_off" && fullOffActive) {
      // Partial-off requirement is satisfied by full-off — log for transparency.
      requirementLines.push({
        requirementId: req.id,
        shortName: plainLabel(req.id, req.shortName),
        section: req.section,
        description: `${req.description} Satisfied by the Auto full-off control — turning off is a 100% reduction, which meets §9.4.1.1(g)'s ≥50% threshold.`,
        status: "active",
        howMet: howMet(req.id, { status: "active", fullOffActive: true }),
      });
    } else {
      requirementLines.push({
        requirementId: req.id,
        shortName: plainLabel(req.id, req.shortName),
        section: req.section,
        description: req.description,
        status: "active",
        howMet: howMet(req.id, { status: "active" }),
      });
    }
  }

  // Selected ADD1
  const add1Waiver = group.waivers.find((w) => w.requirementId === "add1_set");
  const hasAdd1Column = applicable.some((a) => a.applicability === "ADD1");
  if (add1Waiver) {
    requirementLines.push({
      requirementId: "add1_set",
      shortName: "Occupancy strategy",
      section: "9.4.1.1(b)/(c)",
      description: "AHJ / owner override — restricted-on occupancy requirement waived for this group.",
      status: "waived",
      howMet: howMet("", { status: "waived", waiverReason: add1Waiver.reason }),
      footnoteNumber: waiverFootnote(add1Waiver, "ADD1 occupancy strategy"),
    });
  } else if (group.add1Selection) {
    const req = requirementById(group.add1Selection);
    if (req) {
      requirementLines.push({
        requirementId: req.id,
        shortName: plainLabel(req.id, req.shortName),
        section: req.section,
        description: req.description,
        status: "active",
        howMet: howMet(req.id, { status: "active" }),
      });
    }
  } else if (hasAdd1Column) {
    requirementLines.push({
      requirementId: "add1_set",
      shortName: "Occupancy strategy",
      section: "9.4.1.1(b)/(c)",
      description: "Pick one occupancy strategy from §9.4.1.1(b) or (c) for this group.",
      status: "na",
      howMet: "Not yet selected — choose Manual-on or Partial auto-on for this group on the Groups page.",
    });
  }

  // Selected ADD2
  const add2Waiver = group.waivers.find((w) => w.requirementId === "add2_set");
  const hasAdd2Column = applicable.some((a) => a.applicability === "ADD2");
  if (add2Waiver) {
    requirementLines.push({
      requirementId: "add2_set",
      shortName: "Automatic shutoff",
      section: "9.4.1.1(g)/(h)/(i)",
      description: "AHJ / owner override — automatic shutoff requirement waived for this group.",
      status: "waived",
      howMet: howMet("", { status: "waived", waiverReason: add2Waiver.reason }),
      footnoteNumber: waiverFootnote(add2Waiver, "ADD2 shutoff behavior"),
    });
  } else if (group.add2Selections.length > 0) {
    for (const col of group.add2Selections) {
      const req = requirementById(col);
      if (req) {
        requirementLines.push({
          requirementId: req.id,
          shortName: plainLabel(req.id, req.shortName),
          section: req.section,
          description: req.description,
          status: "active",
          howMet: howMet(req.id, { status: "active" }),
        });
      }
    }
  } else if (hasAdd2Column) {
    requirementLines.push({
      requirementId: "add2_set",
      shortName: "Automatic shutoff",
      section: "9.4.1.1(g)/(h)/(i)",
      description: "Pick one shutoff strategy from §9.4.1.1(g)/(h)/(i) for this group.",
      status: "na",
      howMet: "Not yet selected — choose Auto full-off, Scheduled shutoff, or Auto partial-off on the Groups page.",
    });
  }

  // Plug load
  if (spaceType?.plugLoadControl842) {
    const waiver = group.waivers.find((w) => w.requirementId === "plug_load_842");
    const req = REQUIREMENTS.plug_load_842;
    if (waiver) {
      requirementLines.push({
        requirementId: req.id,
        shortName: plainLabel(req.id, req.shortName),
        section: req.section,
        description: req.description,
        status: "waived",
        howMet: howMet(req.id, { status: "waived", waiverReason: waiver.reason }),
        footnoteNumber: waiverFootnote(waiver),
      });
    } else {
      requirementLines.push({
        requirementId: req.id,
        shortName: plainLabel(req.id, req.shortName),
        section: req.section,
        description: req.description,
        status: "active",
        howMet: howMet(req.id, { status: "active" }),
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
      howMet: howMet("", { status: "addition", additionReason: add.reason || add.description }),
      additionNote: add.reason,
    });
  }

  // Designer-choice summary lines
  const designerLines: string[] = [];
  if (dc.sensorType) {
    const parts: string[] = [dc.sensorType];
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
