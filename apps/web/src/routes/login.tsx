import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { GoogleButton } from "@/components/party/google-button";
import { IpodTicket } from "@/components/party/ipod-ticket";
import { NightField } from "@/components/party/night-field";
import { SprayYearLockup } from "@/components/party/spray-year-lockup";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data) {
      throw redirect({ to: "/rsvp" });
    }
  },
});

function LoginPage() {
  const config = useQuery(trpc.event.getPublicConfig.queryOptions());

  return (
    <NightField density="quiet">
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center px-4 py-16 pt-24">
        <SprayYearLockup size="compact" className="mb-10" />
        <IpodTicket lcdKey="login">
          <p className="font-pixel text-[11px] tracking-widest text-magenta">LOCKED</p>
          <p className="mt-3 text-xl text-ink">Google only. That&apos;s how we know it&apos;s you.</p>
          <p className="mt-3 text-sm text-ink-2">Then you&apos;re on the list.</p>
          <div className="mt-6">
            <GoogleButton configured={config.data?.googleAuthConfigured ?? false} />
          </div>
        </IpodTicket>
      </div>
    </NightField>
  );
}
