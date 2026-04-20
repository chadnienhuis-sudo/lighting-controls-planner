"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useProjectStore } from "@/lib/project-store";
import { SPACE_TYPES, interiorSpaceTypes, spaceTypeById } from "@/data/space-types";
import { requirementById } from "@/data/requirements";
import { hasRoomOverrides } from "@/lib/functional-groups";
import type { ControlColumnId, FunctionalGroup, Room, RoomOverrides, SpaceType } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DEFAULT_SPACE_TYPE = "office_open";

export function RoomsSection() {
  const project = useProjectStore((s) => s.project);
  const addRoom = useProjectStore((s) => s.addRoom);
  const updateRoom = useProjectStore((s) => s.updateRoom);
  const updateRoomOverrides = useProjectStore((s) => s.updateRoomOverrides);
  const clearRoomOverrides = useProjectStore((s) => s.clearRoomOverrides);
  const removeRoom = useProjectStore((s) => s.removeRoom);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalSqft = useMemo(
    () => (project?.rooms ?? []).reduce((sum, r) => sum + (r.sizeSqft || 0), 0),
    [project?.rooms],
  );
  const totalAllowanceW = useMemo(
    () =>
      (project?.rooms ?? []).reduce((sum, r) => {
        const st = spaceTypeById(r.spaceTypeId);
        return sum + (r.sizeSqft || 0) * (st?.lpdWattsPerSqft ?? 0);
      }, 0),
    [project?.rooms],
  );

  if (!project) return null;

  function handleAdd() {
    addRoom({
      number: "",
      name: "",
      sizeSqft: 0,
      spaceTypeId: DEFAULT_SPACE_TYPE,
    });
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-6xl">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Rooms</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every room inherits its functional group&rsquo;s behavior. Expand a row to
            customize an individual room&rsquo;s overrides.
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="size-4" />
          Add room
        </Button>
      </header>

      {project.rooms.length === 0 ? (
        <EmptyState onAdd={handleAdd} />
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10" />
                <TableHead className="w-24">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-28">Size (sf)</TableHead>
                <TableHead className="w-72">ASHRAE space type</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.rooms.map((room) => {
                const group = project.functionalGroups.find((g) => g.id === room.functionalGroupId);
                const isExpanded = expandedId === room.id;
                const customized = hasRoomOverrides(room);
                return (
                  <RoomRow
                    key={room.id}
                    room={room}
                    group={group}
                    expanded={isExpanded}
                    customized={customized}
                    onToggleExpand={() =>
                      setExpandedId((cur) => (cur === room.id ? null : room.id))
                    }
                    onChange={(patch) => updateRoom(room.id, patch)}
                    onUpdateOverrides={(patch) => updateRoomOverrides(room.id, patch)}
                    onClearOverrides={() => clearRoomOverrides(room.id)}
                    onRemove={() => removeRoom(room.id)}
                  />
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted-foreground bg-muted/20">
            <span>
              {project.rooms.length} room{project.rooms.length === 1 ? "" : "s"}
              {project.rooms.some(hasRoomOverrides) && (
                <span className="ml-2 text-spark">
                  · {project.rooms.filter(hasRoomOverrides).length} customized
                </span>
              )}
            </span>
            <span className="flex items-center gap-4">
              <span>
                Area: <span className="tabular-nums text-foreground font-medium">{totalSqft.toLocaleString()}</span> sf
              </span>
              <span>
                LPD allowance: <span className="tabular-nums text-foreground font-medium">{Math.round(totalAllowanceW).toLocaleString()}</span> W
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomRow({
  room,
  group,
  expanded,
  customized,
  onToggleExpand,
  onChange,
  onUpdateOverrides,
  onClearOverrides,
  onRemove,
}: {
  room: Room;
  group: FunctionalGroup | undefined;
  expanded: boolean;
  customized: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<Room>) => void;
  onUpdateOverrides: (patch: Partial<RoomOverrides>) => void;
  onClearOverrides: () => void;
  onRemove: () => void;
}) {
  const unknownSpaceType = !SPACE_TYPES.some((s) => s.id === room.spaceTypeId);
  const st = spaceTypeById(room.spaceTypeId);
  return (
    <>
      <TableRow className={expanded ? "bg-muted/30" : undefined}>
        <TableCell>
          <button
            type="button"
            aria-label={expanded ? "Collapse customize" : "Expand customize"}
            onClick={onToggleExpand}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "text-muted-foreground hover:text-jet relative",
            )}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            {customized && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 block size-1.5 rounded-full bg-spark"
              />
            )}
          </button>
        </TableCell>
        <TableCell>
          <Input
            value={room.number}
            onChange={(e) => onChange({ number: e.target.value })}
            placeholder="101"
          />
        </TableCell>
        <TableCell>
          <Input
            value={room.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Private Office"
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            min={0}
            value={room.sizeSqft || ""}
            onChange={(e) => onChange({ sizeSqft: Number(e.target.value) || 0 })}
            className="tabular-nums"
          />
        </TableCell>
        <TableCell>
          <Select
            value={room.spaceTypeId}
            onValueChange={(v) => onChange({ spaceTypeId: v as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pick space type…">
                {(v: string | null) => (v ? spaceTypeById(v)?.name ?? v : "Pick space type…")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {interiorSpaceTypes().map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
              {unknownSpaceType && (
                <SelectItem value={room.spaceTypeId}>
                  {room.spaceTypeId} (unknown — pick a real type)
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Remove ${room.name || "room"}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={6} className="whitespace-normal py-4">
            <RoomOverridePanel
              room={room}
              group={group}
              spaceType={st}
              customized={customized}
              onUpdateOverrides={onUpdateOverrides}
              onClearOverrides={onClearOverrides}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function RoomOverridePanel({
  room,
  group,
  spaceType,
  customized,
  onUpdateOverrides,
  onClearOverrides,
}: {
  room: Room;
  group: FunctionalGroup | undefined;
  spaceType: SpaceType | undefined;
  customized: boolean;
  onUpdateOverrides: (patch: Partial<RoomOverrides>) => void;
  onClearOverrides: () => void;
}) {
  if (!group || !spaceType) {
    return (
      <div className="text-xs text-muted-foreground">
        Room must belong to a functional group before it can be customized. Go to the
        Groups page and click &ldquo;Refresh from rooms&rdquo;.
      </div>
    );
  }
  const o = room.overrides ?? {};

  const add1Options = (["restricted_manual_on", "restricted_partial_auto_on"] as ControlColumnId[])
    .filter((c) => spaceType.controls[c] === "ADD1");
  const add2Options = (["auto_full_off", "scheduled_shutoff", "auto_partial_off"] as ControlColumnId[])
    .filter((c) => spaceType.controls[c] === "ADD2");

  const daylightValue: "inherit" | "yes" | "no" =
    o.daylightZone === undefined ? "inherit" : o.daylightZone ? "yes" : "no";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
            Per-room overrides
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            This room inherits its behavior from Group {group.label} ({group.description}).
            Anything set below overrides the group default for this room only.
          </div>
        </div>
        {customized && (
          <button
            type="button"
            onClick={onClearOverrides}
            className="text-[11px] text-muted-foreground hover:text-destructive underline underline-offset-2 shrink-0"
          >
            Clear overrides · use group defaults
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Daylight */}
        <InheritSelect
          label="Daylight zone"
          value={daylightValue}
          groupHint={group.daylightZone ? "Yes" : "No"}
          inheritEquivalent={group.daylightZone ? "yes" : "no"}
          options={[
            { value: "yes", label: "Yes (override)" },
            { value: "no", label: "No (override)" },
          ]}
          onInherit={() => onUpdateOverrides({ daylightZone: undefined })}
          onSelect={(v) =>
            onUpdateOverrides({ daylightZone: v === "yes" ? true : false })
          }
        />

        {/* ADD1 */}
        <InheritSelect
          label="Occupancy strategy (ADD1)"
          value={
            o.add1Selection === undefined
              ? "inherit"
              : o.add1Selection === null
                ? "none"
                : o.add1Selection
          }
          groupHint={
            group.add1Selection
              ? requirementById(group.add1Selection)?.shortName
              : "None"
          }
          inheritEquivalent={group.add1Selection ?? "none"}
          disabled={add1Options.length === 0}
          disabledNote={
            add1Options.length === 0
              ? "Code does not restrict occupancy for this space type."
              : undefined
          }
          options={[
            ...add1Options.map((c) => ({
              value: c,
              label: requirementById(c)?.shortName ?? c,
            })),
            { value: "none", label: "None (AHJ / owner override)" },
          ]}
          onInherit={() => onUpdateOverrides({ add1Selection: undefined })}
          onSelect={(v) =>
            onUpdateOverrides({
              add1Selection: v === "none" ? null : (v as ControlColumnId),
            })
          }
        />

        {/* ADD2 */}
        <InheritSelect
          label="Shutoff behavior (ADD2)"
          value={
            o.add2Selections === undefined
              ? "inherit"
              : o.add2Selections.length === 0
                ? "none"
                : o.add2Selections[0]
          }
          groupHint={
            group.add2Selections && group.add2Selections[0]
              ? requirementById(group.add2Selections[0])?.shortName
              : "None"
          }
          inheritEquivalent={
            group.add2Stacked
              ? undefined // stacked group — every single-select override is meaningfully different
              : group.add2Selections?.[0] ?? "none"
          }
          disabled={add2Options.length === 0}
          disabledNote={
            add2Options.length === 0
              ? "Code does not offer ADD2 shutoff options for this space type."
              : undefined
          }
          options={[
            ...add2Options.map((c) => ({
              value: c,
              label: requirementById(c)?.shortName ?? c,
            })),
            { value: "none", label: "None (AHJ / owner override)" },
          ]}
          onInherit={() =>
            onUpdateOverrides({ add2Selections: undefined, add2Stacked: undefined })
          }
          onSelect={(v) =>
            onUpdateOverrides({
              add2Selections: v === "none" ? [] : [v as ControlColumnId],
              add2Stacked: false,
            })
          }
        />
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1">Room note (optional)</div>
        <Input
          value={o.roomNote ?? ""}
          placeholder="e.g. Corner office with sidelight daylight per owner request"
          onChange={(e) =>
            onUpdateOverrides({ roomNote: e.target.value || undefined })
          }
        />
      </div>

      <div className="rounded-md border border-dashed border-border bg-background/60 p-3 text-xs text-muted-foreground">
        REQ-level waivers and per-room AHJ reasons for required items will be added
        here in a follow-up. For now, record them in the room note above and flag with
        the group&rsquo;s override flow.
      </div>
    </div>
  );
}

function InheritSelect({
  label,
  value,
  groupHint,
  inheritEquivalent,
  options,
  disabled,
  disabledNote,
  onInherit,
  onSelect,
}: {
  label: string;
  value: string;
  groupHint?: string;
  /** Value that, if picked, would be equivalent to inheriting — filtered out of the overrides list. */
  inheritEquivalent?: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  disabledNote?: string;
  onInherit: () => void;
  onSelect: (v: string) => void;
}) {
  const isInherited = value === "inherit";
  // Hide any option whose value matches what inheritance would produce.
  const visibleOptions = options.filter((o) => o.value !== inheritEquivalent);
  const selectedLabel = options.find((o) => o.value === value)?.label;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        {!isInherited && !disabled && (
          <button
            type="button"
            onClick={onInherit}
            className="text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Reset to group
          </button>
        )}
      </div>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === "inherit" || !v) return onInherit();
          // Safety net: if a user somehow picks the inherit-equivalent value, normalize to inherit.
          if (v === inheritEquivalent) return onInherit();
          onSelect(v);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="mt-1 w-full">
          <SelectValue>
            {() =>
              isInherited
                ? `Inherit from group${groupHint ? ` — ${groupHint}` : ""}`
                : selectedLabel ?? "Select…"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="inherit">Inherit from group{groupHint ? ` — ${groupHint}` : ""}</SelectItem>
          {visibleOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {disabled && disabledNote && (
        <div className="mt-1 text-[11px] text-muted-foreground">{disabledNote}</div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center">
      <h2 className="font-medium">No rooms yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add your first room to get started. You&rsquo;ll pick an ASHRAE space type for each.
      </p>
      <Button className="mt-5" onClick={onAdd}>
        <Plus className="size-4" />
        Add first room
      </Button>
    </div>
  );
}
