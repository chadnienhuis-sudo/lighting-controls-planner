import type {
  BasisOfDesignInputs,
  CommissioningInputs,
  FunctionalGroup,
  OutdoorScope,
  Project,
  Room,
  SectionOverrides,
  SystemArchitectureInputs,
} from "@/lib/types";

export interface ProjectRow {
  id: string;
  owner_id: string;
  name: string;
  location: string | null;
  prepared_by: string | null;
  code_version: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  outdoor_scope: OutdoorScope;
  basis_of_design: BasisOfDesignInputs;
  system_architecture: SystemArchitectureInputs;
  commissioning: CommissioningInputs;
  section_overrides: SectionOverrides;
  rooms_json: Room[];
  functional_groups_json: FunctionalGroup[];
}

export type ProjectRowInsert = Omit<ProjectRow, "created_at" | "updated_at" | "deleted_at"> & {
  created_at?: string;
  updated_at?: string;
};

export function projectToRowInsert(project: Project, ownerId: string): ProjectRowInsert {
  return {
    id: project.id,
    owner_id: ownerId,
    name: project.name,
    location: project.location ?? null,
    prepared_by: project.preparedBy ?? null,
    code_version: project.codeVersion,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    outdoor_scope: project.outdoorScope,
    basis_of_design: project.basisOfDesign,
    system_architecture: project.systemArchitecture,
    commissioning: project.commissioning,
    section_overrides: project.sectionOverrides,
    rooms_json: project.rooms,
    functional_groups_json: project.functionalGroups,
  };
}

export function projectFromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    location: row.location ?? undefined,
    preparedBy: row.prepared_by ?? undefined,
    codeVersion: row.code_version as Project["codeVersion"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rooms: row.rooms_json ?? [],
    outdoorScope: row.outdoor_scope ?? { zones: {} },
    functionalGroups: row.functional_groups_json ?? [],
    basisOfDesign: row.basis_of_design ?? {},
    systemArchitecture:
      row.system_architecture ?? ({ systemType: "networked-wired" } as SystemArchitectureInputs),
    commissioning: row.commissioning ?? ({ defaultVacancyTimerMin: 20 } as CommissioningInputs),
    sectionOverrides: row.section_overrides ?? {},
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function ensureUuid(project: Project): Project {
  if (isUuid(project.id)) return project;
  return { ...project, id: crypto.randomUUID() };
}
