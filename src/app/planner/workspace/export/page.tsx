import { SectionPlaceholder } from "@/components/planner/section-placeholder";

export const metadata = { title: "Export" };

export default function ExportSectionPage() {
  return (
    <SectionPlaceholder
      title="Export"
      description="Generate a PDF of the full controls narrative. Free tier includes all sections with A+ Lighting attribution; premium adds branded headers/footers and manufacturer product mapping."
      nextStep="Coming next: PDF generation with A+ cover page, footer disclaimer, and all document sections."
    />
  );
}
