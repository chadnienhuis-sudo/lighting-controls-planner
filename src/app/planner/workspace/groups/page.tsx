import { SectionPlaceholder } from "@/components/planner/section-placeholder";

export const metadata = { title: "Groups" };

export default function GroupsSectionPage() {
  return (
    <SectionPlaceholder
      title="Functional groups"
      description="Rooms auto-group by ASHRAE space type + splitting factors (daylight, plug load, occupancy strategy). Customize each group — waive code items with a logged reason, add beyond-code features, pick sensor/dimming types."
      nextStep="Coming next: auto-generate groups from room set, review/split, customize panel per group."
    />
  );
}
