"use client";

import * as React from "react";
import { useProjectStore } from "@/lib/project-store";
import { loadLastTemplate, type DocumentTemplate } from "@/lib/pdf/document-template";
import { PDFPreview } from "./pdf-preview";
import { SettingsSidebar } from "./settings-sidebar";

/**
 * Split-layout PDF editor — live preview on the left, settings sidebar on
 * the right. Takes over the Document tab in the workspace; inherits the
 * project from the project store so edits elsewhere (Rooms, Groups) reflect
 * immediately in the preview.
 *
 * Layout is flexible — stacks vertically on narrow screens so the editor
 * remains usable on a tablet. The fixed min-w-0 on the preview column
 * prevents iframe overflow from squeezing the sidebar.
 */
export function PDFEditor() {
  const project = useProjectStore((s) => s.project);
  const [template, setTemplate] = React.useState<DocumentTemplate | null>(null);

  // Hydrate from localStorage on mount — must be client-only so SSR doesn't
  // mismatch. Start with null so we render a quick loading state rather than
  // flashing the default preset before the saved one loads.
  React.useEffect(() => {
    setTemplate(loadLastTemplate());
  }, []);

  // Narrowed setter: the sidebar is only rendered below once `template` is
  // non-null, so the prev arg to any updater is guaranteed non-null. We wrap
  // setTemplate to present a `(prev: DocumentTemplate) => DocumentTemplate`
  // contract to the sidebar while the underlying state is nullable (to allow
  // the `null` loading sentinel above).
  const handleTemplateChange = React.useCallback(
    (next: DocumentTemplate | ((prev: DocumentTemplate) => DocumentTemplate)) => {
      setTemplate((prev) => {
        if (typeof next === "function") {
          if (prev == null) return prev; // shouldn't happen — sidebar not mounted yet
          return next(prev);
        }
        return next;
      });
    },
    [],
  );

  if (!project) return null;

  if (!template) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row">
      {/* Live preview */}
      <div className="flex-1 min-h-0 md:min-w-0 bg-muted/40 border-b md:border-b-0 md:border-r border-border">
        <PDFPreview project={project} template={template} />
      </div>

      {/* Settings sidebar */}
      <div className="w-full md:w-[360px] lg:w-[400px] shrink-0 overflow-hidden">
        <SettingsSidebar
          project={project}
          template={template}
          onTemplateChange={handleTemplateChange}
        />
      </div>
    </div>
  );
}
