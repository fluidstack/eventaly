import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Field } from "@/components/Field";
import { Body, Button, Card, EmptyState, H2, Label, Pill, Section } from "@/components/ui";
import { TEMPLATES, TemplateId, getTemplate } from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import { useInviteStore } from "@/store/InviteStore";

export default function NewEventScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, createEvent } = useInviteStore();
  const defaultTemplate = state.profile.defaultTemplate;

  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>(defaultTemplate);
  const [heroPhotoUri, setHeroPhotoUri] = useState<string | undefined>();
  const [message, setMessage] = useState(getTemplate(defaultTemplate).copyHints[0]);
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(defaultDate());
  const [time, setTime] = useState("19:00");
  const [allowGuestUploads, setAllowGuestUploads] = useState(true);
  const [privacy, setPrivacy] = useState<"link" | "invite-only">("link");

  const template = getTemplate(templateId);

  const onPickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setHeroPhotoUri(result.assets[0].uri);
    }
  };

  const startISO = useMemo(() => {
    try {
      const dt = new Date(`${date}T${time}:00`);
      if (isNaN(dt.getTime())) return new Date().toISOString();
      return dt.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }, [date, time]);

  const canCreate = title.trim().length > 0 && date.length === 10;

  const onCreate = () => {
    const ev = createEvent({
      title: title.trim(),
      templateId,
      heroPhotoUri,
      message: message.trim() || template.copyHints[0],
      startISO,
      location: location.trim(),
      privacy,
      allowGuestUploads,
    });
    router.replace(`/event/${ev.id}`);
  };

  const onSwapTemplate = (id: TemplateId) => {
    setTemplateId(id);
    if (!message || TEMPLATES.some((t) => t.copyHints.includes(message))) {
      setMessage(getTemplate(id).copyHints[0]);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 20 }}
      bottomOffset={20}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Label>Step 1</Label>
        <H2 style={{ marginTop: 6 }}>Pick the look</H2>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 8 }}
      >
        {TEMPLATES.map((t) => {
          const active = t.id === templateId;
          return (
            <Pressable
              key={t.id}
              onPress={() => onSwapTemplate(t.id)}
              style={({ pressed }) => ({
                width: 140,
                borderRadius: 16,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: active ? colors.primary : "transparent",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Image
                source={t.image}
                style={{ width: "100%", height: 170 }}
                contentFit="cover"
              />
              <View style={{ padding: 10, backgroundColor: colors.card }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                  }}
                >
                  {t.name}
                </Text>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 11,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {t.tagline}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View>
        <Label>Step 2</Label>
        <H2 style={{ marginTop: 6 }}>Hero photo</H2>
      </View>
      <Pressable onPress={onPickPhoto}>
        <View
          style={{
            height: 220,
            borderRadius: 18,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          {heroPhotoUri ? (
            <Image
              source={{ uri: heroPhotoUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Image
                source={template.image}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  opacity: 0.55,
                }}
                contentFit="cover"
              />
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name="camera" size={22} color={colors.primary} />
              </View>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                Upload your photo
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                }}
              >
                Or keep the {template.name.toLowerCase()} template image
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <View>
        <Label>Step 3</Label>
        <H2 style={{ marginTop: 6 }}>Details</H2>
      </View>

      <View style={{ gap: 14 }}>
        <Field
          label="Event title"
          value={title}
          onChangeText={setTitle}
          placeholder={`${state.profile.name?.split(" ")[0] || "Your"}'s ${template.name}`}
          autoCapitalize="words"
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1.4 }}>
            <Field
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Time"
              value={time}
              onChangeText={setTime}
              placeholder="19:00"
              autoCapitalize="none"
            />
          </View>
        </View>
        <Field
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="412 Valencia St, Apt 3B"
        />

        <View style={{ gap: 6 }}>
          <Label>Invite copy</Label>
          <Card>
            <Field
              label=""
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              placeholder="Write a short, warm message…"
              style={{ minHeight: 90, textAlignVertical: "top" }}
            />
            <Section title="AI Copy ideas" style={{ marginTop: 14 }}>
              <View style={{ gap: 8 }}>
                {template.copyHints.map((hint) => (
                  <Pressable
                    key={hint}
                    onPress={() => setMessage(hint)}
                    style={({ pressed }) => ({
                      padding: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor:
                        message === hint ? colors.secondary : colors.background,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_400Regular",
                        fontSize: 13,
                        lineHeight: 19,
                      }}
                    >
                      {hint}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Section>
          </Card>
        </View>

        <Section title="Privacy">
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["link", "invite-only"] as const).map((p) => {
              const active = privacy === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPrivacy(p)}
                  style={({ pressed }) => ({
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.secondary : colors.card,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: active ? colors.primary : colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                    }}
                  >
                    {p === "link" ? "Anyone with link" : "Invite only"}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {p === "link"
                      ? "Quick share, no signup."
                      : "Guests need a token."}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Pressable
          onPress={() => setAllowGuestUploads((v) => !v)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <View
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              backgroundColor: allowGuestUploads ? colors.primary : colors.muted,
              padding: 3,
              alignItems: allowGuestUploads ? "flex-end" : "flex-start",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "#fff",
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              Let guests add photos
            </Text>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Photos are queued for you to approve before going live.
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        <Button
          label="Create invite"
          icon="check"
          fullWidth
          style={{ flex: 1 }}
          disabled={!canCreate}
          onPress={onCreate}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}

function defaultDate() {
  const d = new Date(Date.now() + 14 * 86400000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
