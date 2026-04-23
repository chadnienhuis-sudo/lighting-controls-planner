import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { NavAuth } from "@/components/auth/nav-auth";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logos/aplus-logo.svg"
            alt="A+ Lighting"
            width={110}
            height={28}
            priority
            className="h-7 w-auto"
          />
          <span className="hidden md:inline text-sm text-aplus-grey border-l border-border pl-3">
            Lighting Controls Planner
          </span>
        </Link>
        <nav className="flex items-center gap-4 md:gap-6">
          <Link
            href="/resources"
            className="hidden sm:inline text-sm text-jet/80 hover:text-jet transition-colors"
          >
            Resources
          </Link>
          <Link
            href="/about"
            className="hidden sm:inline text-sm text-jet/80 hover:text-jet transition-colors"
          >
            About
          </Link>
          <Link href="/planner/new" className={buttonVariants({ size: "sm" })}>
            Start a Project
          </Link>
          <NavAuth />
        </nav>
      </div>
    </header>
  );
}
