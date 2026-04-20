"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";
import { regenerateFunctionalGroups } from "@/lib/functional-groups";
import type {
  Project,
  Room,
  OutdoorZoneType,
  OutdoorZoneConfig,
  FunctionalGroup,
  BasisOfDesignInputs,
  SystemArchitectureInputs,
  CommissioningInputs,
  SectionOverrides,
} from "@/lib/types";

interface ProjectState {
  project: Project | null;
  hasHydrated: boolean;
  setProject: (project: Project) => void;
  clearProject: () => void;
  updateProject: (patch: Partial<Project>) => void;
  addRoom: (room: Omit<Room, "id">) => void;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  removeRoom: (id: string) => void;
  setOutdoorZone: (type: OutdoorZoneType, config: OutdoorZoneConfig | null) => void;
  setFunctionalGroups: (groups: FunctionalGroup[]) => void;
  updateFunctionalGroup: (id: string, patch: Partial<FunctionalGroup>) => void;
  regenerateGroups: () => void;
  updateBasisOfDesign: (patch: Partial<BasisOfDesignInputs>) => void;
  updateSystemArchitecture: (patch: Partial<SystemArchitectureInputs>) => void;
  updateCommissioning: (patch: Partial<CommissioningInputs>) => void;
  updateSectionOverrides: (patch: Partial<SectionOverrides>) => void;
}

const touch = (p: Project): Project => ({ ...p, updatedAt: new Date().toISOString() });

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: null,
      hasHydrated: false,

      setProject: (project) => set({ project: touch(project) }),
      clearProject: () => set({ project: null }),

      updateProject: (patch) =>
        set((s) => (s.project ? { project: touch({ ...s.project, ...patch }) } : s)),

      addRoom: (room) =>
        set((s) => {
          if (!s.project) return s;
          const newRoom: Room = { id: `rm_${nanoid(8)}`, ...room };
          return { project: touch({ ...s.project, rooms: [...s.project.rooms, newRoom] }) };
        }),

      updateRoom: (id, patch) =>
        set((s) => {
          if (!s.project) return s;
          return {
            project: touch({
              ...s.project,
              rooms: s.project.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
            }),
          };
        }),

      removeRoom: (id) =>
        set((s) => {
          if (!s.project) return s;
          return {
            project: touch({ ...s.project, rooms: s.project.rooms.filter((r) => r.id !== id) }),
          };
        }),

      setOutdoorZone: (type, config) =>
        set((s) => {
          if (!s.project) return s;
          const zones = { ...s.project.outdoorScope.zones };
          if (config === null) {
            delete zones[type];
          } else {
            zones[type] = config;
          }
          return { project: touch({ ...s.project, outdoorScope: { zones } }) };
        }),

      setFunctionalGroups: (groups) =>
        set((s) => (s.project ? { project: touch({ ...s.project, functionalGroups: groups }) } : s)),

      updateFunctionalGroup: (id, patch) =>
        set((s) => {
          if (!s.project) return s;
          return {
            project: touch({
              ...s.project,
              functionalGroups: s.project.functionalGroups.map((g) =>
                g.id === id ? { ...g, ...patch } : g,
              ),
            }),
          };
        }),

      regenerateGroups: () =>
        set((s) => {
          if (!s.project) return s;
          const { groups, roomGroupIds } = regenerateFunctionalGroups(s.project);
          const rooms = s.project.rooms.map((r) =>
            roomGroupIds[r.id] ? { ...r, functionalGroupId: roomGroupIds[r.id] } : { ...r, functionalGroupId: undefined },
          );
          return { project: touch({ ...s.project, rooms, functionalGroups: groups }) };
        }),

      updateBasisOfDesign: (patch) =>
        set((s) =>
          s.project
            ? { project: touch({ ...s.project, basisOfDesign: { ...s.project.basisOfDesign, ...patch } }) }
            : s,
        ),

      updateSystemArchitecture: (patch) =>
        set((s) =>
          s.project
            ? {
                project: touch({
                  ...s.project,
                  systemArchitecture: { ...s.project.systemArchitecture, ...patch },
                }),
              }
            : s,
        ),

      updateCommissioning: (patch) =>
        set((s) =>
          s.project
            ? { project: touch({ ...s.project, commissioning: { ...s.project.commissioning, ...patch } }) }
            : s,
        ),

      updateSectionOverrides: (patch) =>
        set((s) =>
          s.project
            ? {
                project: touch({
                  ...s.project,
                  sectionOverrides: { ...s.project.sectionOverrides, ...patch },
                }),
              }
            : s,
        ),
    }),
    {
      name: "lcp-active-project",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ project: s.project }),
    },
  ),
);

export async function rehydrateProjectStore() {
  await useProjectStore.persist.rehydrate();
  useProjectStore.setState({ hasHydrated: true });
}
