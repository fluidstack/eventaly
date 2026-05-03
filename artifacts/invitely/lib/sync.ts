import type { Event, Rsvp } from "@/store/types";
import { getApiBase } from "@/lib/inviteLink";

export type RemoteRsvp = {
  id: string;
  guestName: string;
  status: Rsvp["status"];
  message?: string;
  plusOne: boolean;
  dietary?: string;
  source: string;
  createdAt: string;
};

function buildEventPayload(ev: Event, hostName: string) {
  return {
    publishToken: ev.publishToken,
    inviteToken: ev.inviteToken ?? null,
    title: ev.title,
    templateId: ev.templateId,
    heroPhotoUri: ev.heroPhotoUri ?? null,
    heroFilter: ev.heroFilter ?? null,
    customName: ev.customName ?? null,
    customTagline: ev.customTagline ?? null,
    customAccent: ev.customAccent ?? null,
    message: ev.message ?? "",
    startISO: ev.startISO,
    location: ev.location ?? "",
    privacy: ev.privacy,
    hostName: hostName ?? "",
    allowGuestUploads: !!ev.allowGuestUploads,
  };
}

/**
 * Push an event up to the api-server so its /e/:id landing page can render.
 * Silent no-op when no public host is configured (e.g. local-only dev),
 * so nothing in the UI breaks.
 */
export async function publishEventRemote(
  ev: Event,
  hostName: string,
): Promise<{ ok: boolean; error?: string }> {
  const base = getApiBase();
  if (!base || !ev.publishToken) return { ok: false, error: "no_host" };
  try {
    const res = await fetch(`${base}/events/${encodeURIComponent(ev.id)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Publish-Token": ev.publishToken,
      },
      body: JSON.stringify(buildEventPayload(ev, hostName)),
    });
    if (!res.ok) return { ok: false, error: `http_${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Fetch RSVPs that have arrived on the server since `since` (ISO timestamp).
 */
export async function fetchEventRsvpsRemote(
  ev: Pick<Event, "id" | "publishToken">,
  since?: string,
): Promise<{ rsvps: RemoteRsvp[]; error?: string }> {
  const base = getApiBase();
  if (!base || !ev.publishToken) return { rsvps: [] };
  const url = new URL(`${base}/events/${encodeURIComponent(ev.id)}/rsvps`);
  if (since) url.searchParams.set("since", since);
  try {
    const res = await fetch(url.toString(), {
      headers: { "X-Publish-Token": ev.publishToken },
    });
    if (!res.ok) return { rsvps: [], error: `http_${res.status}` };
    const data = (await res.json()) as { rsvps: RemoteRsvp[] };
    return { rsvps: Array.isArray(data.rsvps) ? data.rsvps : [] };
  } catch (e) {
    return { rsvps: [], error: (e as Error).message };
  }
}
