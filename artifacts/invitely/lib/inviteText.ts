import { formatDateTime } from "@/lib/format";

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function buildInviteMessage(opts: {
  recipientFirstName?: string;
  hostName?: string;
  eventTitle: string;
  startISO?: string;
  message?: string;
  link: string;
}): string {
  const greeting = opts.recipientFirstName
    ? `Hi ${opts.recipientFirstName},`
    : "Hi!";
  const host = opts.hostName?.split(" ")[0] || "I";
  const when = opts.startISO ? ` — ${formatDateTime(opts.startISO)}` : "";
  const body = opts.message ? `\n\n${opts.message}` : "";
  return `${greeting} ${host} invited you to ${opts.eventTitle}${when}.${body}\n\nRSVP: ${opts.link}`;
}
