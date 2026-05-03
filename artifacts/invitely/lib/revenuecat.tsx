// RevenueCat client wiring. See `.local/skills/revenuecat/SKILL.md`.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import React, { createContext, useContext, useMemo } from "react";
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
    opts?: { eventId?: string },
  ) => Promise<CustomerInfo | undefined>;
  restore: () => Promise<CustomerInfo | undefined>;
  refresh: () => Promise<void>;
};

const Context = createContext<SubscriptionContextValue | null>(null);

function useSubscriptionContext(): SubscriptionContextValue {
  const queryClient = useQueryClient();
  const available = Boolean(getRevenueCatApiKey());

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
    }: {
      pkg: PurchasesPackage;
      eventId?: string;
    }) => {
      // Persist event-id mapping on the RC subscriber profile BEFORE the
      // purchase so it's durably attached to this purchaser. The latest
      // purchased event id can then be recovered on a fresh install.
      if (eventId) {
        try {
          await Purchases.setAttributes({ [ATTR_EVENT_PRO_LAST_EVENT]: eventId });
        } catch {
          // ignore in mocked envs
        }
      }
      const result = await Purchases.purchasePackage(pkg);
      return result.customerInfo;
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
      purchase: (pkg, opts) => purchaseMutation.mutateAsync({ pkg, eventId: opts?.eventId }),
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

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
