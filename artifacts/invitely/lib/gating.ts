import { useMemo } from "react";

import { useSubscription } from "@/lib/revenuecat";
import { useInviteStore } from "@/store/InviteStore";

export const FREE_LIMITS = {
  events: 1,
  guestsPerEvent: 25,
};

export type PlanState = {
  isHostPlus: boolean;
  /**
   * True when an `event_pro` entitlement is active in RevenueCat but the user
   * has not yet attached it to a specific event id locally. The user can
   * "claim" the unlock from the upgrade screen for any locked event. This is
   * the deterministic mapping path for restored purchases on a fresh install.
   */
  hasUnclaimedEventPro: boolean;
  unlockedEventIds: string[];
  /**
   * Per-event unlock check. Strictly: Host Plus OR a local unlock for THIS
   * event id. The bare `event_pro` entitlement is intentionally NOT a global
   * unlock — it must be claimed for a specific event first.
   */
  isEventUnlocked: (eventId: string) => boolean;
  remainingFreeEvents: number;
  canCreateEvent: boolean;
  remainingGuests: (currentCount: number) => number;
  canAddGuest: (eventId: string, currentCount: number) => boolean;
};

export function usePlan(): PlanState {
  const { state } = useInviteStore();
  const { isHostPlus, eventProPurchaseCount } = useSubscription();
  const unlockedEventIds = state.profile.unlockedEventIds ?? [];

  return useMemo<PlanState>(() => {
    const isEventUnlocked = (eventId: string) =>
      isHostPlus || unlockedEventIds.includes(eventId);

    // Each Event Pro purchase = exactly one event unlock. Compare lifetime
    // purchase count against locally claimed unlocks; remaining = unclaimed.
    const unclaimedCount = Math.max(
      0,
      eventProPurchaseCount - unlockedEventIds.length,
    );
    const hasUnclaimedEventPro = !isHostPlus && unclaimedCount > 0;

    // Free tier caps "active" events — past events don't count against quota.
    const now = Date.now();
    const activeEventCount = state.events.filter(
      (e) => new Date(e.startISO).getTime() >= now,
    ).length;
    const remainingFreeEvents = isHostPlus
      ? Number.POSITIVE_INFINITY
      : Math.max(0, FREE_LIMITS.events - activeEventCount);
    const canCreateEvent = isHostPlus || activeEventCount < FREE_LIMITS.events;

    const remainingGuests = (currentCount: number) => {
      if (isHostPlus) return Number.POSITIVE_INFINITY;
      return Math.max(0, FREE_LIMITS.guestsPerEvent - currentCount);
    };

    const canAddGuest = (eventId: string, currentCount: number) => {
      if (isEventUnlocked(eventId)) return true;
      return currentCount < FREE_LIMITS.guestsPerEvent;
    };

    return {
      isHostPlus,
      hasUnclaimedEventPro,
      unlockedEventIds,
      isEventUnlocked,
      remainingFreeEvents,
      canCreateEvent,
      remainingGuests,
      canAddGuest,
    };
  }, [
    isHostPlus,
    eventProPurchaseCount,
    unlockedEventIds,
    state.events,
  ]);
}
