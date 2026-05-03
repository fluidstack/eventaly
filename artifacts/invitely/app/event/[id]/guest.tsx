import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Field } from "@/components/Field";
import { Body, Button, Card, EmptyState, H1, H2, Pill, Section } from "@/components/ui";
import { getTemplate } from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import {
  formatDate,
  formatTime,
  googleCalendarUrl,
} from "@/lib/format";
import { FREE_LIMITS, usePlan } from "@/lib/gating";
import { getHeroFilter } from "@/lib/heroFilters";
import { useInviteStore } from "@/store/InviteStore";
import { RsvpStatus } from "@/store/types";

export default function GuestViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { state, upsertRsvp } = useInviteStore();
  const plan = usePlan();
  const event = state.events.find((e) => e.id === id);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<RsvpStatus | null>(null);
  const [message, setMessage] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [dietary, setDietary] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
        <EmptyState title="Invite not found" />
      </View>
    );
  }

  const template = getTemplate(event.templateId);
  const heroSource = event.heroPhotoUri ? { uri: event.heroPhotoUri } : template.image;
  const heroFilter = event.heroPhotoUri ? getHeroFilter(event.heroFilter) : getHeroFilter("none");

  const isExistingGuest = event.rsvps.some(
    (r) => r.guestName.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  const guestCapReached =
    !plan.canAddGuest(event.id, event.rsvps.length) && !isExistingGuest;

  const onSubmit = () => {
    if (!name.trim() || !status) return;
    if (guestCapReached) return;
    upsertRsvp(event.id, {
      guestName: name.trim(),
      status,
      message: message.trim() || undefined,
      plusOne,
      dietary: dietary.trim() || undefined,
    });
    setSubmitted(true);
  };

  const addToCalendar = () => {
    const url = googleCalendarUrl({
      title: event.title,
      description: event.message,
      location: event.location,
      startISO: event.startISO,
    });
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
      <View style={{ height: 380 }}>
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
          colors={["transparent", "rgba(0,0,0,0.55)"]}
          style={{ position: "absolute", inset: 0 }}
        />
        <View style={{ position: "absolute", left: 24, right: 24, bottom: 28, gap: 10 }}>
          <View style={{ flexDirection: "row" }}>
            <Pill label="You're invited" tone="primary" />
          </View>
          <Text
            style={{
              color: "#fff",
              fontSize: 32,
              fontFamily: "Inter_700Bold",
              letterSpacing: -0.7,
              lineHeight: 36,
            }}
          >
            {event.title}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.95)",
              fontSize: 15,
              fontFamily: "Inter_500Medium",
            }}
          >
            Hosted by {state.profile.name || "your host"}
          </Text>
        </View>
      </View>

      <View style={{ padding: 22, gap: 22, marginTop: -20 }}>
        <Card>
          <View style={{ gap: 12 }}>
            <DetailRow icon="calendar" label={formatDate(event.startISO)} sub={formatTime(event.startISO)} />
            {event.location ? (
              <DetailRow icon="map-pin" label={event.location} />
            ) : null}
            <View
              style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }}
            />
            <Body>{event.message}</Body>
          </View>
        </Card>

        {submitted ? (
          <Card>
            <View style={{ alignItems: "center", padding: 8, gap: 10 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.successMuted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="check" size={28} color={colors.successMutedForeground} />
              </View>
              <H2>You're {status === "yes" ? "in" : status === "maybe" ? "a maybe" : "out"}.</H2>
              <Body muted style={{ textAlign: "center" }}>
                We let {state.profile.name?.split(" ")[0] || "your host"} know.
                Add it to your calendar so it's not just vibes.
              </Body>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                <Button label="Add to calendar" icon="calendar" onPress={addToCalendar} />
                <Button label="Back" variant="ghost" onPress={() => router.back()} />
              </View>
            </View>
          </Card>
        ) : (
          <Section title="Will you be there?">
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(
                [
                  { key: "yes", label: "I'm in", icon: "check" },
                  { key: "maybe", label: "Maybe", icon: "help-circle" },
                  { key: "no", label: "Can't make it", icon: "x" },
                ] satisfies {
                  key: RsvpStatus;
                  label: string;
                  icon: React.ComponentProps<typeof Feather>["name"];
                }[]
              ).map((opt) => {
                const active = status === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setStatus(opt.key)}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.secondary : colors.card,
                      alignItems: "center",
                      gap: 6,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Feather
                      name={opt.icon}
                      size={18}
                      color={active ? colors.primary : colors.mutedForeground}
                    />
                    <Text
                      style={{
                        color: active ? colors.primary : colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Card>
              <View style={{ gap: 14 }}>
                <Field
                  label="Your name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Jordan Lee"
                  autoCapitalize="words"
                />
                <Field
                  label="A short note (optional)"
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Wouldn't miss it!"
                  multiline
                  numberOfLines={2}
                />
                <Pressable
                  onPress={() => setPlusOne((v) => !v)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      borderWidth: 1.5,
                      borderColor: plusOne ? colors.primary : colors.border,
                      backgroundColor: plusOne ? colors.primary : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {plusOne && (
                      <Feather name="check" size={14} color={colors.primaryForeground} />
                    )}
                  </View>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_500Medium",
                      fontSize: 14,
                    }}
                  >
                    Bringing a plus one
                  </Text>
                </Pressable>
                <Field
                  label="Dietary needs (optional)"
                  value={dietary}
                  onChangeText={setDietary}
                  placeholder="Vegetarian, allergies, etc."
                />
              </View>
            </Card>

            {guestCapReached && (
              <Card>
                <Body muted>
                  This guest list is full ({FREE_LIMITS.guestsPerEvent} guests on
                  the free plan). Ask the host to upgrade to add more guests.
                </Body>
              </Card>
            )}
            <Button
              label={guestCapReached ? "Guest list full" : "Submit RSVP"}
              icon="send"
              size="lg"
              fullWidth
              onPress={onSubmit}
              disabled={!status || !name.trim() || guestCapReached}
            />
          </Section>
        )}

        <Section title="Share moments">
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="camera" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  Add a photo to the gallery
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                  }}
                >
                  Your host approves before it goes live.
                </Text>
              </View>
              <Button
                size="sm"
                label="Upload"
                onPress={() => router.push(`/event/${event.id}/upload`)}
              />
            </View>
          </Card>
        </Section>
      </View>
    </KeyboardAwareScrollView>
  );
}

function DetailRow({
  icon,
  label,
  sub,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sub?: string;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.secondary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
          }}
        >
          {label}
        </Text>
        {sub ? (
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
