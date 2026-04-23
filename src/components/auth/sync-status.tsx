"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/lib/project-store";
import { useAuth } from "@/lib/supabase/auth-context";

export function SyncStatusIndicator() {
  const { status: authStatus } = useAuth();
  const syncStatus = useProjectStore((s) => s.syncStatus);
  const syncError = useProjectStore((s) => s.syncError);
  const hasProject = useProjectStore((s) => !!s.project);

  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (syncStatus !== "saved") return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 1500);
    return () => clearTimeout(t);
  }, [syncStatus]);

  if (authStatus !== "signed-in" || !hasProject) return null;

  if (syncStatus === "saving") {
    return <span className="text-xs text-muted-foreground" aria-live="polite">Saving…</span>;
  }
  if (syncStatus === "error") {
    return (
      <span
        className="text-xs text-destructive"
        title={syncError ?? undefined}
        aria-live="polite"
      >
        Sync failed
      </span>
    );
  }
  if (showSaved) {
    return <span className="text-xs text-muted-foreground" aria-live="polite">Saved</span>;
  }
  return null;
}
