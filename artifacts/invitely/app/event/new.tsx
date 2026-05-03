import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Field } from "@/components/Field";
import { HeroPhotoEditor } from "@/components/HeroPhotoEditor";
import { LockBadge } from "@/components/LockBadge";
import { Body, Button, Card, EmptyState, H2, Label, Pill, Section } from "@/components/ui";
import { TEMPLATES, TemplateId, getTemplate, isPremiumTemplate } from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import { usePlan } from "@/lib/gating";
import { HeroFilterId, getHeroFilter } from "@/lib/heroFilters";
import { useInviteStore } from "@/store/InviteStore";

export default function NewEventScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, createEvent } = useInviteStore();
  const plan = usePlan();
  const defaultTemplate = state.profile.defaultTemplate;

  // Hard-block direct entry to /event/new when the free quota is used.
  // The home tab also gates the entry point, but routes can be hit directly.
  useEffect(() => {
    if (!plan.canCreateEvent) {
      router.replace("/upgrade?tier=host_plus");
    }
  }, [plan.canCreateEvent, router]);

  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>(defaultTemplate);
  const [heroPhotoUri, setHeroPhotoUri] = useState<string | undefined>();
  const [heroFilter, setHeroFilter] = useState<HeroFilterId>("none");
  const [editorSourceUri, setEditorSourceUri] = useState<string | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
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
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setEditorSourceUri(result.assets[0].uri);
      setEditorOpen(true);
    }
  };

  const onAdjustExisting = () => {
    if (!heroPhotoUri) return;
    setEditorSourceUri(heroPhotoUri);
    setEditorOpen(true);
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
    // Re-validate template gating at submit. The picker also blocks paid
    // templates, but `templateId` is seeded from `defaultTemplate` which a
    // legacy/imported profile could carry as a premium id — never let a free
    // user actually create an event on a paid template.
    if (isPremiumTemplate(templateId) && !plan.isHostPlus) {
      router.push("/upgrade?tier=host_plus");
      return;
    }
    const ev = createEvent({
      title: title.trim(),
      templateId,
      heroPhotoUri,
      heroFilter: heroPhotoUri ? heroFilter : undefined,
      message: message.trim() || template.copyHints[0],
      startISO,
      location: location.trim(),
      privacy,
      allowGuestUploads,
    });
    router.replace(`/event/${ev.id}`);
  };

  const onSwapTemplate = (id: TemplateId) => {
    if (isPremiumTemplate(id) && !plan.isHostPlus) {
      router.push("/upgrade?tier=host_plus");
      return;
    }
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
          const locked = !!t.premium && !plan.isHostPlus;
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
              <View>
                <Image
                  source={t.image}
                  style={{ width: "100%", height: 170, opacity: locked ? 0.55 : 1 }}
                  contentFit="cover"
                />
                {locked && (
                  <View style={{ position: "absolute", top: 8, right: 8 }}>
                    <LockBadge />
                  </View>
                )}
              </View>
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
      <View style={{ gap: 10 }}>
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
            <Image
              source={heroPhotoUri ? { uri: heroPhotoUri } : template.image}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
            {heroPhotoUri && getHeroFilter(heroFilter).overlayOpacity > 0 && (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  backgroundColor: getHeroFilter(heroFilter).overlayColor,
                  opacity: getHeroFilter(heroFilter).overlayOpacity,
                }}
              />
            )}
            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                backgroundColor: "rgba(0,0,0,0.45)",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {heroPhotoUri
                  ? "Your photo"
                  : `${template.name} template image`}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: "#fff",
                }}
              >
                <Feather name="camera" size={14} color="#111" />
                <Text
                  style={{
                    color: "#111",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                  }}
                >
                  {heroPhotoUri ? "Change photo" : "Add your photo"}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
        {heroPhotoUri && (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pressable
              onPress={onAdjustExisting}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Feather name="crop" size={13} color={colors.foreground} />
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                }}
              >
                Adjust crop & filter
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setHeroPhotoUri(undefined);
                setHeroFilter("none");
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Feather name="rotate-ccw" size={13} color={colors.foreground} />
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                }}
              >
                Use template image
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      <HeroPhotoEditor
        visible={editorOpen}
        sourceUri={editorSourceUri}
        initialFilter={heroFilter}
        onCancel={() => setEditorOpen(false)}
        onSave={({ uri, filter }) => {
          setHeroPhotoUri(uri);
          setHeroFilter(filter);
          setEditorOpen(false);
        }}
      />

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
