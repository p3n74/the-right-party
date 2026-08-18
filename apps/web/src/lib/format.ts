const MANILA = "Asia/Manila";

export function formatPhp(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(centavos / 100);
}

export function formatWhen(iso: string | null | undefined) {
  if (!iso) {
    return "TBA";
  }
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTime(iso: string | null | undefined) {
  if (!iso) {
    return "TBA";
  }
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) {
    return "TBA";
  }
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA,
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}
