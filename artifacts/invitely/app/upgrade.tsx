import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";

import { Body, Button, Card, H1, H2, Label, Pill } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import {
  PACKAGE_EVENT_PRO,
  PACKAGE_HOST_PLUS_MONTHLY,
  PACKAGE_HOST_PLUS_YEARLY,
  useSubscription,
} from "@/lib/revenuecat";
import { useInviteStore } from "@/store/InviteStore";

type PlanKey = "event_pro" | "host_plus_monthly" | "host_plus_yearly";

const PLAN_META: Record<
  PlanKey,
  { title: string; subtitle: string; tag?: string; packageId: string; entitlement: "event_pro" | "host_plus" }
> = {
  event_pro: {
    title: "Event Pro",
    subtitle: "Unlock one event end-to-end. No subscription.",
    packageId: PACKAGE_EVENT_PRO,
    entitlement: "event_pro",
  },
  host_plus_monthly: {
    title: "Host Plus · Monthly",
    subtitle: "Unlimited events, every premium feature.",
    packageId: PACKAGE_HOST_PLUS_MONTHLY,
    entitlement: "host_plus",
  },
  host_plus_yearly: {
    title: "Host Plus · Yearly",
    subtitle: "Best value — two months free.",
    tag: "Best value",
    packageId: PACKAGE_HOST_PLUS_YEARLY,
    entitlement: "host_plus",
  },
};

function notifyError(message: string) {
  if (Platform.OS === "web") {
    window.alert(message);
    return;
  }
  Alert.alert("Purchase failed", message);
}

