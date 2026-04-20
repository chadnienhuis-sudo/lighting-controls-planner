"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { RefreshCw, Plus } from "lucide-react";
import { useProjectStore } from "@/lib/project-store";
import { roomsForGroup } from "@/lib/functional-groups";
import { spaceTypeById, applicableRequirements } from "@/data/space-types";
import { requirementById } from "@/data/requirements";
import type {
  FunctionalGroup,
  OccupancyStrategy,
  SensorType,
  DimmingProtocol,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GroupsSection() {
  const project = useProjectStore((s) => s.project);
  const regenerateGroups = useProjectStore((s) => s.regenerateGroups);
  const updateFunctionalGroup = useProjectStore((s) => s.updateFunctionalGroup);

  useEffect(() => {
    regenerateGroups();
  }, [regenerateGroups]);

  const hasRooms = (project?.rooms.length ?? 0) > 0;

  if (!project) return null;

  return (
    <div className="px-6 md:px-10 py-8 max-w-5xl">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Functional groups</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
            Rooms with the same ASHRAE space type are grouped together. Set splitting factors,
            pick designer choices, waive code items (with a logged reason), and add beyond-code
            features per group.
          </p>
        </div>
        <Button variant="outline" onClick={() => regenerateGroups()} disabled={!hasRooms}>
          <RefreshCw className="size-4" />
          Refresh from rooms
        </Button>
      </header>

      {!hasRooms ? (
        <EmptyNoRooms />
      ) : project.functionalGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center text-sm text-muted-foreground">
          No groups yet. Click &ldquo;Refresh from rooms&rdquo;.
        </div>
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
    <section className="rounded-lg border border-border bg-background">
      <header className="flex items-start justify-between gap-4 p-5 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-jet text-primary-foreground text-sm font-semibold tabular-nums">
            {group.label}
          </div>
          <div>
            <div className="font-semibold">{group.description}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {rooms.length} room{rooms.length === 1 ? "" : "s"}
              {hasOverrides && <span className="ml-2 text-spark">· customized</span>}
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
        {/* Left column: splitting factors + designer choices */}
        <div className="p-5 space-y-5">
          <div>
            <SectionLabel>Splitting factors</SectionLabel>
            <div className="mt-2 space-y-2.5">
              <Toggle
                label="Daylight zone"
                hint="At least some fixtures are within daylight-responsive range."
                checked={group.daylightZone}
                onChange={(v) => onChange({ daylightZone: v })}
              />
              <Toggle
                label="Plug load control (§8.4.2)"
                hint="Automatic receptacle control required for this space."
                checked={group.plugLoadControl}
                onChange={(v) => onChange({ plugLoadControl: v })}
              />
              <LabeledSelect
                label="Occupancy strategy"
                value={group.occupancyStrategy}
                onValueChange={(v) => onChange({ occupancyStrategy: v as OccupancyStrategy })}
                options={[
                  { value: "auto-on", label: "Auto-on (vacancy-activated)" },
                  { value: "manual-on", label: "Manual-on (occupant turns on)" },
                  { value: "partial-auto-on", label: "Partial auto-on (50% on entry)" },
                ]}
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

            {add1Items.length > 0 && (
              <RequirementGroup
                heading="Pick ≥1 (ADD1 set)"
                subheading="At least one of these must be implemented per Table 9.6.1. Uncheck the ones you&rsquo;re not using."
                items={add1Items.map((i) => i.requirementId)}
                waivedSet={waivedSet}
                waivers={group.waivers}
                onToggle={handleToggleRequirement}
                toneClass="text-jet/80"
              />
            )}

            {add2Items.length > 0 && (
              <RequirementGroup
                heading="Pick ≥1 (ADD2 set)"
                subheading="At least one of these must be implemented per Table 9.6.1. Uncheck the ones you&rsquo;re not using."
                items={add2Items.map((i) => i.requirementId)}
                waivedSet={waivedSet}
                waivers={group.waivers}
                onToggle={handleToggleRequirement}
                toneClass="text-jet/80"
              />
            )}

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
