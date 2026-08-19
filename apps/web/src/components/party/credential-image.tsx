import { useEffect, useState } from "react";

import { apiUrl } from "@/lib/api-url";

export function CredentialImage({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    void fetch(apiUrl(path), { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Image failed");
        }
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setSrc(objectUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(null);
        }
      });
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [path]);

  if (!src) {
    return <div className={className ?? "aspect-square bg-qr-paper"} />;
  }

  return <img src={src} alt={alt} className={className} />;
}
