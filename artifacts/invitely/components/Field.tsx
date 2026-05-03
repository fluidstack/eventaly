import React from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = TextInputProps & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, style, ...rest }: Props) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: colors.mutedForeground,
          fontSize: 12,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: colors.foreground,
            fontSize: 16,
            fontFamily: "Inter_400Regular",
          },
          style,
        ]}
        {...rest}
      />
      {hint && (
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 12,
            fontFamily: "Inter_400Regular",
          }}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}
