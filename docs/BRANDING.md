# A+ Lighting Solutions — Branding Guidelines

> Extracted from APL Web Style Guide (Spring 2024) and logo assets.

## Logo
- **Primary:** `data/branding/2025 Logos/svg/AP_Full-Logo-Black-Red.svg` (black text, red plus)
- **Icon only:** `data/branding/2025 Logos/svg/AP_Icon-Logo-Black-Red.svg`
- **On dark backgrounds:** `AP_Full-Logo-White-Red.svg` or `AP_Full-Logo-White.svg`
- **Favicon:** Use icon logo (`AP_Icon-Logo-Black-Red`)

## Colors

### Primary
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Infrared** | `#DE4444` | 222, 68, 68 | Primary red — accent color, used sparingly |
| **Jet Black** | `#312E2E` | 49, 46, 46 | Primary text, headers |
| **Sea Salt Grey** | `#FAFAFA` | 250, 250, 250 | Web backgrounds (use pure white for print/PDF) |
| **Spark Yellow** | `#F7B32B` | 247, 179, 43 | Accent — used sparingly |

### Additional
| Name | Hex | Usage |
|------|-----|-------|
| **White** | `#FFFFFF` | Print backgrounds, cards |
| **Light Grey** | `#DBDBDB` | Borders, dividers |
| **Grey** | `#626262` | Secondary text |
| **Onyx** | `#454545` | Dark text alternative |

### Color Hierarchy
- 50% Jet Black / Onyx (primary)
- 20% Grey tones
- 20% White / Sea Salt Grey
- 5% Infrared (accent)
- 5% Spark Yellow (accent)

## Typography

### Font Family: Area (Adobe Fonts)
- **Headings & Callouts:** Area Extended (bold weights) — `Area-Extended-Black.otf` available in `data/branding/2025 Logos/2025 Font/`
- **Body Text:** Area Normal (medium weights)
- **Buttons:** Area Normal, Bold
- Font source: https://fonts.adobe.com/fonts/area

### Text Color Rules
- Most text: black, white, or shades of grey
- Smaller callouts: occasionally in color (Infrared or Spark Yellow)

## Design Elements
- Rounded corners on boxed elements
- Thin lines / grid patterns
- Blueprint-style drawings
- Thin colored arrows
- Grey gradients
- Frosted glass effect for text over images
- Clean, sophisticated photography (not staged)

## PDF Quote Styling
- **Background:** Pure white (not Sea Salt Grey — that's for web)
- **Header:** Logo left, company info right
- **Accent color:** Infrared `#DE4444` for highlights, section headers, continuation markers
- **Text:** Jet Black `#312E2E`
- **Table borders:** Light Grey `#DBDBDB`
- **Rounded corners** on containers

### Card-layout rows (Visual Catalog template)
- **Row height / image size** driven by `cardScale` (0.6–1.2, default 1.0). 100% = 38mm row, 34mm square image.
- **Image cell:** canvas-composited to square with white backdrop, ~86% inner inset (so images don't touch edges), aspect preserved, no upscaling past native size, high-quality downsampling.
- **No visible frame** around the image — letterbox space blends with the row background.
- **Fallback:** dashed light-grey placeholder with centered "No Product / Image" text when no image exists or fetch fails.
- **Stacked cells:** Product info (Part# bold + Mfr grey + Description wrapped ≤3 lines) · QOH + Lead · Qty + Unit · Extended (bold, right-aligned).
- **Column headers** redraw on every page via `checkPageBreak`; terminal page has no continuation marker.

## Company Info (for headers/footers)
- **Address:** 2336 Wilshere Dr Suite 103, Jenison, MI 49428
- **Phone:** (866) 798-4446
- **Email:** sales@apluslightingllc.com
- **Website:** apluslightingllc.com

## Existing Quote Formats (from samples)

### QuickBooks Quotes (Q-series)
- Simple format: company header, bill-to/ship-to, line items table
- Columns: Tag, Item, Description, Qty, Cost, Total
- Shows tax as separate line
- Signature line at bottom
- Quote number + date in header
- Project name and Ordered By fields
- Terms field (Net 30, etc.)

### Parspec Quotes
- Sections: Lighting, Controls with subtotals
- Columns: Qty, Type (tag), Mfg, Model Number & Notes, Unit Price, Ext. Price
- Quote summary: Products, Services, Taxes, Freight, Grand Total
- Includes quote number, bid date, expiration date
- Job name, addressed to (contact + email + company)
- Notes section at top for project-specific comments
- Footer: Prepared By line with company URL + rep email
- Version tracking in quote number (e.g., 495743-796711-2)

### Key Differences to Resolve
- QB shows Cost column (internal view) — Superapp should show cost internally but hide on customer PDF
- Parspec uses Type/Tag as a fixture identifier — Superapp uses Tag column similarly
- Parspec groups by Lighting/Controls with subtotals — Superapp uses named sections
- QB has signature line — consider adding to Superapp PDF templates
