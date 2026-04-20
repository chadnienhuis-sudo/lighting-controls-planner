import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Start a new project",
};

export default function NewProjectPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-8">
        <Badge variant="outline">Scaffold</Badge>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">
          Start a new project
        </h1>
        <p className="mt-3 text-muted-foreground">
          Pick an entry point. Project creation flow is under construction — UI
          placeholder below shows the two planned paths.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="cursor-not-allowed opacity-70">
          <CardHeader>
            <CardTitle>Start blank</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Name your project and add rooms one at a time. Tool auto-groups by
            function as you go.
          </CardContent>
        </Card>
        <Card className="cursor-not-allowed opacity-70">
          <CardHeader>
            <CardTitle>Start from a template</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pick a building type (Warehouse, Light Industrial, Office, K-12
            School, Retail). Typical rooms pre-populated — customize from there.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
