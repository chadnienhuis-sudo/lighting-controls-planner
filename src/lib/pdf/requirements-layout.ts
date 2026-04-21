// ─────────────────────────────────────────────────────────────────────────────
// Shared type for the Section 5 requirements layout variant. Pulled into its
// own module so DocumentTemplate (which stores the selection) and the renderer
// (which dispatches on it) can both import without a circular dependency on
// the giant controls-narrative-pdf.tsx file.
//
// Each variant trades density for readability differently; the user picks via
// the Sections panel in the PDF editor and the same variant drives both the
// on-screen preview and the downloaded PDF.
// ─────────────────────────────────────────────────────────────────────────────

export type RequirementsLayout =
  | "expanded" // Two-line rows: bold headline + how-met sentence
  | "compact" // One-line grid; N/A items collapsed into a footer
  | "soo" // Two columns: how lights turn on / off
  | "pills" // Active/waived chips + the sequence-of-operation paragraph
  | "hybrid"; // Expanded for active rules, N/A consolidated at bottom

export interface RequirementsLayoutOption {
  id: RequirementsLayout;
  label: string;
  hint: string;
}

export const REQUIREMENTS_LAYOUT_OPTIONS: RequirementsLayoutOption[] = [
  { id: "expanded", label: "Expanded", hint: "Each rule on two lines (current)" },
  { id: "compact", label: "Compact", hint: "One-line rows · N/A consolidated" },
  { id: "soo", label: "Sequence of operation", hint: "Two columns: turn-on / turn-off" },
  { id: "pills", label: "Pills + narrative", hint: "Chip dashboard + plain-English paragraph" },
  { id: "hybrid", label: "Hybrid", hint: "Expanded actives · N/A consolidated" },
];
