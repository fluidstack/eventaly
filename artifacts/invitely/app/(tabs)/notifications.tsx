import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button, Card, EmptyState, H1, Pill, Section } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { relativeTime } from "@/lib/format";
import { useInviteStore } from "@/store/InviteStore";
import { AppNotification } from "@/store/types";

const ICONS: Record<AppNotification["kind"], React.ComponentProps<typeof Feather>["name"]> = {
  rsvp: "check-circle",
  upload: "image",
  reminder: "bell",
  slider: "film",
  system: "info",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, markAllRead } = useInviteStore();
  const unread = state.notifications.filter((n) => !n.read).length;

  return (
    <Screen contentStyle={{ paddingHorizontal: 20, gap: 20 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingTop: 8,
        }}
      >
        <View>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_500Medium",
              fontSize: 13,
              letterSpacing: 0.4,
            }}
          >
            What's happening
          </Text>
          <H1>Activity</H1>
        </View>
        {unread > 0 && (
          <Button label="Mark read" variant="ghost" size="sm" onPress={markAllRead} />
        )}
      </View>

      {state.notifications.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Quiet on the western front"
          body="RSVPs, photo uploads and reminders will land here as guests respond."
        />
      ) : (
        <Section title="Recent">
          <View style={{ gap: 10 }}>
            {state.notifications.map((n) => {
              const event = state.events.find((e) => e.id === n.eventId);
              return (
                <Pressable
                  key={n.id}
                  onPress={() => event && router.push(`/event/${event.id}`)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                  <Card>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: n.read ? colors.muted : colors.secondary,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Feather
                          name={ICONS[n.kind]}
                          size={18}
                          color={n.read ? colors.mutedForeground : colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: colors.foreground,
                              fontSize: 15,
                              fontFamily: "Inter_600SemiBold",
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {n.title}
                          </Text>
                          {!n.read && (
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: colors.primary,
                                marginLeft: 8,
                              }}
                            />
                          )}
                        </View>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 13,
                            fontFamily: "Inter_400Regular",
                            lineHeight: 18,
                          }}
                          numberOfLines={2}
                        >
                          {n.body}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            alignItems: "center",
                            marginTop: 4,
                          }}
                        >
                          {event && <Pill label={event.title} tone="neutral" />}
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 11,
                              fontFamily: "Inter_500Medium",
                            }}
                          >
                            {relativeTime(n.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        </Section>
      )}
    </Screen>
  );
}
