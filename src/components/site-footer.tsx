import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3 text-sm">
          <div>
            <div className="font-semibold mb-2">Lighting Controls Planner</div>
            <p className="text-muted-foreground">
              A free tool from{" "}
              <a
                href="https://apluslightingllc.com"
                className="underline hover:no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                A+ Lighting Solutions, LLC
              </a>
              .
            </p>
          </div>
          <div>
            <div className="font-semibold mb-2">Tool</div>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <Link href="/planner/new" className="hover:text-foreground">
                  Start a Project
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-foreground">
                  Resources
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link href="/legal" className="hover:text-foreground">
                  Legal &amp; Disclaimer
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Disclaimer</div>
            <p className="text-muted-foreground">
              Design aid — not a compliance certification. Verify all outputs
              with your AHJ and licensed engineer.
            </p>
          </div>
        </div>
        <div className="mt-8 pt-4 border-t border-border text-xs text-muted-foreground flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} A+ Lighting Solutions, LLC. All rights reserved.</span>
          <span>Made in Michigan.</span>
        </div>
      </div>
    </footer>
  );
}
