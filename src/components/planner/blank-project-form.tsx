"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBlankProject } from "@/lib/project-factory";
import { useProjectStore } from "@/lib/project-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BlankProjectForm() {
  const router = useRouter();
  const setProject = useProjectStore((s) => s.setProject);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const project = createBlankProject({ name: name.trim(), location: location.trim() || undefined });
    setProject(project);
    router.push("/planner/workspace/rooms");
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ACME Distribution Center"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-location">Location (optional)</Label>
            <Input
              id="project-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Grand Rapids, MI"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim()}>
            Create project
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
