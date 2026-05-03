import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Body, Button, Card, EmptyState, Pill, Section } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { usePlan } from "@/lib/gating";
import { relativeTime } from "@/lib/format";
import { useInviteStore } from "@/store/InviteStore";
import { Upload, UploadStatus } from "@/store/types";

const FILTERS: { key: UploadStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function ModerationQueue() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { state, setUploadStatus, addUpload } = useInviteStore();
  const event = state.events.find((e) => e.id === id);
  const plan = usePlan();
  const unlocked = id ? plan.isEventUnlocked(id) : false;

  // Hard-gate the moderation queue — premium-only feature, deep links blocked.
  React.useEffect(() => {
    if (event && !unlocked) {
      router.replace(`/upgrade?eventId=${event.id}`);
    }
  }, [event, unlocked, router]);

  const [filter, setFilter] = useState<UploadStatus | "all">("pending");

  const filtered = useMemo(() => {
    if (!event) return [];
    return event.uploads.filter((u) => filter === "all" || u.status === filter);
  }, [event, filter]);

  if (!event) return null;

  const onSeed = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.8,
    });
    if (result.canceled) return;
    for (const a of result.assets) {
      addUpload(event.id, {
        uri: a.uri,
        caption: undefined,
        guestName: state.profile.name || "Guest",
        consent: true,
        width: a.width,
        height: a.height,
      });
    }
  };

  return (
    <Screen contentStyle={{ padding: 20, gap: 18 }}>
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
          Photo moderation
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? event.uploads.length
              : event.uploads.filter((u) => u.status === f.key).length;
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.secondary : colors.card,
                flexDirection: "row",
                gap: 6,
                alignItems: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  color: active ? colors.primary : colors.foreground,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                }}
              >
                {f.label}
              </Text>
              <Text
                style={{
                  color: active ? colors.primary : colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                }}
              >
                {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          icon="image"
          title="Nothing in this queue"
          body={
            event.uploads.length === 0
              ? "Once guests upload, you can approve or reject from here."
              : "Try a different filter — or let guests keep posting."
          }
          action={
            event.uploads.length === 0 ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  label="Add as guest"
                  variant="secondary"
                  icon="upload"
                  onPress={() => router.push(`/event/${event.id}/upload`)}
                />
                <Button label="Seed test photos" icon="image" onPress={onSeed} />
              </View>
            ) : null
          }
        />
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((u) => (
            <UploadRow
              key={u.id}
              upload={u}
              onApprove={() => setUploadStatus(event.id, u.id, "approved")}
              onReject={() => setUploadStatus(event.id, u.id, "rejected")}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function UploadRow({
  upload,
  onApprove,
  onReject,
}: {
  upload: Upload;
  onApprove: () => void;
  onReject: () => void;
}) {
  const colors = useColors();
  return (
    <Card padded={false}>
      <View
        style={{
          aspectRatio:
            upload.width && upload.height ? upload.width / upload.height : 4 / 3,
          backgroundColor: colors.muted,
        }}
      >
        <Image source={{ uri: upload.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
        <View style={{ position: "absolute", top: 10, left: 10, flexDirection: "row", gap: 6 }}>
          <Pill
            label={upload.status}
            tone={
              upload.status === "approved"
                ? "yes"
                : upload.status === "rejected"
                  ? "no"
                  : "warn"
            }
          />
        </View>
      </View>
      <View style={{ padding: 14, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_600SemiBold",
              fontSize: 14,
            }}
          >
            {upload.guestName}
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 12,
            }}
          >
            {relativeTime(upload.createdAt)}
          </Text>
        </View>
        {upload.caption ? (
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            "{upload.caption}"
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          {upload.status !== "approved" && (
            <Button label="Approve" icon="check" onPress={onApprove} />
          )}
          {upload.status !== "rejected" && (
            <Button
              label="Reject"
              icon="x"
              variant="ghost"
              onPress={onReject}
            />
          )}
        </View>
      </View>
    </Card>
  );
}
