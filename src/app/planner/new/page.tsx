import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Start a new project",
};

export default function NewProjectPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Start a new project
        </h1>
        <p className="mt-3 text-muted-foreground">
          Pick an entry point. Projects live on your device — no account needed.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <EntryCard
          href="/planner/new/blank"
          title="Start blank"
          body="Name your project and add rooms one at a time. Tool auto-groups by function as you go."
        />
        <EntryCard
          href="/planner/new/template"
          title="Start from a template"
          body="Pick a building type (Warehouse, Light Industrial, Office, K-12 School, Retail). Typical rooms pre-populated — customize from there."
        />
      </div>
    </div>
  );
}

function EntryCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-colors group-hover:border-aplus-grey/60 group-hover:bg-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            {title}
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
      </Card>
    </Link>
  );
}
