import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const LOGO = require("../assets/images/splash-logo.png");
const BG = "#0B0B12";

export function AnimatedSplash({ onFinish }: { onFinish?: () => void }) {
  const [hidden, setHidden] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);
  const overlay = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    scale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
    overlay.value = withDelay(
      1400,
      withTiming(
        0,
        { duration: 450, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) {
            runOnJS(setHidden)(true);
            if (onFinish) runOnJS(onFinish)();
          }
        },
      ),
    );
  }, [onFinish, opacity, overlay, scale]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (hidden) return null;

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "auto"}
      style={[StyleSheet.absoluteFill, styles.container, overlayStyle]}
    >
      <Animated.View style={logoStyle}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  logo: {
    width: 280,
    height: 80,
  },
});
