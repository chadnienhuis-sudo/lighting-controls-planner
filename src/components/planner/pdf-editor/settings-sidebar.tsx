"use client";

import * as React from "react";
import {
  ChevronDown,
  Download,
  FileText,
  Layers,
  SlidersHorizontal,
  Palette,
  Loader2,
} from "lucide-react";
import type { Project } from "@/lib/types";
import {
  saveLastTemplate,
  type DocumentSection,
  type DocumentTemplate,
} from "@/lib/pdf/document-template";
import { SectionsEditor } from "./sections-editor";
import { TemplatePicker } from "./template-picker";
import { cn } from "@/lib/utils";

interface SettingsSidebarProps {
  project: Project;
  template: DocumentTemplate;
  onTemplateChange: (next: DocumentTemplate | ((prev: DocumentTemplate) => DocumentTemplate)) => void;
}

/**
 * Right-hand settings panel. Template picker at top (collapsed by default so
 * the active-preset chip is visible at a glance), then Sections (the primary
 * reorder / toggle interaction — default-open), Page (font size + watermark),
 * Branding (logo + footer toggles). Download button is sticky at the very top.
 */
export function SettingsSidebar({ project, template, onTemplateChange }: SettingsSidebarProps) {
  const [downloading, setDownloading] = React.useState(false);

  const update = React.useCallback(
    <K extends keyof DocumentTemplate>(key: K, value: DocumentTemplate[K]) => {
      onTemplateChange((prev) => {
        const next = { ...prev, [key]: value };
        saveLastTemplate(next);
        return next;
      });
    },
    [onTemplateChange],
  );

  const updateSections = React.useCallback(
    (sections: DocumentSection[]) => {
      onTemplateChange((prev) => {
        const next = { ...prev, sections };
        saveLastTemplate(next);
        return next;
      });
    },
    [onTemplateChange],
  );

  const handleDownload = React.useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { downloadControlsNarrativePdf } = await import("@/lib/pdf/controls-narrative-pdf");
      await downloadControlsNarrativePdf(project, { template });
    } finally {
      setDownloading(false);
    }
  }, [project, template, downloading]);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky download button */}
      <div className="shrink-0 border-b border-border p-3 bg-background">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-jet px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-jet/90 transition-colors disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          {downloading ? "Generating PDF…" : "Download PDF"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Template picker — collapsed by default */}
        <TemplatesCollapsibleSection activeName={template.name}>
          <TemplatePicker template={template} onSelect={(next) => onTemplateChange(next)} />
        </TemplatesCollapsibleSection>

        {/* Sections — the headline interaction, default open */}
        <CollapsibleSection title="Sections" icon={Layers} defaultOpen>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Drag to reorder · check to include · expand rows for per-section options.
          </p>
          <SectionsEditor template={template} onChange={updateSections} />
        </CollapsibleSection>

        {/* Page */}
        <CollapsibleSection title="Page" icon={SlidersHorizontal}>
          <SegmentedToggle<DocumentTemplate["fontSize"]>
            label="Body font size"
            value={template.fontSize}
            options={[
              { value: 9, label: "Small" },
              { value: 10, label: "Normal" },
              { value: 11, label: "Large" },
            ]}
            onChange={(v) => update("fontSize", v)}
          />
          <Select
            label="Watermark"
            value={template.watermark}
            options={[
              { value: "none", label: "None" },
              { value: "draft", label: "DRAFT" },
              { value: "preliminary", label: "PRELIMINARY" },
              { value: "budgetary", label: "BUDGETARY" },
            ]}
            onChange={(v) => update("watermark", v as DocumentTemplate["watermark"])}
          />
        </CollapsibleSection>

        {/* Branding */}
        <CollapsibleSection title="Branding" icon={Palette}>
          <Toggle
            label="Show A+ logo on cover"
            checked={template.showLogo}
            onChange={(v) => update("showLogo", v)}
          />
          <Toggle
            label="Show A+ contact info in page footer"
            checked={template.showBrandFooter}
            onChange={(v) => update("showBrandFooter", v)}
          />
          <p className="text-[10px] text-muted-foreground leading-snug">
            Turn both off for a public-facing / electrician-co-branded export. Per-project
            &ldquo;prepared for&rdquo; + custom logo upload coming next.
          </p>
        </CollapsibleSection>
      </div>
    </div>
  );
}

// ─── Collapsible wrappers ──────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Icon className="size-4 text-muted-foreground" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>}
    </div>
  );
}

function TemplatesCollapsibleSection({
  activeName,
  children,
}: {
  activeName: string;
  children: React.ReactNode;
}) {
  const KEY = "planner-templates-open";
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setOpen(true);
    } catch {}
  }, []);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
      >
        <FileText className="size-4 text-muted-foreground" />
        <span className="text-left">Template</span>
        {!open && (
          <span className="ml-1.5 truncate rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
            {activeName}
          </span>
        )}
        <span className="flex-1" />
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs cursor-pointer">
      <span className="text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-jet" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-[3px]",
          )}
        />
      </button>
    </label>
  );
}

function SegmentedToggle<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-foreground">{label}</span>
      <div className="flex rounded-md border border-border bg-muted/30 p-0.5">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors",
              value === o.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1 text-xs">
      <span className="text-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-jet/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
