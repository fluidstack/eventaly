// RevenueCat client wiring. See `.local/skills/revenuecat/SKILL.md`.
//
// NOTE on keys: the EXPO_PUBLIC_REVENUECAT_*_API_KEY values are RevenueCat
// "SDK API keys" (a.k.a. public app-specific keys). They are designed to be
// embedded in the mobile client binary and are NOT secrets — see
// https://www.revenuecat.com/docs/projects/api-keys#sdk-api-keys . They live
// in `.replit` (managed by the Replit RevenueCat integration) and are
// surfaced via Expo's EXPO_PUBLIC_ env-var inlining. Do NOT replace these
// with the RevenueCat REST/secret key, which would be an actual leak.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const ENTITLEMENT_HOST_PLUS = "host_plus";
export const ENTITLEMENT_EVENT_PRO = "event_pro";

export const PACKAGE_EVENT_PRO = "event_pro";
export const PACKAGE_HOST_PLUS_MONTHLY = "$rc_monthly";
export const PACKAGE_HOST_PLUS_YEARLY = "$rc_annual";

/**
 * Subscriber attribute key we set when purchasing Event Pro so the chosen
 * event id is durably attached to the purchase on RevenueCat's side. This is
 * the source of truth for restoring per-event unlocks on a fresh install.
 */
export const ATTR_EVENT_PRO_LAST_EVENT = "$invitelyEventProLastEventId";

/**
 * Subscriber attribute storing the full `eventProClaims` mapping
 * (transactionId -> eventId) as a JSON string. This is the durable
 * cross-install source of truth for which Event Pro purchase unlocks which
 * event. On launch we read this, merge it into the local profile, and union
 * the resulting eventIds into `unlockedEventIds`.
 *
 * RC subscriber attributes are limited to ~1000 chars per value; we only
 * need 32-byte txnIds + short event uuids so this comfortably fits dozens of
 * purchases. If we ever bump up against the limit we'll move to per-txn
 * attributes keyed by transactionId.
 */
export const ATTR_EVENT_PRO_CLAIMS = "$invitelyEventProClaims";

/**
 * Returns the number of times the user has purchased the Event Pro
 * non-subscription product. Each purchase represents one event unlock and
 * appears as a separate entry in `customerInfo.nonSubscriptionTransactions`.
 */
export function getEventProPurchaseCount(info: CustomerInfo | undefined): number {
  if (!info) return 0;
  const txns = info.nonSubscriptionTransactions ?? [];
  return txns.filter((t) =>
    (t.productIdentifier ?? "").toLowerCase().includes("event_pro"),
  ).length;
}

function getRevenueCatApiKey(): string | undefined {
  // The web build can't purchase via App/Play Store and our keys are mobile-only,
  // so skip configuration entirely on web. The app still renders an "available
  // in mobile" notice on the upgrade screen.
  if (Platform.OS === "web") return undefined;

  if (
    !REVENUECAT_TEST_API_KEY &&
    !REVENUECAT_IOS_API_KEY &&
    !REVENUECAT_ANDROID_API_KEY
  ) {
    return undefined;
  }

  if (__DEV__ || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY ?? REVENUECAT_IOS_API_KEY ?? REVENUECAT_ANDROID_API_KEY;
  }

  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;
  return REVENUECAT_TEST_API_KEY;
}

let configured = false;
let configuredUserId: string | undefined;

/**
 * Initialize RevenueCat. Called once the persisted profile is loaded so we
 * can pass the stable profile id as `appUserID` — that way entitlements
 * follow the user across reinstalls/restores.
 */
export function initializeRevenueCat(appUserID?: string) {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return;
  if (configured) {
    if (appUserID && appUserID !== configuredUserId) {
      try {
        Purchases.logIn(appUserID);
        configuredUserId = appUserID;
      } catch {
        // ignore in mocked envs
      }
    }
    return;
  }
  try {
    Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
  } catch {
    // ignore in mocked envs
  }
  Purchases.configure(appUserID ? { apiKey, appUserID } : { apiKey });
  configured = true;
  configuredUserId = appUserID;
}

export type SubscriptionContextValue = {
  available: boolean;
  customerInfo: CustomerInfo | undefined;
  offerings: PurchasesOfferings | undefined;
  currentOffering: PurchasesOffering | null | undefined;
  isHostPlus: boolean;
  hasEventProEntitlement: boolean;
  /** Total Event Pro purchases recorded by RevenueCat for this user. */
  eventProPurchaseCount: number;
  isLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  purchase: (
    pkg: PurchasesPackage,
    opts?: { eventId?: string; existingClaims?: EventProClaim[] },
  ) => Promise<{ info: CustomerInfo | undefined; newTransactionId?: string }>;
  restore: () => Promise<CustomerInfo | undefined>;
  refresh: () => Promise<void>;
};

