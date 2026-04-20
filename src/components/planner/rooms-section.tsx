"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useProjectStore } from "@/lib/project-store";
import { SPACE_TYPES, interiorSpaceTypes, spaceTypeById } from "@/data/space-types";
import type { Room } from "@/lib/types";
import { Button } from "@/components/ui/button";
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

const DEFAULT_SPACE_TYPE = "office_open";

export function RoomsSection() {
  const project = useProjectStore((s) => s.project);
  const addRoom = useProjectStore((s) => s.addRoom);
  const updateRoom = useProjectStore((s) => s.updateRoom);
  const removeRoom = useProjectStore((s) => s.removeRoom);

  const totalSqft = useMemo(
    () => (project?.rooms ?? []).reduce((sum, r) => sum + (r.sizeSqft || 0), 0),
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
            Every room you add becomes part of a functional group. Enter room numbers,
            names, sizes, and ASHRAE space types.
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
                <TableHead className="w-24">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-28">Size (sf)</TableHead>
                <TableHead className="w-72">ASHRAE space type</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.rooms.map((room) => (
                <RoomRow
                  key={room.id}
                  room={room}
                  onChange={(patch) => updateRoom(room.id, patch)}
                  onRemove={() => removeRoom(room.id)}
                />
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted-foreground bg-muted/20">
            <span>
              {project.rooms.length} room{project.rooms.length === 1 ? "" : "s"}
            </span>
            <span>
              Total: <span className="tabular-nums text-foreground font-medium">{totalSqft.toLocaleString()}</span> sf
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomRow({
  room,
  onChange,
  onRemove,
}: {
  room: Room;
  onChange: (patch: Partial<Room>) => void;
  onRemove: () => void;
}) {
  const unknownSpaceType = !SPACE_TYPES.some((s) => s.id === room.spaceTypeId);
  return (
    <TableRow>
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
            {interiorSpaceTypes().map((st) => (
              <SelectItem key={st.id} value={st.id}>
                {st.name}
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
