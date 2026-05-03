import { Feather } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image as RNImage,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Button } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { HERO_FILTERS, HeroFilterId, getHeroFilter } from "@/lib/heroFilters";

type Props = {
  visible: boolean;
  sourceUri?: string;
  initialFilter?: HeroFilterId;
  onCancel: () => void;
  onSave: (result: { uri: string; filter: HeroFilterId }) => void;
};

const ASPECT_W = 3;
const ASPECT_H = 4;
const FRAME_WIDTH = 270;
const FRAME_HEIGHT = (FRAME_WIDTH * ASPECT_H) / ASPECT_W;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

export function HeroPhotoEditor({
  visible,
  sourceUri,
  initialFilter = "none",
  onCancel,
  onSave,
}: Props) {
  const colors = useColors();
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [filter, setFilter] = useState<HeroFilterId>(initialFilter);
  const [saving, setSaving] = useState(false);

  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  const baseSize = useMemo(() => {
    if (!natural) return { w: FRAME_WIDTH, h: FRAME_HEIGHT };
    const ratio = natural.w / natural.h;
    const frameRatio = FRAME_WIDTH / FRAME_HEIGHT;
    if (ratio > frameRatio) {
      return { w: FRAME_HEIGHT * ratio, h: FRAME_HEIGHT };
    }
    return { w: FRAME_WIDTH, h: FRAME_WIDTH / ratio };
  }, [natural]);

  const reset = () => {
    scale.value = withTiming(1, { duration: 180 });
    tx.value = withTiming(0, { duration: 180 });
    ty.value = withTiming(0, { duration: 180 });
  };

  useEffect(() => {
    if (!visible) return;
    setFilter(initialFilter);
    setNatural(null);
    scale.value = 1;
    tx.value = 0;
    ty.value = 0;
    if (!sourceUri) return;
    RNImage.getSize(
      sourceUri,
      (w, h) => setNatural({ w, h }),
      () => setNatural({ w: FRAME_WIDTH, h: FRAME_HEIGHT }),
    );
  }, [visible, sourceUri, initialFilter]);

  const clamp = (val: number, min: number, max: number) => {
    "worklet";
    return Math.min(Math.max(val, min), max);
  };

  const clampOffsets = () => {
    "worklet";
    const sw = baseSize.w * scale.value;
    const sh = baseSize.h * scale.value;
    const maxX = Math.max(0, (sw - FRAME_WIDTH) / 2);
    const maxY = Math.max(0, (sh - FRAME_HEIGHT) / 2);
    tx.value = clamp(tx.value, -maxX, maxX);
    ty.value = clamp(ty.value, -maxY, maxY);
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startTx.value + e.translationX;
      ty.value = startTy.value + e.translationY;
    })
    .onEnd(() => {
      clampOffsets();
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(startScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      clampOffsets();
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const doSave = async () => {
    if (!sourceUri || !natural) return;
    setSaving(true);
    try {
      // Map current frame to image-space crop rect.
      const renderedW = baseSize.w * scale.value;
      const renderedH = baseSize.h * scale.value;
      const pxPerImageUnitX = renderedW / natural.w;
      const pxPerImageUnitY = renderedH / natural.h;
      // Center of the rendered image relative to the frame center is (tx, ty).
      // Frame top-left in rendered-image coordinates:
      const frameLeftInRendered = renderedW / 2 - tx.value - FRAME_WIDTH / 2;
      const frameTopInRendered = renderedH / 2 - ty.value - FRAME_HEIGHT / 2;
      const cropX = Math.max(0, frameLeftInRendered / pxPerImageUnitX);
      const cropY = Math.max(0, frameTopInRendered / pxPerImageUnitY);
      const cropW = Math.min(
        natural.w - cropX,
        FRAME_WIDTH / pxPerImageUnitX,
      );
      const cropH = Math.min(
        natural.h - cropY,
        FRAME_HEIGHT / pxPerImageUnitY,
      );

      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        [
          {
            crop: {
              originX: Math.round(cropX),
              originY: Math.round(cropY),
              width: Math.round(cropW),
              height: Math.round(cropH),
            },
          },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      onSave({ uri: result.uri, filter });
    } catch {
      // Fall back: keep original uri if cropping fails.
      onSave({ uri: sourceUri, filter });
    } finally {
      setSaving(false);
    }
  };

  const triggerSave = () => {
    // We need to read shared values on JS thread; they are already JS-readable.
    doSave();
  };

  const activeFilter = getHeroFilter(filter);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onCancel}
      transparent={false}
    >
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0b0b0c" }}>
        <View style={{ flex: 1, paddingTop: Platform.OS === "ios" ? 54 : 28 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingBottom: 8,
            }}
          >
            <Pressable
              onPress={onCancel}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            >
              <Feather name="x" size={18} color="#fff" />
            </Pressable>
            <Text
              style={{
                color: "#fff",
                fontFamily: "Inter_600SemiBold",
                fontSize: 15,
              }}
            >
              Adjust photo
            </Text>
            <Pressable
              onPress={reset}
              hitSlop={12}
              style={{
                paddingHorizontal: 12,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.08)",
                flexDirection: "row",
                gap: 6,
              }}
            >
              <Feather name="rotate-ccw" size={13} color="#fff" />
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                }}
              >
                Reset
              </Text>
            </Pressable>
          </View>

          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 20,
            }}
          >
            <GestureDetector gesture={composed}>
              <View
                style={{
                  width: FRAME_WIDTH,
                  height: FRAME_HEIGHT,
                  overflow: "hidden",
                  borderRadius: 18,
                  backgroundColor: "#000",
                  borderWidth: 2,
                  borderColor: "rgba(255,255,255,0.85)",
                }}
              >
                {sourceUri ? (
                  <Animated.View
                    style={[
                      {
                        position: "absolute",
                        left: (FRAME_WIDTH - baseSize.w) / 2,
                        top: (FRAME_HEIGHT - baseSize.h) / 2,
                        width: baseSize.w,
                        height: baseSize.h,
                      },
                      animatedStyle,
                    ]}
                  >
                    <ExpoImage
                      source={{ uri: sourceUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="fill"
                    />
                  </Animated.View>
                ) : (
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: activeFilter.overlayColor,
                    opacity: activeFilter.overlayOpacity,
                  }}
                />
              </View>
            </GestureDetector>
            <Text
              style={{
                color: "rgba(255,255,255,0.65)",
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                marginTop: 12,
                textAlign: "center",
              }}
            >
              {Platform.OS === "web"
                ? "Drag to reposition. Use the +/- to zoom."
                : "Drag to reposition. Pinch to zoom."}
            </Text>
            {Platform.OS === "web" && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <ZoomButton
                  icon="minus"
                  onPress={() => {
                    scale.value = Math.max(MIN_SCALE, scale.value - 0.25);
                    clampOffsets();
                  }}
                />
                <ZoomButton
                  icon="plus"
                  onPress={() => {
                    scale.value = Math.min(MAX_SCALE, scale.value + 0.25);
                    clampOffsets();
                  }}
                />
              </View>
            )}
          </View>

          <View style={{ paddingTop: 8, paddingBottom: 8 }}>
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontFamily: "Inter_600SemiBold",
                fontSize: 11,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                paddingHorizontal: 20,
                marginBottom: 8,
              }}
            >
              Filters
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                gap: 10,
              }}
            >
              {HERO_FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setFilter(f.id)}
                    style={{
                      width: 64,
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        overflow: "hidden",
                        borderWidth: 2,
                        borderColor: active
                          ? "#fff"
                          : "rgba(255,255,255,0.18)",
                        backgroundColor: "#222",
                      }}
                    >
                      {sourceUri ? (
                        <ExpoImage
                          source={{ uri: sourceUri }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      ) : null}
                      <View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: 0,
                          bottom: 0,
                          backgroundColor: f.overlayColor,
                          opacity: f.overlayOpacity,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        color: active ? "#fff" : "rgba(255,255,255,0.65)",
                        fontFamily: active
                          ? "Inter_600SemiBold"
                          : "Inter_400Regular",
                        fontSize: 11,
                      }}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View
            style={{
              padding: 16,
              paddingBottom: Platform.OS === "ios" ? 36 : 20,
              flexDirection: "row",
              gap: 10,
            }}
          >
            <Pressable
              onPress={onCancel}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 22,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                Cancel
              </Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Button
                label={saving ? "Saving…" : "Use this photo"}
                icon="check"
                fullWidth
                disabled={!sourceUri || !natural || saving}
                loading={saving}
                onPress={triggerSave}
              />
            </View>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomButton({
  icon,
  onPress,
}: {
  icon: "plus" | "minus";
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.12)",
      }}
    >
      <Feather name={icon} size={16} color="#fff" />
    </Pressable>
  );
}

