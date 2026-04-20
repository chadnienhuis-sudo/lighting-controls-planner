import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-20 md:py-28 text-center">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
            A free tool from A+ Lighting
          </div>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto">
            Build ASHRAE-compliant lighting controls,{" "}
            <span className="text-primary">room by room</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Enter your spaces, group them by function, and export a complete
            controls narrative. ASHRAE 90.1-2019 interior + outdoor coverage.
            IES illumination recommendations built in.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/planner/new" className={buttonVariants({ size: "lg" })}>
              Start a Project
            </Link>
            <Link
              href="/resources"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Explore Resources
            </Link>
          </div>
          <div className="mt-8 text-xs text-muted-foreground max-w-md mx-auto">
            Design aid — not a compliance certification. Verify outputs with
            your AHJ and licensed engineer.
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Room-by-room design</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Enter your spaces or start from a building template. The tool
              groups rooms by function — every group gets a plain-English
              narrative, code requirements, and IES illumination targets.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ASHRAE 90.1 + IES</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Full Table 9.6.1 coverage of interior space types, plus
              project-level outdoor controls for parking, wall packs, canopies,
              and grounds. IES RP-1, RP-3, and RP-28 illumination targets
              included.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Export a real deliverable</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Generate a complete controls doc — basis of design, system
              architecture, functional group sequences, room schedule,
              commissioning notes, and glossary — ready to hand to your
              contractor.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">
            How it works
          </h2>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            <HowStep
              n={1}
              title="Enter your rooms"
              body="Start blank or pick a building template (Warehouse, Office, School, Retail, Light Industrial). Add each space with room number, name, size, and ASHRAE space type."
            />
            <HowStep
              n={2}
              title="Refine functional groups"
              body="The tool groups rooms with the same behavior. Split by daylight zone, plug load, or occupancy strategy. Waive a code requirement with a logged reason, add beyond-code features, or pick sensor/dimming types."
            />
            <HowStep
              n={3}
              title="Export the deliverable"
              body="Generate a complete controls narrative PDF you can hand to your contractor or owner. Free, no account needed. Premium tier for A+ Lighting customers adds manufacturer product mapping and saved projects."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-semibold">
          Ready to plan your controls?
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Free to use. No account required. Built by the lighting specialists
          at A+ Lighting.
        </p>
        <div className="mt-8">
          <Link href="/planner/new" className={buttonVariants({ size: "lg" })}>
            Start a Project
          </Link>
        </div>
      </section>
    </>
  );
}

function HowStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div>
      <div className="text-4xl font-semibold text-primary mb-2">{n}</div>
      <div className="font-semibold mb-2">{title}</div>
      <div className="text-sm text-muted-foreground leading-relaxed">{body}</div>
    </div>
  );
}
