export function formatPrice(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRelativeTime(isoDate: string): string {
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  const diffSeconds = Math.round((target - now) / 1000);

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return formatter.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}
