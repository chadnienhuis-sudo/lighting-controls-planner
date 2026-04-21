"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { useProjectStore } from "@/lib/project-store";
import { spaceTypeById } from "@/data/space-types";
import { requirementById } from "@/data/requirements";
import {
  resolveRoomSettings,
  lpdCheckForRoom,
  lpdCheckForGroup,
  totalRoomWatts,
  resolveRoomFixtures,
  fixtureBreakdownLines,
  splitSpaceTypeName,
  roomsForGroup,
  type LpdCheck,
} from "@/lib/functional-groups";
import { BRAND } from "@/lib/brand";
import {
  groupNarrative,
  outdoorZoneNarrative,
  formatOutdoorSize,
  OUTDOOR_ZONE_LABELS,
  type GroupNarrative,
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
 * Section 5 layout variant — picked from the toggle at the top of the
 * Document preview. Each variant trades density for readability differently;
 * this lets a designer compare on real data (and download each as a PDF) before
 * locking one in. Whatever's selected here is also what the PDF renders.
 */
export type RequirementsLayout = "expanded" | "compact" | "soo" | "pills" | "hybrid";

const LAYOUT_TABS: Array<{ id: RequirementsLayout; label: string; hint: string }> = [
  { id: "expanded", label: "Expanded", hint: "Each rule on two lines (current)" },
  { id: "compact", label: "Compact", hint: "One-line rows · N/A consolidated" },
  { id: "soo", label: "Sequence of operation", hint: "Two columns: turn-on / turn-off" },
  { id: "pills", label: "Pills + narrative", hint: "Chip dashboard + plain-English paragraph" },
  { id: "hybrid", label: "Hybrid", hint: "Expanded actives · N/A consolidated" },
];

/**
 * Full deliverable preview. Renders the same DOM used for PDF export —
 * the Download button generates a clean react-pdf file so users never hit
 * the browser print dialog's URL / timestamp headers.
 */
export function DocumentSection() {
  const project = useProjectStore((s) => s.project);
  const [downloading, setDownloading] = useState(false);
  const [layout, setLayout] = useState<RequirementsLayout>("expanded");

  if (!project) return null;

  async function handleDownload() {
    if (!project || downloading) return;
    setDownloading(true);
    try {
      const { downloadControlsNarrativePdf } = await import("@/lib/pdf/controls-narrative-pdf");
      await downloadControlsNarrativePdf(project, { requirementsLayout: layout });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-5xl">
      <header className="mb-4 flex items-end justify-between gap-4" data-print-hide>
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Document preview
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            The full controls narrative as it will appear in the exported PDF.
            Download a clean PDF below — no browser headers or URL bars.
          </p>
        </div>
        <Button variant="outline" onClick={handleDownload} disabled={downloading}>
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {downloading ? "Generating PDF…" : "Download PDF"}
        </Button>
      </header>

      <LayoutTabs current={layout} onChange={setLayout} />

      <DocumentBody project={project} requirementsLayout={layout} />
    </div>
  );
}

/**
 * Tabbed selector for the Section 5 layout variant. The current pick drives
 * both the on-screen preview and the PDF download — letting a designer
 * compare each variant on real project data before settling on one.
 */
function LayoutTabs({
  current,
  onChange,
}: {
  current: RequirementsLayout;
  onChange: (next: RequirementsLayout) => void;
}) {
  return (
    <div className="mb-4 rounded-md border border-border bg-muted/20 p-2" data-print-hide>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mr-2">
          Section 5 layout
        </span>
        {LAYOUT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            title={t.hint}
            aria-pressed={current === t.id}
            className={cn(
              "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
              current === t.id
                ? "bg-jet text-primary-foreground"
                : "bg-background text-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {LAYOUT_TABS.find((t) => t.id === current)?.hint} · Downloaded PDF uses this layout.
      </div>
    </div>
  );
}

/**
 * The printable document — everything inside the print stylesheet's `.doc-root`
 * element. Used by the Document preview page and also embedded below the Export
 * page's readiness summary so window.print() from there prints the real doc.
 */
export function DocumentBody({
  project,
  requirementsLayout = "expanded",
}: {
  project: Project;
  requirementsLayout?: RequirementsLayout;
}) {
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
      <RoomScheduleBlock project={project} requirementsLayout={requirementsLayout} />
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
                    line.status === "na" && "border border-muted-foreground/40 bg-transparent",
                  )}
                />
                <div className="flex-1">
                  <span
                    className={cn(
                      line.status === "waived" && "line-through text-muted-foreground",
                      line.status === "na" && "text-muted-foreground italic",
                    )}
                  >
                    {line.shortName}
                  </span>
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    {line.section.startsWith("9.4") || /^\d/.test(line.section) ? `§${line.section}` : line.section}
                  </span>
                  {line.footnoteNumber !== undefined && (
                    <sup className="ml-0.5 text-xs text-spark">[{line.footnoteNumber}]</sup>
                  )}
                  {line.status === "addition" && (
                    <span className="ml-1.5 text-xs text-infrared">(beyond code)</span>
                  )}
                  {line.status === "na" && (
                    <span className="ml-1.5 text-xs text-muted-foreground">— N/A</span>
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

function RoomScheduleBlock({
  project,
  requirementsLayout = "expanded",
}: {
  project: Project;
  requirementsLayout?: RequirementsLayout;
}) {
  const footnotes: Array<{ number: number; text: string }> = [];
  let counter = 0;

  function addFootnote(text: string): number {
    counter += 1;
    footnotes.push({ number: counter, text });
    return counter;
  }

  const ungroupedRooms = project.rooms.filter((r) => !r.functionalGroupId);

  return (
    <DocSection heading="5. Room Schedule / Sequence of Operation">
      {project.rooms.length === 0 ? (
        <Prose muted>No rooms yet.</Prose>
      ) : (
        <>
          <div className="doc-schedule space-y-5 text-xs">
            {project.functionalGroups.map((group) => (
              <GroupBlock
                key={group.id}
                group={group}
                project={project}
                addFootnote={addFootnote}
                requirementsLayout={requirementsLayout}
              />
            ))}
            {ungroupedRooms.length > 0 && (
              <div className="border-t border-border pt-3">
                <DocLabel>Ungrouped rooms</DocLabel>
                <ul className="mt-1 space-y-1.5">
                  {ungroupedRooms.map((room) => (
                    <RoomLine
                      key={room.id}
                      room={room}
                      group={undefined}
                      addFootnote={addFootnote}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>

          <LpdTotalsMath project={project} />

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

/**
 * Group-hoisted block: one per functional group. Header → installed LPD
 * chip → full requirements table (every applicable code rule with a plain-
 * English how-it's-met explanation, code reference muted) → room list. The
 * requirements table is what reviewers / AHJ scan first; rooms below only
 * repeat their deltas (overrides, waivers, notes) plus fixtures.
 */
function GroupBlock({
  group,
  project,
  addFootnote,
  requirementsLayout = "expanded",
}: {
  group: FunctionalGroup;
  project: Project;
  addFootnote: (text: string) => number;
  requirementsLayout?: RequirementsLayout;
}) {
  const rooms = roomsForGroup(project, group);
  const st = spaceTypeById(group.spaceTypeId);
  const { parent, modifier } = st
    ? splitSpaceTypeName(st.name)
    : { parent: group.description || "—", modifier: "" };
  const totalSf = rooms.reduce((s, r) => s + (r.sizeSqft || 0), 0);
  const groupLpd = st ? lpdCheckForGroup(rooms, st.lpdWattsPerSqft) : null;
  const narrative = useMemo(() => groupNarrative(project, group), [project, group]);

  // Bridge group-level waiver footnotes from the narrative into the schedule's
  // shared footnote counter so the numbers don't collide across groups. We
  // re-emit each waived/AHJ-override line into addFootnote() and remap.
  const requirementRows = narrative.requirementLines.map((line) => {
    let footnoteNumber = line.footnoteNumber;
    if (line.status === "waived") {
      const orig = narrative.footnotes.find((f) => f.number === line.footnoteNumber);
      if (orig) {
        footnoteNumber = addFootnote(`Group ${group.label}: ${orig.text}`);
      }
    }
    return { ...line, footnoteNumber };
  });

  return (
    <div className="doc-group border-t border-jet pt-2">
      <header className="flex items-baseline justify-between gap-3 mb-1.5 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <span className="inline-block rounded bg-jet text-primary-foreground px-1.5 py-0.5 text-[11px] font-semibold tabular-nums shrink-0">
            {group.label}
          </span>
          <span className="font-semibold">{parent}</span>
          {modifier && (
            <span className="italic text-muted-foreground text-[11px]">{modifier}</span>
          )}
        </div>
        <div className="text-[11px] tabular-nums text-muted-foreground shrink-0">
          {rooms.length} room{rooms.length === 1 ? "" : "s"} · {totalSf.toLocaleString()} sf
          {st ? ` · LPD allow ${st.lpdWattsPerSqft.toFixed(2)}` : ""}
        </div>
      </header>

      {groupLpd && groupLpd.status !== "unknown" && (
        <div className="mb-2 flex items-center gap-2 text-[11px]">
          <span className="text-muted-foreground">Installed lighting power</span>
          <InstalledLpdPill check={groupLpd} />
          <span className="text-muted-foreground">group rollup</span>
        </div>
      )}

      {requirementRows.length > 0 && (
        <RequirementsRender
          rows={requirementRows}
          narrative={narrative}
          layout={requirementsLayout}
        />
      )}

      {rooms.length > 0 ? (
        <ul className="space-y-1.5">
          {rooms.map((room) => (
            <RoomLine
              key={room.id}
              room={room}
              group={group}
              addFootnote={addFootnote}
            />
          ))}
        </ul>
      ) : (
        <div className="text-[11px] italic text-muted-foreground">No rooms in this group.</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Requirements layout variants — picked from the Section 5 layout tab. All
// share the same data (narrative.requirementLines + narrative.sequenceParagraph)
// but render with very different density/structure tradeoffs. The selected
// variant is also what the PDF renders.
// ─────────────────────────────────────────────────────────────────────────────

type ReqRow = ReturnType<typeof groupNarrative>["requirementLines"][number];

/** Tighter section reference — drops repeated "9.4.1.1" prefix on §a-§i. */
function shortSection(section: string): string {
  // 9.4.1.1(a) → §a; 9.4.1.1(b)/(c) → §b/c; 8.4.2 → §8.4.2; "Beyond code" → ""
  const m = section.match(/^9\.4\.1\.1\(([a-i])\)(?:\/\(([a-i])\))?(?:\/\(([a-i])\))?$/);
  if (m) {
    const letters = [m[1], m[2], m[3]].filter(Boolean).join("/");
    return `§${letters}`;
  }
  if (section === "Beyond code") return "";
  return /^\d/.test(section) ? `§${section}` : section;
}

/** Categorize a requirement for the SoO layout. */
type SooCategory = "turnOn" | "turnOff" | "daylight" | "plugLoad" | "addition";
function sooCategory(reqId: string, status: ReqRow["status"]): SooCategory {
  if (status === "addition") return "addition";
  if (reqId.startsWith("daylight_")) return "daylight";
  if (reqId === "plug_load_842") return "plugLoad";
  if (
    reqId === "auto_full_off" ||
    reqId === "auto_partial_off" ||
    reqId === "scheduled_shutoff" ||
    reqId === "add2_set"
  ) {
    return "turnOff";
  }
  // local_control, restricted_*, bilevel, add1_set, etc → turn-on side
  return "turnOn";
}

function RequirementsRender({
  rows,
  narrative,
  layout,
}: {
  rows: ReqRow[];
  narrative: GroupNarrative;
  layout: RequirementsLayout;
}) {
  switch (layout) {
    case "compact":
      return <RequirementsCompact rows={rows} />;
    case "soo":
      return <RequirementsSoO rows={rows} />;
    case "pills":
      return <RequirementsPills rows={rows} narrative={narrative} />;
    case "hybrid":
      return <RequirementsHybrid rows={rows} />;
    case "expanded":
    default:
      return <RequirementsExpanded rows={rows} />;
  }
}

/**
 * Expanded — original layout. Each rule on two lines (bold name + how-met
 * sentence) with section reference muted on the right.
 */
function RequirementsExpanded({ rows }: { rows: ReqRow[] }) {
  return (
    <div className="mb-2 rounded-sm border border-border bg-muted/10 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">
        Code requirements & how this group meets each
      </div>
      <ul className="divide-y divide-border/60">
        {rows.map((line) => (
          <RequirementRow key={line.requirementId} line={line} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Compact — one-line rows in a 3-column grid (dot · headline + how-met · §).
 * N/A items collapse into a single muted footer line. Halves vertical space
 * vs. Expanded while keeping every requirement visible with its explanation.
 */
function RequirementsCompact({ rows }: { rows: ReqRow[] }) {
  const active = rows.filter((r) => r.status !== "na");
  const naRows = rows.filter((r) => r.status === "na");
  return (
    <div className="mb-2 rounded-sm border border-border bg-muted/10 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">
        Code requirements
      </div>
      <ul className="space-y-[3px]">
        {active.map((line) => (
          <CompactRow key={line.requirementId} line={line} />
        ))}
      </ul>
      {naRows.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-dashed border-border/60 text-[10px] text-muted-foreground">
          <span className="font-semibold">Not applicable here:</span>{" "}
          {naRows.map((r, i) => (
            <span key={r.requirementId}>
              {i > 0 && " · "}
              {r.shortName} ({shortSection(r.section)} — {naReasonShort(r.howMet)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CompactRow({ line }: { line: ReqRow }) {
  const dotClass =
    line.status === "active"
      ? "bg-jet"
      : line.status === "waived"
        ? "bg-spark"
        : line.status === "addition"
          ? "bg-infrared"
          : "border border-muted-foreground/40 bg-transparent";
  return (
    <li className="grid grid-cols-[10px_minmax(0,_max-content)_1fr_max-content] gap-x-2 items-baseline text-[11px]">
      <span className={cn("size-1.5 rounded-full mt-[5px]", dotClass)} aria-hidden />
      <span
        className={cn(
          "font-semibold whitespace-nowrap",
          line.status === "waived" && "line-through text-muted-foreground",
          line.status === "addition" && "text-infrared",
        )}
      >
        {line.shortName}
        {line.footnoteNumber !== undefined && (
          <sup className="ml-0.5 text-[10px] text-spark">[{line.footnoteNumber}]</sup>
        )}
      </span>
      <span className="text-foreground/75 truncate">{line.howMet}</span>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {shortSection(line.section)}
      </span>
    </li>
  );
}

/**
 * Sequence of Operation — two columns side-by-side, organized by what each
 * rule does. Left = how lights turn on (manual control, occupancy, dimming).
 * Right = how they turn off (auto-off variants). A small footer row covers
 * daylight + plug-load (since those are the most common N/A categories).
 */
function RequirementsSoO({ rows }: { rows: ReqRow[] }) {
  const buckets: Record<SooCategory, ReqRow[]> = {
    turnOn: [],
    turnOff: [],
    daylight: [],
    plugLoad: [],
    addition: [],
  };
  for (const r of rows) buckets[sooCategory(r.requirementId, r.status)].push(r);

  return (
    <div className="mb-2 rounded-sm border border-border bg-muted/10 px-2.5 py-1.5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
        <SooColumn label="How lights turn on" rows={buckets.turnOn} />
        <SooColumn label="How lights turn off" rows={buckets.turnOff} />
      </div>
      {(buckets.daylight.length > 0 || buckets.plugLoad.length > 0 || buckets.addition.length > 0) && (
        <div className="mt-1.5 pt-1.5 border-t border-dashed border-border/60 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
          {buckets.daylight.length > 0 && (
            <SooColumn label="Daylight" rows={buckets.daylight} />
          )}
          {buckets.plugLoad.length > 0 && (
            <SooColumn label="Plug load" rows={buckets.plugLoad} />
          )}
          {buckets.addition.length > 0 && (
            <SooColumn label="Beyond code" rows={buckets.addition} />
          )}
        </div>
      )}
    </div>
  );
}

function SooColumn({ label, rows }: { label: string; rows: ReqRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">
        {label}
      </div>
      <ul className="space-y-[3px]">
        {rows.map((line) => {
          const dotClass =
            line.status === "active"
              ? "bg-jet"
              : line.status === "waived"
                ? "bg-spark"
                : line.status === "addition"
                  ? "bg-infrared"
                  : "border border-muted-foreground/40 bg-transparent";
          return (
            <li
              key={line.requirementId}
              className="flex items-baseline gap-1.5 text-[11px] leading-snug"
            >
              <span className={cn("size-1.5 rounded-full mt-[5px] shrink-0", dotClass)} aria-hidden />
              <span className="flex-1 min-w-0">
                <span
                  className={cn(
                    "font-medium",
                    line.status === "waived" && "line-through text-muted-foreground",
                    line.status === "na" && "text-muted-foreground italic",
                    line.status === "addition" && "text-infrared",
                  )}
                >
                  {line.shortName}
                </span>
                {line.status !== "na" && (
                  <span className="text-foreground/70"> — {line.howMet}</span>
                )}
                {line.status === "na" && (
                  <span className="text-muted-foreground"> — {naReasonShort(line.howMet)}</span>
                )}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {shortSection(line.section)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Pills + narrative — a chip dashboard of active rules at the top, an N/A
 * tagline, then the plain-English sequence-of-operation paragraph
 * (already produced by groupNarrative for Section 4). Reads like a one-page
 * cheat sheet plus prose explanation.
 */
function RequirementsPills({
  rows,
  narrative,
}: {
  rows: ReqRow[];
  narrative: GroupNarrative;
}) {
  const active = rows.filter((r) => r.status === "active" || r.status === "addition");
  const waived = rows.filter((r) => r.status === "waived");
  const naRows = rows.filter((r) => r.status === "na");
  return (
    <div className="mb-2 rounded-sm border border-border bg-muted/10 px-2.5 py-2 space-y-1.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground shrink-0">
          Active
        </span>
        {active.map((r) => (
          <Pill key={r.requirementId} line={r} kind="active" />
        ))}
        {waived.map((r) => (
          <Pill key={r.requirementId} line={r} kind="waived" />
        ))}
      </div>
      {naRows.length > 0 && (
        <div className="text-[10px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-widest mr-1">Not req&rsquo;d</span>
          {naRows.map((r, i) => (
            <span key={r.requirementId}>
              {i > 0 && " · "}
              {r.shortName} ({shortSection(r.section)} — {naReasonShort(r.howMet)})
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] leading-snug text-foreground/85 pt-0.5">
        {narrative.sequenceParagraph}
      </p>
    </div>
  );
}

function Pill({
  line,
  kind,
}: {
  line: ReqRow;
  kind: "active" | "waived";
}) {
  const cls =
    kind === "waived"
      ? "border-spark text-spark"
      : line.status === "addition"
        ? "border-infrared text-infrared"
        : "border-jet text-jet";
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 rounded border px-1.5 py-0 text-[10px] leading-snug",
        cls,
      )}
      title={line.howMet}
    >
      <span className={kind === "waived" ? "line-through" : ""}>{line.shortName}</span>
      <span className="text-muted-foreground">{shortSection(line.section)}</span>
      {line.footnoteNumber !== undefined && (
        <sup className="text-spark">[{line.footnoteNumber}]</sup>
      )}
    </span>
  );
}

/**
 * Hybrid — same expanded format as today for active rules, but N/A entries
 * collapse into one muted footer line. Lightest-touch density win.
 */
function RequirementsHybrid({ rows }: { rows: ReqRow[] }) {
  const active = rows.filter((r) => r.status !== "na");
  const naRows = rows.filter((r) => r.status === "na");
  return (
    <div className="mb-2 rounded-sm border border-border bg-muted/10 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">
        Code requirements & how this group meets each
      </div>
      <ul className="divide-y divide-border/60">
        {active.map((line) => (
          <RequirementRow key={line.requirementId} line={line} />
        ))}
      </ul>
      {naRows.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-dashed border-border/60 text-[10px] text-muted-foreground">
          <span className="font-semibold">Not applicable here:</span>{" "}
          {naRows.map((r, i) => (
            <span key={r.requirementId}>
              {i > 0 && " · "}
              {r.shortName} ({shortSection(r.section)} — {naReasonShort(r.howMet)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Trim N/A reasons to a tight phrase for the footer line. The full howMet
 * sentence reads "No windows in this group, so daylight controls are not
 * required here." — that's verbose for a footer; we just want "no windows".
 */
function naReasonShort(howMet: string): string {
  const lower = howMet.toLowerCase();
  if (lower.includes("no windows")) return "no windows";
  if (lower.includes("no skylights")) return "no skylights";
  if (lower.includes("below the 150 w") || lower.includes("150 w threshold")) {
    return "below 150 W threshold";
  }
  if (lower.includes("not yet selected")) return "not yet selected";
  return howMet.length > 60 ? howMet.slice(0, 57) + "…" : howMet;
}

/**
 * One row of the per-group requirements table. Status drives the styling:
 *   active   → solid jet dot, normal text
 *   na       → hollow muted dot, italic muted text (kept on the list so a
 *              reviewer sees we considered this rule and *why* it doesn't apply)
 *   waived   → spark dot, line-through name, footnote marker
 *   addition → infrared dot, "beyond code" tag
 * Code section reference renders muted at the right edge so the plain-
 * English headline reads first.
 */
function RequirementRow({
  line,
}: {
  line: {
    requirementId: string;
    shortName: string;
    section: string;
    howMet: string;
    status: "active" | "waived" | "addition" | "na";
    footnoteNumber?: number;
  };
}) {
  const dotColor =
    line.status === "active"
      ? "bg-jet"
      : line.status === "waived"
        ? "bg-spark"
        : line.status === "addition"
          ? "bg-infrared"
          : "border border-muted-foreground/40 bg-transparent";
  const nameClass = cn(
    "font-medium text-[12px]",
    line.status === "waived" && "line-through text-muted-foreground",
    line.status === "na" && "text-muted-foreground italic",
    line.status === "addition" && "text-infrared",
  );
  const sectionLabel = line.section.startsWith("9.4")
    ? `§${line.section}`
    : line.section === "Beyond code"
      ? "Beyond code"
      : `§${line.section}`;
  return (
    <li className="flex gap-2 py-1">
      <span
        className={cn("mt-[6px] inline-block size-1.5 rounded-full shrink-0", dotColor)}
        aria-hidden
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <div className={nameClass}>
            {line.shortName}
            {line.footnoteNumber !== undefined && (
              <sup className="ml-0.5 text-[10px] text-spark">[{line.footnoteNumber}]</sup>
            )}
            {line.status === "addition" && (
              <span className="ml-1.5 text-[10px] text-infrared font-normal">(beyond code)</span>
            )}
            {line.status === "na" && (
              <span className="ml-1.5 text-[10px] text-muted-foreground font-normal not-italic">
                — Not applicable
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {sectionLabel}
          </div>
        </div>
        <div className={cn(
          "text-[11px] leading-snug",
          line.status === "active" || line.status === "addition"
            ? "text-foreground/80"
            : "text-muted-foreground",
        )}>
          {line.howMet}
        </div>
      </div>
    </li>
  );
}

/**
 * One room line under its group. Shows #, name, size, installed LPD chip;
 * stacks italic fixture lines and an "Override:" delta line when the room
 * diverges from the group (ADD1/ADD2/daylight changed, waivers, room note).
 */
function RoomLine({
  room,
  group,
  addFootnote,
}: {
  room: Room;
  group: FunctionalGroup | undefined;
  addFootnote: (text: string) => number;
}) {
  const st = spaceTypeById(room.spaceTypeId);
  const resolved = group ? resolveRoomSettings(room, group) : null;
  const installed = lpdCheckForRoom(room, st?.lpdWattsPerSqft ?? 0);
  const fixtures = fixtureBreakdownLines(room);

  const overrideParts: React.ReactNode[] = [];
  if (room.overrides?.add1Selection !== undefined) {
    const lbl = room.overrides.add1Selection
      ? shortLabel(room.overrides.add1Selection)
      : "none";
    overrideParts.push(`occupancy → ${lbl}`);
  }
  if (room.overrides?.add2Selections !== undefined) {
    const lbl =
      room.overrides.add2Selections.length > 0
        ? room.overrides.add2Selections.map(shortLabel).join(" + ")
        : "none";
    overrideParts.push(`shutoff → ${lbl}`);
  }
  if (room.overrides?.daylightZone !== undefined) {
    overrideParts.push(`daylight → ${room.overrides.daylightZone ? "Y" : "N"}`);
  }
  // Room-level (not group-level) waivers → footnote
  if (resolved) {
    for (const w of resolved.waivers) {
      if (w.scope !== "room") continue;
      const req = requirementById(w.requirementId);
      const n = addFootnote(
        `${roomRef(room)}: ${req?.shortName ?? w.requirementId} waived — ${w.reason}${w.authority ? ` (${w.authority})` : ""}${w.dateIso ? ` [${w.dateIso.slice(0, 10)}]` : ""}`,
      );
      overrideParts.push(
        <span key={`w${n}`}>
          waive {req?.shortName ?? w.requirementId}
          <sup className="text-spark ml-0.5">[{n}]</sup>
        </span>,
      );
    }
  }
  if (room.overrides?.roomNote?.trim()) {
    overrideParts.push(room.overrides.roomNote.trim());
  }

  return (
    <li className="pl-3 border-l-2 border-border">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-mono text-muted-foreground shrink-0 min-w-[2rem]">
          {room.number || "—"}
        </span>
        <span className="font-medium">
          {room.name || <span className="italic text-muted-foreground">(unnamed)</span>}
        </span>
        <span className="text-muted-foreground tabular-nums">
          · {room.sizeSqft.toLocaleString()} sf
        </span>
        <InstalledLpdPill check={installed} />
      </div>
      {fixtures.length > 0 && (
        <ul className="mt-0.5 space-y-0 text-[10px] italic text-muted-foreground leading-snug break-words">
          {fixtures.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
      {overrideParts.length > 0 && (
        <div className="mt-0.5 text-[10px] text-spark">
          <span className="mr-1">▸</span>
          <span className="text-muted-foreground">Override:</span>{" "}
          {overrideParts.map((p, i) => (
            <span key={i}>
              {i > 0 && <span className="text-muted-foreground mx-1">·</span>}
              {p}
            </span>
          ))}
        </div>
      )}
    </li>
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

/**
 * Arithmetic breakdown shown under the Room Schedule's Totals row. Spells
 * out the math — connected W, fixture count, total area, result, and
 * allowance — so the reader can verify rather than trust the chip.
 */
function LpdTotalsMath({ project }: { project: Project }) {
  let totalW = 0;
  let totalFixtures = 0;
  let totalSfWithFixtures = 0;
  let allowanceW = 0;
  for (const r of project.rooms) {
    const w = totalRoomWatts(r);
    if (w <= 0) continue;
    totalW += w;
    totalFixtures += resolveRoomFixtures(r).reduce((s, f) => s + (f.count > 0 ? f.count : 0), 0);
    totalSfWithFixtures += r.sizeSqft;
    allowanceW += (spaceTypeById(r.spaceTypeId)?.lpdWattsPerSqft ?? 0) * r.sizeSqft;
  }
  const totalSfAll = project.rooms.reduce((s, r) => s + (r.sizeSqft || 0), 0);

  if (totalW === 0) {
    return (
      <div className="mt-3 rounded-md border border-dashed border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
        Enter fixture counts and wattages (click the Fixtures cell in the Groups matrix) to
        see the installed LPD math here.
      </div>
    );
  }

  const installed = totalW / totalSfWithFixtures;
  const allowance = allowanceW / totalSfWithFixtures;
  const pct = allowance > 0 ? Math.round((installed / allowance) * 100) : 0;
  const pass = installed <= allowance;
  const coverageNote =
    totalSfWithFixtures < totalSfAll
      ? ` (fixture data covers ${totalSfWithFixtures.toLocaleString()} of ${totalSfAll.toLocaleString()} ft²; the rest hasn't been entered yet)`
      : "";

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/10 px-3 py-2 text-xs">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">
        Installed LPD — math
      </div>
      <div className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 font-mono tabular-nums">
        <div className="text-muted-foreground">Connected</div>
        <div>
          {totalW.toLocaleString()} W across {totalFixtures.toLocaleString()} fixture
          {totalFixtures === 1 ? "" : "s"}
        </div>
        <div className="text-muted-foreground">Area</div>
        <div>{totalSfWithFixtures.toLocaleString()} ft²</div>
        <div className="text-muted-foreground">Installed</div>
        <div>
          {totalW.toLocaleString()} W ÷ {totalSfWithFixtures.toLocaleString()} ft² ={" "}
          <span className="font-semibold">{installed.toFixed(2)} W/ft²</span>
        </div>
        <div className="text-muted-foreground">Allowance</div>
        <div>
          {allowance.toFixed(2)} W/ft² <span className="text-muted-foreground">(weighted avg)</span>
        </div>
        <div className="text-muted-foreground">Result</div>
        <div
          className={cn(
            "font-semibold",
            pass ? "text-emerald-700" : "text-destructive",
          )}
        >
          {pct}% of cap — {pass ? "pass" : "fail"}
        </div>
      </div>
      {coverageNote && (
        <div className="mt-1.5 text-[10px] italic text-muted-foreground">
          {coverageNote.replace(/^\s*\(/, "").replace(/\)$/, "")}
        </div>
      )}
    </div>
  );
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
