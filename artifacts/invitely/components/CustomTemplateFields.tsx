import React from "react";
import { Pressable, Text, View } from "react-native";

import { Field } from "@/components/Field";
import { Card, Label, Section } from "@/components/ui";
import { ACCENT_PRESETS } from "@/constants/templates";
import { useColors } from "@/hooks/useColors";

type Props = {
  name: string;
  onChangeName: (v: string) => void;
  tagline: string;
  onChangeTagline: (v: string) => void;
  accent: string;
  onChangeAccent: (v: string) => void;
  /** Optional footer slot — used to render "Save as preset" actions. */
  footer?: React.ReactNode;
};

export function CustomTemplateFields({
  name,
  onChangeName,
  tagline,
  onChangeTagline,
  accent,
  onChangeAccent,
  footer,
}: Props) {
  const colors = useColors();
  return (
    <Card>
      <Section title="Make it yours">
        <View style={{ gap: 14 }}>
          <Field
            label="Template name"
            value={name}
            onChangeText={onChangeName}
            placeholder="Reunion, House warming, Farewell…"
            autoCapitalize="words"
          />
          <Field
            label="Tagline"
            value={tagline}
            onChangeText={onChangeTagline}
            placeholder="A short vibe — e.g. Long table, longer stories"
          />
          <View style={{ gap: 8 }}>
            <Label>Accent color</Label>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {ACCENT_PRESETS.map((c) => {
                const active = accent.toLowerCase() === c.toLowerCase();
                return (
                  <Pressable
                    key={c}
                    onPress={() => onChangeAccent(c)}
                    style={({ pressed }) => ({
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: c,
                      borderWidth: active ? 3 : 1,
                      borderColor: active ? colors.foreground : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  />
                );
              })}
            </View>
            <Text
              style={{
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              The hero photo below acts as your custom template image. Pick one
              or we'll use a soft default.
            </Text>
          </View>
          {footer ? <View style={{ marginTop: 4 }}>{footer}</View> : null}
        </View>
      </Section>
    </Card>
  );
}
