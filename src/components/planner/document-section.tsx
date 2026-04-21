"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { useProjectStore } from "@/lib/project-store";
import { spaceTypeById } from "@/data/space-types";
import { requirementById } from "@/data/requirements";
import {
  resolveRoomSettings,
  lpdCheckForRoom,
  totalRoomWatts,
  formatFixtureBreakdown,
  type LpdCheck,
} from "@/lib/functional-groups";
import { BRAND } from "@/lib/brand";
import {
  groupNarrative,
  outdoorZoneNarrative,
  formatOutdoorSize,
  OUTDOOR_ZONE_LABELS,
} from "@/lib/narrative";
import type {
  FunctionalGroup,
  OutdoorZoneType,
  Project,
  Room,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Full deliverable preview. Renders the same DOM used for PDF export —
 * the Export page just triggers window.print() against this preview.
 * Print-specific layout rules live in globals.css under @media print.
 */
export function DocumentSection() {
  const project = useProjectStore((s) => s.project);

  if (!project) return null;

  return (
    <div className="px-6 md:px-10 py-8 max-w-5xl">
      <header className="mb-6 flex items-end justify-between gap-4" data-print-hide>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Document preview
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            The full controls narrative as it will appear in the exported PDF. Use
            the Export tab, or hit Print below, to render a PDF via your browser&rsquo;s
            print dialog.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4" />
          Print / Save as PDF
        </Button>
      </header>

      <DocumentBody project={project} />
    </div>
  );
}

/**
 * The printable document — everything inside the print stylesheet's `.doc-root`
 * element. Used by the Document preview page and also embedded below the Export
 * page's readiness summary so window.print() from there prints the real doc.
 */
export function DocumentBody({ project }: { project: Project }) {
  return (
    <article className="doc-root rounded-lg border border-border bg-white shadow-sm">
      <CoverBlock project={project} />
      <PageBreak />
      <BasisOfDesignBlock project={project} />
      <SystemArchitectureBlock project={project} />
      <CommissioningBlock project={project} />
      <PageBreak />
      <GroupSequencesBlock project={project} />
      <PageBreak />
      <RoomScheduleBlock project={project} />
      {Object.values(project.outdoorScope.zones).some((z) => z?.enabled) && (
        <>
          <PageBreak />
          <OutdoorBlock project={project} />
        </>
      )}
      <PageBreak />
      <GlossaryBlock />
      <DisclaimerFooter />
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cover
// ─────────────────────────────────────────────────────────────────────────────

function CoverBlock({ project }: { project: Project }) {
  const prettyDate = new Date().toISOString().slice(0, 10);
  return (
    <section className="doc-section doc-cover px-10 py-14">
      {/* Logo — internal-branding mark for MVP period. Revisit before
          public-facing / white-label exports go live. */}
      <img
        src="/logos/aplus-logo.svg"
        alt="A+ Lighting Solutions"
        className="h-12 w-auto"
      />
      <div className="mt-8 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        Prepared by
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-jet">
        {project.preparedBy?.trim() || BRAND.legalName}
      </div>
      {project.preparedBy?.trim() && (
        <div className="mt-0.5 text-sm text-muted-foreground">{BRAND.legalName}</div>
      )}
      <div className="mt-8 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        Lighting controls narrative
      </div>
      <h1 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
        {project.name}
      </h1>
      <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-3 text-sm max-w-2xl">
        {project.location && (
          <>
            <dt className="text-muted-foreground">Location</dt>
            <dd className="tabular-nums">{project.location}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Code version</dt>
        <dd className="tabular-nums">{project.codeVersion}</dd>
        <dt className="text-muted-foreground">Document date</dt>
        <dd className="tabular-nums">{prettyDate}</dd>
        <dt className="text-muted-foreground">Rooms covered</dt>
        <dd className="tabular-nums">
          {project.rooms.length} room{project.rooms.length === 1 ? "" : "s"} ·{" "}
          {project.rooms.reduce((s, r) => s + (r.sizeSqft || 0), 0).toLocaleString()} ft²
        </dd>
        <dt className="text-muted-foreground">Functional groups</dt>
        <dd className="tabular-nums">{project.functionalGroups.length}</dd>
      </dl>
      <div className="mt-14 rounded-md border border-border bg-muted/20 px-5 py-4 text-xs leading-relaxed text-muted-foreground max-w-2xl">
        <div className="font-semibold text-jet mb-1">Disclaimer</div>
        <p>
          The Lighting Controls Planner is a design aid provided by A+ Lighting Solutions, LLC to
          help users develop conceptual lighting controls designs. It is{" "}
          <strong className="text-jet">NOT</strong> a compliance certification,
          engineering stamp, or substitute for review by a licensed engineer or Authority
          Having Jurisdiction (AHJ).
        </p>
        <p className="mt-2">
          Outputs are based on ASHRAE 90.1-2019 requirements as interpreted by A+ Lighting
          Solutions, LLC. Local codes, amendments, and AHJ rulings may impose additional or different
          requirements. Users are solely responsible for verifying all outputs against
          applicable codes and for obtaining required approvals, permits, and engineer
          sign-offs prior to installation.
        </p>
        <p className="mt-2">
          A+ Lighting Solutions, LLC makes no warranty of accuracy, completeness, or fitness for any
          particular purpose. In no event shall A+ Lighting Solutions, LLC be liable for damages
          arising from use of this tool.
        </p>
        <p className="mt-2">
          Final construction documents, manufacturer approvals, and installation must be
          performed by qualified parties.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Basis of Design / Architecture / Commissioning
// ─────────────────────────────────────────────────────────────────────────────

function BasisOfDesignBlock({ project }: { project: Project }) {
  const bod = project.basisOfDesign;
  const override = project.sectionOverrides.basisOfDesign?.trim();
  return (
    <DocSection heading="1. Basis of Design">
      {override ? (
        <Prose>{override}</Prose>
      ) : (
        <>
          <Prose>
            This narrative documents the lighting controls design basis for {project.name}
            {project.location ? ` (${project.location})` : ""} in accordance with{" "}
            {project.codeVersion}. Requirements from Section 9 (lighting) of the standard
            are applied per space type per Table 9.6.1, with §8.4.2 automatic receptacle
            control applied where the space type qualifies. Outdoor controls follow §9.4.2.
          </Prose>
          {bod.occupancyHours && (
            <DefinitionRow term="Occupancy hours" desc={bod.occupancyHours} />
          )}
          {bod.additionalAssumptions && (
            <DefinitionRow term="Design assumptions" desc={bod.additionalAssumptions} />
          )}
          {bod.localAmendments && (
            <DefinitionRow
              term="Local amendments"
              desc={bod.localAmendments}
              noteClass="text-spark"
            />
          )}
          {!bod.occupancyHours && !bod.additionalAssumptions && !bod.localAmendments && (
            <Prose muted>
              No project-specific basis-of-design inputs entered. Fill them in on the
              Project page to include occupancy hours, design assumptions, and any local
              amendments in this section.
            </Prose>
          )}
        </>
      )}
    </DocSection>
  );
}

function SystemArchitectureBlock({ project }: { project: Project }) {
  const sa = project.systemArchitecture;
  const override = project.sectionOverrides.systemArchitecture?.trim();
  const prettyType: Record<string, string> = {
    standalone: "Standalone room-by-room controls",
    "networked-wired": "Networked wired controls system",
    "networked-wireless": "Networked wireless controls system",
    "bms-integrated": "Integrated with Building Management System",
    hybrid: "Hybrid — wired backbone with wireless at point-of-load",
  };
  return (
    <DocSection heading="2. System Architecture">
      {override ? (
        <Prose>{override}</Prose>
      ) : (
        <>
          <Prose>
            {prettyType[sa.systemType] ?? sa.systemType}.{" "}
            {sa.bmsIntegration
              ? "Lighting controls integrate with the project Building Management System for scheduling, occupancy sharing, and reporting."
              : "Lighting controls operate as a standalone subsystem; no BMS integration is scoped."}
          </Prose>
          {sa.wiringApproach && <DefinitionRow term="Wiring approach" desc={sa.wiringApproach} />}
          {sa.bmsIntegration && sa.bmsNotes && (
            <DefinitionRow term="BMS integration notes" desc={sa.bmsNotes} />
          )}
        </>
      )}
    </DocSection>
  );
}

function CommissioningBlock({ project }: { project: Project }) {
  const cm = project.commissioning;
  const override = project.sectionOverrides.commissioning?.trim();
  return (
    <DocSection heading="3. Commissioning & Handoff">
      {override ? (
        <Prose>{override}</Prose>
      ) : (
        <>
          <Prose>
            All occupancy / vacancy sensors are commissioned with a{" "}
            {cm.defaultVacancyTimerMin}-minute vacancy timer unless noted otherwise per
            group. Time-of-day schedules are set to match the project&rsquo;s operational
            hours. Daylight-responsive controls are calibrated with the space in its
            as-built reflectance state and target setpoints verified at desk / task
            height.
          </Prose>
          {cm.daylightCalibrationNotes && (
            <DefinitionRow
              term="Daylight calibration"
              desc={cm.daylightCalibrationNotes}
            />
          )}
          {cm.overrideBehavior && (
            <DefinitionRow term="Override behavior" desc={cm.overrideBehavior} />
          )}
          {cm.postOccupancyAdjustmentNotes && (
            <DefinitionRow
              term="Post-occupancy adjustment"
              desc={cm.postOccupancyAdjustmentNotes}
            />
          )}
        </>
      )}
    </DocSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Group sequences
// ─────────────────────────────────────────────────────────────────────────────

function GroupSequencesBlock({ project }: { project: Project }) {
  const groups = project.functionalGroups;
  return (
    <DocSection heading="4. Functional Group Sequences">
      {groups.length === 0 ? (
        <Prose muted>
          No functional groups yet. Add rooms, then visit the Groups page to generate them.
        </Prose>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <GroupSequence key={g.id} project={project} group={g} />
          ))}
        </div>
      )}
    </DocSection>
  );
}

function GroupSequence({ project, group }: { project: Project; group: FunctionalGroup }) {
  const n = useMemo(() => groupNarrative(project, group), [project, group]);
  const override = group.narrativeOverride?.trim();
  return (
    <div className="doc-group">
      <header className="flex items-baseline justify-between gap-4 mb-2 pb-1 border-b border-border">
        <h3 className="text-base font-semibold">
          <span className="inline-block mr-2 rounded bg-jet text-primary-foreground px-1.5 py-0.5 text-xs font-semibold tabular-nums">
            {group.label}
          </span>
          {group.description}
        </h3>
        <div className="text-xs text-muted-foreground tabular-nums shrink-0">
          {n.rooms.length} room{n.rooms.length === 1 ? "" : "s"} · {n.totalSqft.toLocaleString()} ft²
          {n.spaceType?.lpdWattsPerSqft ? ` · LPD ${n.spaceType.lpdWattsPerSqft.toFixed(2)} W/ft²` : ""}
        </div>
      </header>

      <Prose>{override ?? n.sequenceParagraph}</Prose>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <DocLabel>Applicable requirements</DocLabel>
          <ul className="mt-1 space-y-1 text-sm">
            {n.requirementLines.map((line) => (
              <li key={line.requirementId} className="flex gap-1.5">
                <span
                  className={cn(
                    "mt-[7px] inline-block size-1.5 rounded-full shrink-0",
                    line.status === "active" && "bg-jet",
                    line.status === "waived" && "bg-spark",
                    line.status === "addition" && "bg-infrared",
                  )}
                />
                <div className="flex-1">
                  <span className={line.status === "waived" ? "line-through text-muted-foreground" : ""}>
                    {line.shortName}
                  </span>
                  <span className="ml-1.5 text-xs text-muted-foreground">§{line.section}</span>
                  {line.footnoteNumber !== undefined && (
                    <sup className="ml-0.5 text-xs text-spark">[{line.footnoteNumber}]</sup>
                  )}
                  {line.status === "addition" && (
                    <span className="ml-1.5 text-xs text-infrared">(beyond code)</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          {n.designerLines.length > 0 && (
            <div>
              <DocLabel>Designer choices</DocLabel>
              <ul className="mt-1 space-y-0.5 text-sm">
                {n.designerLines.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
          {n.iesSummary && (
            <div>
              <DocLabel>IES targets (free tier)</DocLabel>
              <div className="mt-1 text-sm">{n.iesSummary}</div>
            </div>
          )}
          {n.rooms.length > 0 && (
            <div>
              <DocLabel>Rooms in group</DocLabel>
              <ul className="mt-1 text-xs text-muted-foreground">
                {n.rooms.map((r) => (
                  <li key={r.id} className="truncate">
                    {r.number && <span className="font-mono mr-1.5">{r.number}</span>}
                    {r.name || <span className="italic">(unnamed)</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {n.footnotes.length > 0 && (
        <div className="mt-3 pt-2 border-t border-dashed border-border">
          <DocLabel>Footnotes</DocLabel>
          <ol className="mt-1 space-y-0.5 text-xs text-muted-foreground list-none">
            {n.footnotes.map((f) => (
              <li key={f.number}>
                <sup className="text-spark mr-1">[{f.number}]</sup>
                {f.text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Room schedule / SOO table — the high-value output
// ─────────────────────────────────────────────────────────────────────────────

function RoomScheduleBlock({ project }: { project: Project }) {
  // Pre-compute each row; collect room-level waivers into a footnote list.
  const groupsById = new Map(project.functionalGroups.map((g) => [g.id, g]));

  type Row = {
    room: Room;
    group?: FunctionalGroup;
    spaceTypeName: string;
    lpdAllowance: number;
    installedLpd: LpdCheck;
    groupLabel: string;
    occupancy: string;
    shutoff: string;
    daylight: string;
    plugLoad: string;
    fixtureBreakdown: string;
    note: string;
    footnoteNumbers: number[];
  };

  const footnotes: Array<{ number: number; text: string }> = [];
  let counter = 0;

  const rows: Row[] = project.rooms.map((room): Row => {
    const group = room.functionalGroupId ? groupsById.get(room.functionalGroupId) : undefined;
    const st = spaceTypeById(room.spaceTypeId);
    const resolved = group ? resolveRoomSettings(room, group) : null;
    const footnoteNumbers: number[] = [];

    const occupancy = (() => {
      if (!resolved || !group) return "—";
      if (resolved.waivers.some((w) => w.requirementId === "add1_set")) {
        const w = resolved.waivers.find((x) => x.requirementId === "add1_set")!;
        counter += 1;
        footnotes.push({
          number: counter,
          text: `${roomRef(room)}: ADD1 waived — ${w.reason}${w.authority ? ` (${w.authority})` : ""}${w.dateIso ? ` [${w.dateIso.slice(0, 10)}]` : ""}`,
        });
        footnoteNumbers.push(counter);
        return "AHJ override";
      }
      if (resolved.add1Selection) {
        return shortLabel(resolved.add1Selection);
      }
      return st && hasAdd(st, "ADD1") ? "(unassigned)" : "Auto-on OK";
    })();

    const shutoff = (() => {
      if (!resolved || !group) return "—";
      if (resolved.waivers.some((w) => w.requirementId === "add2_set")) {
        const w = resolved.waivers.find((x) => x.requirementId === "add2_set")!;
        counter += 1;
        footnotes.push({
          number: counter,
          text: `${roomRef(room)}: ADD2 waived — ${w.reason}${w.authority ? ` (${w.authority})` : ""}${w.dateIso ? ` [${w.dateIso.slice(0, 10)}]` : ""}`,
        });
        footnoteNumbers.push(counter);
        return "AHJ override";
      }
      // Selected ADD2
      if (resolved.add2Selections.length > 0) {
        return resolved.add2Selections.map(shortLabel).join(resolved.add2Stacked ? " + " : " / ");
      }
      // REQ-level shutoff columns (g/h/i) — code-mandated, no pick needed
      const reqShutoffs = st
        ? (["auto_full_off", "scheduled_shutoff", "auto_partial_off"] as const).filter(
            (c) => st.controls[c] === "REQ",
          )
        : [];
      if (reqShutoffs.length > 0) {
        return reqShutoffs.map(shortLabel).join(" + ");
      }
      return st && hasAdd(st, "ADD2") ? "(unassigned)" : "—";
    })();

    const daylight = !resolved ? "—" : resolved.daylightZone ? "Yes" : "No";
    const plugLoad = st?.plugLoadControl842
      ? resolved?.waivers.some((w) => w.requirementId === "plug_load_842")
        ? "Waived"
        : "§8.4.2 applies"
      : "—";

    // Room-specific override notes
    const noteParts: string[] = [];
    if (room.overrides?.roomNote) noteParts.push(room.overrides.roomNote);
    if (resolved?.hasOverrides) noteParts.push("per-room override");

    // Room-level non-ADD-set waivers (if user adds them later)
    if (resolved) {
      for (const w of resolved.waivers) {
        if (w.scope !== "room") continue;
        if (w.requirementId === "add1_set" || w.requirementId === "add2_set") continue;
        counter += 1;
        const req = requirementById(w.requirementId);
        footnotes.push({
          number: counter,
          text: `${roomRef(room)}: ${req?.shortName ?? w.requirementId} waived — ${w.reason}${w.authority ? ` (${w.authority})` : ""}${w.dateIso ? ` [${w.dateIso.slice(0, 10)}]` : ""}`,
        });
        footnoteNumbers.push(counter);
      }
    }

    return {
      room,
      group,
      spaceTypeName: st?.name ?? room.spaceTypeId,
      lpdAllowance: st?.lpdWattsPerSqft ?? 0,
      installedLpd: lpdCheckForRoom(room, st?.lpdWattsPerSqft ?? 0),
      groupLabel: group?.label ?? "—",
      occupancy,
      shutoff,
      daylight,
      plugLoad,
      fixtureBreakdown: formatFixtureBreakdown(room),
      note: noteParts.join(" · "),
      footnoteNumbers,
    };
  });

  return (
    <DocSection heading="5. Room Schedule / Sequence of Operation">
      {rows.length === 0 ? (
        <Prose muted>No rooms yet.</Prose>
      ) : (
        <>
          <table className="doc-schedule w-full text-xs border-separate border-spacing-0 table-fixed">
            <colgroup>
              <col style={{ width: "2.5rem" }} />   {/* # */}
              <col />                                {/* Name — flex */}
              <col />                                {/* Space type — flex */}
              <col style={{ width: "4rem" }} />     {/* Size */}
              <col style={{ width: "3.5rem" }} />   {/* LPD allow */}
              <col style={{ width: "5rem" }} />     {/* Installed */}
              <col style={{ width: "3rem" }} />     {/* Grp (extra breathing room) */}
              <col style={{ width: "6rem" }} />     {/* Occupancy */}
              <col style={{ width: "6rem" }} />     {/* Shutoff */}
              <col style={{ width: "3.5rem" }} />   {/* Daylight */}
              <col style={{ width: "5rem" }} />     {/* Plug load */}
              <col />                                {/* Notes — flex */}
            </colgroup>
            <thead>
              <tr className="border-b-2 border-jet text-left align-bottom">
                <th className="py-1.5 px-1.5 border-b-2 border-jet">#</th>
                <th className="py-1.5 px-1.5 border-b-2 border-jet">Name</th>
                <th className="py-1.5 px-1.5 border-b-2 border-jet">Space type</th>
                <th className="py-1.5 px-1.5 tabular-nums text-right border-b-2 border-jet">
                  Size<br/><span className="text-[10px] font-normal text-muted-foreground">ft²</span>
                </th>
                <th className="py-1.5 px-1.5 tabular-nums text-right border-b-2 border-jet">
                  LPD<br/><span className="text-[10px] font-normal text-muted-foreground">allow</span>
                </th>
                <th className="py-1.5 px-1.5 text-center border-b-2 border-jet">
                  Installed<br/><span className="text-[10px] font-normal text-muted-foreground">W/ft²</span>
                </th>
                <th className="py-1.5 px-2 text-center border-b-2 border-jet">Grp</th>
                <th className="py-1.5 px-1.5 border-b-2 border-jet">Occupancy</th>
                <th className="py-1.5 px-1.5 border-b-2 border-jet">Shutoff</th>
                <th className="py-1.5 px-1.5 text-center border-b-2 border-jet">Daylight</th>
                <th className="py-1.5 px-1.5 border-b-2 border-jet">Plug load</th>
                <th className="py-1.5 px-1.5 border-b-2 border-jet">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.room.id} className="align-top">
                  <td className="py-1.5 px-1.5 font-mono border-b border-border">{r.room.number || "—"}</td>
                  <td className="py-1.5 px-1.5 border-b border-border">
                    {r.room.name || <span className="italic text-muted-foreground">(unnamed)</span>}
                  </td>
                  <td className="py-1.5 px-1.5 text-muted-foreground border-b border-border">{r.spaceTypeName}</td>
                  <td className="py-1.5 px-1.5 tabular-nums text-right whitespace-nowrap border-b border-border">
                    {r.room.sizeSqft.toLocaleString()}
                  </td>
                  <td className="py-1.5 px-1.5 tabular-nums text-right whitespace-nowrap border-b border-border">
                    {r.lpdAllowance.toFixed(2)}
                  </td>
                  <td className="py-1.5 px-1.5 text-center border-b border-border">
                    <InstalledLpdPill check={r.installedLpd} />
                  </td>
                  <td className="py-1.5 px-2 font-semibold text-center border-b border-border">{r.groupLabel}</td>
                  <td className="py-1.5 px-1.5 border-b border-border">{r.occupancy}</td>
                  <td className="py-1.5 px-1.5 border-b border-border">{r.shutoff}</td>
                  <td className="py-1.5 px-1.5 text-center border-b border-border">{r.daylight}</td>
                  <td className="py-1.5 px-1.5 border-b border-border">{r.plugLoad}</td>
                  <td className="py-1.5 px-1.5 border-b border-border">
                    {r.fixtureBreakdown && (
                      <div className="text-muted-foreground text-[10px] leading-snug">
                        {r.fixtureBreakdown}
                      </div>
                    )}
                    {r.note && <div>{r.note}</div>}
                    {r.footnoteNumbers.map((n) => (
                      <sup key={n} className="ml-0.5 text-spark">[{n}]</sup>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-xs tabular-nums">
                <td colSpan={3} className="py-1.5 pt-2 px-1.5 font-semibold">Totals</td>
                <td className="py-1.5 pt-2 px-1.5 text-right font-semibold whitespace-nowrap">
                  {project.rooms.reduce((s, r) => s + (r.sizeSqft || 0), 0).toLocaleString()}
                </td>
                <td className="py-1.5 pt-2 px-1.5 text-right font-semibold whitespace-nowrap">
                  {(
                    project.rooms.reduce(
                      (s, r) =>
                        s +
                        (r.sizeSqft || 0) * (spaceTypeById(r.spaceTypeId)?.lpdWattsPerSqft ?? 0),
                      0,
                    ) / Math.max(1, project.rooms.reduce((s, r) => s + (r.sizeSqft || 0), 0))
                  ).toFixed(2)}
                </td>
                <td className="py-1.5 pt-2 px-1.5 text-center">
                  <InstalledLpdPill check={aggregateInstalledLpd(project)} />
                </td>
                <td colSpan={6} className="py-1.5 pt-2 px-1.5 text-muted-foreground">
                  allowance avg W/ft² · installed rollup
                </td>
              </tr>
            </tfoot>
          </table>

          {footnotes.length > 0 && (
            <div className="mt-3 pt-2 border-t border-dashed border-border">
              <DocLabel>Schedule footnotes</DocLabel>
              <ol className="mt-1 space-y-0.5 text-xs text-muted-foreground list-none">
                {footnotes.map((f) => (
                  <li key={f.number}>
                    <sup className="text-spark mr-1">[{f.number}]</sup>
                    {f.text}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </DocSection>
  );
}

/** Small inline chip showing the installed W/ft² with pass/fail coloring. */
function InstalledLpdPill({ check }: { check: LpdCheck }) {
  if (check.status === "unknown") {
    return <span className="text-muted-foreground">—</span>;
  }
  const label = check.installedLpd !== null ? check.installedLpd.toFixed(2) : "—";
  const pct =
    check.allowance > 0 && check.installedLpd !== null
      ? Math.round((check.installedLpd / check.allowance) * 100)
      : null;
  const bg = check.status === "pass" ? "bg-emerald-600" : "bg-destructive";
  const title =
    check.status === "pass"
      ? `Installed ${label} W/ft² vs allowance ${check.allowance.toFixed(2)} — passes`
      : `Installed ${label} W/ft² exceeds allowance ${check.allowance.toFixed(2)}`;
  return (
    <span
      className={cn(
        "inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums whitespace-nowrap [print-color-adjust:exact] [-webkit-print-color-adjust:exact]",
        bg,
      )}
      title={title}
    >
      {label}
      {pct !== null ? ` · ${pct}%` : ""}
    </span>
  );
}

function aggregateInstalledLpd(project: Project): LpdCheck {
  let totalW = 0;
  let totalSf = 0;
  let allowanceW = 0;
  let anyFixtures = false;
  for (const r of project.rooms) {
    const w = totalRoomWatts(r);
    if (w > 0) {
      anyFixtures = true;
      totalW += w;
      totalSf += r.sizeSqft;
      allowanceW += (spaceTypeById(r.spaceTypeId)?.lpdWattsPerSqft ?? 0) * r.sizeSqft;
    }
  }
  const allowance = totalSf > 0 ? allowanceW / totalSf : 0;
  const installed = totalSf > 0 && totalW > 0 ? totalW / totalSf : null;
  return {
    installedWatts: totalW,
    installedLpd: installed,
    allowance,
    status: !anyFixtures || installed === null
      ? "unknown"
      : installed <= allowance ? "pass" : "fail",
  };
}


function hasAdd(st: ReturnType<typeof spaceTypeById>, app: "ADD1" | "ADD2"): boolean {
  if (!st) return false;
  return Object.values(st.controls).some((v) => v === app);
}

function shortLabel(col: string): string {
  const map: Record<string, string> = {
    restricted_manual_on: "Manual-on",
    restricted_partial_auto_on: "Partial auto-on",
    auto_full_off: "Auto full-off",
    scheduled_shutoff: "Scheduled shutoff",
    auto_partial_off: "Auto partial-off",
  };
  return map[col] ?? col;
}

function roomRef(room: Room): string {
  const parts = [room.number, room.name].filter(Boolean);
  if (parts.length === 0) return "(unnamed room)";
  return parts.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Outdoor
// ─────────────────────────────────────────────────────────────────────────────

function OutdoorBlock({ project }: { project: Project }) {
  const enabledZones = (Object.entries(project.outdoorScope.zones) as Array<
    [OutdoorZoneType, NonNullable<typeof project.outdoorScope.zones[OutdoorZoneType]>]
  >).filter(([, cfg]) => cfg.enabled);
  return (
    <DocSection heading="6. Outdoor Controls (§9.4.2)">
      {enabledZones.length === 0 ? (
        <Prose muted>No outdoor zones in scope.</Prose>
      ) : (
        <div className="space-y-5">
          {enabledZones.map(([type, cfg]) => (
            <div key={type} className="doc-group">
              <header className="flex items-baseline justify-between gap-4 mb-1 pb-1 border-b border-border">
                <h3 className="text-base font-semibold">{OUTDOOR_ZONE_LABELS[type]}</h3>
                <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {cfg.lightingZone}
                  {cfg.count ? ` · ${cfg.count.toLocaleString()} fixture${cfg.count === 1 ? "" : "s"}` : ""}
                  {formatOutdoorSize(cfg) ? ` · ${formatOutdoorSize(cfg)}` : ""}
                </div>
              </header>
              <Prose>{outdoorZoneNarrative(type, cfg)}</Prose>
            </div>
          ))}
        </div>
      )}
    </DocSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Glossary + Disclaimer
// ─────────────────────────────────────────────────────────────────────────────

const GLOSSARY: Array<{ term: string; def: string }> = [
  { term: "AHJ", def: "Authority Having Jurisdiction — the local building / code official." },
  { term: "ASHRAE 90.1", def: "American Society of Heating, Refrigerating and Air-Conditioning Engineers — Energy Standard for Buildings." },
  { term: "Bilevel", def: "Lighting with at least one intermediate step between full-on and full-off — continuously dimmable counts." },
  { term: "BMS", def: "Building Management System — centralized controls for HVAC / lighting / etc." },
  { term: "Daylight zone", def: "The area of a space where natural daylight contributes meaningfully to illumination, as defined in §9.4.1.1(e)/(f)." },
  { term: "IES", def: "Illuminating Engineering Society — publishes lighting recommendations (RP-1 offices, RP-3 schools, RP-28 industrial, RP-5 healthcare)." },
  { term: "LPD", def: "Lighting Power Density (watts per square foot) — the connected lighting power cap per space type." },
  { term: "LZ0–LZ4", def: "Lighting Zones, per IES / ASHRAE. LZ0 = no ambient; LZ1 = parks / rural; LZ2 = neighborhoods; LZ3 = urban; LZ4 = high-activity." },
  { term: "PIR", def: "Passive infrared occupancy sensor." },
  { term: "REQ / ADD1 / ADD2", def: "Table 9.6.1 column applicability — REQ items are always required; ADD1 requires one of the restricted-on options; ADD2 requires one of the automatic shutoff options." },
  { term: "SOO", def: "Sequence of Operation — the written description of how a system is controlled." },
  { term: "§8.4.2", def: "Automatic receptacle control — applies to private offices, conference, print/copy, break, classrooms, and individual workstations." },
];

function GlossaryBlock() {
  return (
    <DocSection heading="7. Glossary & Abbreviations">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
        {GLOSSARY.map(({ term, def }) => (
          <div key={term} className="contents">
            <dt className="font-semibold">{term}</dt>
            <dd className="text-muted-foreground">{def}</dd>
          </div>
        ))}
      </dl>
    </DocSection>
  );
}

function DisclaimerFooter() {
  return (
    <footer className="doc-footer px-10 py-5 border-t-2 border-jet text-[10px] text-muted-foreground leading-relaxed">
      <div className="flex items-baseline justify-between gap-6">
        <span>
          <strong className="text-jet">{BRAND.legalName}</strong> · {BRAND.address.line1}, {BRAND.address.cityStateZip}
        </span>
        <span>
          {BRAND.phone} · {BRAND.email}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-6">
        <span>Generated using Lighting Controls Planner.</span>
        <span>Design aid — verify all outputs with your AHJ and licensed engineer.</span>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────────────────────────────────────

function DocSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="doc-section px-10 py-8">
      <h2 className="text-xl font-semibold tracking-tight border-b border-jet pb-1 mb-4">
        {heading}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PageBreak() {
  // Visual separator in the preview; becomes a forced page break in print CSS.
  return <div className="doc-page-break h-2 bg-muted/30 border-y border-border" aria-hidden />;
}

function DocLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
      {children}
    </div>
  );
}

function Prose({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <p className={cn("text-sm leading-relaxed", muted && "text-muted-foreground italic")}>
      {children}
    </p>
  );
}

function DefinitionRow({
  term,
  desc,
  noteClass,
}: {
  term: string;
  desc: string;
  noteClass?: string;
}) {
  return (
    <div className="text-sm">
      <span className="font-semibold">{term}:</span>{" "}
      <span className={noteClass}>{desc}</span>
    </div>
  );
}

// Escape hatch — link to the fallback pages if the user lands here with no data.
export function DocumentEmptyState() {
  return (
    <div className="px-6 py-8 max-w-3xl">
      <h1 className="text-2xl font-semibold">Document preview</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add at least one room and visit the Groups page to generate a preview.
      </p>
      <div className="mt-4 flex gap-2 text-sm">
        <Link className="underline" href="/planner/workspace/rooms">
          Add rooms →
        </Link>
      </div>
    </div>
  );
}
