import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

type LockBadgeProps = {
  label?: string;
  eventId?: string;
  size?: "sm" | "md";
  style?: ViewStyle;
  onPress?: () => void;
};

export function LockBadge({
  label = "Premium",
  eventId,
  size = "sm",
  style,
  onPress,
}: LockBadgeProps) {
  const colors = useColors();
  const router = useRouter();
  const dim = size === "md" ? 14 : 11;
  const pad = size === "md" ? { px: 10, py: 5 } : { px: 8, py: 3 };
  const handle = () => {
    if (onPress) return onPress();
    router.push(eventId ? `/upgrade?eventId=${eventId}` : "/upgrade");
  };
  return (
    <Pressable
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel={`${label} feature, tap to see plans`}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: pad.px,
          paddingVertical: pad.py,
          borderRadius: 999,
          backgroundColor: colors.secondary,
          borderWidth: 1,
          borderColor: colors.primary,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Feather name="lock" size={dim} color={colors.primary} />
      <Text
        style={{
          color: colors.primary,
          fontFamily: "Inter_700Bold",
          fontSize: size === "md" ? 12 : 10,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
