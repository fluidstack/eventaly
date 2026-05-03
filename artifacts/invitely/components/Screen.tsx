import React from "react";
import { Platform, ScrollView, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export function Screen({
  children,
  scroll = true,
  noTopInset = false,
  contentStyle,
  refreshControl,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  noTopInset?: boolean;
  contentStyle?: ViewStyle;
  refreshControl?: React.ReactElement<any>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = noTopInset ? 0 : isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 + 84 : 100;

  if (!scroll) {
    return (
      <View
        style={[
          {
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: topPad,
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        { paddingTop: topPad, paddingBottom: bottomPad },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}
