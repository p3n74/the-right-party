import { createFileRoute } from "@tanstack/react-router";

import { GoingGate, GoingRoll, useGoingList } from "@/components/party/going-roll";
import { NightField } from "@/components/party/night-field";
import { SprayYearLockup } from "@/components/party/spray-year-lockup";

export const Route = createFileRoute("/going")({
  component: GoingPage,
  head: () => ({
    meta: [
      {
        title: "Who's going · Acquaintance Afterparty",
      },
    ],
  }),
});

function GoingPage() {
  const { session, going } = useGoingList();

  return (
    <NightField density="quiet">
      <div className="mx-auto min-h-[100dvh] max-w-5xl px-4 pt-24 pb-16">
        <SprayYearLockup size="compact" className="mb-10" />
        {session ? (
          <GoingRoll
            titleAs="h1"
            layout="wall"
            data={going.data}
            loading={going.isLoading}
            error={going.isError}
          />
        ) : (
          <GoingGate />
        )}
      </div>
    </NightField>
  );
}