export default function UpgradeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const {
    available,
    currentOffering,
    isHostPlus,
    eventProPurchaseCount,
    isLoading,
    isRestoring,
    purchase,
    restore,
  } = useSubscription();
  const { unlockEvent, state } = useInviteStore();
  const { customerInfo } = useSubscription();

  /**
   * Returns the next unclaimed Event Pro transaction id (latest first), or
   * undefined if there isn't one. Each Event Pro purchase shows up as one
   * non-subscription transaction; we exclude any already bound to a local
   * unlock so the consumable model stays 1 purchase = 1 event.
   */
  const pickUnclaimedTransactionId = (): string | undefined => {
    const txns = customerInfo?.nonSubscriptionTransactions ?? [];
    const claimedIds = new Set(
      (state.profile.eventProClaims ?? []).map((c) => c.transactionId),
    );
    const candidates = txns
      .filter(
        (t) =>
          (t.productIdentifier ?? "").toLowerCase().includes("event_pro") &&
          !claimedIds.has(t.transactionIdentifier),
      )
      .sort(
        (a, b) =>
          new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime(),
      );
    return candidates[0]?.transactionIdentifier;
  };
  const event = eventId ? state.events.find((e) => e.id === eventId) : undefined;
  const unlockedEventIds = state.profile.unlockedEventIds ?? [];
  const eventLocallyUnlocked = eventId ? unlockedEventIds.includes(eventId) : false;
  // Lifetime Event Pro purchases minus how many have been claimed locally.
  const unclaimedCount = Math.max(0, eventProPurchaseCount - unlockedEventIds.length);
  const canClaimForEvent =
    !!eventId && !eventLocallyUnlocked && !isHostPlus && unclaimedCount > 0;

  const [pendingKey, setPendingKey] = useState<PlanKey | null>(null);
  const isPending = (k: PlanKey) => (pendingKey as string | null) === k;

  const packagesByKey = useMemo<Partial<Record<PlanKey, PurchasesPackage>>>(() => {
    const result: Partial<Record<PlanKey, PurchasesPackage>> = {};
    if (!currentOffering) return result;
    for (const pkg of currentOffering.availablePackages) {
      if (pkg.identifier === PACKAGE_EVENT_PRO) result.event_pro = pkg;
      else if (pkg.identifier === PACKAGE_HOST_PLUS_MONTHLY) result.host_plus_monthly = pkg;
      else if (pkg.identifier === PACKAGE_HOST_PLUS_YEARLY) result.host_plus_yearly = pkg;
    }
    return result;
  }, [currentOffering]);

  const priceFor = (key: PlanKey): string | undefined => {
    // Live pricing only — no hardcoded fallbacks. Returns undefined if the
    // store hasn't loaded the package yet so callers can render a placeholder.
    return packagesByKey[key]?.product?.priceString;
  };

  useEffect(() => {
    if (isHostPlus && eventId) router.back();
  }, [isHostPlus, eventId, router]);

  const handleBuy = async (key: PlanKey) => {
    const pkg = packagesByKey[key];
    if (!pkg) {
      notifyError(
        "This plan isn't available right now. Restart the app or check your store account.",
      );
      return;
    }
    setPendingKey(key);
    try {
      const { info, newTransactionId } = await purchase(pkg, {
        eventId: eventId ?? undefined,
        existingClaims: state.profile.eventProClaims ?? [],
      });
      const meta = PLAN_META[key];
      const grantedHostPlus = Boolean(info?.entitlements?.active?.host_plus);
      // Event Pro is a CONSUMABLE product (per task spec: "$12 consumable
      // per-event"). Consumables do NOT light up an active entitlement —
      // they show up purely as a new entry in nonSubscriptionTransactions.
      // So we must unlock based on the transaction-delta signal
      // (newTransactionId returned by purchase()), not on
      // info.entitlements.active.event_pro.
      const grantedEventPro =
        meta.entitlement === "event_pro" && Boolean(newTransactionId);
      if (meta.entitlement === "event_pro" && grantedEventPro && eventId) {
        unlockEvent(eventId, newTransactionId);
      }
      if (grantedHostPlus || grantedEventPro) {
        if (Platform.OS !== "web") {
          Alert.alert("You're in", "Premium features are unlocked.");
        }
        router.back();
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "userCancelled" in err && (err as { userCancelled?: boolean }).userCancelled
          ? null
          : err instanceof Error
            ? err.message
            : "Something went wrong with the purchase.";
      if (message) notifyError(message);
    } finally {
      setPendingKey(null);
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      if (Platform.OS !== "web") {
        Alert.alert("Restored", "We refreshed your purchases from the store.");
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Restore failed");
    }
  };

  // Buy is disabled if Host Plus already covers everything, no live package,
  // or the user has an unclaimed Event Pro waiting to be applied (they should
  // claim it instead of double-paying).
  const hasLivePackage = (key: PlanKey) => Boolean(packagesByKey[key]);
  const eventProDisabled =
    !available || isHostPlus || (unclaimedCount > 0 && !canClaimForEvent);
  const hostPlusDisabled = !available || isHostPlus;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}
    >
      <View style={{ gap: 6, paddingTop: 4 }}>
        <Label>Invitely Premium</Label>
        <H1>Make this one unforgettable</H1>
        <Body muted>
          {event
            ? `Unlock the full experience for "${event.title}" or every event you ever host.`
            : "Pick a plan that matches how often you gather."}
        </Body>
      </View>

      {!available && (
        <Card>
          <View style={{ gap: 6 }}>
            <Body>
              {Platform.OS === "web"
                ? "Premium upgrades are available in the Invitely mobile app — open it on iOS or Android to subscribe."
                : "In-app purchases aren't configured in this build. Add your RevenueCat keys to enable upgrades."}
            </Body>
            {Platform.OS === "web" && (
              <Body muted>
                The web preview lets you set up events; purchases happen
                through your App Store or Google Play account.
              </Body>
            )}
          </View>
        </Card>
      )}

      {isHostPlus && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Feather name="check-circle" size={20} color={colors.primary} />
            <Body>You're on Host Plus — every feature is unlocked.</Body>
          </View>
        </Card>
      )}

      {event && canClaimForEvent && (
        <Card>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Feather name="gift" size={18} color={colors.primary} />
              <Body>
                Apply one of your {unclaimedCount} unused Event Pro unlock
                {unclaimedCount === 1 ? "" : "s"} to "{event.title}".
              </Body>
            </View>
            <Button
              label="Apply unlock"
              icon="unlock"
              onPress={() => {
                unlockEvent(event.id, pickUnclaimedTransactionId());
                router.back();
              }}
            />
          </View>
        </Card>
      )}

      <PlanCard
        colors={colors}
        tone="event"
        title={PLAN_META.event_pro.title}
        price={priceFor("event_pro")}
        subtitle={
          event
            ? `Unlock everything for "${event.title}" — slider, full guest list, photo gallery, custom templates.`
            : "Unlock one event end-to-end. Open an event and tap Upgrade to apply the unlock."
        }
        features={[
          "Unlimited guests",
          "Photo gallery + slider",
          "Custom templates & filters",
          "CSV export",
        ]}
        ctaLabel={
          !hasLivePackage("event_pro")
            ? "Loading…"
            : eventLocallyUnlocked
              ? "Already unlocked"
              : isHostPlus
                ? "Included with Host Plus"
                : canClaimForEvent
                  ? "Use existing unlock"
                  : !event
                    ? "Open an event to unlock"
                    : "Unlock this event"
        }
        tag="One-time"
        disabled={
          eventProDisabled ||
          eventLocallyUnlocked ||
          (!event && !canClaimForEvent) ||
          !hasLivePackage("event_pro")
        }
        loading={isPending("event_pro")}
        onPress={() => {
          if (canClaimForEvent && event) {
            unlockEvent(event.id, pickUnclaimedTransactionId());
            router.back();
            return;
          }
          if (!event) {
            router.replace("/(tabs)");
            return;
          }
          handleBuy("event_pro");
        }}
      />


      <View style={{ gap: 6, marginTop: 8 }}>
        <H2>Host Plus</H2>
        <Body muted>Run as many gatherings as you want, with everything unlocked.</Body>
      </View>

      <PlanCard
        colors={colors}
        tone="primary"
        title={PLAN_META.host_plus_yearly.title}
        price={priceFor("host_plus_yearly")}
        subtitle="Two months free vs. monthly. Cancel anytime."
        features={[
          "Unlimited events & guests",
          "All premium templates",
          "Photo slider, gallery, CSV export",
          "Priority reminders",
        ]}
        tag="Best value"
        ctaLabel={
          !hasLivePackage("host_plus_yearly")
            ? "Loading…"
            : isHostPlus
              ? "Current plan"
              : "Go yearly"
        }
        disabled={hostPlusDisabled || !hasLivePackage("host_plus_yearly")}
        loading={isPending("host_plus_yearly")}
        onPress={() => handleBuy("host_plus_yearly")}
      />

      <PlanCard
        colors={colors}
        tone="muted"
        title={PLAN_META.host_plus_monthly.title}
        price={priceFor("host_plus_monthly")}
        subtitle="Flexible monthly billing."
        features={["Unlimited events & guests", "All premium features"]}
        ctaLabel={
          !hasLivePackage("host_plus_monthly")
            ? "Loading…"
            : isHostPlus
              ? "Current plan"
              : "Go monthly"
        }
        disabled={hostPlusDisabled || !hasLivePackage("host_plus_monthly")}
        loading={isPending("host_plus_monthly")}
        onPress={() => handleBuy("host_plus_monthly")}
      />

      <Card>
        <View style={{ gap: 8 }}>
          <Label>Legal</Label>
          <Body muted>
            Subscriptions auto-renew until cancelled in your App Store / Play
            Store account. By purchasing you agree to our Terms of Service and
            Privacy Policy.
          </Body>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Pressable
              onPress={() =>
                Linking.openURL("https://invitely.app/terms").catch(() => {})
              }
            >
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                }}
              >
                Terms of Service
              </Text>
            </Pressable>
            <Pressable
              onPress={() =>
                Linking.openURL("https://invitely.app/privacy").catch(() => {})
              }
            >
              <Text
                style={{
                  color: colors.primary,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                }}
              >
                Privacy Policy
              </Text>
            </Pressable>
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ gap: 10 }}>
          <Label>Free plan includes</Label>
          <FeatureRow text="1 active event" />
          <FeatureRow text="Up to 25 guests" />
          <FeatureRow text="Core templates & RSVP collection" />
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          label="Restore purchases"
          variant="ghost"
          icon="refresh-cw"
          onPress={handleRestore}
          loading={isRestoring}
          disabled={!available}
        />
        <Button
          label="Maybe later"
          variant="ghost"
          onPress={() => router.back()}
          style={{ flex: 1 }}
        />
      </View>

      {isLoading && (
        <Body muted style={{ textAlign: "center" }}>
          Loading the latest pricing…
        </Body>
      )}
    </ScrollView>
  );
}

