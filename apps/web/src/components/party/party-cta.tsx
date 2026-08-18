import { Button } from "@the-right-party/ui/components/button";
import { cn } from "@the-right-party/ui/lib/utils";
import type { ComponentProps } from "react";

type PartyCtaProps = ComponentProps<typeof Button> & {
  mark?: boolean;
};

export function PartyCta({ className, mark = false, children, ...props }: PartyCtaProps) {
  return (
    <Button className={cn("party-cta bg-magenta-action text-on-magenta hover:bg-magenta-action", className)} {...props}>
      {children}
      {mark ? (
        <span className="party-cta-mark" aria-hidden>
          →
        </span>
      ) : null}
    </Button>
  );
}
