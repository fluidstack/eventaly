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

export type PublicEvent = {
  id: string;
  title: string;
  templateId: string;
  heroPhotoUri: string | null;
  customName: string | null;
  customTagline: string | null;
  customAccent: string | null;
  message: string;
  startISO: string;
  location: string;
  privacy: "link" | "invite-only";
  hostName: string;
};

/**
 * Public read used by the deep-link guest screen when the event isn't in
 * local store (i.e., a guest tapped a link to an event they don't own).
 * Pass `inviteToken` for invite-only events.
 */
export async function fetchPublicEvent(
  id: string,
  inviteToken?: string,
): Promise<{ event?: PublicEvent; error?: "not_found" | "forbidden" | "network" }> {
  const base = getApiBase();
  if (!base) return { error: "network" };
  const url = new URL(`${base}/events/${encodeURIComponent(id)}`);
  if (inviteToken) url.searchParams.set("t", inviteToken);
  try {
    const res = await fetch(url.toString());
    if (res.status === 404) return { error: "not_found" };
    if (res.status === 403) return { error: "forbidden" };
    if (!res.ok) return { error: "network" };
    return { event: (await res.json()) as PublicEvent };
  } catch {
    return { error: "network" };
  }
}

/**
 * Submit a public RSVP from the in-app deep-link guest screen (mirrors what
 * the web landing page does).
 */
export async function submitPublicRsvp(
  id: string,
  payload: {
    guestName: string;
    status: "yes" | "no" | "maybe";
    message?: string;
    plusOne?: boolean;
    dietary?: string;
    inviteToken?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const base = getApiBase();
  if (!base) return { ok: false, error: "no_host" };
  const url = `${base}/events/${encodeURIComponent(id)}/rsvps`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: payload.guestName,
        status: payload.status,
        message: payload.message,
        plusOne: !!payload.plusOne,
        dietary: payload.dietary,
        inviteToken: payload.inviteToken || undefined,
      }),
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
