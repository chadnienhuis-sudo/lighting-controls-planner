import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to the Lighting Controls Planner to save projects across devices.",
};

type SearchParams = Promise<{ error?: string | string[] }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const errorMessage = Array.isArray(error) ? error[0] : error;

  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            A+ Lighting Solutions
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-jet">
            Sign in
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Save your projects to the cloud and access them from any device.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-6 md:p-8 shadow-sm">
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </div>
          )}
          <SignInForm />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Don&apos;t have an account? The magic link will create one
          automatically.{" "}
          <Link href="/" className="underline-offset-4 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </section>
  );
}
