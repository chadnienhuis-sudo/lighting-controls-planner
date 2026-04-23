"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/supabase/auth-context";
import { SyncStatusIndicator } from "@/components/auth/sync-status";

export function NavAuth() {
  const { status, user, signOut } = useAuth();

  if (status === "loading") {
    return <div className="h-8 w-24 rounded-md bg-muted/60 animate-pulse" aria-hidden />;
  }

  if (status === "signed-out") {
    return (
      <Link
        href="/sign-in"
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-3">
      <Link
        href="/planner"
        className="hidden sm:inline text-sm text-jet/80 hover:text-jet transition-colors"
      >
        My projects
      </Link>
      <SyncStatusIndicator />
      <span
        className="hidden md:inline text-sm text-jet/80 truncate max-w-[14rem]"
        title={user?.email ?? undefined}
      >
        {user?.email}
      </span>
      <Button size="sm" variant="outline" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );
}
