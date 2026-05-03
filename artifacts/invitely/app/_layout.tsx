import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AnimatedSplash } from "@/components/AnimatedSplash";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useColors } from "@/hooks/useColors";
import { SubscriptionProvider, useSubscription } from "@/lib/revenuecat";
import { InviteStoreProvider, useInviteStore } from "@/store/InviteStore";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerTitleStyle: { fontFamily: "Inter_600SemiBold", color: colors.foreground },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen
        name="event/new"
        options={{ title: "New Event", presentation: "modal" }}
      />
      <Stack.Screen
        name="event/[id]/index"
        options={{ title: "", headerTransparent: true }}
      />
      <Stack.Screen name="event/[id]/edit" options={{ title: "Edit Event" }} />
      <Stack.Screen
        name="event/[id]/invite"
        options={{ title: "Share Invite", presentation: "modal" }}
      />
      <Stack.Screen
        name="event/[id]/guest"
        options={{ title: "Guest View", presentation: "modal" }}
      />
      <Stack.Screen
        name="event/[id]/upload"
        options={{ title: "Add Photos", presentation: "modal" }}
      />
      <Stack.Screen name="event/[id]/uploads" options={{ title: "Photo Queue" }} />
      <Stack.Screen name="event/[id]/guests" options={{ title: "Guest List" }} />
      <Stack.Screen
        name="event/[id]/contacts"
        options={{ title: "Pick Contacts", presentation: "modal" }}
      />
      <Stack.Screen name="event/[id]/slider" options={{ title: "Photo Slider" }} />
      <Stack.Screen
        name="upgrade"
        options={{ title: "Upgrade", presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  const onSplashFinish = useCallback(() => setSplashDone(true), []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <InviteStoreProvider>
                <RevenueCatGate>
                  <EventProClaimsSync>
                    <StatusBar style="auto" />
                    <RootLayoutNav />
                  </EventProClaimsSync>
                </RevenueCatGate>
                {!splashDone && <AnimatedSplash onFinish={onSplashFinish} />}
              </InviteStoreProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

/**
 * Hands the persisted profile id + readiness to SubscriptionProvider so it
 * can call Purchases.configure() BEFORE enabling any RC-backed queries.
 * This eliminates the bootstrap race where customerInfo/offerings would be
 * requested before configure() had completed.
 */
function RevenueCatGate({ children }: { children: React.ReactNode }) {
  const { state, ready } = useInviteStore();
  return (
    <SubscriptionProvider appUserID={state.profile.id} profileReady={ready}>
      {children}
    </SubscriptionProvider>
  );
}

/**
 * Whenever RevenueCat customer info refreshes, prune any local Event Pro
 * claims whose source transaction has disappeared (refunded/voided). This
 * also cascades into removing the matching unlocks from `unlockedEventIds`
 * so refunded purchases can't keep features unlocked forever.
 */
function EventProClaimsSync({ children }: { children: React.ReactNode }) {
  const { customerInfo } = useSubscription();
  const { syncEventProClaims } = useInviteStore();
  useEffect(() => {
    if (!customerInfo) return;
    const validIds = (customerInfo.nonSubscriptionTransactions ?? [])
      .filter((t) =>
        (t.productIdentifier ?? "").toLowerCase().includes("event_pro"),
      )
      .map((t) => t.transactionIdentifier);
    syncEventProClaims(validIds);
  }, [customerInfo, syncEventProClaims]);
  return <>{children}</>;
}
