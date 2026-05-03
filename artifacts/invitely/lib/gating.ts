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
  const { isHostPlus, hasEventProEntitlement } = useSubscription();
  const unlockedEventIds = state.profile.unlockedEventIds ?? [];

  return useMemo<PlanState>(() => {
    const isEventUnlocked = (eventId: string) =>
      isHostPlus || unlockedEventIds.includes(eventId);

    const hasUnclaimedEventPro =
      hasEventProEntitlement && !isHostPlus && unlockedEventIds.length === 0;

    const eventCount = state.events.length;
    const remainingFreeEvents = isHostPlus
      ? Number.POSITIVE_INFINITY
      : Math.max(0, FREE_LIMITS.events - eventCount);
    const canCreateEvent = isHostPlus || eventCount < FREE_LIMITS.events;

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
    hasEventProEntitlement,
    unlockedEventIds,
    state.events.length,
  ]);
}
