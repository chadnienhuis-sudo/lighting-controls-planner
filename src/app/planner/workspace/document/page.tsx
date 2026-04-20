import { SectionPlaceholder } from "@/components/planner/section-placeholder";

export const metadata = { title: "Document" };

export default function DocumentSectionPage() {
  return (
    <SectionPlaceholder
      title="Document preview"
      description="The full controls narrative, as it will appear in the exported PDF. Cover page, basis of design, system architecture, functional group sequences, room schedule, commissioning notes, glossary, and disclaimer."
      nextStep="Coming next: render each section with auto-generated boilerplate + your overrides."
    />
  );
}
