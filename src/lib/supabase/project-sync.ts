import type { Project } from "@/lib/types";
import { getSupabaseBrowserClient } from "./browser";
import {
  projectFromRow,
  projectToRowInsert,
  type ProjectRow,
} from "./project-mapper";

export interface ProjectSummary {
  id: string;
  name: string;
  location: string | null;
  updatedAt: string;
  roomCount: number;
}

type PartialRow = Pick<
  ProjectRow,
  "id" | "name" | "location" | "updated_at" | "rooms_json"
>;

export async function listProjectsForOwner(ownerId: string): Promise<ProjectSummary[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, location, updated_at, rooms_json")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as PartialRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    location: row.location,
    updatedAt: row.updated_at,
    roomCount: Array.isArray(row.rooms_json) ? row.rooms_json.length : 0,
  }));
}

export async function loadProjectById(projectId: string): Promise<Project | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return projectFromRow(data as ProjectRow);
}

export async function upsertProject(project: Project, ownerId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const row = projectToRowInsert(project, ownerId);
  const { error } = await supabase
    .from("projects")
    .upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function softDeleteProject(projectId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) throw error;
}
