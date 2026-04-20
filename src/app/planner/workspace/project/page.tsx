import { SectionPlaceholder } from "@/components/planner/section-placeholder";

export const metadata = { title: "Project" };

export default function ProjectSectionPage() {
  return (
    <SectionPlaceholder
      title="Project"
      description="Project name, location, code version, and basis-of-design inputs that drive the exported deliverable."
      nextStep="Coming next: edit project name, location, occupancy hours, and local amendments."
    />
  );
}
