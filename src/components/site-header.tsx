import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-semibold text-base md:text-lg">
            Lighting Controls Planner
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            from A+ Lighting
          </span>
        </Link>
        <nav className="flex items-center gap-4 md:gap-6">
          <Link
            href="/resources"
            className="hidden sm:inline text-sm text-foreground/80 hover:text-foreground transition-colors"
          >
            Resources
          </Link>
          <Link
            href="/about"
            className="hidden sm:inline text-sm text-foreground/80 hover:text-foreground transition-colors"
          >
            About
          </Link>
          <Link href="/planner/new" className={buttonVariants({ size: "sm" })}>
            Start a Project
          </Link>
        </nav>
      </div>
    </header>
  );
}
