"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Trees, Car, Building2, Umbrella, Trees as TreesIcon, Megaphone, Truck } from "lucide-react";
import { useProjectStore } from "@/lib/project-store";
import { OUTDOOR_ZONE_LABELS, outdoorZoneNarrative } from "@/lib/narrative";
import type { LightingZone, OutdoorZoneConfig, OutdoorZoneType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ZONE_ORDER: OutdoorZoneType[] = [
  "parking",
  "facadeWallPacks",
  "canopy",
  "grounds",
  "signage",
  "loadingDock",
];

const ZONE_ICONS: Record<OutdoorZoneType, typeof Trees> = {
  parking: Car,
  facadeWallPacks: Building2,
  canopy: Umbrella,
  grounds: TreesIcon,
  signage: Megaphone,
  loadingDock: Truck,
};

const ZONE_DESCRIPTIONS: Record<OutdoorZoneType, string> = {
  parking: "Surface parking lots and drive lanes. Subject to §9.4.2 motion-based reduction.",
  facadeWallPacks: "Building façade lighting and perimeter wall-packs.",
  canopy: "Entrance canopies, drive-through canopies, gas-station canopies.",
  grounds: "Landscape, walkways, flagpoles, non-architectural accent lighting.",
  signage: "Illuminated signs. Curfew rules differ from general lighting.",
  loadingDock: "Dock apron fixtures. Occupancy-controlled per §9.4.2.",
};

const LZ_OPTIONS: Array<{ value: LightingZone; label: string; hint: string }> = [
  { value: "LZ0", label: "LZ0 — No ambient lighting", hint: "Undeveloped areas, parks, ecological reserves." },
  { value: "LZ1", label: "LZ1 — Dark", hint: "Developed rural areas; parks; residential fringes." },
  { value: "LZ2", label: "LZ2 — Low", hint: "Neighborhood business districts; light industrial; most small-town commercial." },
  { value: "LZ3", label: "LZ3 — Medium", hint: "All areas not LZ1/LZ2/LZ4. Most urban/suburban commercial default." },
  { value: "LZ4", label: "LZ4 — High", hint: "High-activity commercial; entertainment districts; major city cores." },
];

const DEFAULT_NEW_CONFIG: OutdoorZoneConfig = {
  enabled: true,
  lightingZone: "LZ3",
  sizeUnit: "sf",
};

export function OutdoorSection() {
  const project = useProjectStore((s) => s.project);
  const setOutdoorZone = useProjectStore((s) => s.setOutdoorZone);

  if (!project) return null;

  const enabledCount = Object.values(project.outdoorScope.zones).filter((z) => z?.enabled).length;

  return (
    <div className="px-6 md:px-10 py-8 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Outdoor</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Project-level outdoor scope. Toggle each zone type that applies, set its{" "}
          Lighting Zone classification (LZ0–LZ4), and the tool generates a §9.4.2
          controls narrative for it.
          {enabledCount > 0 && (
            <span className="ml-1.5 text-jet">
              {enabledCount} zone{enabledCount === 1 ? "" : "s"} in scope.
            </span>
          )}
        </p>
      </header>

      <div className="space-y-3">
        {ZONE_ORDER.map((type) => {
          const cfg = project.outdoorScope.zones[type];
          return (
            <ZoneCard
              key={type}
              type={type}
              config={cfg}
              onToggle={(enabled) => {
                if (enabled) {
                  setOutdoorZone(type, cfg ? { ...cfg, enabled: true } : DEFAULT_NEW_CONFIG);
                } else if (cfg) {
                  setOutdoorZone(type, { ...cfg, enabled: false });
                }
              }}
              onChange={(patch) => {
                const next: OutdoorZoneConfig = { ...(cfg ?? DEFAULT_NEW_CONFIG), ...patch };
                setOutdoorZone(type, next);
              }}
              onRemove={() => setOutdoorZone(type, null)}
            />
          );
        })}
      </div>

      <div className="mt-6 rounded-md border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed">
        <strong className="text-jet">Note on §9.4.2 exceptions.</strong> These narratives are
        generic templates — the AHJ may require additional curfew hours, reduction
        percentages, or BUG-rating constraints for your Lighting Zone. Always verify the
        local ordinance: our Resources page has guidance on finding your jurisdiction&rsquo;s
        outdoor lighting rules.
      </div>
    </div>
  );
}

function ZoneCard({
  type,
  config,
  onToggle,
  onChange,
  onRemove,
}: {
  type: OutdoorZoneType;
  config: OutdoorZoneConfig | undefined;
  onToggle: (enabled: boolean) => void;
  onChange: (patch: Partial<OutdoorZoneConfig>) => void;
  onRemove: () => void;
}) {
  const enabled = !!config?.enabled;
  const [previewOpen, setPreviewOpen] = useState(false);
  const Icon = ZONE_ICONS[type];
  return (
    <section
      className={cn(
        "rounded-lg border bg-background transition-colors",
        enabled ? "border-border" : "border-dashed border-border",
      )}
    >
      <header className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-md shrink-0",
            enabled ? "bg-jet/5 text-jet" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{OUTDOOR_ZONE_LABELS[type]}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {ZONE_DESCRIPTIONS[type]}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
          <Checkbox checked={enabled} onCheckedChange={(v) => onToggle(Boolean(v))} />
          <span className="text-sm font-medium">{enabled ? "In scope" : "Not in scope"}</span>
        </label>
      </header>

      {enabled && config && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabelledField label="Lighting Zone">
              <Select
                value={config.lightingZone}
                onValueChange={(v) => onChange({ lightingZone: v as LightingZone })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => config.lightingZone}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {LZ_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <div className="flex flex-col">
                        <span>{o.label}</span>
                        <span className="text-xs text-muted-foreground">{o.hint}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </LabelledField>

            <LabelledField label={type === "parking" ? "Area" : "Size"}>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  min={0}
                  value={config.sizeValue ?? ""}
                  onChange={(e) =>
                    onChange({ sizeValue: Number(e.target.value) || undefined })
                  }
                  placeholder={type === "parking" ? "e.g. 40000" : "optional"}
                  className="tabular-nums"
                />
                <Select
                  value={config.sizeUnit ?? "sf"}
                  onValueChange={(v) =>
                    onChange({ sizeUnit: v as OutdoorZoneConfig["sizeUnit"] })
                  }
                >
                  <SelectTrigger className="w-24 shrink-0">
                    <SelectValue>{() => config.sizeUnit ?? "sf"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sf">sf</SelectItem>
                    <SelectItem value="acre">acre</SelectItem>
                    <SelectItem value="lf">lf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </LabelledField>

            <LabelledField
              label={type === "signage" ? "Sign count" : "Fixture count"}
            >
              <Input
                type="number"
                min={0}
                value={config.count ?? ""}
                onChange={(e) =>
                  onChange({ count: Number(e.target.value) || undefined })
                }
                placeholder="optional"
                className="tabular-nums"
              />
            </LabelledField>
          </div>

          <LabelledField label="Project-specific notes (optional)">
            <Input
              value={config.notes ?? ""}
              onChange={(e) => onChange({ notes: e.target.value || undefined })}
              placeholder="e.g. Existing pole-mount fixtures retained; new LED heads w/ dimming driver."
            />
          </LabelledField>

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-jet"
            >
              {previewOpen ? (
                <ChevronDown className="size-3" />
              ) : (
                <ChevronRight className="size-3" />
              )}
              {previewOpen ? "Hide" : "Show"} generated narrative
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2"
            >
              Remove from project
            </button>
          </div>

          {previewOpen && (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
              {outdoorZoneNarrative(type, config)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function LabelledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}
