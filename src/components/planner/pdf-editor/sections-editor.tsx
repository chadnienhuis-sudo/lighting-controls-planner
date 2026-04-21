"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronDown,
  Trash2,
  Plus,
  Lock,
} from "lucide-react";
import {
  SECTION_KIND_LABELS,
  SECTION_KIND_HINTS,
  customProseSection,
  type DocumentSection,
  type DocumentTemplate,
} from "@/lib/pdf/document-template";
import {
  REQUIREMENTS_LAYOUT_OPTIONS,
  type RequirementsLayout,
} from "@/lib/pdf/requirements-layout";
import { cn } from "@/lib/utils";

interface SectionsEditorProps {
  template: DocumentTemplate;
  onChange: (sections: DocumentSection[]) => void;
}

/**
 * Reorderable / toggleable list of document sections. Cover is pinned at the
 * top (not draggable) because the PDF always starts with a cover page — users
 * who don't want it can still toggle it off. Custom-prose rows can be added
 * via the "+ Add custom section" button and deleted via their own trash icon;
 * built-in sections can only be hidden.
 */
export function SectionsEditor({ template, onChange }: SectionsEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const cover = template.sections[0];
  const rest = template.sections.slice(1);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = rest.findIndex((s) => s.id === active.id);
    const newIdx = rest.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(rest, oldIdx, newIdx);
    onChange([cover, ...reordered]);
  }

  function updateSection(id: string, patch: Partial<DocumentSection>) {
    onChange(
      template.sections.map((s) => (s.id === id ? ({ ...s, ...patch } as DocumentSection) : s)),
    );
  }

  function removeSection(id: string) {
    onChange(template.sections.filter((s) => s.id !== id));
  }

  function addCustomProse() {
    // Insert just before the glossary if present, otherwise at the end, so
    // the new block lands inside the body of the document rather than after
    // the glossary (which reads as an appendix).
    const newSection = customProseSection();
    const glossaryIdx = template.sections.findIndex((s) => s.kind === "glossary");
    const insertAt = glossaryIdx > 0 ? glossaryIdx : template.sections.length;
    const next = [...template.sections];
    next.splice(insertAt, 0, newSection);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {/* Cover — pinned row, never reorderable */}
      <SectionRow
        section={cover}
        sortable={false}
        onToggleEnabled={(v) => updateSection(cover.id, { enabled: v } as Partial<DocumentSection>)}
        onUpdate={(patch) => updateSection(cover.id, patch)}
        onRemove={null}
      />

      {/* Draggable body */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rest.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {rest.map((section) => (
              <SectionRow
                key={section.id}
                section={section}
                sortable
                onToggleEnabled={(v) =>
                  updateSection(section.id, { enabled: v } as Partial<DocumentSection>)
                }
                onUpdate={(patch) => updateSection(section.id, patch)}
                onRemove={
                  section.kind === "customProse" ? () => removeSection(section.id) : null
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addCustomProse}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:border-jet hover:text-jet transition-colors"
      >
        <Plus className="size-3.5" />
        Add custom section
      </button>
    </div>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────

interface SectionRowProps {
  section: DocumentSection;
  sortable: boolean;
  onToggleEnabled: (v: boolean) => void;
  onUpdate: (patch: Partial<DocumentSection>) => void;
  onRemove: (() => void) | null;
}

function SectionRow({ section, sortable, onToggleEnabled, onUpdate, onRemove }: SectionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: !sortable });

  const style: React.CSSProperties = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
      }
    : {};

  const [expanded, setExpanded] = React.useState(false);
  const hasOptions = sectionHasOptions(section);

  const label =
    section.kind === "customProse"
      ? section.heading || "(untitled custom section)"
      : SECTION_KIND_LABELS[section.kind];

  const hint =
    section.kind === "customProse" ? "User-authored prose block." : SECTION_KIND_HINTS[section.kind];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-md border bg-background p-2 space-y-1",
        section.enabled ? "border-border" : "border-border/50 bg-muted/20",
      )}
    >
      <div className="flex items-center gap-2">
        {sortable ? (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity touch-none"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-3.5" />
          </button>
        ) : (
          <span className="text-muted-foreground/50" title="Cover stays at the top">
            <Lock className="size-3.5" />
          </span>
        )}

        <input
          type="checkbox"
          checked={section.enabled}
          onChange={(e) => onToggleEnabled(e.target.checked)}
          className="size-3.5 rounded border-muted-foreground/50 accent-jet"
          aria-label={`Include ${label}`}
        />

        <div
          className={cn(
            "flex-1 min-w-0 text-sm font-medium truncate",
            !section.enabled && "text-muted-foreground",
          )}
        >
          {label}
        </div>

        {hasOptions && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={expanded ? "Hide options" : "Show options"}
          >
            <ChevronDown
              className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
            />
          </button>
        )}

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Remove section"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {!expanded && (
        <p className="pl-[22px] text-[11px] leading-snug text-muted-foreground">{hint}</p>
      )}

      {expanded && hasOptions && (
        <div className="pl-[22px] pt-1 space-y-2 border-t border-dashed border-border">
          <SectionOptions section={section} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

// ─── Per-kind options ──────────────────────────────────────────────────────

function sectionHasOptions(section: DocumentSection): boolean {
  return section.kind === "cover" || section.kind === "roomSchedule" || section.kind === "customProse";
}

function SectionOptions({
  section,
  onUpdate,
}: {
  section: DocumentSection;
  onUpdate: (patch: Partial<DocumentSection>) => void;
}) {
  if (section.kind === "cover") {
    return (
      <div className="space-y-2">
        <TextInput
          label="Title override"
          placeholder="Lighting Controls Narrative"
          value={section.titleOverride ?? ""}
          onChange={(v) =>
            onUpdate({ titleOverride: v === "" ? undefined : v } as Partial<DocumentSection>)
          }
        />
        <Row>
          <Checkbox
            label="Show project facts"
            checked={section.showFacts}
            onChange={(v) => onUpdate({ showFacts: v } as Partial<DocumentSection>)}
          />
          <Checkbox
            label="Show disclaimer box"
            checked={section.showDisclaimer}
            onChange={(v) => onUpdate({ showDisclaimer: v } as Partial<DocumentSection>)}
          />
        </Row>
      </div>
    );
  }
  if (section.kind === "roomSchedule") {
    return (
      <div className="space-y-2">
        <Select
          label="Section 5 layout"
          value={section.requirementsLayout}
          options={REQUIREMENTS_LAYOUT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          onChange={(v) =>
            onUpdate({ requirementsLayout: v as RequirementsLayout } as Partial<DocumentSection>)
          }
        />
        <p className="text-[10px] text-muted-foreground leading-snug -mt-1">
          {REQUIREMENTS_LAYOUT_OPTIONS.find((o) => o.id === section.requirementsLayout)?.hint}
        </p>
        <Checkbox
          label="Show installed-LPD math block"
          checked={section.showLpdMath}
          onChange={(v) => onUpdate({ showLpdMath: v } as Partial<DocumentSection>)}
        />
      </div>
    );
  }
  if (section.kind === "customProse") {
    return (
      <div className="space-y-2">
        <TextInput
          label="Heading"
          placeholder="Project Notes"
          value={section.heading}
          onChange={(v) => onUpdate({ heading: v } as Partial<DocumentSection>)}
        />
        <label className="block space-y-1">
          <span className="text-[11px] font-medium text-foreground">Body</span>
          <textarea
            value={section.body}
            onChange={(e) => onUpdate({ body: e.target.value } as Partial<DocumentSection>)}
            rows={4}
            placeholder="Paragraphs separated by a blank line."
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs resize-y focus:outline-none focus:ring-2 focus:ring-jet/40"
          />
        </label>
      </div>
    );
  }
  return null;
}

// ─── Tiny primitives ───────────────────────────────────────────────────────

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{children}</div>;
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 rounded border-muted-foreground/50 accent-jet"
      />
      <span className="text-foreground">{label}</span>
    </label>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-jet/40"
      />
    </label>
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
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-foreground">{label}</span>
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
