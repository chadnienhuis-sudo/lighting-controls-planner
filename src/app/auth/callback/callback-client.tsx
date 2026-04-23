"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase/auth-context";

export function CallbackClient() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (hash.startsWith("#error")) {
      const params = new URLSearchParams(hash.slice(1));
      const message =
        params.get("error_description") ??
        params.get("error") ??
        "Sign-in link failed. Please request a new one.";
      router.replace(`/sign-in?error=${encodeURIComponent(message)}`);
      return;
    }

    if (status === "signed-in") {
      router.replace("/");
    }
  }, [status, router]);

  return (
    <p className="text-sm text-muted-foreground">
      Hang tight while we finish confirming your magic link.
    </p>
  );
}
