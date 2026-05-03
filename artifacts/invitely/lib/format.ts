export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "Date TBD";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return "Date TBD";
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

export function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = then - now;
  const abs = Math.abs(diff);
  const day = 86400000;
  if (abs < 60000) return diff < 0 ? "just now" : "in a moment";
  if (abs < 3600000) {
    const m = Math.round(abs / 60000);
    return diff < 0 ? `${m}m ago` : `in ${m}m`;
  }
  if (abs < day) {
    const h = Math.round(abs / 3600000);
    return diff < 0 ? `${h}h ago` : `in ${h}h`;
  }
  if (abs < day * 30) {
    const d = Math.round(abs / day);
    return diff < 0 ? `${d}d ago` : `in ${d}d`;
  }
  return new Date(iso).toLocaleDateString();
}

export function formatICS(opts: {
  title: string;
  description?: string;
  location?: string;
  startISO: string;
  endISO?: string;
}): string {
  const dt = (s: string) =>
    new Date(s).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end =
    opts.endISO ??
    new Date(new Date(opts.startISO).getTime() + 2 * 3600000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Invitely//EN",
    "BEGIN:VEVENT",
    `UID:${uid()}@invitely`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(opts.startISO)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${opts.title}`,
    opts.location ? `LOCATION:${opts.location}` : "",
    opts.description ? `DESCRIPTION:${opts.description.replace(/\n/g, "\\n")}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\n");
}

export function googleCalendarUrl(opts: {
  title: string;
  description?: string;
  location?: string;
  startISO: string;
  endISO?: string;
}): string {
  const fmt = (s: string) =>
    new Date(s).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end =
    opts.endISO ??
    new Date(new Date(opts.startISO).getTime() + 2 * 3600000).toISOString();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.startISO)}/${fmt(end)}`,
    details: opts.description ?? "",
    location: opts.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
