import type { ReactNode } from "react";
import { cn } from "@the-right-party/ui/lib/utils";

type IpodTicketProps = {
  children: ReactNode;
  tray?: ReactNode;
  lcdKey?: string;
  className?: string;
  wheelHint?: string;
};

export function IpodTicket({
  children,
  tray,
  lcdKey,
  className,
  wheelHint = "CLICK",
}: IpodTicketProps) {
  return (
    <div className={cn("ipod-shell", className)}>
      <div className="ipod-face">
        <div className="ipod-lcd">
          <div className="ipod-lcd-chrome">
            <span className="ipod-lcd-brand">ACQUAINTANCE AFTERPARTY</span>
            <span className="ipod-lcd-now">NOW</span>
          </div>
          <div className="lcd-crossfade ipod-lcd-body" key={lcdKey}>
            {children}
          </div>
        </div>
        {tray ? <div className="ipod-tray">{tray}</div> : null}
        <div className="ipod-wheel">
          <div className="ipod-wheel-hub" />
          <span className="ipod-wheel-label ipod-wheel-label--n">{wheelHint}</span>
          <span className="ipod-wheel-label ipod-wheel-label--s">MENU</span>
        </div>
      </div>
    </div>
  );
}
