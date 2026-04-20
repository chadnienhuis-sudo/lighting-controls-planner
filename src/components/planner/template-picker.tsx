"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BUILDING_TEMPLATES } from "@/data/building-templates";
import { createProjectFromTemplate } from "@/lib/project-factory";
import { useProjectStore } from "@/lib/project-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TemplatePicker() {
  const router = useRouter();
  const setProject = useProjectStore((s) => s.setProject);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const selected = BUILDING_TEMPLATES.find((t) => t.id === selectedId);

  function handleCreate() {
    if (!selected || !name.trim()) return;
    const project = createProjectFromTemplate(selected, { name: name.trim(), location: location.trim() || undefined });
    setProject(project);
    router.push("/planner/workspace/rooms");
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2 grid gap-3 sm:grid-cols-2">
        {BUILDING_TEMPLATES.map((t) => {
          const isSelected = t.id === selectedId;
          const seededRoomCount = t.typicalRooms.reduce((n, r) => n + r.typicalCount, 0);
          const hasSeededRooms = seededRoomCount > 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "text-left rounded-lg border p-4 transition-colors",
                isSelected
                  ? "border-jet bg-muted/40 ring-2 ring-jet/10"
                  : "border-border hover:border-aplus-grey/60 hover:bg-muted/20",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold">{t.name}</div>
                {isSelected && <Badge variant="outline">Selected</Badge>}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{t.description}</div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{hasSeededRooms ? `${seededRoomCount} room${seededRoomCount === 1 ? "" : "s"} seeded` : "No rooms seeded yet"}</span>
                <span>·</span>
                <span>{Object.keys(t.typicalOutdoorZones).length} outdoor zone{Object.keys(t.typicalOutdoorZones).length === 1 ? "" : "s"}</span>
              </div>
            </button>
          );
        })}
      </div>

      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>Project details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ACME Distribution Center"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-location">Location (optional)</Label>
            <Input
              id="project-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Grand Rapids, MI"
            />
            <p className="text-xs text-muted-foreground">
              Used to flag any local amendments; not required for ASHRAE 90.1-2019.
            </p>
          </div>
          <Button className="w-full" disabled={!selected || !name.trim()} onClick={handleCreate}>
            {selected ? `Create from "${selected.name}"` : "Pick a template above"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
