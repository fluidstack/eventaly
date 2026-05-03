import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventCard } from "@/components/EventCard";
import { Screen } from "@/components/Screen";
import { Body, Button, EmptyState, H1, Section } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { useInviteStore } from "@/store/InviteStore";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, ready } = useInviteStore();

  useEffect(() => {
    if (ready && !state.profile.onboarded) {
      router.replace("/onboarding");
    }
  }, [ready, state.profile.onboarded, router]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const events = [...state.events].sort(
      (a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime(),
    );
    return {
      upcoming: events.filter((e) => new Date(e.startISO).getTime() >= now),
      past: events
        .filter((e) => new Date(e.startISO).getTime() < now)
        .reverse(),
    };
  }, [state.events]);

  const totalRsvps = state.events.reduce((s, e) => s + e.rsvps.length, 0);
  const totalGoing = state.events.reduce(
    (s, e) => s + e.rsvps.filter((r) => r.status === "yes").length,
    0,
  );

  return (
    <Screen contentStyle={{ paddingHorizontal: 20, gap: 24 }}>
      <View style={{ gap: 6, paddingTop: 8 }}>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_500Medium",
            fontSize: 13,
            letterSpacing: 0.4,
          }}
        >
          {greeting()}, {state.profile.name || "friend"}
        </Text>
        <H1>Your gatherings</H1>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatBlock label="Events" value={state.events.length} />
        <StatBlock label="RSVPs" value={totalRsvps} />
        <StatBlock label="Going" value={totalGoing} accent />
      </View>

      <Pressable
        onPress={() => router.push("/event/new")}
        style={({ pressed }) => ({
          backgroundColor: colors.foreground,
          borderRadius: 18,
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="plus" size={22} color={colors.primaryForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontFamily: "Inter_600SemiBold",
              letterSpacing: -0.3,
            }}
          >
            Start a new invite
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              marginTop: 2,
              fontFamily: "Inter_400Regular",
            }}
          >
            Pick a template, set the vibe, share in a tap.
          </Text>
        </View>
        <Feather name="arrow-up-right" size={20} color="rgba(255,255,255,0.6)" />
      </Pressable>

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No events yet"
          body="Create your first invitation to start collecting RSVPs and photos."
          action={
            <Button
              label="Create event"
              icon="plus"
              onPress={() => router.push("/event/new")}
            />
          }
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <Section title={`Upcoming · ${upcoming.length}`}>
              <View style={{ gap: 16 }}>
                {upcoming.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </View>
            </Section>
          )}
          {past.length > 0 && (
            <Section title={`Past · ${past.length}`}>
              <View style={{ gap: 16 }}>
                {past.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </View>
            </Section>
          )}
        </>
      )}
      <View style={{ height: insets.bottom }} />
    </Screen>
  );
}

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: accent ? colors.primary : colors.card,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: accent ? colors.primary : colors.border,
      }}
    >
      <Text
        style={{
          color: accent ? "rgba(255,255,255,0.8)" : colors.mutedForeground,
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: accent ? "#fff" : colors.foreground,
          fontSize: 26,
          marginTop: 4,
          fontFamily: "Inter_700Bold",
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Night owl";
}
