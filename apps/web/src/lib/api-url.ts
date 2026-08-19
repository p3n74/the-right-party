import { env } from "@the-right-party/env/web";

export function serverUrl() {
  return env.VITE_SERVER_URL.replace(/\/$/, "");
}

export function frontendUrl(path: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined") {
    return new URL(suffix, window.location.origin).toString();
  }
  return suffix;
}

export function apiUrl(path: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${serverUrl()}${suffix}`;
}
