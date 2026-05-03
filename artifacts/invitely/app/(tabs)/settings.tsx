import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";

import { Field } from "@/components/Field";
import { PresetTile } from "@/components/PresetTile";
import { Screen } from "@/components/Screen";
import { Body, Button, Card, H1, Pill, Section } from "@/components/ui";
import { SELECTABLE_DEFAULT_TEMPLATES } from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import { initials } from "@/lib/format";
import { usePlan } from "@/lib/gating";
import { useSubscription } from "@/lib/revenuecat";
import { useInviteStore } from "@/store/InviteStore";

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, updateProfile, resetData, updateCustomPreset, deleteCustomPreset } =
    useInviteStore();
  const { isHostPlus, hasEventProEntitlement, isRestoring, restore, available } =
    useSubscription();
  const plan = usePlan();
  const [name, setName] = useState(state.profile.name);
  const [email, setEmail] = useState(state.profile.email);

  const planLabel = isHostPlus
    ? "Host Plus"
    : hasEventProEntitlement || (state.profile.unlockedEventIds ?? []).length > 0
      ? "Event Pro"
      : "Free";

  const saveProfile = () => updateProfile({ name, email });

  const customPresets = state.profile.customPresets ?? [];

  const onRenamePreset = (presetId: string, currentName: string) => {
    if (Platform.OS === "web") {
      const next = window.prompt("Rename preset", currentName);
      if (next && next.trim()) {
        updateCustomPreset(presetId, { name: next.trim() });
      }
      return;
    }
    Alert.prompt(
      "Rename preset",
      "Pick a new name for this saved template.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: (v?: string) => {
            if (v && v.trim()) updateCustomPreset(presetId, { name: v.trim() });
          },
        },
      ],
      "plain-text",
      currentName,
    );
  };

  const onDeletePreset = (presetId: string, presetName: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${presetName}"? This cannot be undone.`)) {
        deleteCustomPreset(presetId);
      }
      return;
    }
    Alert.alert(
      "Delete preset?",
      `"${presetName}" will be removed from your saved templates.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCustomPreset(presetId),
        },
      ],
    );
  };

  const confirmReset = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Reset all data? This restores the sample event.")) {
        resetData();
      }
      return;
    }
    Alert.alert(
      "Reset data?",
      "This clears your events and restores the sample. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: resetData },
      ],
    );
  };

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
          Make it yours
        </Text>
        <H1>You</H1>
      </View>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: colors.primaryForeground,
                fontSize: 22,
                fontFamily: "Inter_700Bold",
              }}
            >
              {initials(state.profile.name || "You")}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 18,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              {state.profile.name || "Add your name"}
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontSize: 13,
                marginTop: 2,
                fontFamily: "Inter_400Regular",
              }}
            >
              {state.profile.email || "no email yet"}
            </Text>
          </View>
          <Pill label={planLabel} tone="primary" />
        </View>
      </Card>

      <Section title="Profile">
        <Card>
          <View style={{ gap: 14 }}>
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              onBlur={saveProfile}
              placeholder="Your name"
              autoCapitalize="words"
            />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              onBlur={saveProfile}
              placeholder="you@invitely.app"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </Card>
      </Section>

      <Section title="Default template">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SELECTABLE_DEFAULT_TEMPLATES.map((t) => {
            const active = state.profile.defaultTemplate === t.id;
            const locked = !!t.premium && !plan.isHostPlus;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  // Hard-gate premium templates so a free user can never set
                  // a paid template as their default and bypass the new-event
                  // template picker check.
                  if (locked) {
                    router.push("/upgrade?tier=host_plus");
                    return;
                  }
                  updateProfile({ defaultTemplate: t.id });
                }}
                style={({ pressed }) => ({
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.secondary : colors.card,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text
                  style={{
                    color: active ? colors.primary : colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  {t.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="Saved templates">
        {customPresets.length === 0 ? (
          <Card>
            <Body muted>
              Save a Custom template from the new event screen and it'll show
              up here, ready to reuse on any future event.
            </Body>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {customPresets.map((p) => (
              <Card key={p.id}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <PresetTile
                    preset={p}
                    active={false}
                    onPress={() => router.push(`/preset/${p.id}`)}
                    width={88}
                    height={104}
                    showTagline={false}
                  />
                  <View style={{ flex: 1, justifyContent: "space-between", gap: 8 }}>
                    <View style={{ gap: 2 }}>
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 15,
                        }}
                        numberOfLines={1}
                      >
                        {p.name}
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                        }}
                        numberOfLines={2}
                      >
                        {p.tagline}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                      <PresetAction
                        icon="edit-2"
                        label="Edit"
                        onPress={() => router.push(`/preset/${p.id}`)}
                      />
                      <PresetAction
                        icon="type"
                        label="Rename"
                        onPress={() => onRenamePreset(p.id, p.name)}
                      />
                      <PresetAction
                        icon="trash-2"
                        label="Delete"
                        onPress={() => onDeletePreset(p.id, p.name)}
                        destructive
                      />
                    </View>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </Section>

      <Section title="Reminders">
        <Card>
          <View style={{ gap: 12 }}>
            <Body muted>
              We'll nudge guests this many hours before each event.
            </Body>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[6, 24, 48, 72].map((h) => {
                const active = state.profile.reminderHours === h;
                return (
                  <Pressable
                    key={h}
                    onPress={() => updateProfile({ reminderHours: h })}
                    style={({ pressed }) => ({
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.secondary : colors.card,
                      alignItems: "center",
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: active ? colors.primary : colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 14,
                      }}
                    >
                      {h}h
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>
      </Section>

      <Section title="Billing">
        <Card>
          <View style={{ gap: 14 }}>
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
                <Feather name="award" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                  }}
                >
                  {isHostPlus ? "Host Plus" : "Free plan"}
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {isHostPlus
                    ? "Unlimited events, every premium feature unlocked."
                    : "Unlock unlimited events, photo slider, and full guest list."}
                </Text>
              </View>
              <Button
                label={isHostPlus ? "Manage" : "Upgrade"}
                size="sm"
                variant="secondary"
                onPress={() => router.push("/upgrade?tier=host_plus")}
              />
            </View>
            <Button
              label="Restore purchases"
              variant="ghost"
              icon="refresh-cw"
              onPress={async () => {
                try {
                  await restore();
                  if (Platform.OS !== "web") {
                    Alert.alert("Restored", "We refreshed your purchases.");
                  }
                } catch (err) {
                  const message = err instanceof Error ? err.message : "Restore failed";
                  if (Platform.OS === "web") window.alert(message);
                  else Alert.alert("Restore failed", message);
                }
              }}
              loading={isRestoring}
              disabled={!available}
            />
          </View>
        </Card>
      </Section>

      <Section title="Privacy">
        <Card>
          <View style={{ gap: 10 }}>
            <PrivacyRow icon="shield" label="Strip GPS metadata from uploads" on />
            <PrivacyRow icon="user-check" label="Consent logging on guest uploads" on />
            <PrivacyRow icon="lock" label="Minimal contact storage (opt-in)" on />
          </View>
        </Card>
      </Section>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          label="Edit onboarding"
          variant="ghost"
          icon="edit-2"
          onPress={() => router.push("/onboarding")}
        />
        <Button
          label="Reset data"
          variant="ghost"
          icon="refresh-cw"
          onPress={confirmReset}
        />
      </View>
    </Screen>
  );
}

function PresetAction({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  const tint = destructive ? colors.destructive ?? "#DC2626" : colors.foreground;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Feather name={icon} size={12} color={tint} />
      <Text
        style={{
          color: tint,
          fontFamily: "Inter_600SemiBold",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PrivacyRow({
  icon,
  label,
  on,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  on: boolean;
}) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <Text
        style={{
          flex: 1,
          color: colors.foreground,
          fontSize: 14,
          fontFamily: "Inter_500Medium",
        }}
      >
        {label}
      </Text>
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: on ? colors.successMuted : colors.muted,
        }}
      >
        <Text
          style={{
            color: on ? colors.successMutedForeground : colors.mutedForeground,
            fontSize: 11,
            fontFamily: "Inter_700Bold",
            letterSpacing: 0.4,
          }}
        >
          {on ? "ON" : "OFF"}
        </Text>
      </View>
    </View>
  );
}
