"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Printer, FileText, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { useProjectStore } from "@/lib/project-store";
import { spaceTypeById } from "@/data/space-types";
import { Button, buttonVariants } from "@/components/ui/button";
import { DocumentBody } from "@/components/planner/document-section";
import { cn } from "@/lib/utils";

// react-pdf pulls in ~MB of pdfkit/fonts/canvas; keep it OUT of the Export
// route's compile graph by importing it only when the user clicks Download.

export function ExportSection() {
  const project = useProjectStore((s) => s.project);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const readiness = useMemo(() => {
    if (!project) return null;
    const issues: Array<{ tone: "blocking" | "warning"; msg: string; href?: string }> = [];

    if (!project.name.trim()) {
      issues.push({ tone: "blocking", msg: "Project name is empty.", href: "/planner/workspace/project" });
    }
    if (project.rooms.length === 0) {
      issues.push({ tone: "blocking", msg: "No rooms yet — nothing to schedule.", href: "/planner/workspace/rooms" });
    }
    if (project.functionalGroups.length === 0 && project.rooms.length > 0) {
      issues.push({
        tone: "warning",
        msg: "No functional groups yet. Visit the Groups page to generate them.",
        href: "/planner/workspace/groups",
      });
    }
    const hasUnpickedAdd1 = project.functionalGroups.some((g) => {
      // Only warn when the space type actually has ADD1 columns — restrooms / mechanical
      // / stairways have no ADD1, so null is the correct value there.
      const st = spaceTypeById(g.spaceTypeId);
      if (!st) return false;
      const hasAdd1Columns = Object.values(st.controls).some((v) => v === "ADD1");
      if (!hasAdd1Columns) return false;
      if (g.waivers.some((w) => w.requirementId === "add1_set")) return false;
      return g.add1Selection === null;
    });
    if (hasUnpickedAdd1) {
      issues.push({
        tone: "warning",
        msg: "Some groups have no ADD1 occupancy strategy picked. Review the Groups page.",
        href: "/planner/workspace/groups",
      });
    }
    return issues;
  }, [project]);

  if (!project) return null;

  const totalSqft = project.rooms.reduce((s, r) => s + (r.sizeSqft || 0), 0);
  const outdoorEnabled = Object.values(project.outdoorScope.zones).filter((z) => z?.enabled).length;
  const hasBlocking = (readiness ?? []).some((r) => r.tone === "blocking");

  return (
    <div className="px-6 md:px-10 py-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Export</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Save the full controls narrative as a PDF via your browser&rsquo;s print dialog. Free tier
          includes A+ Lighting attribution on the cover and every page footer.
        </p>
      </header>

      <div className="rounded-lg border border-border bg-background">
        <div className="p-6 flex items-start gap-5">
          <div className="shrink-0 flex items-center justify-center size-12 rounded-lg bg-jet/5 text-jet">
            <FileText className="size-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{project.name}</h2>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <Stat label="Rooms" value={project.rooms.length.toLocaleString()} />
              <Stat label="Groups" value={project.functionalGroups.length.toLocaleString()} />
              <Stat label="Interior area" value={`${totalSqft.toLocaleString()} sf`} />
              <Stat label="Outdoor zones in scope" value={outdoorEnabled.toLocaleString()} />
            </dl>
          </div>
        </div>

        <div className="border-t border-border p-6">
          <div className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
            Readiness
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {readiness && readiness.length > 0 ? (
              readiness.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertTriangle
                    className={cn(
                      "size-4 mt-0.5 shrink-0",
                      r.tone === "blocking" ? "text-destructive" : "text-spark",
                    )}
                  />
                  <span className="flex-1">
                    {r.msg}
                    {r.href && (
                      <Link href={r.href} className="ml-2 underline underline-offset-2 hover:text-jet">
                        Go →
                      </Link>
                    )}
                  </span>
                </li>
              ))
            ) : (
              <li className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-jet" />
                <span>Project is ready to export.</span>
              </li>
            )}
          </ul>
        </div>

        <div className="border-t border-border p-6 space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-md">
              <div className="text-sm font-medium text-jet">Download as PDF</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Generates a structured, text-selectable PDF file — saves directly to
                your Downloads folder. Recommended for sending the deliverable to the
                AHJ, owner, or contractor.
              </div>
              {downloadError && (
                <div className="mt-2 text-xs text-destructive">
                  Download failed: {downloadError}
                </div>
              )}
            </div>
            <Button
              size="lg"
              onClick={async () => {
                if (!project) return;
                setDownloading(true);
                setDownloadError(null);
                try {
                  // Lazy-load react-pdf + the PDF document. Keeps the heavy
                  // @react-pdf/renderer bundle out of the Export route's
                  // initial compile — it only loads when the user clicks.
                  const mod = await import("@/lib/pdf/controls-narrative-pdf");
                  await mod.downloadControlsNarrativePdf(project);
                } catch (err) {
                  setDownloadError(err instanceof Error ? err.message : String(err));
                } finally {
                  setDownloading(false);
                }
              }}
              disabled={hasBlocking || downloading}
            >
              <Download className="size-4" />
              {downloading ? "Generating PDF…" : "Download PDF"}
            </Button>
          </div>
          <div className="flex items-start justify-between gap-6 border-t border-border pt-4">
            <div className="max-w-md">
              <div className="text-sm font-medium text-jet">Or — print via browser</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Opens your browser&rsquo;s print dialog. In Chrome / Edge, choose{" "}
                <span className="font-medium">&ldquo;Save as PDF&rdquo;</span>. US
                Letter, 0.55in / 0.6in margins.
              </div>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.print()}
              disabled={hasBlocking}
            >
              <Printer className="size-4" />
              Open print dialog
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm" data-print-hide>
        <Link
          href="/planner/workspace/document"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Preview document →
        </Link>
        <div className="text-xs text-muted-foreground max-w-md text-right">
          Branded exports, saved projects, and manufacturer product mapping are premium
          features (A+ customer invitation).
        </div>
      </div>

      <div className="mt-8">
        <div className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2" data-print-hide>
          Document to be exported
        </div>
        <DocumentBody project={project} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </>
  );
}
