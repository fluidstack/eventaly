import { useMemo } from "react";

import { useSubscription } from "@/lib/revenuecat";
import { useInviteStore } from "@/store/InviteStore";

export const FREE_LIMITS = {
  events: 1,
  guestsPerEvent: 25,
};

export type PlanState = {
  isHostPlus: boolean;
  unlockedEventIds: string[];
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
    // host_plus is configured to also grant the event_pro entitlement.
    // Either the explicit entitlement or a locally-recorded unlock is fine.
    const isEventUnlocked = (eventId: string) =>
      isHostPlus ||
      hasEventProEntitlement ||
      unlockedEventIds.includes(eventId);

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
      if (isHostPlus || unlockedEventIds.includes(eventId)) return true;
      return currentCount < FREE_LIMITS.guestsPerEvent;
    };

    return {
      isHostPlus,
      unlockedEventIds,
      isEventUnlocked,
      remainingFreeEvents,
      canCreateEvent,
      remainingGuests,
      canAddGuest,
    };
  }, [isHostPlus, hasEventProEntitlement, unlockedEventIds, state.events.length]);
}
