import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { Field } from "@/components/Field";
import { Button, Card, Label, Pill, Section } from "@/components/ui";
import { TEMPLATES, TemplateId, getTemplate } from "@/constants/templates";
import { useColors } from "@/hooks/useColors";
import { useInviteStore } from "@/store/InviteStore";

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { state, updateEvent } = useInviteStore();
  const event = state.events.find((e) => e.id === id);

  const [title, setTitle] = useState(event?.title ?? "");
  const [templateId, setTemplateId] = useState<TemplateId>(event?.templateId ?? "birthday");
  const [heroPhotoUri, setHeroPhotoUri] = useState<string | undefined>(event?.heroPhotoUri);
  const [message, setMessage] = useState(event?.message ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const startDate = event ? new Date(event.startISO) : new Date();
  const [date, setDate] = useState(formatDateForInput(startDate));
  const [time, setTime] = useState(formatTimeForInput(startDate));

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
        <Text style={{ color: colors.foreground }}>Event not found.</Text>
      </View>
    );
  }

  const template = getTemplate(templateId);

  const onPickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setHeroPhotoUri(result.assets[0].uri);
    }
  };

  const onSave = () => {
    let startISO = event.startISO;
    try {
      const dt = new Date(`${date}T${time}:00`);
      if (!isNaN(dt.getTime())) startISO = dt.toISOString();
    } catch {}
    updateEvent(event.id, {
      title: title.trim() || event.title,
      templateId,
      heroPhotoUri,
      message: message.trim(),
      location: location.trim(),
      startISO,
    });
    router.back();
  };

  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
      bottomOffset={20}
    >
      <Section title="Template">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {TEMPLATES.map((t) => {
            const active = t.id === templateId;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTemplateId(t.id)}
                style={{
                  width: 110,
                  borderRadius: 14,
                  overflow: "hidden",
                  borderWidth: 2,
                  borderColor: active ? colors.primary : "transparent",
                }}
              >
                <Image source={t.image} style={{ width: "100%", height: 130 }} contentFit="cover" />
                <View style={{ padding: 8, backgroundColor: colors.card }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                    }}
                  >
                    {t.name}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Section>

      <Section title="Hero photo">
        <Pressable onPress={onPickPhoto}>
          <View
            style={{
              height: 180,
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Image
              source={heroPhotoUri ? { uri: heroPhotoUri } : template.image}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button label="Change photo" variant="ghost" icon="image" onPress={onPickPhoto} />
          {heroPhotoUri && (
            <Button
              label="Reset"
              variant="ghost"
              icon="x"
              onPress={() => setHeroPhotoUri(undefined)}
            />
          )}
        </View>
      </Section>

      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        autoCapitalize="words"
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1.4 }}>
          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Time" value={time} onChangeText={setTime} placeholder="19:00" />
        </View>
      </View>

      <Field label="Location" value={location} onChangeText={setLocation} />

      <Field
        label="Message"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
        style={{ minHeight: 110, textAlignVertical: "top" }}
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        <Button
          label="Save changes"
          icon="check"
          fullWidth
          style={{ flex: 1 }}
          onPress={onSave}
        />
      </View>
    </KeyboardAwareScrollView>
  );
}

function formatDateForInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeForInput(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
