export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl prose prose-sm md:prose-base prose-neutral dark:prose-invert">
      <h1>About Lighting Controls Planner</h1>
      <p>
        Lighting Controls Planner is a free web tool for generating
        code-compliant lighting controls designs. Users enter their rooms or
        start from a building template, and the tool produces a complete
        controls narrative — basis of design, system architecture, per-group
        sequences, room schedule, commissioning notes, and glossary.
      </p>

      <h2>Why we built it</h2>
      <p>
        Design-build commercial and industrial projects frequently lack a real
        controls narrative. If an engineer isn&rsquo;t involved, the
        documentation tends to be incomplete or absent — leaving contractors,
        owners, and facilities teams without a clear reference for how the
        system should operate.
      </p>
      <p>
        A+ Lighting LLC, a Michigan-based lighting distributor that does
        in-house photometric and controls design, built this tool to fill that
        gap. It encodes ASHRAE 90.1-2019 Section 9 requirements (interior and
        outdoor) and IES illumination recommendations into a guided flow that
        produces a proper deliverable in minutes.
      </p>

      <h2>What it covers</h2>
      <ul>
        <li>ASHRAE 90.1-2019 Table 9.6.1 interior space types</li>
        <li>Outdoor controls per §9.4.2 (parking, wall packs, canopies, grounds, signage, loading docks)</li>
        <li>IES illumination recommendations (horizontal fc, uniformity)</li>
        <li>Per-group overrides: code waivers with logged reason, beyond-code additions, designer choices for sensor and dimming</li>
        <li>Export-ready deliverable with disclaimer, ready to hand off</li>
      </ul>

      <h2>Premium tier (for A+ customers)</h2>
      <p>
        An invite-only premium tier adds manufacturer product mapping (Autani,
        SensorWorx, NX Controls, Lutron), saved projects, A+ branded exports,
        extended IES fields (vertical fc, UGR, cylindrical), and budget
        rollups. Premium is a customer benefit — not a paid subscription.
        Interested? <a href="https://apluslightingllc.com/contact">Contact A+ Lighting</a>.
      </p>

      <h2>Who maintains it</h2>
      <p>
        A+ Lighting LLC maintains the tool&rsquo;s code data, templates, and
        resource content. Updates happen as ASHRAE, IES, and product lines
        evolve.
      </p>

      <p className="text-xs text-muted-foreground">
        Design aid — not a compliance certification. See{" "}
        <a href="/legal">Legal &amp; Disclaimer</a> for full terms.
      </p>
    </div>
  );
}
