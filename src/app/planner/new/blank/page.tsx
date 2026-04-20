import { BlankProjectForm } from "@/components/planner/blank-project-form";

export const metadata = { title: "Start a blank project" };

export default function BlankProjectPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Start blank</h1>
        <p className="mt-3 text-muted-foreground">
          Name your project. You&rsquo;ll add rooms once you&rsquo;re in the workspace.
        </p>
      </div>
      <BlankProjectForm />
    </div>
  );
}
