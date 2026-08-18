import { env } from "@the-right-party/env/web";

export function serverUrl() {
  return env.VITE_SERVER_URL.replace(/\/$/, "");
}

export function apiUrl(path: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${serverUrl()}${suffix}`;
}
