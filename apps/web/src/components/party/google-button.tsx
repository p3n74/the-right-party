import { Button } from "@the-right-party/ui/components/button";

import { authClient } from "@/lib/auth-client";
import { frontendUrl } from "@/lib/api-url";

type GoogleButtonProps = {
  callbackURL?: string;
  configured: boolean;
};

export function GoogleButton({ callbackURL = "/rsvp", configured }: GoogleButtonProps) {
  if (!configured) {
    return (
      <p className="text-sm leading-relaxed text-ink-2">
        Google sign-in isn&apos;t live yet. Ping the host.
      </p>
    );
  }

  return (
    <Button
      type="button"
      className="h-11 min-h-11 w-full gap-2 whitespace-nowrap bg-qr-paper text-sm font-semibold text-google-ink hover:opacity-90 sm:gap-3"
      onClick={() => {
        void authClient.signIn.social({
          provider: "google",
          callbackURL: frontendUrl(callbackURL),
          errorCallbackURL: frontendUrl("/login"),
        });
      }}
    >
      <GoogleMark />
      Continue with Google
    </Button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.64-.23-2.43H12v4.6h6.46a5.52 5.52 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.93l-3.88-3c-1.08.73-2.47 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.55.38-2.27V6.63H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.63l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}
