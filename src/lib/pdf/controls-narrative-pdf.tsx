"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { OutdoorZoneType, Project } from "@/lib/types";
import { spaceTypeById } from "@/data/space-types";
import {
  groupNarrative,
  outdoorZoneNarrative,
  formatOutdoorSize,
  OUTDOOR_ZONE_LABELS,
} from "@/lib/narrative";
import {
  resolveRoomSettings,
  lpdCheckForRoom,
  formatFixtureBreakdown,
  type LpdCheck,
} from "@/lib/functional-groups";
import { BRAND } from "@/lib/brand";

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  jet: "#312E2E",
  jetLight: "#4A4646",
  ink: "#1F1C1C",
  muted: "#626262",
  light: "#DBDBDB",
  spark: "#F7B32B",
  infrared: "#DE4444",
  bgSoft: "#F6F6F6",
  white: "#FAFAFA",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 54,
    paddingBottom: 64,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.jet,
  },
  cover: {
    paddingTop: 110,
    paddingBottom: 80,
    paddingHorizontal: 56,
    fontFamily: "Helvetica",
    color: C.jet,
  },
  // Typography
  eyebrow: {
    fontSize: 8,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: C.muted,
  },
  h1: { fontSize: 28, fontFamily: "Helvetica-Bold", marginTop: 4 },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: `1 solid ${C.jet}`,
  },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  prose: { fontSize: 10, lineHeight: 1.45, marginBottom: 6 },
  muted: { color: C.muted },
  bold: { fontFamily: "Helvetica-Bold" },
  tinyLabel: {
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.muted,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  // Cover
  coverLogo: { width: 140, height: "auto", marginBottom: 32 },
  coverName: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2, color: C.jet },
  coverProjectLabel: {
    fontSize: 8,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: C.muted,
    marginTop: 40,
  },
  coverProjectName: { fontSize: 32, fontFamily: "Helvetica-Bold", marginTop: 4, color: C.jet },
  coverFacts: { marginTop: 44, fontSize: 10, lineHeight: 1.6 },
  factRow: { flexDirection: "row", marginBottom: 2 },
  factLabel: { width: 120, color: C.muted },
  factValue: { flex: 1 },
  disclaimerBox: {
    marginTop: 56,
    padding: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.light,
    backgroundColor: C.bgSoft,
    fontSize: 9,
    lineHeight: 1.45,
    color: C.muted,
  },
  disclaimerHeading: { fontFamily: "Helvetica-Bold", color: C.jet, marginBottom: 3 },
  // Sections
  section: { marginBottom: 16 },
  defRow: { flexDirection: "row", fontSize: 10, marginBottom: 3 },
  defTerm: { fontFamily: "Helvetica-Bold", marginRight: 4 },
  // Group panel
  groupBlock: { marginBottom: 14 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: C.light,
  },
  groupTag: {
    width: 20,
    height: 16,
    backgroundColor: C.jet,
    color: C.white,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingTop: 3,
    marginRight: 8,
  },
  groupTitle: { flex: 1, fontSize: 11, fontFamily: "Helvetica-Bold" },
  groupMeta: { fontSize: 8, color: C.muted },
  bullet: { flexDirection: "row", fontSize: 9, marginBottom: 2 },
  bulletDot: { width: 8, marginRight: 2 },
  footnote: { fontSize: 8, color: C.muted, marginBottom: 1 },
  footnoteMark: { color: C.spark, fontFamily: "Helvetica-Bold" },
  twoColumns: { flexDirection: "row", marginTop: 4 },
  colLeft: { flex: 1.5, paddingRight: 10 },
  colRight: { flex: 1 },
  // Room schedule table
  table: { marginTop: 4 },
  trHead: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: C.jet,
    paddingBottom: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.light,
    paddingTop: 3,
    paddingBottom: 3,
    fontSize: 8,
  },
  trTotals: {
    flexDirection: "row",
    paddingTop: 3,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  tdNum: { width: 22 },
  tdName: { flex: 1.3 },
  tdType: { flex: 1.5, color: C.muted },
  tdSize: { width: 42, textAlign: "right" },
  tdLpd: { width: 32, textAlign: "right" },
  tdInstalled: { width: 46, textAlign: "center" },
  tdGrp: {
    width: 28,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingLeft: 4,
    paddingRight: 4,
  },
  tdStrategy: { flex: 1 },
  tdShort: { width: 44 },
  tdNotes: { flex: 1.5 },
  installedPill: {
    paddingTop: 1,
    paddingBottom: 1,
    paddingLeft: 3,
    paddingRight: 3,
    borderRadius: 2,
    color: "#FFFFFF",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  installedPass: { backgroundColor: "#059669" },
  installedFail: { backgroundColor: C.infrared },
  // Footer — two rows: contact (brand) + tagline + tiny disclaimer.
  footer: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    fontSize: 7,
    color: C.muted,
    borderTopWidth: 1,
    borderTopColor: C.jet,
    paddingTop: 5,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 1,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SHORT_LABELS: Record<string, string> = {
  restricted_manual_on: "Manual-on",
  restricted_partial_auto_on: "Partial auto-on",
  auto_full_off: "Auto full-off",
  scheduled_shutoff: "Sched shutoff",
  auto_partial_off: "Auto partial-off",
};
const shortLabel = (col: string) => SHORT_LABELS[col] ?? col;

function formatDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Local-time filename stamp: `yyyy-MM-dd-HHmm` (no seconds, no TZ).
 * Kept local so the timestamp on the file matches the designer's wall clock.
 */
function formatLocalFilenameStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}-${hh}${mi}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// The document
// ─────────────────────────────────────────────────────────────────────────────

export function ControlsNarrativePdf({ project }: { project: Project }) {
  const hasOutdoor = Object.values(project.outdoorScope.zones).some((z) => z?.enabled);
  const date = formatDateIso();
  return (
    <Document
      title={`${project.name} — Controls Narrative`}
      author="A+ Lighting Solutions, LLC"
      subject={`ASHRAE 90.1-2019 Lighting Controls Narrative for ${project.name}`}
    >
      {/* Cover */}
      <Page size="LETTER" style={styles.cover}>
        <Cover project={project} date={date} />
        <PageFooter />
      </Page>

      {/* §1-§3 */}
      <Page size="LETTER" style={styles.page}>
        <BasisOfDesignSection project={project} />
        <ArchitectureSection project={project} />
        <CommissioningSection project={project} />
        <PageFooter />
      </Page>

      {/* §4 Group sequences */}
      <Page size="LETTER" style={styles.page} wrap>
        <Text style={styles.h2}>4. Functional Group Sequences</Text>
        {project.functionalGroups.length === 0 ? (
          <Text style={[styles.prose, styles.muted]}>
            No functional groups yet. Add rooms, then visit the Groups page to generate them.
          </Text>
        ) : (
          project.functionalGroups.map((g) => (
            <GroupSequence key={g.id} project={project} groupId={g.id} />
          ))
        )}
        <PageFooter />
      </Page>

      {/* §5 Room Schedule */}
      <Page size="LETTER" style={styles.page} orientation="landscape" wrap>
        <Text style={styles.h2}>5. Room Schedule / Sequence of Operation</Text>
        <RoomScheduleTable project={project} />
        <PageFooter />
      </Page>

      {/* §6 Outdoor */}
      {hasOutdoor && (
        <Page size="LETTER" style={styles.page} wrap>
          <OutdoorSection project={project} />
          <PageFooter />
        </Page>
      )}

      {/* §7 Glossary + Disclaimer */}
      <Page size="LETTER" style={styles.page}>
        <GlossarySection />
        <PageFooter />
      </Page>
    </Document>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────────────────────

function Cover({ project, date }: { project: Project; date: string }) {
  const totalSqft = project.rooms.reduce((s, r) => s + (r.sizeSqft || 0), 0);
  // Logo has to be an absolute URL for react-pdf's Image fetcher. We're always
  // browser-side at the download call site, so window.location.origin is safe.
  const logoSrc =
    typeof window !== "undefined"
      ? `${window.location.origin}/logos/aplus-logo.png`
      : "/logos/aplus-logo.png";
  return (
    <View>
      <Image src={logoSrc} style={styles.coverLogo} />
      <Text style={styles.eyebrow}>Prepared by</Text>
      <Text style={styles.coverName}>
        {project.preparedBy?.trim() || BRAND.legalName}
      </Text>
      {project.preparedBy?.trim() ? (
        <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
          {BRAND.legalName}
        </Text>
      ) : null}

      <Text style={styles.coverProjectLabel}>Lighting controls narrative</Text>
      <Text style={styles.coverProjectName}>{project.name}</Text>

      <View style={styles.coverFacts}>
        {project.location ? (
          <Fact label="Location" value={project.location} />
        ) : null}
        <Fact label="Code version" value={project.codeVersion} />
        <Fact label="Document date" value={date} />
        <Fact
          label="Rooms covered"
          value={`${project.rooms.length} room${project.rooms.length === 1 ? "" : "s"} · ${totalSqft.toLocaleString()} ft²`}
        />
        <Fact label="Functional groups" value={`${project.functionalGroups.length}`} />
      </View>

      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerHeading}>Disclaimer</Text>
        <Text>
          The Lighting Controls Planner is a design aid provided by A+ Lighting Solutions, LLC to
          help users develop conceptual lighting controls designs. It is{" "}
          <Text style={styles.bold}>NOT</Text> a compliance certification, engineering
          stamp, or substitute for review by a licensed engineer or Authority Having
          Jurisdiction (AHJ).
        </Text>
        <Text style={{ marginTop: 6 }}>
          Outputs are based on ASHRAE 90.1-2019 requirements as interpreted by A+
          Lighting LLC. Local codes, amendments, and AHJ rulings may impose additional
          or different requirements. Users are solely responsible for verifying all
          outputs against applicable codes and for obtaining required approvals,
          permits, and engineer sign-offs prior to installation.
        </Text>
        <Text style={{ marginTop: 6 }}>
          A+ Lighting Solutions, LLC makes no warranty of accuracy, completeness, or fitness for
          any particular purpose. In no event shall A+ Lighting Solutions, LLC be liable for
          damages arising from use of this tool.
        </Text>
        <Text style={{ marginTop: 6 }}>
          Final construction documents, manufacturer approvals, and installation must
          be performed by qualified parties.
        </Text>
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

function BasisOfDesignSection({ project }: { project: Project }) {
  const bod = project.basisOfDesign;
  const override = project.sectionOverrides.basisOfDesign?.trim();
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>1. Basis of Design</Text>
      {override ? (
        <Text style={styles.prose}>{override}</Text>
      ) : (
        <>
          <Text style={styles.prose}>
            This narrative documents the lighting controls design basis for{" "}
            {project.name}
            {project.location ? ` (${project.location})` : ""} in accordance with{" "}
            {project.codeVersion}. Requirements from Section 9 (lighting) of the
            standard are applied per space type per Table 9.6.1, with §8.4.2 automatic
            receptacle control applied where the space type qualifies. Outdoor
            controls follow §9.4.2.
          </Text>
          {bod.occupancyHours ? (
            <DefRow term="Occupancy hours" desc={bod.occupancyHours} />
          ) : null}
          {bod.additionalAssumptions ? (
            <DefRow term="Design assumptions" desc={bod.additionalAssumptions} />
          ) : null}
          {bod.localAmendments ? (
            <DefRow term="Local amendments" desc={bod.localAmendments} />
          ) : null}
        </>
      )}
    </View>
  );
}

function ArchitectureSection({ project }: { project: Project }) {
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
    <View style={styles.section}>
      <Text style={styles.h2}>2. System Architecture</Text>
      {override ? (
        <Text style={styles.prose}>{override}</Text>
      ) : (
        <>
          <Text style={styles.prose}>
            {prettyType[sa.systemType] ?? sa.systemType}.{" "}
            {sa.bmsIntegration
              ? "Lighting controls integrate with the project Building Management System for scheduling, occupancy sharing, and reporting."
              : "Lighting controls operate as a standalone subsystem; no BMS integration is scoped."}
          </Text>
          {sa.wiringApproach ? (
            <DefRow term="Wiring approach" desc={sa.wiringApproach} />
          ) : null}
          {sa.bmsIntegration && sa.bmsNotes ? (
            <DefRow term="BMS integration notes" desc={sa.bmsNotes} />
          ) : null}
        </>
      )}
    </View>
  );
}

function CommissioningSection({ project }: { project: Project }) {
  const cm = project.commissioning;
  const override = project.sectionOverrides.commissioning?.trim();
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>3. Commissioning & Handoff</Text>
      {override ? (
        <Text style={styles.prose}>{override}</Text>
      ) : (
        <>
          <Text style={styles.prose}>
            All occupancy / vacancy sensors are commissioned with a{" "}
            {cm.defaultVacancyTimerMin}-minute vacancy timer unless noted otherwise
            per group. Time-of-day schedules are set to match the project&rsquo;s
            operational hours. Daylight-responsive controls are calibrated with the
            space in its as-built reflectance state and target setpoints verified at
            desk / task height.
          </Text>
          {cm.daylightCalibrationNotes ? (
            <DefRow term="Daylight calibration" desc={cm.daylightCalibrationNotes} />
          ) : null}
          {cm.overrideBehavior ? (
            <DefRow term="Override behavior" desc={cm.overrideBehavior} />
          ) : null}
          {cm.postOccupancyAdjustmentNotes ? (
            <DefRow
              term="Post-occupancy adjustment"
              desc={cm.postOccupancyAdjustmentNotes}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

function DefRow({ term, desc }: { term: string; desc: string }) {
  return (
    <View style={styles.defRow}>
      <Text style={styles.defTerm}>{term}:</Text>
      <Text style={{ flex: 1 }}>{desc}</Text>
    </View>
  );
}

function GroupSequence({ project, groupId }: { project: Project; groupId: string }) {
  const group = project.functionalGroups.find((g) => g.id === groupId);
  if (!group) return null;
  const n = groupNarrative(project, group);
  return (
    <View style={styles.groupBlock} wrap={false}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTag}>{group.label}</Text>
        <Text style={styles.groupTitle}>{group.description}</Text>
        <Text style={styles.groupMeta}>
          {n.rooms.length} room{n.rooms.length === 1 ? "" : "s"} ·{" "}
          {n.totalSqft.toLocaleString()} ft²
          {n.spaceType?.lpdWattsPerSqft
            ? ` · LPD ${n.spaceType.lpdWattsPerSqft.toFixed(2)} W/ft²`
            : ""}
        </Text>
      </View>

      <Text style={styles.prose}>
        {group.narrativeOverride?.trim() || n.sequenceParagraph}
      </Text>

      <View style={styles.twoColumns}>
        <View style={styles.colLeft}>
          <Text style={styles.tinyLabel}>Applicable requirements</Text>
          {n.requirementLines.map((line) => (
            <View key={line.requirementId} style={styles.bullet}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={{ flex: 1 }}>
                <Text
                  style={
                    line.status === "waived"
                      ? [styles.muted, { textDecoration: "line-through" }]
                      : undefined
                  }
                >
                  {line.shortName}
                </Text>
                <Text style={styles.muted}> §{line.section}</Text>
                {line.footnoteNumber !== undefined ? (
                  <Text style={styles.footnoteMark}>
                    {" "}[{line.footnoteNumber}]
                  </Text>
                ) : null}
                {line.status === "addition" ? (
                  <Text style={{ color: C.infrared }}> (beyond code)</Text>
                ) : null}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.colRight}>
          {n.designerLines.length > 0 ? (
            <>
              <Text style={styles.tinyLabel}>Designer choices</Text>
              {n.designerLines.map((d, i) => (
                <Text key={i} style={{ fontSize: 9, marginBottom: 1 }}>
                  {d}
                </Text>
              ))}
            </>
          ) : null}
          {n.iesSummary ? (
            <>
              <Text style={[styles.tinyLabel, { marginTop: 6 }]}>
                IES targets (free tier)
              </Text>
              <Text style={{ fontSize: 9 }}>{n.iesSummary}</Text>
            </>
          ) : null}
          {n.rooms.length > 0 ? (
            <>
              <Text style={[styles.tinyLabel, { marginTop: 6 }]}>Rooms</Text>
              {n.rooms.map((r) => (
                <Text key={r.id} style={{ fontSize: 8, color: C.muted }}>
                  {r.number ? `${r.number}  ` : ""}
                  {r.name || "(unnamed)"}
                  {r.sizeSqft > 0 ? ` · ${r.sizeSqft.toLocaleString()} sf` : ""}
                </Text>
              ))}
            </>
          ) : null}
        </View>
      </View>

      {n.footnotes.length > 0 ? (
        <View
          style={{
            marginTop: 4,
            paddingTop: 3,
            borderTopWidth: 0.5,
            borderTopColor: C.light,
          }}
        >
          <Text style={styles.tinyLabel}>Footnotes</Text>
          {n.footnotes.map((f) => (
            <Text key={f.number} style={styles.footnote}>
              <Text style={styles.footnoteMark}>[{f.number}] </Text>
              {f.text}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RoomScheduleTable({ project }: { project: Project }) {
  if (project.rooms.length === 0) {
    return (
      <Text style={[styles.prose, styles.muted]}>No rooms yet.</Text>
    );
  }
  const groupsById = new Map(
    project.functionalGroups.map((g) => [g.id, g]),
  );

  const rows = project.rooms.map((room) => {
    const group = room.functionalGroupId ? groupsById.get(room.functionalGroupId) : undefined;
    const st = spaceTypeById(room.spaceTypeId);
    const resolved = group ? resolveRoomSettings(room, group) : null;

    const occupancy = (() => {
      if (!resolved) return "—";
      if (resolved.waivers.some((w) => w.requirementId === "add1_set")) return "AHJ override";
      if (resolved.add1Selection) return shortLabel(resolved.add1Selection);
      const hasAdd1 = st
        ? Object.values(st.controls).some((v) => v === "ADD1")
        : false;
      return hasAdd1 ? "(unassigned)" : "Auto-on OK";
    })();

    const shutoff = (() => {
      if (!resolved) return "—";
      if (resolved.waivers.some((w) => w.requirementId === "add2_set")) return "AHJ override";
      if (resolved.add2Selections.length > 0) {
        return resolved.add2Selections
          .map(shortLabel)
          .join(resolved.add2Stacked ? " + " : " / ");
      }
      const reqShutoffs = st
        ? (["auto_full_off", "scheduled_shutoff", "auto_partial_off"] as const).filter(
            (c) => st.controls[c] === "REQ",
          )
        : [];
      return reqShutoffs.length > 0 ? reqShutoffs.map(shortLabel).join(" + ") : "—";
    })();

    const plug = st?.plugLoadControl842
      ? resolved?.waivers.some((w) => w.requirementId === "plug_load_842")
        ? "Waived"
        : "§8.4.2"
      : "—";

    return {
      room,
      spaceTypeName: st?.name ?? room.spaceTypeId,
      lpd: st?.lpdWattsPerSqft ?? 0,
      installedLpd: lpdCheckForRoom(room, st?.lpdWattsPerSqft ?? 0),
      fixtureBreakdown: formatFixtureBreakdown(room),
      groupLabel: group?.label ?? "—",
      occupancy,
      shutoff,
      daylight: resolved ? (resolved.daylightZone ? "Yes" : "No") : "—",
      plug,
      note: room.overrides?.roomNote ?? (resolved?.hasOverrides ? "per-room override" : ""),
    };
  });

  const totalSqft = project.rooms.reduce((s, r) => s + (r.sizeSqft || 0), 0);
  const totalW = project.rooms.reduce(
    (s, r) => s + (r.sizeSqft || 0) * (spaceTypeById(r.spaceTypeId)?.lpdWattsPerSqft ?? 0),
    0,
  );
  const avgLpd = totalSqft > 0 ? totalW / totalSqft : 0;

  return (
    <View style={styles.table}>
      <View style={styles.trHead}>
        <Text style={styles.tdNum}>#</Text>
        <Text style={styles.tdName}>Name</Text>
        <Text style={styles.tdType}>Space type</Text>
        <Text style={styles.tdSize}>Size (sf)</Text>
        <Text style={styles.tdLpd}>LPD</Text>
        <Text style={styles.tdInstalled}>Installed</Text>
        <Text style={styles.tdGrp}>Grp</Text>
        <Text style={styles.tdStrategy}>Occupancy</Text>
        <Text style={styles.tdStrategy}>Shutoff</Text>
        <Text style={styles.tdShort}>Daylight</Text>
        <Text style={styles.tdShort}>Plug load</Text>
        <Text style={styles.tdNotes}>Notes</Text>
      </View>
      {rows.map((r) => (
        <View key={r.room.id} style={styles.tr} wrap={false}>
          <Text style={styles.tdNum}>{r.room.number || "—"}</Text>
          <Text style={styles.tdName}>{r.room.name || "(unnamed)"}</Text>
          <Text style={styles.tdType}>{r.spaceTypeName}</Text>
          <Text style={styles.tdSize}>{r.room.sizeSqft.toLocaleString()}</Text>
          <Text style={styles.tdLpd}>{r.lpd.toFixed(2)}</Text>
          <View style={styles.tdInstalled}>
            <InstalledLpdPdf check={r.installedLpd} />
          </View>
          <Text style={styles.tdGrp}>{r.groupLabel}</Text>
          <Text style={styles.tdStrategy}>{r.occupancy}</Text>
          <Text style={styles.tdStrategy}>{r.shutoff}</Text>
          <Text style={styles.tdShort}>{r.daylight}</Text>
          <Text style={styles.tdShort}>{r.plug}</Text>
          <View style={styles.tdNotes}>
            {r.fixtureBreakdown ? (
              <Text style={{ fontSize: 7, color: C.muted }}>
                {r.fixtureBreakdown}
              </Text>
            ) : null}
            {r.note ? <Text>{r.note}</Text> : null}
          </View>
        </View>
      ))}
      <View style={styles.trTotals}>
        <Text style={styles.tdNum}></Text>
        <Text style={styles.tdName}>Totals</Text>
        <Text style={styles.tdType}></Text>
        <Text style={styles.tdSize}>{totalSqft.toLocaleString()}</Text>
        <Text style={styles.tdLpd}>{avgLpd.toFixed(2)}</Text>
        <Text style={styles.tdInstalled}></Text>
        <Text style={styles.tdGrp}></Text>
        <Text style={[styles.tdStrategy, styles.muted]}>allowance avg W/ft²</Text>
        <Text style={styles.tdStrategy}></Text>
        <Text style={styles.tdShort}></Text>
        <Text style={styles.tdShort}></Text>
        <Text style={styles.tdNotes}></Text>
      </View>
    </View>
  );
}

/** Small colored pill inside a PDF cell showing installed W/ft² + pass/fail. */
function InstalledLpdPdf({ check }: { check: LpdCheck }) {
  if (check.status === "unknown") {
    return <Text style={{ color: C.muted }}>—</Text>;
  }
  const value = check.installedLpd !== null ? check.installedLpd.toFixed(2) : "—";
  const pct =
    check.allowance > 0 && check.installedLpd !== null
      ? Math.round((check.installedLpd / check.allowance) * 100)
      : null;
  const pillStyle = [
    styles.installedPill,
    check.status === "pass" ? styles.installedPass : styles.installedFail,
  ];
  return (
    <Text style={pillStyle}>
      {value}
      {pct !== null ? ` · ${pct}%` : ""}
    </Text>
  );
}

function OutdoorSection({ project }: { project: Project }) {
  const enabledZones = (
    Object.entries(project.outdoorScope.zones) as Array<
      [OutdoorZoneType, NonNullable<typeof project.outdoorScope.zones[OutdoorZoneType]>]
    >
  ).filter(([, cfg]) => cfg.enabled);
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>6. Outdoor Controls (§9.4.2)</Text>
      {enabledZones.length === 0 ? (
        <Text style={[styles.prose, styles.muted]}>No outdoor zones in scope.</Text>
      ) : (
        enabledZones.map(([type, cfg]) => (
          <View key={type} style={styles.groupBlock} wrap={false}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{OUTDOOR_ZONE_LABELS[type]}</Text>
              <Text style={styles.groupMeta}>
                {cfg.lightingZone}
                {cfg.count ? ` · ${cfg.count.toLocaleString()} fixture${cfg.count === 1 ? "" : "s"}` : ""}
                {formatOutdoorSize(cfg) ? ` · ${formatOutdoorSize(cfg)}` : ""}
              </Text>
            </View>
            <Text style={styles.prose}>{outdoorZoneNarrative(type, cfg)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const GLOSSARY: Array<{ term: string; def: string }> = [
  { term: "AHJ", def: "Authority Having Jurisdiction — the local building / code official." },
  { term: "ASHRAE 90.1", def: "Energy Standard for Buildings from ASHRAE." },
  { term: "Bilevel", def: "Lighting with at least one intermediate step between full-on and full-off." },
  { term: "BMS", def: "Building Management System — centralized controls for HVAC / lighting / etc." },
  { term: "Daylight zone", def: "Area of a space where natural daylight contributes per §9.4.1.1(e)/(f)." },
  { term: "IES", def: "Illuminating Engineering Society — publishes lighting recommendations (RP-1, RP-3, RP-28, RP-5)." },
  { term: "LPD", def: "Lighting Power Density (watts per square foot) — connected lighting cap." },
  { term: "LZ0–LZ4", def: "Lighting Zones per IES / ASHRAE, from LZ0 (no ambient) to LZ4 (high activity)." },
  { term: "REQ / ADD1 / ADD2", def: "Table 9.6.1 column applicability — REQ items always required; ADD sets require one pick." },
  { term: "SOO", def: "Sequence of Operation — written description of how a system is controlled." },
  { term: "§8.4.2", def: "Automatic receptacle control — applies to private offices, conference, print/copy, break, classrooms, and workstations." },
];

function GlossarySection() {
  return (
    <View style={styles.section}>
      <Text style={styles.h2}>7. Glossary & Abbreviations</Text>
      {GLOSSARY.map(({ term, def }) => (
        <View key={term} style={{ flexDirection: "row", marginBottom: 3 }}>
          <Text style={[styles.bold, { width: 92 }]}>{term}</Text>
          <Text style={{ flex: 1, color: C.muted }}>{def}</Text>
        </View>
      ))}
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <View style={styles.footerRow}>
        <Text>
          <Text style={styles.bold}>{BRAND.legalName}</Text> · {BRAND.address.line1}, {BRAND.address.cityStateZip}
        </Text>
        <Text>
          {BRAND.phone} · {BRAND.email}
        </Text>
      </View>
      <View style={styles.footerRow}>
        <Text>Generated using Lighting Controls Planner.</Text>
        <Text>Design aid — verify with your AHJ and licensed engineer.</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Download trigger
// ─────────────────────────────────────────────────────────────────────────────

export async function downloadControlsNarrativePdf(project: Project) {
  const blob = await pdf(<ControlsNarrativePdf project={project} />).toBlob();
  const safeName =
    project.name
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "project";
  const stamp = formatLocalFilenameStamp();
  const filename = `${safeName}-controls-narrative-${stamp}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
