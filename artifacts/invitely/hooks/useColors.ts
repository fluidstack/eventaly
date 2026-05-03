import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

export function useColors() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const palette = isDark ? colors.dark : colors.light;
  return {
    ...palette,
    radius: colors.radius,
    scheme: (isDark ? "dark" : "light") as "dark" | "light",
  };
}
