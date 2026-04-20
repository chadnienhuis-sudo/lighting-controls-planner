import { TemplatePicker } from "@/components/planner/template-picker";

export const metadata = { title: "Pick a building template" };

export default function TemplatePickerPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Pick a building template
        </h1>
        <p className="mt-3 text-muted-foreground">
          Typical rooms and outdoor zones will be pre-populated. Name your project, then customize
          from there.
        </p>
      </div>
      <TemplatePicker />
    </div>
  );
}
