"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Project } from "@/lib/types";
import { rehydrateProjectStore, useProjectStore } from "@/lib/project-store";
import { useAuth } from "./auth-context";
import { ensureUuid, isUuid } from "./project-mapper";
import { upsertProject } from "./project-sync";

const SAVE_DEBOUNCE_MS = 500;

export function ProjectSyncProvider({ children }: { children: React.ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const project = useProjectStore((s) => s.project);
  const hasHydrated = useProjectStore((s) => s.hasHydrated);
  const setSyncStatus = useProjectStore((s) => s.setSyncStatus);
  const setProject = useProjectStore((s) => s.setProject);

  const lastSavedRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSignedInUserRef = useRef<string | null>(null);

  useEffect(() => {
    void rehydrateProjectStore();
  }, []);

  useEffect(() => {
    if (authStatus !== "signed-out") return;
    if (lastSignedInUserRef.current === null) return;
    lastSignedInUserRef.current = null;
    useProjectStore.getState().clearProject();
    try {
      localStorage.removeItem("lcp-active-project");
    } catch {}
    lastSavedRef.current = null;
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== "signed-in" || !user || !hasHydrated) return;
    if (lastSignedInUserRef.current === user.id) return;
    lastSignedInUserRef.current = user.id;

    const current = useProjectStore.getState().project;
    if (!current) return;

    const canonical = isUuid(current.id) ? current : ensureUuid(current);
    if (canonical.id !== current.id) {
      setProject(canonical);
    }
    void saveNow(canonical, user.id, setSyncStatus, lastSavedRef);
  }, [authStatus, user, hasHydrated, setProject, setSyncStatus]);

  useEffect(() => {
    if (authStatus !== "signed-in" || !user || !project || !hasHydrated) return;
    if (!isUuid(project.id)) return;

    const serialized = JSON.stringify(project);
    if (lastSavedRef.current === serialized) return;

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    setSyncStatus("saving");
    pendingTimerRef.current = setTimeout(() => {
      void saveNow(project, user.id, setSyncStatus, lastSavedRef);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, [project, authStatus, user, hasHydrated, setSyncStatus]);

  return <>{children}</>;
}

async function saveNow(
  project: Project,
  userId: string,
  setSyncStatus: (status: "idle" | "saving" | "saved" | "error" | "offline", err?: string | null) => void,
  lastSavedRef: React.RefObject<string | null>,
) {
  try {
    setSyncStatus("saving");
    await upsertProject(project, userId);
    lastSavedRef.current = JSON.stringify(project);
    setSyncStatus("saved");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    setSyncStatus("error", message);
    toast.error("Couldn't sync project", { description: message });
  }
}
