import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

type ButtonProps = {
  label?: string;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Feather>["name"];
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "md" | "lg" | "sm";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  children?: React.ReactNode;
};

export function Button({
  label,
  onPress,
  icon,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  fullWidth,
  haptic = true,
  style,
  children,
}: ButtonProps) {
  const colors = useColors();
  const bg = {
    primary: colors.primary,
    secondary: colors.secondary,
    ghost: "transparent",
    destructive: colors.destructive,
  }[variant];
  const fg = {
    primary: colors.primaryForeground,
    secondary: colors.foreground,
    ghost: colors.foreground,
    destructive: colors.destructiveForeground,
  }[variant];
  const padV = size === "lg" ? 16 : size === "sm" ? 8 : 13;
  const padH = size === "lg" ? 22 : size === "sm" ? 12 : 18;
  const radius = size === "sm" ? 10 : 14;
  return (
    <Pressable
      onPress={() => {
        if (haptic && Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPress?.();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: radius,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Feather name={icon} size={size === "lg" ? 20 : 16} color={fg} />}
          {label && (
            <Text
              style={{
                color: fg,
                fontSize: size === "lg" ? 17 : size === "sm" ? 13 : 15,
                fontFamily: "Inter_600SemiBold",
                letterSpacing: -0.2,
              }}
            >
              {label}
            </Text>
          )}
          {children}
        </>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
  padded = true,
  ...rest
}: ViewProps & { padded?: boolean }) {
  const colors = useColors();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          padding: padded ? 16 : 0,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export type PillTone = "neutral" | "yes" | "no" | "maybe" | "warn" | "primary";

export function Pill({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: PillTone;
  icon?: React.ComponentProps<typeof Feather>["name"];
}) {
  const colors = useColors();
  const tones: Record<PillTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.muted, fg: colors.foreground },
    yes: { bg: "#DCEFE2", fg: "#1E6B3A" },
    no: { bg: "#F6DCDA", fg: "#9A2E27" },
    maybe: { bg: "#F4E5C9", fg: "#7C5A12" },
    warn: { bg: "#F4E5C9", fg: "#7C5A12" },
    primary: { bg: colors.secondary, fg: colors.primary },
  };
  const t = tones[tone];
  return (
    <View
      style={{
        backgroundColor: t.bg,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        alignSelf: "flex-start",
      }}
    >
      {icon && <Feather name={icon} size={11} color={t.fg} />}
      <Text
        style={{
          color: t.fg,
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: 0.2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function Section({
  title,
  action,
  children,
  style,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <View style={[{ gap: 12 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 11,
            fontFamily: "Inter_600SemiBold",
            letterSpacing: 1.4,
            textTransform: "uppercase",
            flex: 1,
          }}
        >
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function H1({ children, style, ...rest }: TextProps & { style?: TextStyle }) {
  const colors = useColors();
  return (
    <Text
      {...rest}
      style={[
        {
          color: colors.foreground,
          fontSize: 30,
          lineHeight: 36,
          fontFamily: "Inter_700Bold",
          letterSpacing: -0.8,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function H2({ children, style, ...rest }: TextProps & { style?: TextStyle }) {
  const colors = useColors();
  return (
    <Text
      {...rest}
      style={[
        {
          color: colors.foreground,
          fontSize: 22,
          lineHeight: 28,
          fontFamily: "Inter_700Bold",
          letterSpacing: -0.5,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  style,
  muted,
  ...rest
}: TextProps & { style?: TextStyle; muted?: boolean }) {
  const colors = useColors();
  return (
    <Text
      {...rest}
      style={[
        {
          color: muted ? colors.mutedForeground : colors.foreground,
          fontSize: 15,
          lineHeight: 22,
          fontFamily: "Inter_400Regular",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const colors = useColors();
  return (
    <Text
      style={[
        {
          color: colors.mutedForeground,
          fontSize: 12,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: 0.6,
          textTransform: "uppercase",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Divider() {
  const colors = useColors();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export function EmptyState({
  icon = "inbox",
  title,
  body,
  action,
}: {
  icon?: React.ComponentProps<typeof Feather>["name"];
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.secondary,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <Feather name={icon} size={24} color={colors.primary} />
      </View>
      <Text
        style={{
          color: colors.foreground,
          fontSize: 17,
          fontFamily: "Inter_600SemiBold",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {body && (
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 14,
            textAlign: "center",
            marginTop: 6,
            fontFamily: "Inter_400Regular",
            lineHeight: 20,
            maxWidth: 280,
          }}
        >
          {body}
        </Text>
      )}
      {action && <View style={{ marginTop: 16 }}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
});
