"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus({ kind: "sending" });
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setStatus({ kind: "sent", email: trimmed });
  }

  if (status.kind === "sent") {
    return (
      <div className="space-y-3 text-center">
        <h2 className="font-heading text-xl text-jet">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to <span className="font-medium text-jet">{status.email}</span>.
          Open it on this device to finish signing in.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="text-sm text-infrared underline-offset-4 hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={status.kind === "sending"}
        />
      </div>
      {status.kind === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {status.message}
        </p>
      )}
      <Button type="submit" disabled={status.kind === "sending"} className="w-full">
        {status.kind === "sending" ? "Sending link…" : "Send magic link"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        We&apos;ll email you a one-time link — no password needed.
      </p>
    </form>
  );
}
