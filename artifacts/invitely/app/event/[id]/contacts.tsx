import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";

import { Screen } from "@/components/Screen";
import { Body, Button, Card, EmptyState, Pill, Section } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { DeviceContact, useContacts } from "@/hooks/useContacts";
import { initials } from "@/lib/format";
import { buildInviteMessage, firstNameOf } from "@/lib/inviteText";
import { useInviteStore } from "@/store/InviteStore";
import { InviteChannel } from "@/store/types";

type ChannelOpt = {
  key: InviteChannel;
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  tint: string;
};

const CHANNELS: ChannelOpt[] = [
  { key: "sms", label: "Messages", icon: "message-circle", tint: "#34C759" },
  { key: "whatsapp", label: "WhatsApp", icon: "phone", tint: "#25D366" },
  { key: "email", label: "Email", icon: "mail", tint: "#5E72E4" },
  { key: "share", label: "Share sheet", icon: "share", tint: "#4F46E5" },
];

export default function ContactsPickerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { state, recordInvitedContacts } = useInviteStore();
  const event = state.events.find((e) => e.id === id);
  const { permission, contacts, loading, request, openSettings } = useContacts();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, DeviceContact>>({});
  const [phase, setPhase] = useState<"pick" | "confirm">("pick");
  const [channel, setChannel] = useState<InviteChannel>("sms");

  const link = useMemo(
    () => (event ? Linking.createURL(`/event/${event.id}/guest`) : ""),
    [event],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q),
    );
  }, [contacts, query]);

  const selectedList = Object.values(selected);

  if (!event) {
    return (
      <Screen contentStyle={{ padding: 24 }}>
        <EmptyState title="Event not found" />
      </Screen>
    );
  }

  const previewMessage = buildInviteMessage({
    recipientFirstName: selectedList.length === 1 ? selectedList[0].firstName : undefined,
    hostName: state.profile.name,
    eventTitle: event.title,
    startISO: event.startISO,
    message: event.message,
    link,
  });

  const toggle = (c: DeviceContact) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[c.id]) delete next[c.id];
      else next[c.id] = c;
      return next;
    });
  };

  const onSend = async () => {
    if (selectedList.length === 0) return;

    const phones = selectedList.map((c) => c.phone).filter(Boolean) as string[];
    const emails = selectedList.map((c) => c.email).filter(Boolean) as string[];

    let opened = false;
    try {
      if (channel === "email") {
        const list = emails.length > 0 ? emails.join(",") : "";
        const url = `mailto:${list}?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(previewMessage)}`;
        opened = await tryOpen(url);
      } else if (channel === "sms") {
        if (phones.length === 0) {
          opened = await fallbackShare(previewMessage);
        } else if (phones.length === 1 || Platform.OS === "ios") {
          const sep = Platform.OS === "ios" ? "," : ";";
          const scheme = Platform.OS === "android" ? "smsto:" : "sms:";
          const url = `${scheme}${phones.join(sep)}${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(previewMessage)}`;
          opened = await tryOpen(url);
        } else {
          opened = await fallbackShare(previewMessage);
        }
      } else if (channel === "whatsapp") {
        if (phones.length === 1) {
          const num = phones[0].replace(/[^\d+]/g, "");
          const url = `whatsapp://send?phone=${encodeURIComponent(num)}&text=${encodeURIComponent(previewMessage)}`;
          opened = await tryOpen(url);
          if (!opened) opened = await tryOpen(`https://wa.me/${encodeURIComponent(num)}?text=${encodeURIComponent(previewMessage)}`);
        } else {
          const url = `whatsapp://send?text=${encodeURIComponent(previewMessage)}`;
          opened = await tryOpen(url);
          if (!opened) opened = await tryOpen(`https://wa.me/?text=${encodeURIComponent(previewMessage)}`);
        }
      } else {
        opened = await fallbackShare(previewMessage);
      }
    } catch {
      opened = false;
    }

    if (!opened && Platform.OS === "web") {
      await Clipboard.setStringAsync(
        `${previewMessage}\n\nRecipients: ${selectedList.map((c) => c.name).join(", ")}`,
      );
    }

    recordInvitedContacts(
      event.id,
      selectedList.map((c) => ({ name: c.name, phone: c.phone, email: c.email })),
      channel,
    );

    router.back();
  };

  // ---------- WEB / UNSUPPORTED ----------
  if (permission === "unsupported") {
    return (
      <Screen contentStyle={{ padding: 24, gap: 18 }}>
        <EmptyState
          icon="smartphone"
          title="Open Invitely on your phone"
          body="The contacts importer uses your device's address book. Open this event on your iPhone or Android to pick contacts and send personalized invites."
          action={
            <Button label="Back to share" icon="arrow-left" onPress={() => router.back()} />
          }
        />
      </Screen>
    );
  }

  // ---------- PERMISSION REQUEST ----------
  if (permission === "unknown") {
    return (
      <Screen contentStyle={{ padding: 24, gap: 18 }}>
        <EmptyState
          icon="users"
          title="Invite from your contacts"
          body="Invitely uses your address book only on this device — names you pick are saved locally so we can show who you've invited. Nothing is uploaded."
          action={<Button label="Allow contacts" icon="check" onPress={request} />}
        />
      </Screen>
    );
  }

  if (permission === "denied" || permission === "restricted") {
    return (
      <Screen contentStyle={{ padding: 24, gap: 18 }}>
        <EmptyState
          icon="lock"
          title="Contacts access is off"
          body="To pick people from your address book, enable Contacts for Invitely in Settings. We never upload your contacts."
          action={
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button label="Try again" variant="secondary" onPress={request} />
              <Button label="Open Settings" icon="settings" onPress={openSettings} />
            </View>
          }
        />
      </Screen>
    );
  }

  // ---------- CONFIRM SHEET ----------
  if (phase === "confirm") {
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
            Sending to {selectedList.length}
          </Text>
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 24,
              marginTop: 4,
            }}
          >
            Review & send
          </Text>
        </View>

        <Section title="Channel">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {CHANNELS.map((c) => {
              const active = channel === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setChannel(c.key)}
                  style={({ pressed }) => ({
                    flexBasis: "47%",
                    flexGrow: 1,
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: active ? c.tint : colors.border,
                    backgroundColor: active ? c.tint + "15" : colors.card,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Feather name={c.icon} size={18} color={c.tint} />
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
              );
            })}
          </View>
        </Section>

        <Section title="Preview">
          <Card>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_400Regular",
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {previewMessage}
            </Text>
            {selectedList.length > 1 && (
              <Body muted style={{ fontSize: 12, marginTop: 10 }}>
                With multiple recipients we use a friendly opener; pick a single contact to personalize by first name.
              </Body>
            )}
          </Card>
        </Section>

        <Section title={`Recipients (${selectedList.length})`}>
          <Card>
            <View style={{ gap: 8 }}>
              {selectedList.map((c) => (
                <View
                  key={c.id}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                >
                  <Avatar name={c.name} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 14,
                      }}
                    >
                      {c.name}
                    </Text>
                    {(c.phone || c.email) && (
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                        }}
                        numberOfLines={1}
                      >
                        {c.phone || c.email}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </Section>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            label="Back"
            variant="ghost"
            icon="arrow-left"
            onPress={() => setPhase("pick")}
          />
          <View style={{ flex: 1 }}>
            <Button
              label={`Send ${selectedList.length} invite${selectedList.length === 1 ? "" : "s"}`}
              icon="send"
              fullWidth
              onPress={onSend}
            />
          </View>
        </View>
      </Screen>
    );
  }

  // ---------- PICKER ----------
  return (
    <Screen contentStyle={{ padding: 20, gap: 14 }}>
      <View>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_700Bold",
            fontSize: 24,
          }}
        >
          Pick contacts
        </Text>
        <Body muted style={{ marginTop: 4 }}>
          Select the people you want to invite to {event.title}.
        </Body>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: colors.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12,
        }}
      >
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, number, email"
          placeholderTextColor={colors.mutedForeground}
          style={{
            flex: 1,
            paddingVertical: 12,
            color: colors.foreground,
            fontFamily: "Inter_400Regular",
            fontSize: 15,
          }}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <EmptyState icon="loader" title="Loading contacts…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="users"
          title={contacts.length === 0 ? "No contacts on this device" : "No matches"}
          body={
            contacts.length === 0
              ? "Add people to your phone's address book to invite them from here."
              : "Try a different name, number, or email."
          }
        />
      ) : (
        <ScrollView
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 6, paddingBottom: 120 }}
        >
          {filtered.map((c) => {
            const checked = !!selected[c.id];
            return (
              <Pressable
                key={c.id}
                onPress={() => toggle(c)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: checked ? colors.secondary : colors.card,
                  borderWidth: 1,
                  borderColor: checked ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Avatar name={c.name} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                    }}
                  >
                    {c.name}
                  </Text>
                  {(c.phone || c.email) && (
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                      }}
                      numberOfLines={1}
                    >
                      {c.phone || c.email}
                    </Text>
                  )}
                </View>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: checked ? colors.primary : colors.border,
                    backgroundColor: checked ? colors.primary : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {checked && <Feather name="check" size={14} color={colors.primaryForeground} />}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {selectedList.length > 0 && (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 24,
            backgroundColor: colors.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <Pill
            label={`${selectedList.length} selected`}
            tone="primary"
            icon="users"
          />
          <View style={{ flex: 1 }} />
          <Button
            label="Continue"
            icon="arrow-right"
            onPress={() => setPhase("confirm")}
          />
        </View>
      )}
    </Screen>
  );
}

async function tryOpen(url: string): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      window.open(url, "_blank");
      return true;
    }
    const can = await Linking.canOpenURL(url);
    if (!can) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

async function fallbackShare(message: string): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      const nav: Navigator | undefined =
        typeof navigator !== "undefined" ? navigator : undefined;
      const webShare = nav && typeof nav.share === "function" ? nav.share.bind(nav) : null;
      if (webShare) {
        await webShare({ text: message });
        return true;
      }
      return false;
    }
    await Share.share({ message });
    return true;
  } catch {
    return false;
  }
}

function Avatar({ name }: { name: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.secondary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: colors.primary,
          fontFamily: "Inter_700Bold",
          fontSize: 13,
        }}
      >
        {initials(name) || firstNameOf(name)[0]?.toUpperCase()}
      </Text>
    </View>
  );
}
