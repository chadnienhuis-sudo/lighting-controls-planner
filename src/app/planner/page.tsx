import type { Metadata } from "next";
import { PlannerIndex } from "@/components/planner/planner-index";

export const metadata: Metadata = {
  title: "My projects",
};

export default function PlannerIndexPage() {
  return <PlannerIndex />;
}
