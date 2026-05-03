import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { CustomTemplateFields } from "@/components/CustomTemplateFields";
import { Field } from "@/components/Field";
import { HeroPhotoEditor } from "@/components/HeroPhotoEditor";
import { LockBadge } from "@/components/LockBadge";
import { PresetTile } from "@/components/PresetTile";
import { Button, Card, Label, Pill, Section } from "@/components/ui";
import {
  DEFAULT_CUSTOM_ACCENT,
  DEFAULT_CUSTOM_NAME,
  DEFAULT_CUSTOM_TAGLINE,
  TEMPLATES,
  TemplateId,
  getTemplate,
  isPremiumTemplate,
  resolveEventTemplate,
} from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import { usePlan } from "@/lib/gating";
import { HeroFilterId, getHeroFilter } from "@/lib/heroFilters";
import { useInviteStore } from "@/store/InviteStore";
import { publishEventRemote } from "@/lib/sync";

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { state, updateEvent, saveCustomPreset } = useInviteStore();
  const plan = usePlan();
  const event = state.events.find((e) => e.id === id);
  const eventUnlocked = id ? plan.isEventUnlocked(id) : false;
  const customPresets = state.profile.customPresets ?? [];

  const [title, setTitle] = useState(event?.title ?? "");
  const [templateId, setTemplateId] = useState<TemplateId>(event?.templateId ?? "birthday");
  const [heroPhotoUri, setHeroPhotoUri] = useState<string | undefined>(event?.heroPhotoUri);
  const [heroFilter, setHeroFilter] = useState<HeroFilterId>(event?.heroFilter ?? "none");
  const [editorSourceUri, setEditorSourceUri] = useState<string | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [message, setMessage] = useState(event?.message ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const startDate = event ? new Date(event.startISO) : new Date();
  const [date, setDate] = useState(formatDateForInput(startDate));
  const [time, setTime] = useState(formatTimeForInput(startDate));
  const [customName, setCustomName] = useState(event?.customName ?? "");
  const [customTagline, setCustomTagline] = useState(event?.customTagline ?? "");
  const [customAccent, setCustomAccent] = useState(event?.customAccent ?? DEFAULT_CUSTOM_ACCENT);
  const [activePresetId, setActivePresetId] = useState<string | undefined>(
    event?.customPresetId,
  );

  const onChangeCustomName = (v: string) => {
    setCustomName(v);
    setActivePresetId(undefined);
  };
  const onChangeCustomTagline = (v: string) => {
    setCustomTagline(v);
    setActivePresetId(undefined);
  };
  const onChangeCustomAccent = (v: string) => {
    setCustomAccent(v);
    setActivePresetId(undefined);
  };

  const applyPreset = (presetId: string) => {
    const preset = customPresets.find((p) => p.id === presetId);
    if (!preset) return;
    setTemplateId("custom");
    setCustomName(preset.name);
    setCustomTagline(preset.tagline);
    setCustomAccent(preset.accent);
    setHeroPhotoUri(preset.heroPhotoUri);
    setHeroFilter(preset.heroPhotoUri ? preset.heroFilter ?? "none" : "none");
    setActivePresetId(preset.id);
  };

  const onSavePreset = () => {
    const trimmedName = customName.trim();
    if (!trimmedName) {
      const msg = "Add a template name before saving as a preset.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Name required", msg);
      return;
    }
    const created = saveCustomPreset({
      name: trimmedName,
      tagline: customTagline.trim() || DEFAULT_CUSTOM_TAGLINE,
      accent: customAccent,
      heroPhotoUri,
      heroFilter: heroPhotoUri ? heroFilter : undefined,
    });
    setActivePresetId(created.id);
    const ok = `"${created.name}" is saved. You can reuse it on other events.`;
    if (Platform.OS === "web") window.alert(ok);
    else Alert.alert("Preset saved", ok);
  };

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
        <Text style={{ color: colors.foreground }}>Event not found.</Text>
      </View>
    );
  }

  const template = resolveEventTemplate({
    templateId,
    customName,
    customTagline,
    customAccent,
  });
  const showCustomFields = templateId === "custom";

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

  const onSave = () => {
    let startISO = event.startISO;
    try {
      const dt = new Date(`${date}T${time}:00`);
      if (!isNaN(dt.getTime())) startISO = dt.toISOString();
    } catch {}
    const patch = {
      title: title.trim() || event.title,
      templateId,
      heroPhotoUri,
      heroFilter: heroPhotoUri ? heroFilter : undefined,
      customName: templateId === "custom" ? customName.trim() || DEFAULT_CUSTOM_NAME : undefined,
      customTagline:
        templateId === "custom" ? customTagline.trim() || DEFAULT_CUSTOM_TAGLINE : undefined,
      customAccent: templateId === "custom" ? customAccent : undefined,
      customPresetId: templateId === "custom" ? activePresetId : undefined,
      message: message.trim(),
      location: location.trim(),
      startISO,
    };
    updateEvent(event.id, patch);
    publishEventRemote({ ...event, ...patch }, state.profile.name).catch(() => {});
    router.back();
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
      <Section title="Template">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {customPresets.map((p) => (
            <PresetTile
              key={p.id}
              preset={p}
              active={templateId === "custom" && activePresetId === p.id}
              onPress={() => applyPreset(p.id)}
              width={110}
              height={130}
              showTagline={false}
            />
          ))}
          {TEMPLATES.map((t) => {
            const active =
              t.id === templateId && !(t.id === "custom" && activePresetId);
            const locked = !!t.premium && !eventUnlocked;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  if (locked) {
                    router.push(`/upgrade?eventId=${event.id}`);
                    return;
                  }
                  setTemplateId(t.id);
                  setActivePresetId(undefined);
                }}
                style={{
                  width: 110,
                  borderRadius: 14,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: active ? colors.primary : "transparent",
                }}
              >
                <View>
                  <Image
                    source={t.image}
                    style={{ width: "100%", height: 130, opacity: locked ? 0.55 : 1 }}
                    contentFit="cover"
                  />
                  {locked && (
                    <View style={{ position: "absolute", top: 6, right: 6 }}>
                      <LockBadge eventId={event.id} />
                    </View>
                  )}
                </View>
                <View style={{ padding: 8, backgroundColor: colors.card }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                    }}
                  >
                    {t.name}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Section>

      {showCustomFields && (
        <CustomTemplateFields
          name={customName}
          onChangeName={onChangeCustomName}
          tagline={customTagline}
          onChangeTagline={onChangeCustomTagline}
          accent={customAccent}
          onChangeAccent={onChangeCustomAccent}
          footer={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={onSavePreset}
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
                <Feather name="bookmark" size={13} color={colors.foreground} />
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 12,
                  }}
                >
                  Save as preset
                </Text>
              </Pressable>
              {activePresetId ? (
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 11,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  Using your saved preset.
                </Text>
              ) : null}
            </View>
          }
        />
      )}

      <Section title="Hero photo">
        <Pressable onPress={onPickPhoto}>
          <View
            style={{
              height: 200,
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border,
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
                {heroPhotoUri ? "Your photo" : `${template.name} template image`}
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
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
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
                setActivePresetId(undefined);
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
      </Section>
      <HeroPhotoEditor
        visible={editorOpen}
        sourceUri={editorSourceUri}
        initialFilter={heroFilter}
        onCancel={() => setEditorOpen(false)}
        onSave={({ uri, filter }) => {
          setHeroPhotoUri(uri);
          setHeroFilter(filter);
          setActivePresetId(undefined);
          setEditorOpen(false);
        }}
      />

      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        autoCapitalize="words"
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1.4 }}>
          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Time" value={time} onChangeText={setTime} placeholder="19:00" />
        </View>
      </View>

      <Field label="Location" value={location} onChangeText={setLocation} />

      <Field
        label="Message"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        <Button
          label="Save changes"
          icon="check"
          fullWidth
          style={{ flex: 1 }}
          onPress={onSave}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}

function formatDateForInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeForInput(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
