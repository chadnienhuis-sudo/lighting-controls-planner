"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Building2,
  Trees,
  Layers,
  FileText,
  Download,
  Trash2,
} from "lucide-react";
import { rehydrateProjectStore, useProjectStore } from "@/lib/project-store";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Status = "done" | "in-progress" | "empty";

interface NavItem {
  href: string;
  label: string;
  Icon: typeof LayoutGrid;
  count?: number;
  status: Status;
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useProjectStore((s) => s.hasHydrated);
  const project = useProjectStore((s) => s.project);
  const clearProject = useProjectStore((s) => s.clearProject);

  useEffect(() => {
    void rehydrateProjectStore();
  }, []);

  useEffect(() => {
    if (hasHydrated && !project) {
      router.replace("/planner/new");
    }
  }, [hasHydrated, project, router]);

  if (!hasHydrated) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 text-sm text-muted-foreground">
        Loading project…
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const outdoorActiveCount = Object.values(project.outdoorScope.zones).filter((z) => z?.enabled).length;

  const nav: NavItem[] = [
    {
      href: "/planner/workspace/project",
      label: "Project",
      Icon: LayoutGrid,
      status: project.name ? "done" : "empty",
    },
    {
      href: "/planner/workspace/rooms",
      label: "Rooms",
      Icon: Building2,
      count: project.rooms.length,
      status: project.rooms.length > 0 ? "done" : "empty",
    },
    {
      href: "/planner/workspace/outdoor",
      label: "Outdoor",
      Icon: Trees,
      count: outdoorActiveCount,
      status: outdoorActiveCount > 0 ? "done" : "empty",
    },
    {
      href: "/planner/workspace/groups",
      label: "Groups",
      Icon: Layers,
      count: project.functionalGroups.length,
      status: project.functionalGroups.length > 0 ? "done" : "empty",
    },
    {
      href: "/planner/workspace/document",
      label: "Document",
      Icon: FileText,
      status: "empty",
    },
    {
      href: "/planner/workspace/export",
      label: "Export",
      Icon: Download,
      status: "empty",
    },
  ];

  function handleClearProject() {
    const confirmed = window.confirm(
      `Discard "${project?.name ?? "this project"}"? This cannot be undone — projects aren't saved until premium is available.`,
    );
    if (!confirmed) return;
    clearProject();
    router.replace("/planner/new");
  }

  return (
    <div className="flex-1 flex">
      <aside className="w-64 shrink-0 border-r border-border bg-muted/30 flex flex-col">
        <div className="px-4 py-5 border-b border-border">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Project
          </div>
          <div className="mt-1 font-semibold text-base truncate" title={project.name}>
            {project.name}
          </div>
          {project.location && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {project.location}
            </div>
          )}
        </div>
        <nav className="flex-1 py-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                  active
                    ? "bg-jet/5 text-jet font-medium border-l-2 border-jet -ml-0.5"
                    : "text-jet/75 hover:bg-muted/60 hover:text-jet border-l-2 border-transparent -ml-0.5",
                )}
              >
                <StatusDot status={item.status} />
                <item.Icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {typeof item.count === "number" && (
                  <span className="text-xs text-muted-foreground tabular-nums">{item.count}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <Separator />
        <div className="p-3 space-y-2">
          <button
            type="button"
            onClick={handleClearProject}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full justify-start text-muted-foreground hover:text-destructive",
            )}
          >
            <Trash2 className="size-3.5" />
            Clear project
          </button>
          <div className="text-[10px] text-muted-foreground px-2 leading-relaxed">
            Projects stored on this device only. Premium (coming soon) adds saved projects
            across devices.
          </div>
        </div>
      </aside>
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">{children}</div>
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-1.5 rounded-full shrink-0",
        status === "done" && "bg-jet",
        status === "in-progress" && "bg-spark",
        status === "empty" && "bg-aplus-light-grey",
      )}
    />
  );
}
