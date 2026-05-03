import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen } from "@/components/Screen";
import { Body, Button, Card, Pill, Section } from "@/components/ui";
import { getTemplate } from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import { formatDate, formatTime, initials, relativeTime } from "@/lib/format";
import { getHeroFilter } from "@/lib/heroFilters";
import { useInviteStore } from "@/store/InviteStore";

export default function EventDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, deleteEvent } = useInviteStore();

  const event = state.events.find((e) => e.id === id);

  if (!event) {
    return (
      <Screen contentStyle={{ padding: 24 }}>
        <Stack.Screen options={{ title: "Event" }} />
        <Text style={{ color: colors.foreground }}>Event not found.</Text>
      </Screen>
    );
  }

  const template = getTemplate(event.templateId);
  const heroSource = event.heroPhotoUri ? { uri: event.heroPhotoUri } : template.image;
  const heroFilter = event.heroPhotoUri ? getHeroFilter(event.heroFilter) : getHeroFilter("none");

  const yes = event.rsvps.filter((r) => r.status === "yes").length;
  const no = event.rsvps.filter((r) => r.status === "no").length;
  const maybe = event.rsvps.filter((r) => r.status === "maybe").length;
  const pendingPhotos = event.uploads.filter((u) => u.status === "pending").length;

  const isPast = new Date(event.startISO).getTime() < Date.now();

  const confirmDelete = () => {
    const run = () => {
      deleteEvent(event.id);
      router.replace("/");
    };
    if (Platform.OS === "web") {
      if (window.confirm("Delete this event? This cannot be undone.")) run();
      return;
    }
    Alert.alert("Delete event?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: "transparent" },
          headerTransparent: true,
          headerTintColor: "#fff",
          headerRight: () => (
            <Pressable onPress={() => router.push(`/event/${event.id}/edit`)}>
              <Feather name="edit-2" size={20} color="#fff" />
            </Pressable>
          ),
        }}
      />
      <Screen contentStyle={{ paddingBottom: 60 }} noTopInset>
        <View style={{ height: 320 }}>
          <Image source={heroSource} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          {heroFilter.overlayOpacity > 0 && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundColor: heroFilter.overlayColor,
                opacity: heroFilter.overlayOpacity,
              }}
            />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "transparent", "rgba(0,0,0,0.7)"]}
            locations={[0, 0.4, 1]}
            style={{ position: "absolute", inset: 0 }}
          />
          <View
            style={{
              position: "absolute",
              left: 20,
              right: 20,
              bottom: 24,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Pill label={template.name} tone="primary" />
              {isPast && <Pill label="Past event" tone="neutral" />}
              {event.slider.published && <Pill label="Slider Live" icon="film" tone="yes" />}
            </View>
            <Text
              style={{
                color: "#fff",
                fontSize: 30,
                fontFamily: "Inter_700Bold",
                letterSpacing: -0.6,
                lineHeight: 34,
              }}
            >
              {event.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather name="calendar" size={14} color="rgba(255,255,255,0.95)" />
              <Text
                style={{
                  color: "rgba(255,255,255,0.95)",
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                }}
              >
                {formatDate(event.startISO)} · {formatTime(event.startISO)}
              </Text>
            </View>
            {event.location ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name="map-pin" size={14} color="rgba(255,255,255,0.85)" />
                <Text
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                  }}
                  numberOfLines={1}
                >
                  {event.location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ padding: 20, gap: 22 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              label="Share invite"
              icon="send"
              size="lg"
              fullWidth
              style={{ flex: 1 }}
              onPress={() => router.push(`/event/${event.id}/invite`)}
            />
            <Button
              label="Preview"
              variant="secondary"
              icon="eye"
              size="lg"
              onPress={() => router.push(`/event/${event.id}/guest`)}
            />
          </View>

          <Card>
            <Body>{event.message}</Body>
          </Card>

          <Section title={isPast ? "Final RSVPs" : "Live RSVPs"}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <RsvpStat label="Going" count={yes} tone={colors.success} />
              <RsvpStat label="Maybe" count={maybe} tone={colors.warning} />
              <RsvpStat label="Out" count={no} tone={colors.destructive} />
            </View>
            <Pressable onPress={() => router.push(`/event/${event.id}/guests`)}>
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flexDirection: "row" }}>
                    {event.rsvps.slice(0, 3).map((r, i) => (
                      <View
                        key={r.id}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: colors.secondary,
                          alignItems: "center",
                          justifyContent: "center",
                          marginLeft: i === 0 ? 0 : -10,
                          borderWidth: 2,
                          borderColor: colors.card,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.primary,
                            fontFamily: "Inter_700Bold",
                            fontSize: 12,
                          }}
                        >
                          {initials(r.guestName)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 15,
                      }}
                    >
                      {event.rsvps.length} responses
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      Tap to view, message, and export
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                </View>
              </Card>
            </Pressable>
          </Section>

          <Section title="Photos">
            <View style={{ gap: 10 }}>
              <Pressable onPress={() => router.push(`/event/${event.id}/uploads`)}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: colors.secondary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="image" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 15,
                        }}
                      >
                        Photo queue
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                        }}
                      >
                        {event.uploads.length} total · {pendingPhotos} need review
                      </Text>
                    </View>
                    {pendingPhotos > 0 && (
                      <Pill label={`${pendingPhotos}`} tone="primary" />
                    )}
                    <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                  </View>
                </Card>
              </Pressable>
              <Pressable onPress={() => router.push(`/event/${event.id}/slider`)}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: colors.secondary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="film" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 15,
                        }}
                      >
                        Post‑event slider
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                        }}
                      >
                        {event.slider.published
                          ? `Published ${event.slider.publishedAt ? relativeTime(event.slider.publishedAt) : ""}`
                          : "Compose & publish a thank-you slider"}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                  </View>
                </Card>
              </Pressable>
              <Pressable onPress={() => router.push(`/event/${event.id}/upload`)}>
                <Card>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: colors.secondary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="upload" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 15,
                        }}
                      >
                        Add photos as a guest
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                        }}
                      >
                        Test the guest upload flow on this device
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                  </View>
                </Card>
              </Pressable>
            </View>
          </Section>

          <Section title="Danger zone">
            <Button
              label="Delete this event"
              variant="ghost"
              icon="trash-2"
              onPress={confirmDelete}
            />
          </Section>
          <View style={{ height: insets.bottom }} />
        </View>
      </Screen>
    </View>
  );
}

function RsvpStat({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: string;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: tone,
          }}
        />
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 11,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 24,
          marginTop: 4,
          fontFamily: "Inter_700Bold",
          letterSpacing: -0.5,
        }}
      >
        {count}
      </Text>
    </View>
  );
}