function PlanCard({
  colors,
  title,
  price,
  subtitle,
  features,
  ctaLabel,
  tag,
  disabled,
  loading,
  onPress,
  tone,
}: {
  colors: ReturnType<typeof useColors>;
  title: string;
  /** Live store price string, or undefined while pricing is loading. */
  price: string | undefined;
  subtitle: string;
  features: string[];
  ctaLabel: string;
  tag?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  tone: "primary" | "muted" | "event";
}) {
  const accent =
    tone === "primary" ? colors.primary : tone === "event" ? colors.foreground : colors.border;
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: accent,
        backgroundColor: colors.card,
        padding: 18,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_700Bold",
            fontSize: 20,
            flex: 1,
          }}
        >
          {title}
        </Text>
        {tag && <Pill label={tag} tone="primary" />}
      </View>
      <Text
        style={{
          color: price ? colors.foreground : colors.mutedForeground,
          fontFamily: "Inter_700Bold",
          fontSize: 26,
          letterSpacing: -0.5,
        }}
      >
        {price ?? "—"}
      </Text>
      <Body muted>{subtitle}</Body>
      <View style={{ gap: 6 }}>
        {features.map((f) => (
          <FeatureRow key={f} text={f} />
        ))}
      </View>
      <Button
        label={ctaLabel}
        variant={tone === "muted" ? "secondary" : "primary"}
        fullWidth
        disabled={disabled}
        loading={loading}
        onPress={onPress}
      />
    </View>
  );
}

function FeatureRow({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Feather name="check" size={14} color={colors.primary} />
      <Text
        style={{
          color: colors.foreground,
          fontFamily: "Inter_500Medium",
          fontSize: 13,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
