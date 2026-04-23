"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/supabase/auth-context";
import { useProjectStore } from "@/lib/project-store";
import {
  listProjectsForOwner,
  loadProjectById,
  softDeleteProject,
  type ProjectSummary,
} from "@/lib/supabase/project-sync";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PlannerIndex() {
  const router = useRouter();
  const { status, user } = useAuth();
  const setProject = useProjectStore((s) => s.setProject);

  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "signed-out") {
      router.replace("/planner/new");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "signed-in" || !user) return;
    let cancelled = false;
    listProjectsForOwner(user.id).then(
      (list) => {
        if (cancelled) return;
        setProjects(list);
        setLoadError(null);
      },
      (err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Failed to load projects");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [status, user]);

  async function handleOpen(id: string) {
    setOpeningId(id);
    try {
      const project = await loadProjectById(id);
      if (!project) {
        toast.error("Project not found or was deleted.");
        setOpeningId(null);
        setProjects((prev) => prev?.filter((p) => p.id !== id) ?? null);
        return;
      }
      setProject(project);
      router.push("/planner/workspace/rooms");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open project";
      toast.error("Couldn't open project", { description: message });
      setOpeningId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    const ok = window.confirm(
      `Remove "${name}" from your projects? It will be soft-deleted (recoverable for a while).`,
    );
    if (!ok) return;
    setDeletingId(id);
    try {
      await softDeleteProject(id);
      setProjects((prev) => prev?.filter((p) => p.id !== id) ?? null);
      toast.success("Project removed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error("Couldn't delete project", { description: message });
    } finally {
      setDeletingId(null);
    }
  }

  if (status === "loading" || status === "signed-out") {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            My projects
          </h1>
          <p className="mt-3 text-muted-foreground">
            Everything you&rsquo;ve saved to your account, synced across devices.
          </p>
        </div>
        <Link
          href="/planner/new"
          className={cn(buttonVariants({ size: "sm" }), "shrink-0 whitespace-nowrap")}
        >
          Start a new project
        </Link>
      </div>

      {loadError && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {loadError}
        </div>
      )}

      {projects === null && !loadError && (
        <div className="text-sm text-muted-foreground">Loading your projects…</div>
      )}

      {projects && projects.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              You don&rsquo;t have any saved projects yet.
            </p>
            <Link href="/planner/new" className={buttonVariants({ size: "sm" })}>
              Start your first project
            </Link>
          </CardContent>
        </Card>
      )}

      {projects && projects.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Card className="h-full">
                <CardContent className="pt-6 pb-4 flex flex-col h-full">
                  <button
                    type="button"
                    onClick={() => handleOpen(p.id)}
                    disabled={openingId !== null}
                    className="flex-1 text-left group"
                  >
                    <div className="font-semibold text-base truncate" title={p.name}>
                      {p.name}
                    </div>
                    {p.location && (
                      <div className="text-sm text-muted-foreground mt-0.5 truncate">
                        {p.location}
                      </div>
                    )}
                    <div className="mt-3 text-xs text-muted-foreground flex items-center gap-3">
                      <span>{p.roomCount} {p.roomCount === 1 ? "room" : "rooms"}</span>
                      <span aria-hidden>&middot;</span>
                      <span>Updated {formatRelative(p.updatedAt)}</span>
                    </div>
                  </button>
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpen(p.id)}
                      disabled={openingId !== null}
                    >
                      {openingId === p.id ? "Opening…" : "Open"}
                      <ArrowRight className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={deletingId !== null}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}
