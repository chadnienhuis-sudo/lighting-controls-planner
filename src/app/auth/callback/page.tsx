import type { Metadata } from "next";
import { CallbackClient } from "./callback-client";

export const metadata: Metadata = {
  title: "Signing you in…",
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="max-w-md mx-auto text-center space-y-3">
        <h1 className="font-heading text-2xl text-jet">Signing you in…</h1>
        <CallbackClient />
      </div>
    </section>
  );
}
