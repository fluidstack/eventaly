import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, Share, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { Screen } from "@/components/Screen";
import { Body, Button, Card, EmptyState, H2, Pill, Section } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { formatDateTime } from "@/lib/format";
import { useInviteStore } from "@/store/InviteStore";

export default function InviteShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { state } = useInviteStore();
  const event = state.events.find((e) => e.id === id);
  const [copied, setCopied] = useState(false);

  if (!event) {
    return (
      <Screen contentStyle={{ padding: 24 }}>
        <EmptyState title="Event not found" />
      </Screen>
    );
  }

  const link = useMemo(
    () => Linking.createURL(`/event/${event.id}/guest`),
    [event.id],
  );
  const shareText = `${state.profile.name?.split(" ")[0] || "I"} invited you to ${event.title} — ${formatDateTime(event.startISO)}\n\n${event.message}\n\nRSVP: ${link}`;

  const onCopy = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setTimeout(() => setCopied(false), 1800);
  };

  const onShare = async () => {
    if (Platform.OS === "web") {
      if (navigator.share) {
        try {
          await navigator.share({ title: event.title, text: shareText, url: link });
        } catch {}
      } else {
        await onCopy();
      }
      return;
    }
    await Share.share({ message: shareText, url: link, title: event.title });
  };

  const channels: {
    label: string;
    icon: React.ComponentProps<typeof Feather>["name"];
    onPress: () => void;
    tint?: string;
  }[] = [
    { label: "Share sheet", icon: "share", onPress: onShare, tint: colors.primary },
    {
      label: "Messages",
      icon: "message-circle",
      onPress: () => onShareViaUrl(`sms:?&body=${encodeURIComponent(shareText)}`),
      tint: "#34C759",
    },
    {
      label: "WhatsApp",
      icon: "phone",
      onPress: () =>
        onShareViaUrl(`https://wa.me/?text=${encodeURIComponent(shareText)}`),
      tint: "#25D366",
    },
    {
      label: "Email",
      icon: "mail",
      onPress: () =>
        onShareViaUrl(
          `mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(shareText)}`,
        ),
      tint: "#5E72E4",
    },
  ];

  function onShareViaUrl(url: string) {
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url).catch(() => {});
    }
  }

  return (
    <Screen contentStyle={{ padding: 20, gap: 22 }} noTopInset>
      <View style={{ alignItems: "center", paddingTop: 12 }}>
        <View
          style={{
            backgroundColor: "#fff",
            padding: 18,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <QRCode value={link} size={180} color={colors.foreground} backgroundColor="#fff" />
        </View>
        <Text
          style={{
            color: colors.mutedForeground,
            marginTop: 14,
            fontFamily: "Inter_500Medium",
            fontSize: 12,
            letterSpacing: 0.4,
          }}
        >
          GUESTS SCAN OR TAP TO RSVP
        </Text>
        <Text
          style={{
            color: colors.foreground,
            marginTop: 6,
            fontFamily: "Inter_700Bold",
            fontSize: 18,
          }}
        >
          {event.title}
        </Text>
      </View>

      <Pressable onPress={onCopy}>
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
              <Feather name={copied ? "check" : "link"} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                {copied ? "Copied!" : "Copy invite link"}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {link}
              </Text>
            </View>
            <Feather name="copy" size={18} color={colors.mutedForeground} />
          </View>
        </Card>
      </Pressable>

      <Section title="Send via">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {channels.map((c) => (
            <Pressable
              key={c.label}
              onPress={c.onPress}
              style={({ pressed }) => ({
                width: "47%",
                flexGrow: 1,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
                gap: 10,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: (c.tint ?? colors.primary) + "22",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={c.icon} size={18} color={c.tint ?? colors.primary} />
              </View>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="Contacts">
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
              <Feather name="users" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                Import phone contacts
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Opt-in only. We'll only store who you invite.
              </Text>
            </View>
            <Pill label="Soon" tone="neutral" />
          </View>
        </Card>
      </Section>

      <Body muted style={{ fontSize: 12, textAlign: "center" }}>
        Invitely strips GPS metadata from photos and never shares your guest list.
      </Body>

      <Button label="Done" variant="ghost" fullWidth onPress={() => router.back()} />
    </Screen>
  );
}