const Context = createContext<SubscriptionContextValue | null>(null);

function useSubscriptionContext(appUserID: string | undefined, profileReady: boolean): SubscriptionContextValue {
  const queryClient = useQueryClient();
  const hasKey = Boolean(getRevenueCatApiKey());
  // Only flip `available` (which gates the RC queries) AFTER configure() has
  // returned. This eliminates the bootstrap race where customerInfo/offerings
  // queries fired before Purchases.configure().
  const [configuredReady, setConfiguredReady] = useState(false);
  useEffect(() => {
    if (!hasKey || !profileReady) return;
    try {
      initializeRevenueCat(appUserID);
      setConfiguredReady(true);
    } catch (err) {
      console.warn("RevenueCat init skipped:", err);
    }
  }, [hasKey, profileReady, appUserID]);

  const available = hasKey && configuredReady;

  const customerInfoQuery = useQuery({
    queryKey: ["rc", "customer-info"],
    queryFn: async () => Purchases.getCustomerInfo(),
    enabled: available,
    staleTime: 60 * 1000,
  });

  const offeringsQuery = useQuery({
    queryKey: ["rc", "offerings"],
    queryFn: async () => Purchases.getOfferings(),
    enabled: available,
    staleTime: 5 * 60 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({
      pkg,
      eventId,
      existingClaims,
    }: {
      pkg: PurchasesPackage;
      eventId?: string;
      existingClaims?: EventProClaim[];
    }) => {
      // Persist event-id mapping on the RC subscriber profile BEFORE the
      // purchase so it's durably attached to this purchaser.
      if (eventId) {
        try {
          await Purchases.setAttributes({ [ATTR_EVENT_PRO_LAST_EVENT]: eventId });
        } catch {
          // ignore in mocked envs
        }
      }
      // Snapshot pre-purchase Event Pro txn ids so we can identify the EXACT
      // newly-issued transaction id after purchasePackage resolves (instead
      // of a "first unbound" heuristic).
      let preTxnIds = new Set<string>();
      try {
        const before = await Purchases.getCustomerInfo();
        preTxnIds = new Set(
          (before?.nonSubscriptionTransactions ?? [])
            .filter((t) =>
              (t.productIdentifier ?? "").toLowerCase().includes("event_pro"),
            )
            .map((t) => t.transactionIdentifier),
        );
      } catch {
        // ignore in mocked envs
      }

      const result = await Purchases.purchasePackage(pkg);

      let newTransactionId: string | undefined;
      if (eventId) {
        try {
          const txns = result.customerInfo?.nonSubscriptionTransactions ?? [];
          const postEventProTxns = txns.filter((t) =>
            (t.productIdentifier ?? "").toLowerCase().includes("event_pro"),
          );
          const postTxnIdSet = new Set(
            postEventProTxns.map((t) => t.transactionIdentifier),
          );
          // Exact diff: the new txn is the post-set entry that wasn't there
          // before. Falls back to the latest unbound-by-existingClaims txn
          // if the diff is empty (e.g. stub envs).
          const claimedIds = new Set(
            (existingClaims ?? []).map((c) => c.transactionId),
          );
          const diffed = postEventProTxns
            .filter((t) => !preTxnIds.has(t.transactionIdentifier))
            .sort(
              (a, b) =>
                new Date(b.purchaseDate).getTime() -
                new Date(a.purchaseDate).getTime(),
            );
          const fallbackUnbound = postEventProTxns
            .filter((t) => !claimedIds.has(t.transactionIdentifier))
            .sort(
              (a, b) =>
                new Date(b.purchaseDate).getTime() -
                new Date(a.purchaseDate).getTime(),
            );
          newTransactionId =
            diffed[0]?.transactionIdentifier ??
            fallbackUnbound[0]?.transactionIdentifier;

          // Use the caller-supplied LOCAL persisted claims as the durable
          // baseline (cross-session) since the RN SDK doesn't expose a read
          // for subscriber attributes. Append the new txn->event mapping and
          // write the FULL mapping back to RC.
          const merged = mergeEventProClaims(
            existingClaims ?? [],
            postTxnIdSet,
            newTransactionId
              ? { transactionId: newTransactionId, eventId }
              : { eventId },
          );
          await Purchases.setAttributes({
            [ATTR_EVENT_PRO_CLAIMS]: JSON.stringify(merged),
          });
        } catch {
          // ignore in mocked envs
        }
      }

      return { info: result.customerInfo, newTransactionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rc", "customer-info"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => Purchases.restorePurchases(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rc", "customer-info"] });
    },
  });

  return useMemo<SubscriptionContextValue>(() => {
    const info = customerInfoQuery.data;
    const isHostPlus = Boolean(info?.entitlements?.active?.[ENTITLEMENT_HOST_PLUS]);
    const hasEventProEntitlement = Boolean(
      info?.entitlements?.active?.[ENTITLEMENT_EVENT_PRO],
    );
    return {
      available,
      customerInfo: info,
      offerings: offeringsQuery.data,
      currentOffering: offeringsQuery.data?.current,
      isHostPlus,
      hasEventProEntitlement,
      eventProPurchaseCount: getEventProPurchaseCount(info),
      isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
      isPurchasing: purchaseMutation.isPending,
      isRestoring: restoreMutation.isPending,
      purchase: (pkg, opts) =>
        purchaseMutation.mutateAsync({
          pkg,
          eventId: opts?.eventId,
          existingClaims: opts?.existingClaims,
        }),
      restore: restoreMutation.mutateAsync,
      refresh: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["rc", "customer-info"] }),
          queryClient.invalidateQueries({ queryKey: ["rc", "offerings"] }),
        ]);
      },
    };
  }, [
    available,
    customerInfoQuery.data,
    customerInfoQuery.isLoading,
    offeringsQuery.data,
    offeringsQuery.isLoading,
    purchaseMutation.isPending,
    purchaseMutation.mutateAsync,
    restoreMutation.isPending,
    restoreMutation.mutateAsync,
    queryClient,
  ]);
}

