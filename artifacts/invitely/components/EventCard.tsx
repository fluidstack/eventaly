import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { Pill } from "@/components/ui";
import { getTemplate } from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import { formatDate, formatTime } from "@/lib/format";
import { Event } from "@/store/types";

export function EventCard({ event }: { event: Event }) {
  const colors = useColors();
  const router = useRouter();
  const template = getTemplate(event.templateId);
  const yesCount = event.rsvps.filter((r) => r.status === "yes").length;
  const plusOnes = event.rsvps.filter((r) => r.plusOne && r.status === "yes").length;
  const total = yesCount + plusOnes;
  const isPast = new Date(event.startISO).getTime() < Date.now();

  const heroSource = event.heroPhotoUri ? { uri: event.heroPhotoUri } : template.image;

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => ({
        borderRadius: 22,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
        transform: [{ scale: pressed ? 0.99 : 1 }],
        backgroundColor: colors.card,
      })}
    >
      <View style={{ height: 200 }}>
        <Image
          source={heroSource}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.55)"]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120 }}
        />
        <View
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            flexDirection: "row",
            gap: 6,
          }}
        >
          <Pill label={template.name} tone="primary" />
          {isPast && <Pill label="Past" tone="neutral" />}
          {event.slider.published && (
            <Pill label="Slider Live" icon="film" tone="yes" />
          )}
        </View>
        <View style={{ position: "absolute", bottom: 14, left: 16, right: 16 }}>
          <Text
            style={{
              color: "#fff",
              fontSize: 22,
              fontFamily: "Inter_700Bold",
              letterSpacing: -0.5,
            }}
            numberOfLines={2}
          >
            {event.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Feather name="calendar" size={13} color="rgba(255,255,255,0.9)" />
            <Text
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: 13,
                fontFamily: "Inter_500Medium",
              }}
            >
              {formatDate(event.startISO)} · {formatTime(event.startISO)}
            </Text>
          </View>
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 18,
          alignItems: "center",
        }}
      >
        <Stat icon="users" value={`${total}`} label="Going" colors={colors} />
        <View style={{ width: 1, height: 26, backgroundColor: colors.border }} />
        <Stat
          icon="image"
          value={`${event.uploads.length}`}
          label="Photos"
          colors={colors}
        />
        <View style={{ width: 1, height: 26, backgroundColor: colors.border }} />
        <Stat
          icon="map-pin"
          value={event.location.split(",")[0] || "—"}
          label="Where"
          colors={colors}
          flex
        />
      </View>
    </Pressable>
  );
}

function Stat({
  icon,
  value,
  label,
  colors,
  flex,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  value: string;
  label: string;
  colors: ReturnType<typeof useColors>;
  flex?: boolean;
}) {
  return (
    <View style={{ flex: flex ? 1 : 0, minWidth: flex ? 0 : undefined }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Feather name={icon} size={13} color={colors.mutedForeground} />
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 14,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      <Text
        style={{
          color: colors.mutedForeground,
          fontSize: 11,
          marginTop: 2,
          fontFamily: "Inter_500Medium",
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
