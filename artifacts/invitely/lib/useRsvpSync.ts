import { useEffect, useRef } from "react";

import { fetchEventRsvpsRemote } from "@/lib/sync";
import { useInviteStore } from "@/store/InviteStore";
import type { Event } from "@/store/types";

/**
 * Pulls RSVPs from the api-server for `event` and merges any web-submitted
 * ones into local state. Runs once on mount and again whenever the event id
 * or its publishToken changes. Silently no-ops when the event hasn't been
 * published (no token) or no public host is configured.
 */
export function useRsvpSync(event: Event | undefined): void {
  const { mergeRemoteRsvps } = useInviteStore();
  const inFlight = useRef<string | null>(null);

  useEffect(() => {
    if (!event?.id || !event.publishToken) return;
    if (inFlight.current === event.id) return;
    inFlight.current = event.id;

    let cancelled = false;
    (async () => {
      const since = event.lastRsvpSyncAt;
      const res = await fetchEventRsvpsRemote(event, since);
      if (cancelled || !res.rsvps.length) {
        inFlight.current = null;
        return;
      }
      const latest = res.rsvps.reduce(
        (acc, r) => (r.createdAt > acc ? r.createdAt : acc),
        since ?? "",
      );
      mergeRemoteRsvps(
        event.id,
        res.rsvps.map((r) => ({
          guestName: r.guestName,
          status: r.status,
          message: r.message,
          plusOne: r.plusOne,
          dietary: r.dietary,
          createdAt: r.createdAt,
          id: r.id,
        })),
        latest || undefined,
      );
      inFlight.current = null;
    })();
    return () => {
      cancelled = true;
      inFlight.current = null;
    };
  }, [event?.id, event?.publishToken, event?.lastRsvpSyncAt, mergeRemoteRsvps]);
}