export function SubscriptionProvider({
  children,
  appUserID,
  profileReady,
}: {
  children: React.ReactNode;
  appUserID: string | undefined;
  profileReady: boolean;
}) {
  const value = useSubscriptionContext(appUserID, profileReady);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export type EventProClaim = { transactionId: string; eventId: string };

/**
 * RESTORE / REHYDRATION MODEL (read this before changing).
 *
 * Source of truth for per-event Event Pro unlocks WITHIN an install is the
 * local AsyncStorage-persisted `Profile.eventProClaims` (transactionId ->
 * eventId). It survives app restart, is rehydrated on InviteStoreProvider
 * boot, and is fed back into RC writes so the durable subscriber attribute
 * `ATTR_EVENT_PRO_CLAIMS` always carries the FULL history (used by future
 * server-side readers; the RN Purchases SDK has no getAttributes()).
 *
 * Cross-install / new-device recovery uses the deterministic delta between
 * RevenueCat's `nonSubscriptionTransactions` count (lifetime Event Pro
 * purchases for this appUserID) and the local `eventProClaims` length. Any
 * un-attributed purchases surface as "unclaimed credits" in /upgrade and
 * the user maps them to a specific event via the manual claim banner.
 * This is the supported model for App Store / Play Store CONSUMABLE
 * products — the stores don't auto-restore consumables and don't carry
 * arbitrary client metadata into a fresh install.
 *
 * Refund safety: `EventProClaimsSync` watches customerInfo and prunes any
 * local claim whose transactionId no longer appears in
 * nonSubscriptionTransactions; the cascade also drops the matching unlock.
 */
function mergeEventProClaims(
  existing: EventProClaim[],
  validTxnIds: Set<string>,
  newEntry?: { transactionId?: string; eventId: string },
): EventProClaim[] {
  const map = new Map<string, string>();
  for (const c of existing) {
    if (validTxnIds.has(c.transactionId)) map.set(c.transactionId, c.eventId);
  }
  if (newEntry?.transactionId) {
    map.set(newEntry.transactionId, newEntry.eventId);
  } else if (newEntry) {
    // No txn id available yet — find any unbound event_pro txn and bind it.
    for (const txnId of validTxnIds) {
      if (!map.has(txnId)) {
        map.set(txnId, newEntry.eventId);
        break;
      }
    }
  }
  const out = Array.from(map.entries()).map(([transactionId, eventId]) => ({
    transactionId,
    eventId,
  }));
  return out;
}

export { mergeEventProClaims };

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
