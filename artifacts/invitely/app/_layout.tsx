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
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useColors } from "@/hooks/useColors";
import { InviteStoreProvider } from "@/store/InviteStore";

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
      <Stack.Screen name="event/[id]/slider" options={{ title: "Photo Slider" }} />
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <InviteStoreProvider>
                <StatusBar style="auto" />
                <RootLayoutNav />
              </InviteStoreProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
