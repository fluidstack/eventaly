import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, Text, View } from "react-native";

import {
  CUSTOM_TEMPLATE_ID,
  customPresetTemplate,
  getTemplate,
} from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import { CustomPreset } from "@/store/types";

type Props = {
  preset: CustomPreset;
  active: boolean;
  onPress: () => void;
  width?: number;
  height?: number;
  showTagline?: boolean;
};

/**
 * Picker tile for a saved Custom-template preset. Mirrors the look of the
 * built-in template tiles but uses the preset's hero image (or the default
 * Custom image) and shows a small "saved" marker so users can tell their
 * presets apart from the built-ins.
 */
export function PresetTile({
  preset,
  active,
  onPress,
  width = 140,
  height = 170,
  showTagline = true,
}: Props) {
  const colors = useColors();
  const tile = customPresetTemplate(preset);
  const fallback = getTemplate(CUSTOM_TEMPLATE_ID).image;
  const heroSource = preset.heroPhotoUri ? { uri: preset.heroPhotoUri } : fallback;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: active ? colors.primary : "transparent",
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View>
        <Image
          source={heroSource}
          style={{ width: "100%", height }}
          contentFit="cover"
        />
        <View
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          <Feather name="bookmark" size={11} color="#fff" />
          <Text
            style={{
              color: "#fff",
              fontFamily: "Inter_600SemiBold",
              fontSize: 10,
              letterSpacing: 0.4,
            }}
          >
            SAVED
          </Text>
        </View>
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: tile.accent,
            borderWidth: 2,
            borderColor: "#fff",
          }}
        />
      </View>
      <View style={{ padding: 10, backgroundColor: colors.card }}>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
          }}
          numberOfLines={1}
        >
          {tile.name}
        </Text>
        {showTagline && (
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 11,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {tile.tagline}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
