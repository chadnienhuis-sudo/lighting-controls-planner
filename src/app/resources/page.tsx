import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Resources",
  description:
    "Guides and references for lighting controls design — finding local codes, ASHRAE vs IECC, Dark Sky, BUG ratings, and more.",
};

const TOPICS: { title: string; body: string; comingSoon?: boolean }[] = [
  {
    title: "Finding your local exterior lighting code",
    body: "Search terms, municipal code lookups, DOE Building Energy Codes Program, state-by-state adoption references.",
    comingSoon: true,
  },
  {
    title: "Dark Sky and BUG ratings",
    body: "What BUG (Backlight/Uplight/Glare) ratings mean, how to read them, and where DarkSky International requirements apply.",
    comingSoon: true,
  },
  {
    title: "Lighting Zones LZ0–LZ4",
    body: "How to identify your project's lighting zone per ASHRAE 90.1 and IES LZ classifications.",
    comingSoon: true,
  },
  {
    title: "ASHRAE 90.1 vs IECC",
    body: "How the two standards relate, which your state has adopted, and what that means for your design.",
    comingSoon: true,
  },
  {
    title: "What is a Lighting Controls Narrative?",
    body: "Explains the output this tool generates — purpose, audience, typical sections, and how engineers and contractors use it.",
    comingSoon: true,
  },
  {
    title: "Daylight zone depth: when daylight-responsive controls apply",
    body: "How to calculate primary and secondary daylight zones, and when ASHRAE §9.4.1.4 controls are required.",
    comingSoon: true,
  },
  {
    title: "0-10V vs DALI vs wireless dimming",
    body: "A plain-English comparison of common dimming protocols — when each makes sense, trade-offs, and what controls manufacturers support.",
    comingSoon: true,
  },
];

export default function ResourcesPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Resources
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Guides and references for lighting controls design. For topics the
          tool doesn&rsquo;t encode directly — local codes, dark-sky rules, and
          design concepts — start here.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {TOPICS.map((t) => (
          <Card key={t.title} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">
                  {t.title}
                </CardTitle>
                {t.comingSoon && (
                  <Badge variant="secondary" className="shrink-0">
                    Soon
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t.body}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
