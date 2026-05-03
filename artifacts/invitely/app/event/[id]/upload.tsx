import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Field } from "@/components/Field";
import { Body, Button, Card, EmptyState, Pill, Section } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { relativeTime } from "@/lib/format";
import { useInviteStore } from "@/store/InviteStore";

export default function UploadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { state, addUpload, removeUpload } = useInviteStore();
  const event = state.events.find((e) => e.id === id);

  const [picked, setPicked] = useState<{ uri: string; w?: number; h?: number } | null>(null);
  const [caption, setCaption] = useState("");
  const [guestName, setGuestName] = useState(state.profile.name || "");
  const [consent, setConsent] = useState(false);

  if (!event) {
    return (
      <View style={{ flex: 1, padding: 24, backgroundColor: colors.background }}>
        <EmptyState title="Event not found" />
      </View>
    );
  }

  const myUploads = event.uploads.filter(
    (u) =>
      u.guestName.trim().toLowerCase() ===
      (guestName || state.profile.name || "").trim().toLowerCase(),
  );

  const onPick = async (fromCamera: boolean) => {
    const fn = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const result = await fn({
      mediaTypes: "images",
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setPicked({ uri: a.uri, w: a.width, h: a.height });
    }
  };

  const onSubmit = () => {
    if (!picked || !consent || !guestName.trim()) return;
    addUpload(event.id, {
      uri: picked.uri,
      caption: caption.trim() || undefined,
      guestName: guestName.trim(),
      consent,
      width: picked.w,
      height: picked.h,
    });
    setPicked(null);
    setCaption("");
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
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
          Add a memory
        </Text>
      </View>

      {!picked ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => onPick(true)}
            style={({ pressed }) => ({
              flex: 1,
              padding: 22,
              borderRadius: 18,
              backgroundColor: colors.inverseSurface,
              alignItems: "center",
              gap: 10,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Feather name="camera" size={24} color={colors.inverseSurfaceForeground} />
            <Text
              style={{
                color: colors.inverseSurfaceForeground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              Take photo
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onPick(false)}
            style={({ pressed }) => ({
              flex: 1,
              padding: 22,
              borderRadius: 18,
              borderWidth: 1.5,
              borderColor: colors.primary,
              backgroundColor: colors.secondary,
              alignItems: "center",
              gap: 10,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Feather name="image" size={24} color={colors.primary} />
            <Text
              style={{
                color: colors.primary,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              From library
            </Text>
          </Pressable>
        </View>
      ) : (
        <Card padded={false}>
          <View
            style={{
              aspectRatio: picked.w && picked.h ? picked.w / picked.h : 1,
              backgroundColor: colors.muted,
            }}
          >
            <Image source={{ uri: picked.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          </View>
          <View style={{ padding: 14, gap: 14 }}>
            <Field
              label="Your name"
              value={guestName}
              onChangeText={setGuestName}
              placeholder="Jordan"
              autoCapitalize="words"
            />
            <Field
              label="Caption (optional)"
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={2}
              placeholder="Best dance floor moment of the night."
            />
            <Pressable
              onPress={() => setConsent((v) => !v)}
              style={{ flexDirection: "row", gap: 12 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: consent ? colors.primary : colors.border,
                  backgroundColor: consent ? colors.primary : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 2,
                }}
              >
                {consent && <Feather name="check" size={14} color={colors.primaryForeground} />}
              </View>
              <Text
                style={{
                  flex: 1,
                  color: colors.foreground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                I'm in this photo or have permission to share it. GPS metadata is
                stripped automatically.
              </Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                label="Discard"
                variant="ghost"
                onPress={() => setPicked(null)}
              />
              <Button
                label="Upload"
                icon="upload"
                fullWidth
                style={{ flex: 1 }}
                onPress={onSubmit}
                disabled={!consent || !guestName.trim()}
              />
            </View>
          </View>
        </Card>
      )}

      <Section title={`My uploads · ${myUploads.length}`}>
        {myUploads.length === 0 ? (
          <EmptyState
            icon="image"
            title="No uploads yet"
            body="Pictures you add show up here with their review status."
          />
        ) : (
          <View style={{ gap: 10 }}>
            {myUploads.map((u) => (
              <Card key={u.id}>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Image
                    source={{ uri: u.uri }}
                    style={{ width: 70, height: 70, borderRadius: 12 }}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
                      <Pill
                        label={u.status}
                        tone={
                          u.status === "approved"
                            ? "yes"
                            : u.status === "rejected"
                              ? "no"
                              : "warn"
                        }
                      />
                    </View>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_500Medium",
                        fontSize: 13,
                        lineHeight: 18,
                      }}
                      numberOfLines={2}
                    >
                      {u.caption || "No caption"}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                        fontSize: 11,
                        marginTop: 4,
                      }}
                    >
                      {relativeTime(u.createdAt)}
                    </Text>
                  </View>
                  {u.status === "pending" && (
                    <Pressable
                      onPress={() => removeUpload(event.id, u.id)}
                      hitSlop={10}
                      style={{ padding: 6 }}
                    >
                      <Feather name="x" size={18} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
              </Card>
            ))}
          </View>
        )}
      </Section>

      <Body muted style={{ fontSize: 12, textAlign: "center" }}>
        You have a 5-minute grace period to delete your upload before review.
      </Body>
    </KeyboardAwareScrollView>
  );
}
