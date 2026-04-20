import { Construction } from "lucide-react";

export function SectionPlaceholder({
  title,
  description,
  nextStep,
}: {
  title: string;
  description: string;
  nextStep?: string;
}) {
  return (
    <div className="px-6 md:px-10 py-8 max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="rounded-lg border border-dashed border-border bg-muted/10 p-10 text-center">
        <Construction className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-3 font-medium">Not built yet</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          {nextStep ?? "This section will be wired up in the next iteration."}
        </p>
      </div>
    </div>
  );
}
