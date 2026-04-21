"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import type { Project } from "@/lib/types";
import type { DocumentTemplate } from "@/lib/pdf/document-template";

interface PDFPreviewProps {
  project: Project;
  template: DocumentTemplate;
}

/**
 * Debounced live PDF preview. Any change to `project` or `template`
 * re-triggers the pipeline 300ms later — long enough to coalesce a sustained
 * edit (typing a heading, dragging a section) into a single render, short
 * enough that the preview still feels live.
 *
 * Why an iframe of a Blob URL (instead of, say, react-pdf's <PDFViewer>)?
 * Matches the quoting-superapp UX and gives the user the browser's native
 * PDF toolbar for scrolling / zoom / page navigation for free. The
 * #toolbar=0 hash hides Chrome's built-in toolbar so the preview reads
 * cleanly inside our shell.
 */
export function PDFPreview({ project, template }: PDFPreviewProps) {
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const prevUrlRef = React.useRef<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const { generateControlsNarrativeBlob } = await import(
          "@/lib/pdf/controls-narrative-pdf"
        );
        const blob = await generateControlsNarrativeBlob(project, { template });
        const url = URL.createObjectURL(blob);
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = url;
        setPdfUrl(url);
      } catch (err) {
        console.error("PDF preview generation failed:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [project, template]);

  React.useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background p-6">
          <div className="max-w-md rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="mb-1 font-semibold text-destructive">PDF preview failed</p>
            <p className="break-words text-muted-foreground">{error}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              See the browser console for the full stack trace.
            </p>
          </div>
        </div>
      )}
      {pdfUrl && (
        <iframe
          src={pdfUrl + "#toolbar=0"}
          className="h-full w-full border-0"
          title="Controls narrative preview"
        />
      )}
    </div>
  );
}
