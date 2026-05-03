import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function CreateTabRedirect() {
  const router = useRouter();
  const colors = useColors();
  useFocusEffect(
    useCallback(() => {
      router.replace("/event/new");
    }, [router]),
  );
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
