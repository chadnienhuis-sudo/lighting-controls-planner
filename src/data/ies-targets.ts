import type { IesTarget } from "@/lib/types";

/**
 * IES illumination recommendations by space/activity.
 * Free tier exposes horizontalFc + uniformityRatio; premium unlocks vertical/UGR/cylindrical.
 *
 * TODO: seed from IES RP-1 (offices), RP-3 (educational), RP-28 (industrial),
 * RP-5 (healthcare) once Chad confirms which publications are available.
 * Recommendations are paraphrased per fair use; source citations retained.
 */
export const IES_TARGETS: IesTarget[] = [
  {
    id: "ies_office_private",
    source: "IES-RP-1",
    horizontalFc: 30,
    uniformityRatio: 0.6, // min:avg
    verticalFc: 5,
    ugr: 19,
  },
  {
    id: "ies_office_open",
    source: "IES-RP-1",
    horizontalFc: 30,
    uniformityRatio: 0.6,
    verticalFc: 5,
    ugr: 19,
  },
  {
    id: "ies_conference",
    source: "IES-RP-1",
    horizontalFc: 30,
    uniformityRatio: 0.6,
    verticalFc: 10,
    ugr: 19,
  },
  {
    id: "ies_corridor",
    source: "IES-Handbook",
    horizontalFc: 10,
    uniformityRatio: 0.3,
  },
  {
    id: "ies_restroom",
    source: "IES-Handbook",
    horizontalFc: 15,
    uniformityRatio: 0.4,
  },
  {
    id: "ies_warehouse_medium",
    source: "IES-RP-28",
    horizontalFc: 20,
    uniformityRatio: 0.4,
    verticalFc: 10,
    notes: "Vertical fc is important for label/SKU reading on shelving.",
  },
  { id: "ies_lobby", source: "IES-Handbook", horizontalFc: 15, uniformityRatio: 0.4 },
  { id: "ies_assembly", source: "IES-Handbook", horizontalFc: 10, uniformityRatio: 0.4, notes: "Varies heavily by use; check IES Handbook application category." },
  { id: "ies_classroom", source: "IES-RP-3", horizontalFc: 30, uniformityRatio: 0.6, verticalFc: 10, notes: "IES RP-3 K–12 classroom recommendation." },
  { id: "ies_dining", source: "IES-Handbook", horizontalFc: 10, uniformityRatio: 0.4 },
  { id: "ies_mechanical", source: "IES-Handbook", horizontalFc: 30, uniformityRatio: 0.4 },
  { id: "ies_food_prep", source: "IES-Handbook", horizontalFc: 50, uniformityRatio: 0.5 },
  { id: "ies_healthcare", source: "IES-RP-5", horizontalFc: 30, uniformityRatio: 0.5, notes: "General exam / care area baseline; task-specific recommendations higher (see RP-5)." },
  { id: "ies_breakroom", source: "IES-Handbook", horizontalFc: 20, uniformityRatio: 0.4 },
  // TODO: seed finer-grained targets to match specific space-type nuances (RP-1 private vs open office separation is already present; healthcare and industrial still coarse).
];

export function iesTargetById(id: string): IesTarget | undefined {
  return IES_TARGETS.find((t) => t.id === id);
}
