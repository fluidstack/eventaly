import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { CustomTemplateFields } from "@/components/CustomTemplateFields";
import { HeroPhotoEditor } from "@/components/HeroPhotoEditor";
import { Button, Section } from "@/components/ui";
import {
  CUSTOM_TEMPLATE_ID,
  DEFAULT_CUSTOM_ACCENT,
  DEFAULT_CUSTOM_TAGLINE,
  getTemplate,
} from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import { HeroFilterId, getHeroFilter } from "@/lib/heroFilters";
import { useInviteStore } from "@/store/InviteStore";

export default function EditPresetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { state, updateCustomPreset, deleteCustomPreset } = useInviteStore();
  const preset = (state.profile.customPresets ?? []).find((p) => p.id === id);

  const [name, setName] = useState(preset?.name ?? "");
  const [tagline, setTagline] = useState(preset?.tagline ?? "");
  const [accent, setAccent] = useState(preset?.accent ?? DEFAULT_CUSTOM_ACCENT);
  const [heroPhotoUri, setHeroPhotoUri] = useState<string | undefined>(
    preset?.heroPhotoUri,
  );
  const [heroFilter, setHeroFilter] = useState<HeroFilterId>(
    preset?.heroFilter ?? "none",
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSourceUri, setEditorSourceUri] = useState<string | undefined>();

  if (!preset) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
        <Text style={{ color: colors.foreground }}>Preset not found.</Text>
      </View>
    );
  }

  const fallback = getTemplate(CUSTOM_TEMPLATE_ID).image;

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
    const trimmed = name.trim();
    if (!trimmed) {
      const msg = "Give your preset a name before saving.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Name required", msg);
      return;
    }
    updateCustomPreset(preset.id, {
      name: trimmed,
      tagline: tagline.trim() || DEFAULT_CUSTOM_TAGLINE,
      accent,
      heroPhotoUri,
      heroFilter: heroPhotoUri ? heroFilter : undefined,
    });
    router.back();
  };

  const onDelete = () => {
    const confirmAndDelete = () => {
      deleteCustomPreset(preset.id);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${preset.name}"? This cannot be undone.`)) {
        confirmAndDelete();
      }
      return;
    }
    Alert.alert(
      "Delete preset?",
      `"${preset.name}" will be removed from your saved templates.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmAndDelete },
      ],
    );
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
      <CustomTemplateFields
        name={name}
        onChangeName={setName}
        tagline={tagline}
        onChangeTagline={setTagline}
        accent={accent}
        onChangeAccent={setAccent}
      />

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
              source={heroPhotoUri ? { uri: heroPhotoUri } : fallback}
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
                {heroPhotoUri ? "Your photo" : "Default Custom image"}
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
                  {heroPhotoUri ? "Change photo" : "Add a photo"}
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
                Use default image
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
          setEditorOpen(false);
        }}
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          label="Delete"
          variant="ghost"
          icon="trash-2"
          onPress={onDelete}
        />
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
