"use client";

import * as React from "react";
import { Popover } from "@base-ui/react/popover";
import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Small click-to-open "?" popover for inline help content. Keeps long
 * explanations out of the table flow while still giving a click-to-see
 * affordance per field. Built on base-ui's popover primitive.
 */
export function HelpPopover({
  children,
  label = "More info",
  className,
}: {
  /** Rich help content shown when the popover opens. */
  children: React.ReactNode;
  /** Accessible label for the trigger. */
  label?: string;
  className?: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <button
            type="button"
            aria-label={label}
            className={cn(
              "inline-flex items-center justify-center text-muted-foreground hover:text-jet focus-visible:text-jet focus-visible:outline-none transition-colors align-middle",
              className,
            )}
          >
            <HelpCircle className="size-3.5" />
          </button>
        }
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={6}>
          <Popover.Popup className="z-50 max-w-sm rounded-md border border-border bg-background p-3.5 text-xs leading-relaxed text-foreground shadow-lg outline-none">
            {children}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
