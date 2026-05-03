import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Share, Text, View } from "react-native";

import { LockBadge } from "@/components/LockBadge";
import { Screen } from "@/components/Screen";
import { Body, Button, Card, EmptyState, Pill, PillTone, Section } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { usePlan } from "@/lib/gating";
import { csvEscape, formatDateTime, initials, relativeTime } from "@/lib/format";
import { buildInviteMessage, firstNameOf } from "@/lib/inviteText";
import { useInviteStore } from "@/store/InviteStore";
import { InviteChannel, InvitedGuest, Rsvp, RsvpStatus } from "@/store/types";

const FILTERS: { key: RsvpStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "yes", label: "Going" },
  { key: "maybe", label: "Maybe" },
  { key: "no", label: "Out" },
];

export default function GuestListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { state, pushNotification } = useInviteStore();
  const event = state.events.find((e) => e.id === id);
  const plan = usePlan();
  const exportUnlocked = id ? plan.isEventUnlocked(id) : false;

  const [filter, setFilter] = useState<RsvpStatus | "all">("all");
  const [showCsv, setShowCsv] = useState(false);
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    if (!event) return [];
    return event.rsvps.filter((r) => filter === "all" || r.status === filter);
  }, [event, filter]);

  if (!event) return null;

  const csv = useMemo(() => {
    const rows = [
      ["Name", "Status", "Plus one", "Dietary", "Message", "Submitted"],
      ...event.rsvps.map((r) => [
        r.guestName,
        r.status,
        r.plusOne ? "Yes" : "No",
        r.dietary || "",
        r.message || "",
        new Date(r.createdAt).toISOString(),
      ]),
    ];
    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  }, [event.rsvps]);

  const onCopyCsv = async () => {
    await Clipboard.setStringAsync(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const onBulkMessage = async () => {
    const recipients = event.rsvps.filter((r) => r.status === "yes").map((r) => r.guestName);
    const msg = `Quick update from ${state.profile.name?.split(" ")[0] || "your host"} about ${event.title}:`;
    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(msg);
    } else {
      await Share.share({ message: msg });
    }
    pushNotification({
      eventId: event.id,
      kind: "system",
      title: `Message drafted for ${recipients.length} guests`,
      body: "Opened your share sheet — pick a channel to send.",
    });
  };

  const yes = event.rsvps.filter((r) => r.status === "yes").length;
  const plusOnes = event.rsvps.filter((r) => r.status === "yes" && r.plusOne).length;
  const invited = event.invited ?? [];

  const onResend = async (g: InvitedGuest) => {
    const link = Linking.createURL(`/event/${event.id}/guest`);
    const message = buildInviteMessage({
      recipientFirstName: firstNameOf(g.name),
      hostName: state.profile.name,
      eventTitle: event.title,
      startISO: event.startISO,
      message: event.message,
      link,
    });
    let url: string | null = null;
    if (g.channel === "email" && g.email) {
      url = `mailto:${g.email}?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(message)}`;
    } else if (g.channel === "whatsapp" && g.phone) {
      const num = g.phone.replace(/[^\d+]/g, "");
      url = `whatsapp://send?phone=${encodeURIComponent(num)}&text=${encodeURIComponent(message)}`;
    } else if (g.channel === "sms" && g.phone) {
      const scheme = Platform.OS === "android" ? "smsto:" : "sms:";
      url = `${scheme}${g.phone}${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(message)}`;
    }
    if (url) {
      if (Platform.OS === "web") window.open(url, "_blank");
      else Linking.openURL(url).catch(() => {});
      return;
    }
    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(message);
    } else {
      await Share.share({ message });
    }
  };

  return (
    <Screen contentStyle={{ padding: 20, gap: 18 }}>
      <View>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_500Medium",
            fontSize: 12,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          {event.title}
        </Text>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 26,
            fontFamily: "Inter_700Bold",
            letterSpacing: -0.5,
            marginTop: 4,
          }}
        >
          Guest list
        </Text>
        <Body muted style={{ marginTop: 6 }}>
          {yes} confirmed · {plusOnes} plus ones · {event.rsvps.length} total responses
          {invited.length > 0 ? ` · ${invited.length} invited` : ""}
        </Body>
      </View>

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Button label="Message guests" icon="send" onPress={onBulkMessage} />
        {exportUnlocked ? (
          <Button
            label={showCsv ? "Hide CSV" : "Export CSV"}
            icon="download"
            variant="secondary"
            onPress={() => setShowCsv((v) => !v)}
          />
        ) : (
          <Button
            label="Export CSV"
            icon="lock"
            variant="secondary"
            onPress={() => router.push(`/upgrade?eventId=${event.id}`)}
          />
        )}
        {!exportUnlocked && <LockBadge eventId={event.id} label="CSV is Premium" />}
      </View>

      {showCsv && exportUnlocked && (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 13,
              }}
            >
              guests-{event.id.slice(0, 6)}.csv
            </Text>
            <Button
              size="sm"
              label={copied ? "Copied" : "Copy"}
              icon={copied ? "check" : "copy"}
              variant="ghost"
              onPress={onCopyCsv}
            />
          </View>
          <ScrollView
            horizontal
            style={{
              marginTop: 12,
              backgroundColor: colors.muted,
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_400Regular",
                fontSize: 11,
                lineHeight: 16,
              }}
            >
              {csv}
            </Text>
          </ScrollView>
        </Card>
      )}

      {invited.length > 0 && (
        <Section title={`Invited — no reply yet (${invited.length})`}>
          <View style={{ gap: 8 }}>
            {invited.map((g) => (
              <InvitedRow key={g.id} g={g} onResend={() => onResend(g)} />
            ))}
          </View>
        </Section>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? event.rsvps.length
              : event.rsvps.filter((r) => r.status === f.key).length;
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.secondary : colors.card,
                flexDirection: "row",
                gap: 6,
                alignItems: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  color: active ? colors.primary : colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                }}
              >
                {f.label}
              </Text>
              <Text
                style={{
                  color: active ? colors.primary : colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                }}
              >
                {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          icon="users"
          title="No responses yet"
          body="Open the guest preview to test an RSVP, or share the invite link."
          action={
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button
                label="Guest preview"
                variant="secondary"
                icon="eye"
                onPress={() => router.push(`/event/${event.id}/guest`)}
              />
              <Button
                label="Share invite"
                icon="send"
                onPress={() => router.push(`/event/${event.id}/invite`)}
              />
            </View>
          }
        />
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map((r) => (
            <GuestRow key={r.id} r={r} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function GuestRow({ r }: { r: Rsvp }) {
  const colors = useColors();
  const tone: PillTone =
    r.status === "yes" ? "yes" : r.status === "no" ? "no" : "maybe";
  const label = r.status === "yes" ? "Going" : r.status === "no" ? "Out" : "Maybe";
  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontFamily: "Inter_700Bold",
              fontSize: 14,
            }}
          >
            {initials(r.guestName)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
              }}
            >
              {r.guestName}
            </Text>
            <Pill label={label} tone={tone} />
            {r.plusOne && <Pill label="+1" tone="primary" />}
          </View>
          {r.message ? (
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                lineHeight: 18,
                marginTop: 4,
              }}
            >
              "{r.message}"
            </Text>
          ) : null}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
              marginTop: 6,
            }}
          >
            {r.dietary ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="coffee" size={11} color={colors.mutedForeground} />
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 11,
                  }}
                >
                  {r.dietary}
                </Text>
              </View>
            ) : null}
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 11,
              }}
            >
              {relativeTime(r.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

function InvitedRow({ g, onResend }: { g: InvitedGuest; onResend: () => void }) {
  const colors = useColors();
  const channelIcon: Record<InviteChannel, React.ComponentProps<typeof Feather>["name"]> = {
    sms: "message-circle",
    whatsapp: "phone",
    email: "mail",
    share: "share",
  };
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.muted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_700Bold",
              fontSize: 13,
            }}
          >
            {initials(g.name)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              {g.name}
            </Text>
            <Feather name={channelIcon[g.channel]} size={12} color={colors.mutedForeground} />
          </View>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            Sent {relativeTime(g.sentAt)}
            {g.phone ? ` · ${g.phone}` : g.email ? ` · ${g.email}` : ""}
          </Text>
        </View>
        <Button label="Resend" size="sm" variant="ghost" icon="repeat" onPress={onResend} />
      </View>
    </Card>
  );
}
