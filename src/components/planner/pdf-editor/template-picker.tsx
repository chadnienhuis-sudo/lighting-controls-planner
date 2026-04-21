"use client";

import * as React from "react";
import { Save, Trash2, Check } from "lucide-react";
import {
  DOCUMENT_PRESETS,
  loadCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  type DocumentTemplate,
} from "@/lib/pdf/document-template";
import { cn } from "@/lib/utils";

interface TemplatePickerProps {
  template: DocumentTemplate;
  onSelect: (template: DocumentTemplate) => void;
}

/**
 * Preset cards (built-ins + user customs) + a "Save as preset…" action that
 * snapshots the current knob set under a user-supplied name. Storage is
 * localStorage-only for Phase 1; when auth ships in Phase 2 we can move
 * customs to the server without changing this UI.
 */
export function TemplatePicker({ template, onSelect }: TemplatePickerProps) {
  const [customs, setCustoms] = React.useState<DocumentTemplate[]>([]);
  const [showSave, setShowSave] = React.useState(false);

  React.useEffect(() => {
    setCustoms(loadCustomPresets());
  }, []);

  function handleSave(name: string) {
    const next: DocumentTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      name,
      isPreset: false,
    };
    saveCustomPreset(next);
    setCustoms(loadCustomPresets());
    onSelect(next);
  }

  function handleDelete(id: string) {
    deleteCustomPreset(id);
    setCustoms(loadCustomPresets());
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {DOCUMENT_PRESETS.map((p) => (
          <PresetCard
            key={p.id}
            preset={p}
            active={template.id === p.id}
            onSelect={() => onSelect(p)}
          />
        ))}
      </div>

      {customs.length > 0 && (
        <>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Custom
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {customs.map((p) => (
              <PresetCard
                key={p.id}
                preset={p}
                active={template.id === p.id}
                onSelect={() => onSelect(p)}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setShowSave(true)}
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-jet transition-colors"
      >
        <Save className="size-3" />
        Save current settings as preset…
      </button>

      {showSave && (
        <SaveDialog
          onClose={() => setShowSave(false)}
          onSave={(name) => {
            handleSave(name);
            setShowSave(false);
          }}
        />
      )}
    </div>
  );
}

function PresetCard({
  preset,
  active,
  onSelect,
  onDelete,
}: {
  preset: DocumentTemplate;
  active: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const enabledCount = preset.sections.filter((s) => s.enabled).length;
  const totalCount = preset.sections.length;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-md border p-2 text-left transition-colors",
        active
          ? "border-jet bg-jet/5 ring-1 ring-jet/30"
          : "border-border hover:border-muted-foreground/50 hover:bg-muted/30",
      )}
    >
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-xs font-semibold", active ? "text-jet" : "text-foreground")}>
            {preset.name}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            {enabledCount}/{totalCount} sections
            {preset.watermark !== "none" && ` · ${preset.watermark}`}
            {!preset.showLogo && " · no logo"}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {active && <Check className="size-3.5 text-jet" />}
          {onDelete && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Delete preset"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onDelete();
                }
              }}
              className="cursor-pointer p-0.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="size-3" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function SaveDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = React.useState("");
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl border border-border shadow-lg w-[360px] p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-foreground">Save as preset</h3>
        <input
          type="text"
          placeholder="e.g. Permit Set — Grand Rapids"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSave(name.trim());
            if (e.key === "Escape") onClose();
          }}
          autoFocus
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jet/40"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => onSave(name.trim())}
            className="rounded bg-jet px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-jet/90 transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
