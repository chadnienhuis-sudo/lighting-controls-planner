"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { nanoid } from "nanoid";
import { Popover } from "@base-ui/react/popover";
import {
  RefreshCw,
  Plus,
  LayoutGrid,
  Grid3x3,
  Check,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { useProjectStore } from "@/lib/project-store";
import {
  roomsForGroup,
  hasRoomOverrides,
  resolveRoomSettings,
  resolveDaylight,
  lpdCheckForRoom,
  lpdCheckForGroup,
  switchZoneInfoForRoom,
  resolveRoomFixtures,
  totalRoomFixtureCount,
  totalRoomWatts,
  type LpdCheck,
} from "@/lib/functional-groups";
import { spaceTypeById, applicableRequirements } from "@/data/space-types";
import { requirementById } from "@/data/requirements";
import type {
  ControlApplicability,
  ControlColumnId,
  FunctionalGroup,
  Room,
  RoomFixture,
  SensorType,
  DimmingProtocol,
  SpaceType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { HelpPopover } from "@/components/ui/help-popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ViewMode = "cards" | "matrix";
const VIEW_MODE_STORAGE_KEY = "lcp-groups-view-mode";

export function GroupsSection() {
  const project = useProjectStore((s) => s.project);
  const regenerateGroups = useProjectStore((s) => s.regenerateGroups);
  const updateFunctionalGroup = useProjectStore((s) => s.updateFunctionalGroup);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  useEffect(() => {
    regenerateGroups();
  }, [regenerateGroups]);

  // Restore preferred view on mount
  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === "matrix" || saved === "cards") setViewMode(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // When user clicks "Edit" in matrix, flip to cards view and scroll to the group
  useEffect(() => {
    if (!scrollTarget || viewMode !== "cards") return;
    const t = setTimeout(() => {
      const el = document.getElementById(`group-card-${scrollTarget}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.classList.add("ring-2", "ring-spark");
      setTimeout(() => el?.classList.remove("ring-2", "ring-spark"), 1400);
      setScrollTarget(null);
    }, 60);
    return () => clearTimeout(t);
  }, [scrollTarget, viewMode]);

  const hasRooms = (project?.rooms.length ?? 0) > 0;

  if (!project) return null;

  return (
    <div className={cn("px-6 md:px-10 py-8", viewMode === "matrix" ? "w-full" : "max-w-5xl")}>
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Functional groups</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Rooms with the same ASHRAE space type are grouped together. Flag daylight
            exposure, pick designer choices, waive code items (with a logged reason),
            and add beyond-code features per group.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button variant="outline" onClick={() => regenerateGroups()} disabled={!hasRooms}>
            <RefreshCw className="size-4" />
            Refresh from rooms
          </Button>
        </div>
      </header>

      {!hasRooms ? (
        <EmptyNoRooms />
      ) : project.functionalGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
          No groups yet. Click &ldquo;Refresh from rooms&rdquo;.
        </div>
      ) : viewMode === "matrix" ? (
        <MatrixView
          groups={project.functionalGroups}
          onEdit={(groupId) => {
            setScrollTarget(groupId);
            setViewMode("cards");
          }}
        />
      ) : (
        <div className="space-y-4">
          {project.functionalGroups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onChange={(patch) => updateFunctionalGroup(g.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
      <button
        type="button"
        onClick={() => onChange("cards")}
        aria-pressed={value === "cards"}
        title="Detailed card view — edit picks, waivers, designer choices"
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          value === "cards" ? "bg-muted text-jet" : "text-muted-foreground hover:text-jet",
        )}
      >
        <LayoutGrid className="size-3.5" />
        Cards
      </button>
      <button
        type="button"
        onClick={() => onChange("matrix")}
        aria-pressed={value === "matrix"}
        title="Compact matrix — Table 9.6.1 with your picks"
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
          value === "matrix" ? "bg-muted text-jet" : "text-muted-foreground hover:text-jet",
        )}
      >
        <Grid3x3 className="size-3.5" />
        Matrix
      </button>
    </div>
  );
}

function GroupCard({
  group,
  onChange,
}: {
  group: FunctionalGroup;
  onChange: (patch: Partial<FunctionalGroup>) => void;
}) {
  const project = useProjectStore((s) => s.project);
  const rooms = useMemo(
    () => (project ? roomsForGroup(project, group) : []),
    [project, group],
  );
  const st = spaceTypeById(group.spaceTypeId);
  const applicable = st ? applicableRequirements(st) : [];
  const reqItems = applicable.filter((a) => a.applicability === "REQ");
  const add1Items = applicable.filter((a) => a.applicability === "ADD1");
  const add2Items = applicable.filter((a) => a.applicability === "ADD2");
  const plugLoadItem = applicable.find((a) => a.applicability === "PLUG_LOAD");
  const waivedSet = new Set(group.waivers.map((w) => w.requirementId));
  const hasOverrides = group.waivers.length > 0 || group.additions.length > 0;

  function handleToggleRequirement(reqId: string, nextChecked: boolean) {
    if (nextChecked) {
      onChange({ waivers: group.waivers.filter((w) => w.requirementId !== reqId) });
    } else {
      const reason = window.prompt(
        `Reason for waiving "${requirementById(reqId)?.shortName ?? reqId}"?\nThis will be logged as a footnote in the exported narrative.`,
      );
      if (!reason) return;
      onChange({
        waivers: [
          ...group.waivers,
          { requirementId: reqId, reason, dateIso: new Date().toISOString() },
        ],
      });
    }
  }

  function handleAhjOverrideSet(setKey: "add1_set" | "add2_set", setLabel: string) {
    const reason = window.prompt(
      `AHJ / owner override for ${setLabel}.\n\nReason (e.g. "Owner letter dated 2026-04-15: requested auto-on in warehouse" or "Grand Rapids BCD verbal OK")?`,
    );
    if (!reason) return;
    const authority = window.prompt(
      `Authority (optional — who issued the ruling / approval)?\nExamples: "Grand Rapids BCD", "Owner: ACME Co.", "Project PE: Jane Smith, PE."`,
    ) ?? undefined;
    onChange({
      waivers: [
        ...group.waivers.filter((w) => w.requirementId !== setKey),
        {
          requirementId: setKey,
          reason,
          authority: authority || undefined,
          dateIso: new Date().toISOString(),
        },
      ],
    });
  }

  function handleRestoreSet(setKey: "add1_set" | "add2_set") {
    onChange({ waivers: group.waivers.filter((w) => w.requirementId !== setKey) });
  }

  const add1SetWaiver = group.waivers.find((w) => w.requirementId === "add1_set");
  const add2SetWaiver = group.waivers.find((w) => w.requirementId === "add2_set");

  function handleAddAddition() {
    const featureName = window.prompt("Addition feature name (e.g. 'Dimming')?");
    if (!featureName) return;
    const description = window.prompt("Short description of the addition?") ?? featureName;
    onChange({
      additions: [
        ...group.additions,
        { id: `add_${Math.random().toString(36).slice(2, 10)}`, featureName, description },
      ],
    });
  }

  function handleRemoveAddition(id: string) {
    onChange({ additions: group.additions.filter((a) => a.id !== id) });
  }

  return (
    <section
      id={`group-card-${group.id}`}
      className="rounded-lg border border-border bg-background transition-shadow scroll-mt-6"
    >
      <header className="flex items-start justify-between gap-4 p-5 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-jet text-primary-foreground text-sm font-semibold tabular-nums">
            {group.label}
          </div>
          <div>
            <div className="font-semibold">{group.description}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {rooms.length} room{rooms.length === 1 ? "" : "s"}
              {rooms.some(hasRoomOverrides) && (
                <span className="ml-2 text-spark">
                  · {rooms.filter(hasRoomOverrides).length} with per-room overrides
                </span>
              )}
              {hasOverrides && <span className="ml-2 text-spark">· group customized</span>}
            </div>
          </div>
        </div>
        <div className="text-right flex items-start gap-6">
          {st && st.lpdWattsPerSqft > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">LPD</div>
              <div className="text-sm mt-0.5 tabular-nums">
                <span className="font-semibold">{st.lpdWattsPerSqft.toFixed(2)}</span>
                <span className="ml-0.5 text-muted-foreground">W/ft²</span>
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">ASHRAE type</div>
            <div className="text-sm mt-0.5 font-mono">{group.spaceTypeId}</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Left column: daylight toggle + designer choices */}
        <div className="p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <SectionLabel>Daylight</SectionLabel>
              <HelpPopover label="About daylight zones">
                <DaylightZoneHelp />
              </HelpPopover>
            </div>
            <div className="mt-2 space-y-2.5">
              <Toggle
                label="Exposed to daylight"
                hint="Rooms in this group have windows or skylights that bring in daylight (see ?)."
                checked={group.daylightZone}
                onChange={(v) => onChange({ daylightZone: v })}
              />
            </div>
          </div>

          <div>
            <SectionLabel>Designer choices</SectionLabel>
            <div className="mt-2 space-y-2.5">
              <LabeledSelect
                label="Sensor type"
                value={group.designerChoices.sensorType ?? ""}
                onValueChange={(v) =>
                  onChange({
                    designerChoices: { ...group.designerChoices, sensorType: (v || undefined) as SensorType | undefined },
                  })
                }
                options={[
                  { value: "PIR", label: "PIR (passive infrared)" },
                  { value: "dual-tech", label: "Dual-tech (PIR + ultrasonic)" },
                  { value: "ultrasonic", label: "Ultrasonic" },
                  { value: "microwave", label: "Microwave" },
                ]}
                placeholder="(designer to pick)"
              />
              <LabeledSelect
                label="Dimming protocol"
                value={group.designerChoices.dimmingProtocol ?? ""}
                onValueChange={(v) =>
                  onChange({
                    designerChoices: { ...group.designerChoices, dimmingProtocol: (v || undefined) as DimmingProtocol | undefined },
                  })
                }
                options={[
                  { value: "0-10V", label: "0-10V" },
                  { value: "DALI", label: "DALI" },
                  { value: "phase", label: "Phase (forward / reverse)" },
                  { value: "wireless", label: "Wireless (BLE / mesh)" },
                ]}
                placeholder="(designer to pick)"
              />
            </div>
          </div>
        </div>

        {/* Right column: requirements + additions + room list */}
        <div className="p-5 space-y-5">
          <div className="space-y-4">
            {applicable.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No requirements applicable to this space type (per Table 9.6.1).
              </div>
            )}

            {reqItems.length > 0 && (
              <RequirementGroup
                heading="Required (§9.4.1.1 REQ)"
                subheading="All required controls. Uncheck only when waived by the AHJ — you&rsquo;ll be asked for the reason."
                items={reqItems.map((i) => i.requirementId)}
                waivedSet={waivedSet}
                waivers={group.waivers}
                onToggle={handleToggleRequirement}
              />
            )}

            {add1Items.length > 0 ? (
              add1SetWaiver ? (
                <AhjWaiverBanner
                  heading="Occupancy strategy (§9.4.1.1 ADD1)"
                  waiver={add1SetWaiver}
                  onRestore={() => handleRestoreSet("add1_set")}
                />
              ) : (
                <AddSetRadio
                  heading="Occupancy strategy (§9.4.1.1 ADD1)"
                  subheading="Code requires restricted-on behavior for this space type — pick one."
                  items={add1Items.map((i) => i.requirementId as ControlColumnId)}
                  selected={group.add1Selection ? [group.add1Selection] : []}
                  stacked={false}
                  onPick={(col) => onChange({ add1Selection: col })}
                  onAhjOverride={() => handleAhjOverrideSet("add1_set", "ADD1 occupancy strategy")}
                />
              )
            ) : (
              <div>
                <SectionLabel>Occupancy strategy</SectionLabel>
                <div className="mt-1 text-xs text-muted-foreground">
                  Code does not restrict occupancy behavior for this space type — auto-on is acceptable.
                </div>
              </div>
            )}

            {add2Items.length > 0 &&
              (add2SetWaiver ? (
                <AhjWaiverBanner
                  heading="Shutoff behavior (§9.4.1.1 ADD2)"
                  waiver={add2SetWaiver}
                  onRestore={() => handleRestoreSet("add2_set")}
                />
              ) : (
                <AddSetRadio
                  heading="Shutoff behavior (§9.4.1.1 ADD2)"
                  subheading={
                    group.add2Stacked
                      ? "Stacking enabled — both controls implemented together. Uncommon; usually one is enough."
                      : "Code requires at least one shutoff mechanism — pick one. Defaults to automatic full-off."
                  }
                  items={add2Items.map((i) => i.requirementId as ControlColumnId)}
                  selected={group.add2Selections}
                  stacked={group.add2Stacked}
                  onPick={(col) => onChange({ add2Selections: [col] })}
                  onToggleStack={(col, next) => {
                    const cur = new Set(group.add2Selections);
                    if (next) cur.add(col);
                    else cur.delete(col);
                    onChange({ add2Selections: Array.from(cur) });
                  }}
                  onToggleStackMode={() => {
                    const nextStacked = !group.add2Stacked;
                    if (!nextStacked) {
                      const preferred = group.add2Selections[0];
                      onChange({ add2Stacked: false, add2Selections: preferred ? [preferred] : [] });
                    } else {
                      onChange({ add2Stacked: true });
                    }
                  }}
                  onAhjOverride={() => handleAhjOverrideSet("add2_set", "ADD2 shutoff behavior")}
                />
              ))}

            {plugLoadItem && (
              <RequirementGroup
                heading="Plug-load control (§8.4.2)"
                subheading="Chapter 8 receptacle control — applies to this space type per the §8.4.2 applicability list."
                items={[plugLoadItem.requirementId]}
                waivedSet={waivedSet}
                waivers={group.waivers}
                onToggle={handleToggleRequirement}
              />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <SectionLabel>Beyond-code additions</SectionLabel>
              <Button variant="ghost" size="xs" onClick={handleAddAddition}>
                <Plus className="size-3" />
                Add
              </Button>
            </div>
            {group.additions.length === 0 ? (
              <div className="mt-2 text-xs text-muted-foreground">
                None. Use additions to add features the code doesn&rsquo;t require (e.g. dimming in restrooms).
              </div>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {group.additions.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-2 text-sm rounded-md bg-muted/40 px-2.5 py-1.5"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{a.featureName}</span>
                      {a.description !== a.featureName && (
                        <span className="ml-1.5 text-muted-foreground">— {a.description}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddition(a.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <SectionLabel>Rooms in this group ({rooms.length})</SectionLabel>
            {rooms.length === 0 ? (
              <div className="mt-2 text-xs text-muted-foreground">None.</div>
            ) : (
              <ul className="mt-2 text-xs text-muted-foreground">
                {rooms.map((r) => (
                  <li key={r.id} className="truncate">
                    {r.number && <span className="font-mono mr-2">{r.number}</span>}
                    {r.name || <span className="italic">(unnamed)</span>}
                    {r.sizeSqft > 0 && <span className="ml-1.5">· {r.sizeSqft.toLocaleString()} sf</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
      {children}
    </div>
  );
}

function AddSetRadio({
  heading,
  subheading,
  items,
  selected,
  stacked,
  onPick,
  onToggleStack,
  onToggleStackMode,
  onAhjOverride,
}: {
  heading: string;
  subheading?: string;
  items: ControlColumnId[];
  selected: ControlColumnId[];
  stacked: boolean;
  onPick: (col: ControlColumnId) => void;
  onToggleStack?: (col: ControlColumnId, next: boolean) => void;
  onToggleStackMode?: () => void;
  onAhjOverride?: () => void;
}) {
  const selectedSet = new Set(selected);
  return (
    <div>
      <SectionLabel>{heading}</SectionLabel>
      {subheading && <div className="mt-1 text-xs text-muted-foreground">{subheading}</div>}
      <ul className="mt-2 space-y-2">
        {items.map((col) => {
          const req = requirementById(col);
          if (!req) return null;
          const isSelected = selectedSet.has(col);
          return (
            <li key={col} className="flex items-start gap-2.5 text-sm">
              {stacked ? (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(v) => onToggleStack?.(col, Boolean(v))}
                  className="mt-0.5"
                />
              ) : (
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onPick(col)}
                  className={`mt-0.5 size-4 shrink-0 rounded-full border transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 after:block after:size-1.5 after:rounded-full after:bg-primary after:mx-auto after:mt-[5px]"
                      : "border-input hover:border-aplus-grey"
                  }`}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className={isSelected ? "" : "text-muted-foreground"}>
                  <span className="font-medium">{req.shortName}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">§{req.section}</span>
                </div>
                {isSelected && req.description && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{req.description}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
        {onToggleStackMode && items.length > 1 && (
          <button
            type="button"
            onClick={onToggleStackMode}
            className="hover:text-foreground underline underline-offset-2"
          >
            {stacked ? "Back to pick-one" : "Stack both (uncommon)"}
          </button>
        )}
        {onAhjOverride && (
          <button
            type="button"
            onClick={onAhjOverride}
            className="hover:text-foreground underline underline-offset-2"
          >
            AHJ / owner override
          </button>
        )}
      </div>
    </div>
  );
}

function AhjWaiverBanner({
  heading,
  waiver,
  onRestore,
}: {
  heading: string;
  waiver: { reason: string; authority?: string; dateIso?: string };
  onRestore: () => void;
}) {
  const dateDisplay = waiver.dateIso ? new Date(waiver.dateIso).toISOString().slice(0, 10) : undefined;
  return (
    <div>
      <SectionLabel>{heading}</SectionLabel>
      <div className="mt-2 rounded-md border border-spark/40 bg-spark/10 p-3 text-sm">
        <div className="font-medium text-jet">AHJ / owner override in effect</div>
        <div className="mt-1 text-muted-foreground italic">{waiver.reason}</div>
        {(waiver.authority || dateDisplay) && (
          <div className="mt-1.5 text-xs text-muted-foreground">
            {waiver.authority && <span>{waiver.authority}</span>}
            {waiver.authority && dateDisplay && <span> · </span>}
            {dateDisplay && <span>{dateDisplay}</span>}
          </div>
        )}
        <button
          type="button"
          onClick={onRestore}
          className="mt-2 text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Restore code-compliant picking
        </button>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Logged as a footnote in the exported narrative.
      </div>
    </div>
  );
}

function RequirementGroup({
  heading,
  subheading,
  items,
  waivedSet,
  waivers,
  onToggle,
  toneClass,
}: {
  heading: string;
  subheading?: string;
  items: string[];
  waivedSet: Set<string>;
  waivers: { requirementId: string; reason: string }[];
  onToggle: (id: string, nextChecked: boolean) => void;
  toneClass?: string;
}) {
  return (
    <div>
      <SectionLabel>{heading}</SectionLabel>
      {subheading && <div className={`mt-1 text-xs ${toneClass ?? "text-muted-foreground"}`}>{subheading}</div>}
      <ul className="mt-2 space-y-2">
        {items.map((reqId) => {
          const req = requirementById(reqId);
          if (!req) return null;
          const isWaived = waivedSet.has(reqId);
          const waiver = waivers.find((w) => w.requirementId === reqId);
          return (
            <li key={reqId} className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={!isWaived}
                onCheckedChange={(v) => onToggle(reqId, Boolean(v))}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className={isWaived ? "line-through text-muted-foreground" : ""}>
                  <span className="font-medium">{req.shortName}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">§{req.section}</span>
                </div>
                {!isWaived && req.description && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{req.description}</div>
                )}
                {isWaived && waiver?.reason && (
                  <div className="mt-0.5 text-xs text-spark italic">Waived: {waiver.reason}</div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} className="mt-0.5" />
      <span className="text-sm flex-1">
        <span>{label}</span>
        {hint && <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const selectedLabel = options.find((o) => o.value === value)?.label;
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={(v) => onValueChange(v ?? "")}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder ?? "Select…"}>
            {() => selectedLabel ?? placeholder ?? "Select…"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyNoRooms() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center">
      <h2 className="font-medium">No rooms yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Groups are derived from your rooms. Add rooms first, then come back here.
      </p>
      <Badge variant="outline" className="mt-4">
        <Link href="/planner/workspace/rooms">Go to Rooms →</Link>
      </Badge>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix view — Table 9.6.1 with the project's picks filled in
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compact view: one row per group, columns mirror Table 9.6.1 §9.4.1.1(a–i)
 * plus §8.4.2 plug load and the daylight-zone splitting factor. Read-only;
 * edits happen in the Cards view (click the Edit button per row to jump).
 */
function MatrixView({
  groups,
  onEdit,
}: {
  groups: FunctionalGroup[];
  onEdit: (groupId: string) => void;
}) {
  const project = useProjectStore((s) => s.project);
  const updateFunctionalGroup = useProjectStore((s) => s.updateFunctionalGroup);
  const updateRoom = useProjectStore((s) => s.updateRoom);
  const updateRoomOverrides = useProjectStore((s) => s.updateRoomOverrides);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const footnotes: Array<{ n: number; text: string }> = [];
  let footnoteCounter = 0;

  // Allocate footnote numbers up front so cells can reference them in any order.
  // One footnote per distinct waiver record across all groups.
  const waiverFootnoteNums = new Map<string, number>();
  function fn(groupId: string, waiverKey: string, text: string): number {
    const k = `${groupId}:${waiverKey}`;
    const existing = waiverFootnoteNums.get(k);
    if (existing !== undefined) return existing;
    footnoteCounter += 1;
    waiverFootnoteNums.set(k, footnoteCounter);
    footnotes.push({ n: footnoteCounter, text });
    return footnoteCounter;
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Click handlers for in-cell edits. Kept here so we can pass small
  // onXxx(col) callbacks down to cells rather than the full group/setter.
  const toggleReqWaiver = (g: FunctionalGroup, col: string) => {
    const isWaived = g.waivers.some((w) => w.requirementId === col);
    if (isWaived) {
      updateFunctionalGroup(g.id, {
        waivers: g.waivers.filter((w) => w.requirementId !== col),
      });
      return;
    }
    const label =
      col === "plug_load_842"
        ? "§8.4.2 plug-load control"
        : requirementById(col)?.shortName ?? col;
    const reason = window.prompt(
      `AHJ / owner waiver reason for "${label}"?\nWill appear as a footnote in the exported narrative.`,
    );
    if (!reason) return;
    const authority = window.prompt(`Authority (optional — e.g. "Grand Rapids BCD")?`) ?? undefined;
    updateFunctionalGroup(g.id, {
      waivers: [
        ...g.waivers,
        {
          requirementId: col,
          reason,
          authority: authority || undefined,
          dateIso: new Date().toISOString(),
        },
      ],
    });
  };

  const toggleSetWaiver = (g: FunctionalGroup, setKey: "add1_set" | "add2_set") => {
    const existing = g.waivers.find((w) => w.requirementId === setKey);
    if (existing) {
      // Restore — remove the set-level waiver.
      updateFunctionalGroup(g.id, {
        waivers: g.waivers.filter((w) => w.requirementId !== setKey),
      });
      return;
    }
    const setLabel =
      setKey === "add1_set" ? "ADD1 turn-on strategy" : "ADD2 turn-off strategy";
    const reason = window.prompt(
      `AHJ / owner override for ${setLabel}.\n\nReason?`,
    );
    if (!reason) return;
    const authority = window.prompt(`Authority (optional — e.g. "Grand Rapids BCD")?`) ?? undefined;
    updateFunctionalGroup(g.id, {
      waivers: [
        ...g.waivers.filter((w) => w.requirementId !== setKey),
        {
          requirementId: setKey,
          reason,
          authority: authority || undefined,
          dateIso: new Date().toISOString(),
        },
      ],
    });
  };

  const toggleWindows = (g: FunctionalGroup) => {
    const current = resolveDaylight(g);
    const nextWindows = !current.hasWindows;
    updateFunctionalGroup(g.id, {
      hasWindows: nextWindows,
      hasSkylights: current.hasSkylights,
      daylightZone: nextWindows || current.hasSkylights,
    });
  };
  const toggleSkylights = (g: FunctionalGroup) => {
    const current = resolveDaylight(g);
    const nextSkylights = !current.hasSkylights;
    updateFunctionalGroup(g.id, {
      hasWindows: current.hasWindows,
      hasSkylights: nextSkylights,
      daylightZone: current.hasWindows || nextSkylights,
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-background overflow-x-auto">
        <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
          <thead>
            <tr className="border-b border-border bg-muted/20 text-left align-bottom">
              <th className="px-1 py-2 w-8" aria-label="Expand" />
              <th className="px-3 py-2 w-12 font-semibold">Grp</th>
              <th className="px-3 py-2 font-semibold">Space type</th>
              <th className="px-2 py-2 w-14 text-right font-semibold">Rms</th>
              <SimpleColHeader label="LPD" sub="allowance" width="w-16" />
              <SimpleColHeader label="Fixtures" sub="count × W/ea" width="w-28" />
              <SimpleColHeader label="Installed" sub="W/ft² · pass / fail" width="w-24" />
              <SimpleColHeader
                label="Local control"
                sub="§a"
                width="w-20"
                help={<LocalControlZoningHelp />}
              />
              <SimpleColHeader label="Turn-on strategy" sub="§b / §c · pick one" width="w-48" />
              <SimpleColHeader label="Bi-level" sub="§d" width="w-20" />
              <SimpleColHeader label="Daylight side" sub="§e" width="w-24" />
              <SimpleColHeader label="Daylight top" sub="§f" width="w-24" />
              <SimpleColHeader label="Turn-off strategy" sub="§g / §h / §i · pick one" width="w-64" />
              <SimpleColHeader label="Plug load" sub="§8.4.2" width="w-20" />
              <SimpleColHeader
                label="Windows?"
                sub="triggers §e"
                width="w-20"
                help={<DaylightZoneHelp />}
              />
              <SimpleColHeader
                label="Skylights?"
                sub="triggers §f"
                width="w-20"
                help={<DaylightZoneHelp />}
              />
              <th className="px-2 py-2 w-14" />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const st = spaceTypeById(g.spaceTypeId);
              const rooms = project ? roomsForGroup(project, g) : [];
              const roomCount = rooms.length;
              const waivers = new Map(g.waivers.map((w) => [w.requirementId, w]));
              const add1SetWaiver = waivers.get("add1_set");
              const add2SetWaiver = waivers.get("add2_set");
              const plugLoadWaiver = waivers.get("plug_load_842");
              const isExpanded = expandedIds.has(g.id);

              return (
                <Fragment key={g.id}>
                <tr className="border-b border-border align-middle hover:bg-muted/20">
                  <td className="px-1 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(g.id)}
                      aria-label={isExpanded ? "Collapse group" : "Expand group to see rooms"}
                      aria-expanded={isExpanded}
                      className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-jet transition-colors"
                      disabled={roomCount === 0}
                    >
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="inline-flex size-6 items-center justify-center rounded bg-jet text-primary-foreground text-xs font-semibold tabular-nums">
                      {g.label}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div
                      className="font-medium truncate"
                      title={`${g.description} (${g.spaceTypeId})`}
                    >
                      {g.description}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{roomCount}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {st && st.lpdWattsPerSqft > 0 ? st.lpdWattsPerSqft.toFixed(2) : "—"}
                  </td>
                  {/* Fixtures — group aggregate: total count and total wattage. */}
                  <td className="px-3 py-2.5 text-right tabular-nums text-[11px] text-muted-foreground">
                    <GroupFixtureSummary rooms={rooms} />
                  </td>
                  {/* Installed LPD — rollup chip. */}
                  <td className="px-3 py-2.5 text-center">
                    {st ? (
                      <LpdStatusChip
                        check={lpdCheckForGroup(rooms, st.lpdWattsPerSqft)}
                      />
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                  {/* Local control (§a) */}
                  <ReqStatusCell
                    spaceType={st}
                    col="local_control"
                    waiver={waivers.get("local_control")}
                    getFootnote={(key, text) => fn(g.id, key, text)}
                    onToggle={() => toggleReqWaiver(g, "local_control")}
                  />
                  {/* Turn-on strategy (§b/c — ADD1) */}
                  <StrategyCell
                    kind="add1"
                    spaceType={st}
                    group={g}
                    setWaiver={add1SetWaiver}
                    columnWaivers={waivers}
                    getFootnote={(key, text) => fn(g.id, key, text)}
                    onPick={(c) =>
                      updateFunctionalGroup(g.id, { add1Selection: c as ControlColumnId })
                    }
                    onToggleSetWaiver={() => toggleSetWaiver(g, "add1_set")}
                  />
                  {/* Bi-level (§d) */}
                  <ReqStatusCell
                    spaceType={st}
                    col="bilevel"
                    waiver={waivers.get("bilevel")}
                    getFootnote={(key, text) => fn(g.id, key, text)}
                    onToggle={() => toggleReqWaiver(g, "bilevel")}
                  />
                  {/* Daylight sidelight (§e) — active only if the group has windows */}
                  <ReqStatusCell
                    spaceType={st}
                    col="daylight_sidelighting"
                    waiver={waivers.get("daylight_sidelighting")}
                    getFootnote={(key, text) => fn(g.id, key, text)}
                    onToggle={() => toggleReqWaiver(g, "daylight_sidelighting")}
                    notApplicable={!resolveDaylight(g).hasWindows}
                    notApplicableReason="No windows — §e not applicable"
                  />
                  {/* Daylight toplight (§f) — active only if the group has skylights */}
                  <ReqStatusCell
                    spaceType={st}
                    col="daylight_toplighting"
                    waiver={waivers.get("daylight_toplighting")}
                    getFootnote={(key, text) => fn(g.id, key, text)}
                    onToggle={() => toggleReqWaiver(g, "daylight_toplighting")}
                    notApplicable={!resolveDaylight(g).hasSkylights}
                    notApplicableReason="No skylights — §f not applicable"
                  />
                  {/* Turn-off strategy (§g/h/i — REQ + ADD2) */}
                  <StrategyCell
                    kind="add2"
                    spaceType={st}
                    group={g}
                    setWaiver={add2SetWaiver}
                    columnWaivers={waivers}
                    getFootnote={(key, text) => fn(g.id, key, text)}
                    onPick={(c) =>
                      updateFunctionalGroup(g.id, {
                        add2Selections: [c as ControlColumnId],
                        add2Stacked: false,
                      })
                    }
                    onToggleSetWaiver={() => toggleSetWaiver(g, "add2_set")}
                  />
                  <td className="px-3 py-2.5 text-center">
                    <PlugLoadCell
                      spaceType={st}
                      waiver={plugLoadWaiver}
                      getFootnote={(key, text) => fn(g.id, key, text)}
                      onToggle={() => toggleReqWaiver(g, "plug_load_842")}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <DaylightFlagCell
                      flag={resolveDaylight(g).hasWindows}
                      applies={st?.controls.daylight_sidelighting === "REQ"}
                      label="Windows"
                      onToggle={() => toggleWindows(g)}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <DaylightFlagCell
                      flag={resolveDaylight(g).hasSkylights}
                      applies={st?.controls.daylight_toplighting === "REQ"}
                      label="Skylights"
                      onToggle={() => toggleSkylights(g)}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => onEdit(g.id)}
                      className="text-[11px] text-muted-foreground hover:text-jet underline underline-offset-2"
                      aria-label={`Edit group ${g.label}`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
                {isExpanded &&
                  rooms.map((room) => (
                    <RoomMatrixRow
                      key={room.id}
                      room={room}
                      group={g}
                      spaceType={st}
                      projectTotalSqft={
                        project?.rooms.reduce((s, r) => s + (r.sizeSqft || 0), 0) ?? 0
                      }
                      onUpdateRoom={(patch) => updateRoom(room.id, patch)}
                      onUpdateOverrides={(patch) => updateRoomOverrides(room.id, patch)}
                    />
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <MatrixLegend />

      {footnotes.length > 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/10 p-3">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">
            AHJ / owner overrides
          </div>
          <ol className="space-y-0.5 text-xs text-muted-foreground list-none">
            {footnotes.map((f) => (
              <li key={f.n}>
                <sup className="text-spark mr-1">[{f.n}]</sup>
                {f.text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

/**
 * Compact option labels used on pills inside strategy cells (shorter than
 * `req.shortName`). These are what the user sees in the matrix — they pick
 * from them like a radio group.
 */
const OPTION_LABELS: Partial<Record<ControlColumnId, string>> = {
  restricted_manual_on: "Manual-on",
  restricted_partial_auto_on: "Partial auto-on",
  auto_partial_off: "Auto partial-off",
  auto_full_off: "Auto full-off",
  scheduled_shutoff: "Scheduled shutoff",
};

const ADD1_COLS: ControlColumnId[] = ["restricted_manual_on", "restricted_partial_auto_on"];
const ADD2_COLS: ControlColumnId[] = ["auto_partial_off", "auto_full_off", "scheduled_shutoff"];

function SimpleColHeader({
  label,
  sub,
  width,
  help,
}: {
  label: string;
  /** Subtext under the label — pass section reference like "§a" or descriptive text. */
  sub?: string;
  width: string;
  /** Optional rich help content rendered behind a ? trigger next to the label. */
  help?: React.ReactNode;
}) {
  return (
    <th className={cn("px-2 py-2 text-center font-semibold align-bottom", width)}>
      <div className="flex items-center justify-center gap-1 text-[11px] leading-tight">
        <span>{label}</span>
        {help && <HelpPopover label={`About ${label}`}>{help}</HelpPopover>}
      </div>
      {sub && (
        <div className="text-[9px] font-mono text-muted-foreground font-normal mt-0.5">
          {sub}
        </div>
      )}
    </th>
  );
}

/** Single-column REQ-status cell. Shows "REQ", "—" (N/A), or waived REQ. */
function ReqStatusCell({
  spaceType,
  col,
  waiver,
  getFootnote,
  onToggle,
  notApplicable,
  notApplicableReason,
}: {
  spaceType: SpaceType | undefined;
  col: ControlColumnId;
  waiver: { reason: string; authority?: string; dateIso?: string } | undefined;
  getFootnote: (key: string, text: string) => number;
  /** Optional — when provided, the REQ chip becomes clickable to waive/restore. */
  onToggle?: () => void;
  /** When true, render as muted "not-applicable" regardless of Table 9.6.1 REQ
   *  status — e.g. §e when the group has no windows. */
  notApplicable?: boolean;
  /** Tooltip text for the N/A state. */
  notApplicableReason?: string;
}) {
  const req = requirementById(col);
  const applicability: ControlApplicability = spaceType?.controls[col] ?? null;
  const label = req?.shortName ?? col;

  if (applicability === null) {
    return (
      <td
        className="px-3 py-2.5 text-center text-muted-foreground/50"
        title={`${label} — not in Table 9.6.1 for this space type`}
      >
        —
      </td>
    );
  }

  // Overridden N/A — code marks it REQ, but the project can't trigger it
  // (e.g. §e with no windows). Render a muted chip with the reason.
  if (notApplicable && applicability === "REQ" && !waiver) {
    return (
      <td
        className="px-3 py-2.5 text-center"
        title={notApplicableReason ?? `${label} — not applicable`}
      >
        <Chip variant="subsumed">N/A</Chip>
      </td>
    );
  }

  // This cell only handles REQ — strategy cells handle ADD columns. A REQ-only
  // column that somehow holds an ADD applicability is a data bug; fall through
  // to a muted label so it's visible.
  if (applicability !== "REQ") {
    return (
      <td
        className="px-3 py-2.5 text-center text-muted-foreground/70 text-[10px]"
        title={`${label} — ${applicability}`}
      >
        {applicability}
      </td>
    );
  }

  const isWaived = !!waiver;
  const footnoteNum = waiver ? getFootnote(col, formatWaiverText(label, waiver)) : null;
  const title = isWaived
    ? `${label} — waived (click to restore)`
    : `${label} — required by code (click to AHJ-waive)`;

  const chip = (
    <Chip variant={isWaived ? "waived" : "req"}>
      <Check className="size-3.5" aria-label={isWaived ? "REQ waived" : "Required by code"} />
    </Chip>
  );

  return (
    <td className="px-3 py-2.5 text-center" title={title}>
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={title}
          className="rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
        >
          {chip}
        </button>
      ) : (
        chip
      )}
      {footnoteNum !== null && <FootnoteMark n={footnoteNum} />}
    </td>
  );
}

/**
 * Multi-pill strategy cell — renders the ADD1 (turn-on) or ADD2 (turn-off)
 * options for this group as a row of pills. Each pill is one of:
 *   - REQ (code-mandated, non-clickable) — filled, labeled "name · REQ"
 *   - Selected ADD (user's pick) — filled
 *   - Unselected ADD — outlined, clickable
 * If the whole set is AHJ-waived, shows one "AHJ override" pill + footnote.
 * If no columns in the set apply, shows "Auto-on OK" muted text.
 */
function StrategyCell({
  kind,
  spaceType,
  group,
  setWaiver,
  columnWaivers,
  getFootnote,
  onPick,
  onToggleSetWaiver,
}: {
  kind: "add1" | "add2";
  spaceType: SpaceType | undefined;
  group: FunctionalGroup;
  setWaiver: { reason: string; authority?: string; dateIso?: string } | undefined;
  columnWaivers: Map<string, { reason: string; authority?: string; dateIso?: string }>;
  getFootnote: (key: string, text: string) => number;
  onPick: (col: ControlColumnId) => void;
  /** Click-selected → waive the whole set (prompts for AHJ reason).
   *  Click waived set → restore (clear the waiver). */
  onToggleSetWaiver?: () => void;
}) {
  const cols = kind === "add1" ? ADD1_COLS : ADD2_COLS;
  const applicable = cols.filter((c) => spaceType?.controls[c] != null);

  // Whole-set AHJ override — clickable to restore.
  if (setWaiver) {
    const n = getFootnote(
      `${kind}_set`,
      formatWaiverText(
        kind === "add1" ? "ADD1 turn-on strategy" : "ADD2 turn-off strategy",
        setWaiver,
      ),
    );
    const title = `${kind.toUpperCase()} set waived — click to restore`;
    return (
      <td className="px-3 py-2.5 text-center" title={title}>
        {onToggleSetWaiver ? (
          <button
            type="button"
            onClick={onToggleSetWaiver}
            aria-label={title}
            className="rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
          >
            <Chip variant="waived">AHJ override</Chip>
          </button>
        ) : (
          <Chip variant="waived">AHJ override</Chip>
        )}
        <FootnoteMark n={n} />
      </td>
    );
  }

  // Nothing applies — space type has no ADD1 restrictions (e.g. restroom)
  if (applicable.length === 0) {
    return (
      <td
        className="px-3 py-2.5 text-center text-[10px] text-muted-foreground"
        title={
          kind === "add1"
            ? "Code does not restrict occupancy behavior for this space type — auto-on is acceptable."
            : "No shutoff columns apply to this space type."
        }
      >
        {kind === "add1" ? "Auto-on OK" : "—"}
      </td>
    );
  }

  // Subsumption: Auto full-off (h) satisfies Auto partial-off (g), since
  // turning lights off is a 100% reduction — well beyond the 50% g requires.
  // When full-off is active (REQ or user-picked ADD2), render the partial-off
  // pill as muted + annotated so it's clear one device covers both.
  const fullOffActive =
    kind === "add2" &&
    (spaceType?.controls.auto_full_off === "REQ" ||
      group.add2Selections.includes("auto_full_off"));

  return (
    <td className="px-2 py-1.5">
      <div className="flex flex-wrap items-center justify-center gap-1">
        {applicable.map((col) => {
          const applicability = spaceType!.controls[col]!;
          const label = OPTION_LABELS[col] ?? col;
          const colWaiver = columnWaivers.get(col);
          const isSubsumedByFullOff = col === "auto_partial_off" && fullOffActive;

          // REQ option — code-mandated, non-clickable. A trailing check icon
          // distinguishes it from a user-picked ADD pill.
          if (applicability === "REQ") {
            if (colWaiver) {
              const n = getFootnote(col, formatWaiverText(label, colWaiver));
              return (
                <span key={col} className="inline-flex items-center">
                  <Chip variant="waived">
                    <span>{label}</span>
                    <Check className="ml-1 size-3" />
                  </Chip>
                  <FootnoteMark n={n} />
                </span>
              );
            }
            if (isSubsumedByFullOff) {
              return (
                <Chip
                  key={col}
                  variant="subsumed"
                  title="Satisfied by Auto full-off — turning off is a 100% reduction, which exceeds the ≥50% §9.4.1.1(g) requires."
                >
                  <span>{label}</span>
                  <Check className="ml-1 size-3" />
                </Chip>
              );
            }
            return (
              <Chip key={col} variant="req" title={`${label} — required by code`}>
                <span>{label}</span>
                <Check className="ml-1 size-3" aria-label="Required by code" />
              </Chip>
            );
          }

          // ADD option — clickable. Click unselected → pick it (radio).
          // Click already-selected → prompt for AHJ waiver on the whole set.
          const isSelected =
            kind === "add1"
              ? group.add1Selection === col
              : group.add2Selections.includes(col) &&
                (!group.add2Stacked || group.add2Selections.length === 1);
          const handleClick = () => {
            if (!isSelected) {
              onPick(col);
              return;
            }
            // Already selected — treat click as "turn this set off", which
            // requires an AHJ waiver since the code still mandates a pick.
            onToggleSetWaiver?.();
          };
          const hint = isSelected
            ? `${label} — your pick (click to AHJ-override the whole set)`
            : `Click to pick ${label}`;
          return (
            <button
              key={col}
              type="button"
              onClick={handleClick}
              aria-pressed={isSelected}
              aria-label={hint}
              className="rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Chip
                variant={isSelected ? "selected" : "optional"}
                interactive
                title={hint}
              >
                {label}
              </Chip>
            </button>
          );
        })}
      </div>
    </td>
  );
}

function PlugLoadCell({
  spaceType,
  waiver,
  getFootnote,
  onToggle,
}: {
  spaceType: SpaceType | undefined;
  waiver: { reason: string; authority?: string; dateIso?: string } | undefined;
  getFootnote: (key: string, text: string) => number;
  onToggle?: () => void;
}) {
  if (!spaceType?.plugLoadControl842) {
    return (
      <span className="text-muted-foreground/50" title="§8.4.2 does not apply to this space type">
        —
      </span>
    );
  }
  const isWaived = !!waiver;
  const footnoteNum = waiver
    ? getFootnote("plug_load_842", formatWaiverText("§8.4.2 plug-load control", waiver))
    : null;
  const title = isWaived
    ? "§8.4.2 plug-load control — waived (click to restore)"
    : "§8.4.2 plug-load control — required (click to AHJ-waive)";
  const chip = (
    <Chip variant={isWaived ? "waived" : "req"}>
      <Check className="size-3.5" />
    </Chip>
  );
  return (
    <span title={title}>
      {onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={title}
          className="rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
        >
          {chip}
        </button>
      ) : (
        chip
      )}
      {footnoteNum !== null && <FootnoteMark n={footnoteNum} />}
    </span>
  );
}

/**
 * One-click Y/N toggle for a daylight-exposure flag (Windows? or Skylights?).
 * When the underlying control column doesn't apply to the space type ("—")
 * the cell is rendered as muted N/A and the flag is effectively unused.
 */
function DaylightFlagCell({
  flag,
  applies,
  label,
  onToggle,
}: {
  flag: boolean;
  applies: boolean;
  label: string;
  onToggle: () => void;
}) {
  if (!applies) {
    return (
      <span
        className="text-muted-foreground/50"
        title={`${label}: not applicable to this space type`}
      >
        —
      </span>
    );
  }
  const title = `${label}: ${flag ? "Yes" : "No"} (click to toggle)`;
  const chip = flag ? (
    <Chip variant="selected" title={title}>Y</Chip>
  ) : (
    <Chip variant="optional" interactive title={title}>N</Chip>
  );
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={title}
      aria-pressed={flag}
      className="rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
    >
      {chip}
    </button>
  );
}

/**
 * One sub-row per room inside an expanded group. Shows the room's resolved
 * settings (inherited unless overridden) and lets the user edit per-room
 * picks inline. Fixture-count + W/fix inputs feed the installed-LPD check.
 */
function RoomMatrixRow({
  room,
  group,
  spaceType,
  projectTotalSqft,
  onUpdateRoom,
  onUpdateOverrides,
}: {
  room: Room;
  group: FunctionalGroup;
  spaceType: SpaceType | undefined;
  projectTotalSqft: number;
  onUpdateRoom: (patch: Partial<Room>) => void;
  onUpdateOverrides: (patch: Partial<Room["overrides"]>) => void;
}) {
  const resolved = resolveRoomSettings(room, group);
  const zones = switchZoneInfoForRoom(room.sizeSqft, projectTotalSqft);
  const overrideBadge = resolved.hasOverrides ? (
    <span
      className="ml-2 inline-flex items-center rounded bg-spark/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-spark"
      title="This room has per-room overrides that differ from the group"
    >
      overridden
    </span>
  ) : null;
  const lpd = spaceType
    ? lpdCheckForRoom(room, spaceType.lpdWattsPerSqft)
    : null;

  // Per-room ADD picks: when the user clicks a pill, write the choice to
  // room.overrides so it diverges from the group. If they click the
  // currently-selected one, treat as a "clear override" shortcut.
  const pickAdd1 = (col: ControlColumnId) => {
    if (resolved.add1Selection === col) {
      // Re-picking same value — if override is active, clear it; otherwise no-op.
      if (room.overrides?.add1Selection !== undefined) {
        onUpdateOverrides({ add1Selection: undefined });
      }
      return;
    }
    onUpdateOverrides({ add1Selection: col });
  };
  const pickAdd2 = (col: ControlColumnId) => {
    const current = resolved.add2Selections;
    const isSame = current.length === 1 && current[0] === col && !resolved.add2Stacked;
    if (isSame) {
      if (room.overrides?.add2Selections !== undefined) {
        onUpdateOverrides({ add2Selections: undefined, add2Stacked: undefined });
      }
      return;
    }
    onUpdateOverrides({ add2Selections: [col], add2Stacked: false });
  };
  const toggleDaylight = () => {
    onUpdateOverrides({ daylightZone: !resolved.daylightZone });
  };

  return (
    <tr className="border-b border-border/60 bg-muted/5 text-muted-foreground align-middle">
      <td />
      <td />
      <td className="px-3 py-2 pl-8 text-xs">
        <div className="flex items-center gap-1 truncate">
          <span className="text-muted-foreground/60 shrink-0">↳</span>
          <input
            type="text"
            value={room.number}
            onChange={(e) => onUpdateRoom({ number: e.target.value })}
            placeholder="#"
            aria-label="Room number"
            className="w-12 shrink-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] tabular-nums font-mono text-foreground outline-none hover:border-input focus:border-input focus:bg-background"
          />
          <input
            type="text"
            value={room.name}
            onChange={(e) => onUpdateRoom({ name: e.target.value })}
            placeholder="Room name"
            aria-label="Room name"
            className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] font-medium text-foreground outline-none hover:border-input focus:border-input focus:bg-background"
          />
          {overrideBadge}
        </div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-[10px]">
        {room.sizeSqft > 0 ? (
          <>
            <div>{room.sizeSqft.toLocaleString()} sf</div>
            {zones.minZonesRequired > 1 && (
              <div
                className="text-spark text-[9px]"
                title={`§9.4.1.1(a): max ${zones.zoneMaxSqft.toLocaleString()} ft² per switch — this room needs ≥${zones.minZonesRequired} zones`}
              >
                ≥ {zones.minZonesRequired} zones
              </div>
            )}
          </>
        ) : (
          "—"
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-[10px]">
        {spaceType?.lpdWattsPerSqft ? spaceType.lpdWattsPerSqft.toFixed(2) : "—"}
      </td>
      {/* Fixtures — clickable summary opens a popover editor */}
      <td className="px-2 py-2">
        <FixturePopoverCell room={room} onUpdateRoom={onUpdateRoom} />
      </td>
      {/* Installed LPD chip */}
      <td className="px-2 py-2 text-center">
        {lpd ? <LpdStatusChip check={lpd} /> : <span className="text-muted-foreground/50">—</span>}
      </td>
      {/* Local control (§a) */}
      <InheritedReqCell col="local_control" spaceType={spaceType} />
      {/* Turn-on (§b/c) — editable per-room */}
      <EditableStrategyCell
        kind="add1"
        spaceType={spaceType}
        resolved={resolved}
        onPick={pickAdd1}
      />
      {/* Bi-level (§d) */}
      <InheritedReqCell col="bilevel" spaceType={spaceType} />
      {/* Daylight side (§e) */}
      <InheritedReqCell col="daylight_sidelighting" spaceType={spaceType} />
      {/* Daylight top (§f) */}
      <InheritedReqCell col="daylight_toplighting" spaceType={spaceType} />
      {/* Turn-off (§g/h/i) — editable per-room */}
      <EditableStrategyCell
        kind="add2"
        spaceType={spaceType}
        resolved={resolved}
        onPick={pickAdd2}
      />
      {/* Plug load (§8.4.2) */}
      <td className="px-3 py-2 text-center">
        {spaceType?.plugLoadControl842 ? (
          <Chip variant="req">
            <Check className="size-3.5" />
          </Chip>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>
      {/* Daylight zone — editable per-room */}
      <td className="px-3 py-2 text-center">
        {spaceType?.controls.daylight_sidelighting === "REQ" ||
        spaceType?.controls.daylight_toplighting === "REQ" ? (
          <button
            type="button"
            onClick={toggleDaylight}
            aria-pressed={resolved.daylightZone}
            aria-label={
              resolved.daylightZone
                ? "Room daylight zone: Yes (click to toggle)"
                : "Room daylight zone: No (click to toggle)"
            }
            className="rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
          >
            <Chip
              variant={resolved.daylightZone ? "selected" : "optional"}
              interactive={!resolved.daylightZone}
            >
              {resolved.daylightZone ? "Y" : "N"}
            </Chip>
          </button>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-2 py-2 text-right text-[10px] text-muted-foreground">
        <Link
          href="/planner/workspace/rooms"
          className="hover:text-jet underline underline-offset-2"
          title="Open the Rooms page to rename, resize, or add notes"
        >
          Rooms →
        </Link>
      </td>
    </tr>
  );
}

/** Read-only REQ chip for the expanded room sub-rows. */
function InheritedReqCell({
  col,
  spaceType,
}: {
  col: ControlColumnId;
  spaceType: SpaceType | undefined;
}) {
  const applicability = spaceType?.controls[col] ?? null;
  if (applicability === null || applicability !== "REQ") {
    return <td className="px-3 py-2 text-center text-muted-foreground/50">—</td>;
  }
  return (
    <td className="px-3 py-2 text-center">
      <Chip variant="req">
        <Check className="size-3.5" />
      </Chip>
    </td>
  );
}

/** Read-only strategy cell for the expanded room sub-rows. Shows the room's
 *  resolved selection (inherited or overridden) as a single short-label chip. */
/**
 * Editable strategy cell for the per-room sub-rows. Same radio-pill layout as
 * the group-level StrategyCell, but writes to `room.overrides` instead of the
 * group, so changes create a room-level override without splitting the group.
 */
function EditableStrategyCell({
  kind,
  spaceType,
  resolved,
  onPick,
}: {
  kind: "add1" | "add2";
  spaceType: SpaceType | undefined;
  resolved: ReturnType<typeof resolveRoomSettings>;
  onPick: (col: ControlColumnId) => void;
}) {
  const cols = kind === "add1" ? ADD1_COLS : ADD2_COLS;
  const applicable = cols.filter((c) => spaceType?.controls[c] != null);
  const setKey = kind === "add1" ? "add1_set" : "add2_set";

  if (applicable.length === 0) {
    return (
      <td className="px-3 py-2 text-center text-[10px] text-muted-foreground">
        {kind === "add1" ? "Auto-on OK" : "—"}
      </td>
    );
  }

  if (resolved.waivers.some((w) => w.requirementId === setKey)) {
    return (
      <td className="px-3 py-2 text-center">
        <Chip variant="waived">AHJ override</Chip>
      </td>
    );
  }

  const selectedCol =
    kind === "add1" ? resolved.add1Selection : resolved.add2Selections[0] ?? null;

  return (
    <td className="px-2 py-2">
      <div className="flex flex-wrap items-center justify-center gap-1">
        {applicable.map((col) => {
          const applicability = spaceType!.controls[col]!;
          const label = OPTION_LABELS[col] ?? col;
          if (applicability === "REQ") {
            return (
              <Chip key={col} variant="req" title={`${label} — required by code`}>
                <span>{label}</span>
                <Check className="ml-1 size-3" />
              </Chip>
            );
          }
          const isSelected = selectedCol === col;
          const hint = isSelected
            ? `${label} — your pick for this room`
            : `Click to override this room to ${label}`;
          return (
            <button
              key={col}
              type="button"
              onClick={() => onPick(col)}
              aria-pressed={isSelected}
              aria-label={hint}
              className="rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Chip
                variant={isSelected ? "selected" : "optional"}
                interactive
                title={hint}
              >
                {label}
              </Chip>
            </button>
          );
        })}
      </div>
    </td>
  );
}

/**
 * Clickable fixture-summary cell that opens a popover editor. The cell shows
 * a compact summary ("3 types · 25 fix · 1,100 W") and the popover lets the
 * user add/edit/remove any number of fixture types with Model | W/ea | Count.
 * Writes flow through the new `fixtures[]` field and clear any legacy
 * `fixtureCount` / `fixtureWattage` at the same time.
 */
function FixturePopoverCell({
  room,
  onUpdateRoom,
}: {
  room: Room;
  onUpdateRoom: (patch: Partial<Room>) => void;
}) {
  const fixtures = resolveRoomFixtures(room);
  const totalCount = totalRoomFixtureCount(room);
  const totalWatts = totalRoomWatts(room);
  const isEmpty = fixtures.length === 0 || totalWatts === 0;

  const writeFixtures = (next: RoomFixture[]) => {
    onUpdateRoom({
      fixtures: next,
      // Clear legacy fields to keep a single source of truth
      fixtureCount: undefined,
      fixtureWattage: undefined,
    });
  };
  const updateFixture = (id: string, patch: Partial<RoomFixture>) =>
    writeFixtures(fixtures.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeFixture = (id: string) =>
    writeFixtures(fixtures.filter((f) => f.id !== id));
  const addFixture = () =>
    writeFixtures([
      ...fixtures,
      { id: `fx_${nanoid(6)}`, model: "", wattage: 0, count: 0 },
    ]);

  const summary = isEmpty ? (
    <span className="text-muted-foreground/50">—</span>
  ) : fixtures.length === 1 ? (
    <span className="tabular-nums">
      {fixtures[0].count.toLocaleString()} ×{" "}
      {fixtures[0].wattage.toLocaleString()} W
    </span>
  ) : (
    <span className="tabular-nums">
      {fixtures.length} types · {totalCount.toLocaleString()} ·{" "}
      {totalWatts.toLocaleString()} W
    </span>
  );

  const triggerLabel = isEmpty
    ? `Edit fixtures — none yet`
    : `Edit fixtures — ${totalCount} fixtures, ${totalWatts.toLocaleString()} W total`;

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <button
            type="button"
            aria-label={triggerLabel}
            title={triggerLabel}
            className="block w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[11px] text-center outline-none hover:border-input focus-visible:border-input focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            {summary}
          </button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="end">
          <Popover.Popup className="z-50 w-[440px] rounded-md border border-border bg-background p-3 text-xs shadow-lg outline-none">
            <div className="flex items-baseline justify-between mb-2">
              <div className="font-semibold text-jet text-[12px]">
                Fixtures —{" "}
                {room.number ? (
                  <span className="font-mono mr-1">{room.number}</span>
                ) : null}
                {room.name || <span className="italic text-muted-foreground">room</span>}
              </div>
              <div className="text-[10px] tabular-nums text-muted-foreground">
                {totalCount.toLocaleString()} fix ·{" "}
                {totalWatts.toLocaleString()} W
              </div>
            </div>
            {fixtures.length > 0 ? (
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    <th className="text-left py-1 pr-2 font-semibold">
                      Model / tag
                    </th>
                    <th className="text-right py-1 px-2 font-semibold w-16">
                      W/ea
                    </th>
                    <th className="text-right py-1 px-2 font-semibold w-14">
                      Count
                    </th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody>
                  {fixtures.map((f) => (
                    <tr key={f.id} className="align-middle">
                      <td className="py-0.5 pr-2">
                        <input
                          type="text"
                          value={f.model}
                          onChange={(e) =>
                            updateFixture(f.id, { model: e.target.value })
                          }
                          placeholder="LS-A8-4K"
                          className="w-full rounded border border-input bg-background px-1.5 py-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Fixture model"
                        />
                      </td>
                      <td className="py-0.5 px-1">
                        <input
                          type="number"
                          min={0}
                          step="0.5"
                          value={f.wattage || ""}
                          onChange={(e) =>
                            updateFixture(f.id, {
                              wattage: Number(e.target.value) || 0,
                            })
                          }
                          placeholder="W"
                          className="w-full rounded border border-input bg-background px-1 py-1 text-right tabular-nums text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Watts per fixture"
                        />
                      </td>
                      <td className="py-0.5 px-1">
                        <input
                          type="number"
                          min={0}
                          value={f.count || ""}
                          onChange={(e) =>
                            updateFixture(f.id, {
                              count: Number(e.target.value) || 0,
                            })
                          }
                          placeholder="#"
                          className="w-full rounded border border-input bg-background px-1 py-1 text-right tabular-nums text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Fixture count"
                        />
                      </td>
                      <td className="py-0.5 pl-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeFixture(f.id)}
                          aria-label={`Remove ${f.model || "fixture"}`}
                          title="Remove fixture"
                          className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="rounded border border-dashed border-border bg-muted/10 p-3 text-center text-[11px] text-muted-foreground">
                No fixture types yet — add one below.
              </div>
            )}
            <button
              type="button"
              onClick={addFixture}
              className="mt-2 inline-flex items-center gap-1 rounded border border-dashed border-input px-2 py-1 text-[11px] text-muted-foreground hover:border-jet hover:text-jet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <Plus className="size-3" /> Add fixture
            </button>
            <div className="mt-2 text-[10px] text-muted-foreground">
              Totals drive the installed LPD check against Table 9.6.1.
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * Chip that visualizes an LpdCheck result: green pass, red fail, or muted
 * "needs data" when fixtures aren't entered yet. Displays the installed W/ft²
 * value on pass/fail for an at-a-glance read.
 */
function LpdStatusChip({ check }: { check: LpdCheck }) {
  if (check.status === "unknown") {
    return (
      <Chip variant="optional" title="Enter fixture count + W/fix to calculate">
        —
      </Chip>
    );
  }
  const pct = check.allowance > 0 && check.installedLpd
    ? Math.round((check.installedLpd / check.allowance) * 100)
    : null;
  const label =
    check.installedLpd !== null ? `${check.installedLpd.toFixed(2)}` : "—";
  const suffix = pct !== null ? ` · ${pct}%` : "";
  if (check.status === "pass") {
    return (
      <Chip
        variant="pass"
        title={`Installed ${label} W/ft² vs allowance ${check.allowance.toFixed(2)} W/ft² — passes`}
      >
        {label}{suffix}
      </Chip>
    );
  }
  return (
    <Chip
      variant="fail"
      title={`Installed ${label} W/ft² exceeds allowance ${check.allowance.toFixed(2)} W/ft²`}
    >
      {label}{suffix}
    </Chip>
  );
}

/** Group-level fixture aggregate for the header row. */
function GroupFixtureSummary({ rooms }: { rooms: Room[] }) {
  let totalCount = 0;
  let totalWatts = 0;
  let hasAny = false;
  for (const r of rooms) {
    const w = totalRoomWatts(r);
    if (w > 0) {
      hasAny = true;
      totalCount += totalRoomFixtureCount(r);
      totalWatts += w;
    }
  }
  if (!hasAny) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  return (
    <span title={`${totalCount} fixtures · ${totalWatts.toLocaleString()} W across ${rooms.length} room${rooms.length === 1 ? "" : "s"}`}>
      {totalCount.toLocaleString()} · {totalWatts.toLocaleString()} W
    </span>
  );
}

/** Read-only strategy cell (kept for places that don't want editing, e.g. if a
 *  future read-only matrix appears elsewhere). Currently unused but cheap to keep. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _InheritedStrategyCell_UNUSED({
  kind,
  spaceType,
  resolved,
}: {
  kind: "add1" | "add2";
  spaceType: SpaceType | undefined;
  resolved: ReturnType<typeof resolveRoomSettings>;
}) {
  const cols = kind === "add1" ? ADD1_COLS : ADD2_COLS;
  const applicable = cols.filter((c) => spaceType?.controls[c] != null);

  if (applicable.length === 0) {
    return (
      <td className="px-3 py-2 text-center text-[10px] text-muted-foreground">
        {kind === "add1" ? "Auto-on OK" : "—"}
      </td>
    );
  }

  // Set-level waiver applied to the room
  const setKey = kind === "add1" ? "add1_set" : "add2_set";
  if (resolved.waivers.some((w) => w.requirementId === setKey)) {
    return (
      <td className="px-3 py-2 text-center">
        <Chip variant="waived">AHJ override</Chip>
      </td>
    );
  }

  const selectedCol =
    kind === "add1" ? resolved.add1Selection : resolved.add2Selections[0] ?? null;
  if (!selectedCol) {
    return (
      <td className="px-3 py-2 text-center text-[10px] text-muted-foreground">
        none
      </td>
    );
  }
  const label = OPTION_LABELS[selectedCol] ?? selectedCol;
  return (
    <td className="px-3 py-2 text-center">
      <Chip variant="selected">{label}</Chip>
    </td>
  );
}

function Chip({
  children,
  variant,
  title,
  interactive,
}: {
  children: React.ReactNode;
  variant: "req" | "selected" | "optional" | "waived" | "subsumed" | "pass" | "fail";
  title?: string;
  /** When true, render hover feedback signaling the chip is clickable. */
  interactive?: boolean;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded px-2 py-1 text-xs font-semibold leading-none whitespace-nowrap transition-colors",
        variant === "req" && "bg-jet text-primary-foreground",
        variant === "selected" && "bg-jet text-primary-foreground",
        variant === "optional" && "border border-border bg-background text-muted-foreground",
        variant === "waived" && "bg-spark/15 text-spark line-through decoration-[1.5px]",
        variant === "subsumed" && "bg-muted text-muted-foreground/80 cursor-help",
        variant === "pass" && "bg-emerald-600 text-white",
        variant === "fail" && "bg-destructive text-white",
        interactive && variant === "optional" && "hover:border-jet hover:text-jet cursor-pointer",
        interactive && variant === "selected" && "cursor-default",
      )}
    >
      {children}
    </span>
  );
}

function FootnoteMark({ n }: { n: number }) {
  return <sup className="ml-0.5 text-[9px] text-spark">[{n}]</sup>;
}

function formatWaiverText(
  label: string,
  w: { reason: string; authority?: string; dateIso?: string },
): string {
  const meta: string[] = [];
  if (w.authority) meta.push(w.authority);
  if (w.dateIso) meta.push(new Date(w.dateIso).toISOString().slice(0, 10));
  const metaStr = meta.length > 0 ? ` (${meta.join(" · ")})` : "";
  return `${label} waived — ${w.reason}${metaStr}`;
}

/**
 * Plain-English explanation of the §9.4.1.1(e)/(f) daylight-zone trigger.
 * Shown behind a ? button on the Daylight zone toggle / column so users
 * don't have to read the standard to answer the question.
 */
function DaylightZoneHelp() {
  return (
    <div className="space-y-2">
      <div>
        <strong className="text-jet">Does this group have windows or skylights?</strong>{" "}
        If yes, ASHRAE §9.4.1.1(e) or (f) may require daylight-responsive controls in
        the affected zone.
      </div>
      <div>
        <span className="font-semibold text-jet">How this flag interacts with §e / §f:</span>{" "}
        the adjacent <em>Daylight side (§e)</em> and <em>Daylight top (§f)</em> columns
        show the code's REQ status for the space type — i.e. "if a sidelit / toplit
        zone exists, install daylight-responsive controls." This toggle tells the tool
        whether such a zone <em>actually exists</em> in the project. Without it, the §e
        /§f requirements don't activate in the narrative even if Table 9.6.1 marks them
        REQ.
      </div>
      <div>
        <span className="font-semibold text-jet">Primary daylight zone (rule of thumb):</span>
        <ul className="mt-1 ml-4 list-disc space-y-0.5">
          <li>
            <strong>Sidelit</strong> — depth equal to the <em>head height</em> of the
            window (the height from finished floor to the top of the glass), running
            along the window wall.
          </li>
          <li>
            <strong>Toplit</strong> — extends 0.7 × ceiling height on each side of a
            skylight.
          </li>
        </ul>
      </div>
      <div>
        <span className="font-semibold text-jet">Threshold:</span> daylight-responsive
        controls are only required when the <em>connected lighting power</em> inside
        that zone exceeds <strong>150 W</strong>. If the zone has no lighting or less
        than 150 W, leave this off.
      </div>
    </div>
  );
}

/** §9.4.1.1(a) zoning-rule help — 10k/2.5k sf max per switch. */
function LocalControlZoningHelp() {
  return (
    <div className="space-y-2">
      <div>
        <strong className="text-jet">Zoning rule (§9.4.1.1(a))</strong> — lighting
        must be independently controlled in zones sized as follows:
      </div>
      <ul className="ml-4 list-disc space-y-0.5">
        <li>
          <strong>Floors ≥ 10,000 ft² total</strong> — max 10,000 ft² per switch.
        </li>
        <li>
          <strong>Floors &lt; 10,000 ft² total</strong> — max 2,500 ft² per switch.
        </li>
      </ul>
      <div>
        The threshold is the total interior floor area of the project, not a single
        room or group. Expand any group to see per-room zone counts — rooms larger
        than the zone max are flagged in yellow.
      </div>
    </div>
  );
}

function MatrixLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Chip variant="req">
          <Check className="size-3.5" />
        </Chip>
        required by code
      </span>
      <span className="flex items-center gap-1.5">
        <Chip variant="selected">Manual-on</Chip>
        <Chip variant="optional">Partial auto-on</Chip>
        turn-on / turn-off strategy — filled = your pick, outlined = click to switch
      </span>
      <span className="flex items-center gap-1.5">
        <Chip variant="waived">
          <Check className="size-3.5" />
        </Chip>
        AHJ / owner waiver (see footnotes)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-muted-foreground/50">—</span>
        not applicable to this space type
      </span>
    </div>
  );
}
