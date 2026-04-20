# Lighting Controls Planner — MVP Spec

**Status:** Planning draft — derived from scoping conversation on 2026-04-20. Review, correct, fill gaps in §10.

---

## 1. Overview

**Lighting Controls Planner** is a web-based tool that generates code-compliant lighting controls designs for interior and outdoor commercial/industrial spaces. Users enter rooms (or start from a building template), and the tool produces a complete controls narrative + schedule deliverable based on ASHRAE 90.1-2019 and IES illumination recommendations.

The tool ships as a free public web app for lead generation. A premium tier — gated behind A+ Lighting customer invitation — adds manufacturer product mapping, saved projects, branded exports, and eventual budget rollup.

## 2. Positioning

Part of the **A+ Lighting Advantage** product package. The tool:
- Fills a real gap: design/build jobs frequently lack engineered controls narratives (contractors aren't sophisticated enough to write them; no engineer was involved)
- Generates SEO/links/leads back to A+ Lighting
- Reinforces the walled garden: premium features are an A+ customer benefit
- Differentiates A+ from distributor competitors offering only static design services

## 3. Core Concepts

- **Functional Group** (primary organizing unit): a set of rooms that operate the same way. Defined by ASHRAE space type + splitting factors.
  - Splitting factors: (1) daylight zone (window-exposed vs interior), (2) plug load control (§8.4.2) required vs not, (3) occupancy strategy (auto-on vs manual-on designer choice)
  - Bi-level/multi-level dimming is **code-inherited** (from space type + wattage), not a splitting factor
  - Each group carries: narrative, ASHRAE requirements, IES targets, [premium] device list
- **Narrative**: plain-English description of how the group's spaces function. *Not* a lengthy prose document — a concise behavioral description per group.
- **Room Schedule**: table mapping each individual room (#, name, size, ceiling info, etc.) to its functional group.

## 4. MVP Scope (Phase 1)

### 4.1 Code Coverage
- ASHRAE 90.1-2019, Section 9 (lighting)
- **Interior** space types (Table 9.6.1) covered per-room
- **Outdoor** handled as a **project-level section** (not per-zone) with preset zone types:
  - Parking lots / drives
  - Facade / wall packs
  - Entrance canopies
  - Grounds / landscape
  - Signage
  - Loading docks
- Per outdoor zone type: user toggles "applies Y/N", enters basic info (sf, count, Lighting Zone classification LZ0–LZ4), tool generates applicable §9.4.2 controls narrative (photocell + astronomical time clock + reductions + curfew behavior, as applicable).
- Main requirements encoded; **exceptions deferred** with "see standard §X" notes for edge cases

### 4.2 IES Integration
| Field | Free | Premium |
|---|---|---|
| Horizontal illuminance (fc) | ✅ | ✅ |
| Uniformity ratio | ✅ | ✅ |
| Vertical illuminance (fc) | — | ✅ |
| UGR (glare) | — | ✅ |
| Cylindrical fc, modelling ratio | — | ✅ |

### 4.3 Building Templates (5 for MVP)
1. Warehouse / Distribution
2. Light Industrial / Manufacturing
3. Office
4. K-12 School
5. Retail

(Phase 2 additions: Healthcare, Hospitality, Higher Ed, Mixed-Use.)

### 4.4 Entry Points
- **Manual room entry**: per room — room #, name, size, ASHRAE space type
- **Building templates**: start from preset with typical rooms pre-populated; customize
- **CSV/Excel upload**: deferred to Phase 2

### 4.5 Output: Controls Narrative Deliverable
Exported document sections:
1. Cover page (project info, date, "Prepared by A+ Lighting LLC")
2. Basis of Design
3. System Architecture notes
4. **Functional Group Sequences** (narratives + requirements + IES targets + [premium] devices)
5. **Room Schedule** (table)
6. Commissioning / Handoff notes
7. Glossary + Abbreviations
8. Standard disclaimer

**Export format**: PDF (MVP). Word and JSON export (for future superapp consumption) deferred to Phase 2.

### 4.6 Free vs Premium Gate
**Free (anonymous, public):** everything not listed as premium.

**Premium (invite-only, A+ customers):**
- Manufacturer product mapping per group (Autani, SensorWorx, NX Controls, Lutron)
- Saved projects
- A+-branded exports (logo, custom header/footer)
- Budget rollup (added later in Phase 2)
- Extended IES fields (vertical, UGR, cylindrical, modelling)

### 4.7 Access Model (Premium)
- Invite-based: A+ admin adds user by email; user gets a link to set up an account
- **No billing system in MVP** — premium is a customer benefit, not a paid subscription
- Future option: add public paid tier if demand shows up

### 4.8 Per-Group Overrides & Designer Selections

Real projects don't match code minimums perfectly. Users need to customize each functional group in three ways. **All three are MVP-required** — without them, the tool produces rigid outputs that fail on any real project.

**1. Code waivers** — remove a code-required item when the AHJ has waived it. Tool prompts for a reason (e.g., *"Plug load control waived per AHJ ruling — 2026-03-12 email from City of Grand Rapids BCD"*). Reasons are logged in the exported narrative as footnotes, so the deliverable shows *why* the waiver applies (not just that the requirement is missing). Waivers are tracked per group; an icon on the group card signals an override is active.

**2. Beyond-code additions** — add features code doesn't require but the designer wants (e.g., *"Add dimming to restroom"*). Additions appear in the narrative and flow through to the requirements list and device selection.

**3. Designer choices within code-valid options** — multiple valid ways to meet the same requirement:
- **Sensor type**: PIR vs dual-tech vs ultrasonic; ceiling-mount vs wall-mount
- **Dimming protocol**: 0-10V vs DALI vs phase vs wireless
- **Auto-on vs manual-on** (a splitting factor, but also surfaces here for rooms within a group)
- **Plug load strategy**: room controller vs receptacle-level device

**Phase 2 (Premium) extension: manufacturer-specific multi-option design.** When product mapping is on, certain rooms have multiple valid mfg-specific designs (e.g., *"NX Controls has 3 valid designs for this room — review and select"*). Each option presents its device list, wiring approach, and trade-offs so the designer picks deliberately.

**Data model implication**: each functional group carries base requirements (from ASHRAE) + `waivers[]` + `additions[]` + `designer_choices{}`. Narrative generation reads all of these; overrides appear as footnotes or inline call-outs in the exported doc.

**UI sketch**: each group card has a "Customize" panel —
- Checkboxes next to code-required items (uncheck → prompt for waiver reason)
- Dropdowns for designer choices (sensor type, dimming protocol, etc.)
- "+ Add feature" button for beyond-code additions
- Visual indicator when any override is active

### 4.9 Resources / Help Content (SEO + User Education)
A static content section alongside the tool that helps users find **local and jurisdictional requirements** the tool itself doesn't encode. Purpose: long-tail SEO capture + user education + A+ positioning as helpful experts (not gatekeepers).

Starter topics (static MDX pages, low build cost):
- **Finding your local exterior lighting code** — suggested Google search terms (e.g., `"[city name] outdoor lighting ordinance"`, `"[state] energy code exterior lighting"`), links to municode.com / ecode360.com, DOE Building Energy Codes Program, state-by-state adoption lookup
- **Dark Sky and BUG ratings** — what they are, how to read them, DarkSky International reference
- **Lighting Zones 1–4** — how to identify your project's zone per ASHRAE/IES LZ classification
- **ASHRAE vs IECC** — how the two relate, which your state adopts
- **What's a Lighting Controls Narrative** — defines the tool's output, positions the tool
- **Daylight zone depth** — how to calculate; when daylight-responsive controls apply
- **0-10V vs DALI vs wireless** — choosing control types

Inline help callouts within the tool flow (especially outdoor scope steps) link to these pages so users discover them contextually. Each page ends with a CTA back to the tool or to A+'s contact form.

## 5. User Journey (Free Tier MVP)

1. Land on tool URL
2. Start new project → name, location (for any local amendments later), code version (default: ASHRAE 90.1-2019)
3. Choose: **Start blank** OR **Pick a building template**
4. Enter/edit rooms (#, name, size, ASHRAE space type)
5. Tool auto-generates functional groups; user refines via splitting factors (daylight Y/N, plug load Y/N, occupancy strategy)
6. Review generated doc (all sections)
7. Export PDF

(Premium: save project, upgrade to branded export, assign products, etc.)

## 6. Tech Stack & Hosting

| Area | Phase 1 (MVP) | Phase 2 |
|---|---|---|
| Framework | Next.js 15 | same |
| Hosting | Vercel | same |
| Domain | `lighting-controls-planner.vercel.app` (or custom `.com` if grabbed early) | `apluslightingllc.com/tools/controls-planner` (integrated) |
| Data | Static JSON/TS in repo | + Postgres (Vercel Postgres or Neon) for projects/users |
| Auth | None | Clerk |
| Styling | Tailwind CSS + shadcn/ui | same |
| Language | TypeScript | same |
| Analytics | Plausible or Vercel Analytics | same |

**Phase 1 simplification:** no database, no auth, no billing — ASHRAE requirements, IES targets, building templates, and glossary all ship as static data in the repo. Ship in weeks, not months.

## 7. Branding

- **Tool name**: Lighting Controls Planner (descriptive-generic — helps the tool rank for generic industry searches like "lighting controls planner" or "ASHRAE 90.1 tool")
- **Visual identity**: strongly A+ Lighting. A+ logo in header, A+ colors/typography, clear "from A+ Lighting" attribution. It's a public good — but it was built by A+, and every visitor should know it. Same pattern Stripe/Vercel use for their free/open tools: generic name, unmistakable company fingerprint.
- **Tagline concept (draft)**: e.g., *"Lighting Controls Planner — a free tool from A+ Lighting"* in the hero / header
- **Exports**: A+-branded throughout — "Prepared by A+ Lighting LLC" on cover and footer; "Generated using Lighting Controls Planner" credit line
- **Visual design**: derive from apluslightingllc.com once we know the site stack and brand guide. Starting point: A+ logo + colors on shadcn/ui's polished defaults, customized with the A+ palette. Need logo assets + primary/secondary colors from Chad.

## 8. Phase 2+ Roadmap

### Phase 2 Premium features
- Manufacturer product mapping (Autani, SensorWorx, NX Controls, Lutron)
- Saved projects, user accounts (Clerk + Postgres)
- A+-branded exports
- Extended IES fields
- Budget rollup

### Phase 2 Free-tier additions
- CSV/Excel room upload
- More building templates (Healthcare, Hospitality, Higher Ed, Mixed-Use)
- ASHRAE exceptions
- Other code versions (90.1-2022, IECC variants)

### Phase 2 Integration
- A+ website integration at `apluslightingllc.com/tools/controls-planner`
- Superapp integration (exports consumed by customer portal; shared product database)

### Phase 3+ Stretch ambitions
- **Drawing-based room tagging (premium)**: Upload PDF floor plan → user clicks/highlights a room on the drawing → tool extracts room #, name, size, and space type → rooms map back to the project table with colored highlights/tags on the drawing for visual coverage verification. Eliminates manual transcription on large projects. Tech: PDF render (pdf.js), OCR for text extraction (Tesseract or cloud OCR), scale handling (user sets scale via two-point click or tool reads scale bar), optional Claude Vision for room-boundary detection. Sophistication levels from MVP→polished: (a) manual click + type, (b) click + OCR-adjacent-text auto-fill + confirm, (c) AI-vision full extraction from a click.

## 9. Open Questions (decide before/during build)

- [x] ~~Outdoor data model~~ — **decided**: project-level section with preset zone types (see §4.1)
- [x] ~~Auto-gen content defaults~~ — **decided**: I draft initial boilerplate per section (with structured-input placeholders); Chad reviews and edits during build.
- [x] ~~Disclaimer wording~~ — **drafted**: see §11 Legal & Disclaimers
- [ ] **Authoring model**: structured inputs that regenerate sections vs. inline free-form editing
- [x] ~~Internal beta / validation plan~~ — **decided**: templates + fictional rooms only for pre-launch validation. Templates need to be detailed enough to stress-test edge cases (daylight zones, plug load, overrides, outdoor). Real-job validation happens post-launch through Chad's ongoing use.
- [x] ~~Analytics scope~~ — **decided**: core funnel + lead events. Page views, project starts, template chosen, room count, narrative exports, A+ CTA clicks. Cookieless (Plausible or Vercel Analytics). No cookie banner needed.
- [x] ~~Data maintenance ownership~~ — **deferred**: decide after launch based on actual update cadence.
- [x] ~~PE review~~ — **decided**: disclaimer-only, no formal PE review. See §11.
- [x] ~~Target launch window~~ — **decided**: no fixed target, ship when it's genuinely excellent. "ASAP" applied to deployment path (Vercel, skip WordPress integration for Phase 1), not to feature cuts.
- [x] ~~IP attorney~~ — **decided** (see §11.4 checklist): optional 1-hour review before public launch (belt-and-suspenders); required review before any public paid premium tier or commercial offering.
- [x] ~~Specific ASHRAE space types~~ — **decided**: full Table 9.6.1 (~40 types) seeded in MVP. No user hits a "my space type isn't supported" dead end.

## 10. Dependencies (from Chad)

- [ ] ASHRAE 90.1-2019 reference copy (PDF or equivalent) — Chad has this
- [ ] IES publications (RP-1 Offices, RP-3 Educational, RP-28 Industrial, RP-5 Healthcare; full Handbook ideal) — availability TBC
- [ ] Manufacturer design guides & spec sheets (Autani, SensorWorx, NX Controls, Lutron) — Phase 2 priority
- [ ] A+ brand assets (logo, colors, typeface)
- [x] ~~A+ website stack info~~ — **known**: apluslightingllc.com runs on self-hosted WordPress with a custom/premium theme. Phase 2 integration via reverse proxy on the `/tools/*` path is the cleanest approach (nginx/.htaccess rewrite, or Cloudflare Worker if behind Cloudflare).

## 11. Legal & Disclaimers

Positioning: **design aid, not compliance certification.** No PE review pipeline in MVP. Disclaimer surfaces prominently on every export and in the tool UI. Users verify final design with their AHJ and licensed engineer.

### 11.1 Disclaimer — long form
Appears on the cover page and footer of every export, and on the tool's About/Legal page:

> **Disclaimer.** The Lighting Controls Planner is a design aid provided by A+ Lighting LLC to help users develop conceptual lighting controls designs. It is **NOT** a compliance certification, engineering stamp, or substitute for review by a licensed engineer or Authority Having Jurisdiction (AHJ).
>
> Outputs are based on ASHRAE 90.1-2019 requirements as interpreted by A+ Lighting LLC. Local codes, amendments, and AHJ rulings may impose additional or different requirements. Users are solely responsible for verifying all outputs against applicable codes and for obtaining required approvals, permits, and engineer sign-offs prior to installation.
>
> A+ Lighting LLC makes no warranty of accuracy, completeness, or fitness for any particular purpose. In no event shall A+ Lighting LLC be liable for damages arising from use of this tool.
>
> Final construction documents, manufacturer approvals, and installation must be performed by qualified parties.

### 11.2 Disclaimer — short form
Runs in the tool's header/footer and on every export's footer:

> Design aid — not a compliance certification. Verify all outputs with your AHJ and licensed engineer.

### 11.3 Terms of Service & Privacy Policy

**Phase 1 (no user accounts):**
- Short "Terms of Use" page covering no-warranty, user responsibility, IP/attribution, acceptable use
- Cookie notice **only if needed** (Plausible is cookieless; Vercel Analytics is cookieless by default — likely no banner required)
- No personal-data collection in Phase 1; privacy policy a simple one-pager

**Phase 2 (user accounts for premium):**
- Fuller ToS + Privacy Policy covering account data, session handling, data retention, data deletion rights
- **IP attorney review recommended before premium goes to non-customers** (belt-and-suspenders for the ASHRAE interpretation reproduction and for the mfg product data usage)

### 11.4 Pre-launch legal checklist
- [ ] Chad reviews and approves final disclaimer wording
- [ ] Short ToS and Privacy drafted (I can draft; you review)
- [ ] (Optional) 1-hour IP attorney review before public launch
- [ ] IP attorney engagement **required** before any public paid tier or commercial premium

---

**Next step**: Chad reviews this spec, corrects anything wrong, closes remaining open questions in §9, and drops reference material in `C:\Users\CHAD\projects\lighting-controls-planner\reference\`. Then we scaffold.
