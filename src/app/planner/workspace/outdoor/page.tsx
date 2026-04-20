import { SectionPlaceholder } from "@/components/planner/section-placeholder";

export const metadata = { title: "Outdoor" };

export default function OutdoorSectionPage() {
  return (
    <SectionPlaceholder
      title="Outdoor"
      description="Project-level outdoor scope — parking, façade, canopies, grounds, signage, loading docks. Each zone gets a §9.4.2 controls narrative based on its Lighting Zone classification."
      nextStep="Coming next: toggle outdoor zones on/off, set size and Lighting Zone per zone type."
    />
  );
}
