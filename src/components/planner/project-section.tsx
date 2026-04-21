"use client";

import { useProjectStore } from "@/lib/project-store";
import type { ControlSystemType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SYSTEM_TYPE_OPTIONS: Array<{ value: ControlSystemType; label: string; hint: string }> = [
  { value: "standalone", label: "Standalone", hint: "Room-by-room controls; no network backbone." },
  { value: "networked-wired", label: "Networked — wired", hint: "CAT-cable or proprietary bus between devices / panels." },
  { value: "networked-wireless", label: "Networked — wireless", hint: "BLE / Zigbee / Wi-Fi mesh; no additional control wiring." },
  { value: "bms-integrated", label: "BMS-integrated", hint: "Controls ride on the BMS — shared schedules, occupancy, reporting." },
  { value: "hybrid", label: "Hybrid", hint: "Wired backbone to room controllers; wireless at point-of-load." },
];

export function ProjectSection() {
  const project = useProjectStore((s) => s.project);
  const updateProject = useProjectStore((s) => s.updateProject);
  const updateBasisOfDesign = useProjectStore((s) => s.updateBasisOfDesign);
  const updateSystemArchitecture = useProjectStore((s) => s.updateSystemArchitecture);
  const updateCommissioning = useProjectStore((s) => s.updateCommissioning);

  if (!project) return null;

  const bod = project.basisOfDesign;
  const sa = project.systemArchitecture;
  const cm = project.commissioning;

  return (
    <div className="px-6 md:px-10 py-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Project</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          The fields here flow directly into the exported deliverable&rsquo;s cover page,
          basis-of-design, system architecture, and commissioning sections. Leaving a
          field blank just omits the corresponding line in the document.
        </p>
      </header>

      <div className="space-y-5">
        <Card title="Project identity">
          <Grid2>
            <Field label="Project name" required>
              <Input
                value={project.name}
                onChange={(e) => updateProject({ name: e.target.value })}
                placeholder="e.g. ACME Distribution Center"
              />
            </Field>
            <Field label="Location">
              <Input
                value={project.location ?? ""}
                onChange={(e) => updateProject({ location: e.target.value || undefined })}
                placeholder="e.g. Grand Rapids, MI"
              />
            </Field>
          </Grid2>
          <Field
            label="Prepared by"
            hint="Shown on the cover of the deliverable. Leave blank to default to the company name."
          >
            <Input
              value={project.preparedBy ?? ""}
              onChange={(e) => updateProject({ preparedBy: e.target.value || undefined })}
              placeholder="e.g. Chad Vander Veen · A+ Lighting Solutions"
            />
          </Field>
          <Field label="Code version" hint="ASHRAE 90.1-2019 is the only version supported in Phase 1.">
            <Select
              value={project.codeVersion}
              onValueChange={() => {
                /* single option for now */
              }}
              disabled
            >
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue>{() => project.codeVersion}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASHRAE-90.1-2019">ASHRAE 90.1-2019</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Card>

        <Card
          title="Basis of Design"
          description="Establishes the assumptions behind the controls design. Appears in §1 of the exported document."
        >
          <Field
            label="Occupancy hours"
            hint="When the building is regularly occupied. Drives scheduled-shutoff defaults."
          >
            <Input
              value={bod.occupancyHours ?? ""}
              onChange={(e) => updateBasisOfDesign({ occupancyHours: e.target.value || undefined })}
              placeholder="e.g. Mon–Fri 7am–6pm, Sat 9am–2pm"
            />
          </Field>
          <Field label="Design assumptions">
            <Textarea
              value={bod.additionalAssumptions ?? ""}
              onChange={(v) => updateBasisOfDesign({ additionalAssumptions: v || undefined })}
              placeholder="e.g. Ceiling heights per A-sheets. Daylight zones estimated from window schedule."
            />
          </Field>
          <Field
            label="Local amendments"
            hint="Any jurisdiction-specific amendments to ASHRAE 90.1-2019. Flagged visibly in the exported doc."
          >
            <Textarea
              value={bod.localAmendments ?? ""}
              onChange={(v) => updateBasisOfDesign({ localAmendments: v || undefined })}
              placeholder="e.g. City of Grand Rapids BCD requires 100% auto-off (no partial-off) in office spaces over 1,000 sf."
            />
          </Field>
        </Card>

        <Card
          title="System architecture"
          description="How the lighting controls system is structured. Appears in §2 of the exported document."
        >
          <Field label="System type">
            <Select
              value={sa.systemType}
              onValueChange={(v) => updateSystemArchitecture({ systemType: v as ControlSystemType })}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue>
                  {() =>
                    SYSTEM_TYPE_OPTIONS.find((o) => o.value === sa.systemType)?.label ?? sa.systemType
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SYSTEM_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <div className="flex flex-col">
                      <span>{o.label}</span>
                      <span className="text-xs text-muted-foreground">{o.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="BMS integration">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox
                checked={!!sa.bmsIntegration}
                onCheckedChange={(v) => updateSystemArchitecture({ bmsIntegration: Boolean(v) })}
              />
              <span className="text-sm">
                Lighting controls integrate with the project Building Management System.
              </span>
            </label>
          </Field>
          {sa.bmsIntegration && (
            <Field label="BMS integration notes">
              <Textarea
                value={sa.bmsNotes ?? ""}
                onChange={(v) => updateSystemArchitecture({ bmsNotes: v || undefined })}
                placeholder="e.g. BACnet/IP gateway to the Niagara JACE. Lighting shares occupancy signals with HVAC zoning."
              />
            </Field>
          )}
          <Field label="Wiring approach">
            <Textarea
              value={sa.wiringApproach ?? ""}
              onChange={(v) => updateSystemArchitecture({ wiringApproach: v || undefined })}
              placeholder="e.g. Room-by-room low-voltage controls panels; 0-10V control wire to each fixture. Two CAT-6 drops per panel for network backbone."
            />
          </Field>
        </Card>

        <Card
          title="Commissioning"
          description="How the system is brought online and verified. Appears in §3 of the exported document."
        >
          <Grid2>
            <Field
              label="Default vacancy timer (minutes)"
              hint="Standard timeout before auto-off triggers. Group-level overrides possible."
            >
              <Input
                type="number"
                min={1}
                max={60}
                value={cm.defaultVacancyTimerMin || 20}
                onChange={(e) =>
                  updateCommissioning({ defaultVacancyTimerMin: Number(e.target.value) || 20 })
                }
                className="tabular-nums w-32"
              />
            </Field>
            <div />
          </Grid2>
          <Field label="Daylight calibration notes">
            <Textarea
              value={cm.daylightCalibrationNotes ?? ""}
              onChange={(v) => updateCommissioning({ daylightCalibrationNotes: v || undefined })}
              placeholder="e.g. Calibrate at 35 fc desk-height target with all shades retracted, overcast conditions or equivalent via task-light reference."
            />
          </Field>
          <Field label="Override behavior">
            <Textarea
              value={cm.overrideBehavior ?? ""}
              onChange={(v) => updateCommissioning({ overrideBehavior: v || undefined })}
              placeholder="e.g. Wall-station overrides restore lighting to full output for 2 hours, then resume scheduled behavior."
            />
          </Field>
          <Field label="Post-occupancy adjustment">
            <Textarea
              value={cm.postOccupancyAdjustmentNotes ?? ""}
              onChange={(v) => updateCommissioning({ postOccupancyAdjustmentNotes: v || undefined })}
              placeholder="e.g. Owner-requested 30-day tuning window during which setpoints and timers may be adjusted without re-commissioning fee."
            />
          </Field>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-background">
      <header className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground max-w-2xl">{description}</p>
        )}
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-1.5">
        <label className="text-xs font-medium text-jet">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-normal transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 resize-y"
    />
  );
}
