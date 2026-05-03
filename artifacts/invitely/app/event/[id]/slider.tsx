import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Body, Button, Card, EmptyState, Pill, Section } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { useInviteStore } from "@/store/InviteStore";
import { SliderPreset } from "@/store/types";

const PRESETS: { key: SliderPreset; label: string; desc: string }[] = [
  { key: "fade", label: "Fade", desc: "Cinematic crossfade between photos." },
  { key: "stack", label: "Stack", desc: "Photos stack and zoom forward." },
  { key: "reel", label: "Reel", desc: "Quick-cut reel with snappy entrance." },
];

export default function SliderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { state, updateSlider } = useInviteStore();
  const event = state.events.find((e) => e.id === id);

  const [playing, setPlaying] = useState(false);

  if (!event) return null;

  const approved = event.uploads.filter((u) => u.status === "approved");
  const orderedIds =
    event.slider.orderedUploadIds.length > 0
      ? event.slider.orderedUploadIds.filter((id) => approved.some((u) => u.id === id))
      : approved.map((u) => u.id);
  const ordered = orderedIds
    .map((id) => approved.find((u) => u.id === id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u));

  const toggleInSlider = (uploadId: string) => {
    const next = orderedIds.includes(uploadId)
      ? orderedIds.filter((id) => id !== uploadId)
      : [...orderedIds, uploadId];
    updateSlider(event.id, { orderedUploadIds: next });
  };

  const move = (uploadId: string, dir: -1 | 1) => {
    const idx = orderedIds.indexOf(uploadId);
    if (idx < 0) return;
    const next = [...orderedIds];
    const newIdx = Math.max(0, Math.min(next.length - 1, idx + dir));
    next.splice(idx, 1);
    next.splice(newIdx, 0, uploadId);
    updateSlider(event.id, { orderedUploadIds: next });
  };

  const onPublish = () => {
    updateSlider(event.id, {
      published: true,
      orderedUploadIds: orderedIds,
      publishedAt: new Date().toISOString(),
    });
  };

  const onUnpublish = () => {
    updateSlider(event.id, { published: false, publishedAt: undefined });
  };

  return (
    <Screen contentStyle={{ padding: 20, gap: 22 }}>
      <View>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_500Medium",
            fontSize: 12,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          {event.title}
        </Text>
        <Text
          style={{
            color: colors.foreground,
            fontSize: 26,
            fontFamily: "Inter_700Bold",
            letterSpacing: -0.5,
            marginTop: 4,
          }}
        >
          Thank-you slider
        </Text>
        <Body muted style={{ marginTop: 6 }}>
          Compose a curated slider from approved photos. Publish when ready and
          guests are notified.
        </Body>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          label="Preview"
          icon="play"
          fullWidth
          style={{ flex: 1 }}
          disabled={ordered.length === 0}
          onPress={() => setPlaying(true)}
        />
        {event.slider.published ? (
          <Button label="Unpublish" icon="eye-off" variant="ghost" onPress={onUnpublish} />
        ) : (
          <Button
            label="Publish"
            variant="secondary"
            icon="upload-cloud"
            disabled={ordered.length === 0}
            onPress={onPublish}
          />
        )}
      </View>

      {event.slider.published && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#D1FAE5",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="check" size={18} color="#065F46" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 14,
                }}
              >
                Slider is live
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Guests with the link can view and download the slider.
              </Text>
            </View>
          </View>
        </Card>
      )}

      <Section title="Animation preset">
        <View style={{ gap: 8 }}>
          {PRESETS.map((p) => {
            const active = event.slider.preset === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => updateSlider(event.id, { preset: p.key })}
                style={({ pressed }) => ({
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.secondary : colors.card,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: active ? colors.primary : colors.border,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.primary,
                      }}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 14,
                    }}
                  >
                    {p.label}
                  </Text>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {p.desc}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title={`In slider · ${ordered.length}`}>
        {ordered.length === 0 ? (
          <EmptyState
            icon="film"
            title="No photos selected yet"
            body="Tap photos below to add them to the slider in tap order."
          />
        ) : (
          <View style={{ gap: 8 }}>
            {ordered.map((u, idx) => (
              <Card key={u.id} padded={false}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: colors.foreground,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontFamily: "Inter_700Bold",
                        fontSize: 12,
                      }}
                    >
                      {idx + 1}
                    </Text>
                  </View>
                  <Image
                    source={{ uri: u.uri }}
                    style={{ width: 56, height: 56, borderRadius: 8 }}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 13,
                      }}
                      numberOfLines={2}
                    >
                      {u.caption || u.guestName}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <Pressable onPress={() => move(u.id, -1)} hitSlop={8} style={{ padding: 6 }}>
                      <Feather name="chevron-up" size={20} color={colors.mutedForeground} />
                    </Pressable>
                    <Pressable onPress={() => move(u.id, 1)} hitSlop={8} style={{ padding: 6 }}>
                      <Feather name="chevron-down" size={20} color={colors.mutedForeground} />
                    </Pressable>
                    <Pressable
                      onPress={() => toggleInSlider(u.id)}
                      hitSlop={8}
                      style={{ padding: 6 }}
                    >
                      <Feather name="x" size={18} color={colors.destructive} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </Section>

      <Section title="All approved photos">
        {approved.length === 0 ? (
          <EmptyState
            icon="image"
            title="No approved photos yet"
            body="Approve photos from the moderation queue to add them to the slider."
            action={
              <Button
                label="Open queue"
                icon="image"
                onPress={() => router.push(`/event/${event.id}/uploads`)}
              />
            }
          />
        ) : (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {approved.map((u) => {
              const active = orderedIds.includes(u.id);
              return (
                <Pressable
                  key={u.id}
                  onPress={() => toggleInSlider(u.id)}
                  style={({ pressed }) => ({
                    width: "32%",
                    aspectRatio: 1,
                    borderRadius: 10,
                    overflow: "hidden",
                    borderWidth: active ? 3 : 1,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Image source={{ uri: u.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  {active && (
                    <View
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Feather name="check" size={14} color={colors.primaryForeground} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </Section>

      {playing && (
        <SliderPlayer
          uris={ordered.map((u) => u.uri)}
          captions={ordered.map((u) => u.caption || u.guestName)}
          preset={event.slider.preset}
          onClose={() => setPlaying(false)}
        />
      )}
    </Screen>
  );
}

function SliderPlayer({
  uris,
  captions,
  preset,
  onClose,
}: {
  uris: string[];
  captions: string[];
  preset: SliderPreset;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (uris.length === 0) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % uris.length);
    }, 2800);
    return () => clearInterval(t);
  }, [uris.length]);

  useEffect(() => {
    opacity.value = 0;
    scale.value = preset === "stack" ? 0.94 : preset === "reel" ? 1.06 : 1;
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [idx, preset, opacity, scale]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal visible animationType="fade" presentationStyle="overFullScreen" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {uris[idx] && (
          <Animated.View style={[{ width: "100%", height: "100%" }, aStyle]}>
            <Image source={{ uri: uris[idx] }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
          </Animated.View>
        )}
        <View
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            right: 0,
            paddingHorizontal: 32,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontFamily: "Inter_600SemiBold",
              fontSize: 16,
              textAlign: "center",
              textShadowColor: "rgba(0,0,0,0.6)",
              textShadowRadius: 6,
            }}
          >
            {captions[idx]}
          </Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 14 }}>
            {uris.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === idx ? 22 : 6,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: i === idx ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              />
            ))}
          </View>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={20}
          style={{
            position: "absolute",
            top: Platform.OS === "ios" ? 60 : 30,
            right: 22,
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Feather name="x" size={20} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}
