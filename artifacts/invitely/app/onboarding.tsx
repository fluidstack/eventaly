import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field } from "@/components/Field";
import { Body, Button, H1, H2 } from "@/components/ui";
import { TEMPLATES, TemplateId, isPremiumTemplate } from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import { useInviteStore } from "@/store/InviteStore";

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, completeOnboarding, updateProfile } = useInviteStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.profile.name);
  const [email, setEmail] = useState(state.profile.email);
  const [template, setTemplate] = useState<TemplateId>(state.profile.defaultTemplate);

  const finish = () => {
    // Onboarding always lands a free user, so block premium template
    // selection from leaking into defaultTemplate. Falls back to "birthday"
    // (a free template) if a premium id was somehow chosen.
    const safeTemplate: TemplateId = isPremiumTemplate(template)
      ? "birthday"
      : template;
    completeOnboarding(name.trim() || "Friend", email.trim());
    updateProfile({ defaultTemplate: safeTemplate });
    router.replace("/");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[colors.secondary, colors.background]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 360 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + 32,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 32 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i <= step ? colors.primary : colors.border,
                }}
              />
            ))}
          </View>

          {step === 0 && (
            <View style={{ flex: 1 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <Feather name="mail" size={26} color={colors.primaryForeground} />
              </View>
              <H1>Welcome to Invitely.</H1>
              <Body muted style={{ marginTop: 12, fontSize: 16, lineHeight: 24 }}>
                Send beautiful invitations, collect one‑tap RSVPs, and turn the
                photos your guests take into a shared keepsake.
              </Body>
              <View style={{ flex: 1 }} />
              <Button
                label="Let's go"
                icon="arrow-right"
                size="lg"
                fullWidth
                onPress={() => setStep(1)}
              />
            </View>
          )}

          {step === 1 && (
            <View style={{ flex: 1, gap: 18 }}>
              <View>
                <H2>Who's hosting?</H2>
                <Body muted style={{ marginTop: 8 }}>
                  We'll show this on every invite you send.
                </Body>
              </View>
              <Field
                label="Your name"
                value={name}
                onChangeText={setName}
                placeholder="Maya Chen"
                autoCapitalize="words"
                autoFocus
              />
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@invitely.app"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button
                  label="Back"
                  variant="ghost"
                  onPress={() => setStep(0)}
                />
                <Button
                  label="Continue"
                  icon="arrow-right"
                  fullWidth
                  style={{ flex: 1 }}
                  onPress={() => setStep(2)}
                  disabled={!name.trim()}
                />
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={{ flex: 1, gap: 18 }}>
              <View>
                <H2>Pick a vibe to start.</H2>
                <Body muted style={{ marginTop: 8 }}>
                  This is just your default — every event can swap templates.
                </Body>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {TEMPLATES.filter((t) => !t.premium).map((t) => {
                  const active = template === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setTemplate(t.id)}
                      style={({ pressed }) => ({
                        width: "48%",
                        padding: 14,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.secondary : colors.card,
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: t.accent,
                          marginBottom: 10,
                        }}
                      />
                      <Text
                        style={{
                          color: colors.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 15,
                        }}
                      >
                        {t.name}
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontFamily: "Inter_400Regular",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {t.tagline}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flex: 1 }} />
              <Button
                label="Open Invitely"
                icon="arrow-right"
                size="lg"
                fullWidth
                onPress={finish}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
