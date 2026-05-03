import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { formatDate, formatTime } from "@/lib/format";
import { fetchPublicEvent, submitPublicRsvp, type PublicEvent } from "@/lib/sync";
import { useInviteStore } from "@/store/InviteStore";

type Status = "yes" | "no" | "maybe";

/**
 * Universal Link / App Link entry point for `https://<host>/e/<id>`.
 *
 * - If the event lives in the host's local store (the user IS the host),
 *   redirect them to the event dashboard.
 * - Otherwise (guest tapped a friend's link), fetch the event from the
 *   api-server and render a self-contained RSVP screen that posts back
 *   via the same public endpoint the web landing page uses.
 */
export default function InviteEntry() {
  const params = useLocalSearchParams<{ id: string; t?: string }>();
  const id = params.id;
  const inviteToken = typeof params.t === "string" ? params.t : undefined;
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state } = useInviteStore();

  const localEvent = useMemo(
    () => (id ? state.events.find((e) => e.id === id) : undefined),
    [id, state.events],
  );

  const [remoteEvent, setRemoteEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not_found" | "forbidden" | "network" | null>(null);

  // Form state
  const [status, setStatus] = useState<Status | null>(null);
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [dietary, setDietary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || localEvent) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetchPublicEvent(id, inviteToken);
      if (cancelled) return;
      if (res.error) setError(res.error);
      else if (res.event) setRemoteEvent(res.event);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, inviteToken, localEvent]);

  if (!id) return <Redirect href="/" />;
  if (localEvent) return <Redirect href={`/event/${id}`} />;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (error || !remoteEvent) {
    const msg =
      error === "not_found"
        ? "This invite couldn't be found. Ask the host to send a fresh link."
        : error === "forbidden"
          ? "This is a private invite. Ask the host for a link with the access code."
          : "Couldn't load this invite. Check your connection and try again.";
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, padding: 24, paddingTop: insets.top + 24 },
        ]}
      >
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 8 }}>
          Hmm.
        </Text>
        <Text style={{ color: colors.text, opacity: 0.75, textAlign: "center", marginBottom: 24 }}>
          {msg}
        </Text>
        <Pressable
          onPress={() => router.replace("/")}
          style={{
            paddingHorizontal: 22,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: colors.text,
          }}
        >
          <Text style={{ color: colors.background, fontWeight: "700" }}>Go to Invitely</Text>
        </Pressable>
      </View>
    );
  }

  const accent = remoteEvent.customAccent || "#6366F1";
  const title = remoteEvent.customName?.trim() || remoteEvent.title;
  const tagline = remoteEvent.customTagline?.trim() || "";
  const hostName = remoteEvent.hostName?.trim() || "your host";

  if (submitted) {
    return (
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, padding: 24, paddingTop: insets.top + 24 },
        ]}
      >
        <Text style={{ fontSize: 56, marginBottom: 8 }}>🎉</Text>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 6 }}>
          You're on the list
        </Text>
        <Text style={{ color: colors.text, opacity: 0.75, textAlign: "center" }}>
          {hostName} has been notified of your RSVP.
        </Text>
      </View>
    );
  }

  const canSubmit = !!status && guestName.trim().length > 0 && !submitting;

  const onSubmit = async () => {
    if (!status) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await submitPublicRsvp(id, {
      guestName: guestName.trim(),
      status,
      message: message.trim() || undefined,
      plusOne,
      dietary: dietary.trim() || undefined,
      inviteToken,
    });
    setSubmitting(false);
    if (res.ok) setSubmitted(true);
    else setSubmitError("Couldn't send your RSVP. Try again.");
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.hero, { paddingTop: insets.top + 28 }]}>
        {remoteEvent.heroPhotoUri ? (
          <Image
            source={{ uri: remoteEvent.heroPhotoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: accent, opacity: 0.85 },
            ]}
          />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]} />
        <View style={styles.heroContent}>
          <View style={[styles.pill, { backgroundColor: accent }]}>
            <Text style={styles.pillText}>YOU'RE INVITED</Text>
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          {tagline ? <Text style={styles.heroSub}>{tagline}</Text> : null}
          <Text style={styles.heroSub}>Hosted by {hostName}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Row icon="📅" label={formatDate(remoteEvent.startISO)} sub={formatTime(remoteEvent.startISO)} color={colors.text} />
        {remoteEvent.location ? (
          <Row icon="📍" label={remoteEvent.location} color={colors.text} divider />
        ) : null}
        {remoteEvent.message ? (
          <Row icon="✨" sub={remoteEvent.message} color={colors.text} divider />
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
        <Text style={[styles.section, { color: colors.text }]}>Will you be there?</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {([
            ["yes", "I'm in"],
            ["maybe", "Maybe"],
            ["no", "Can't make it"],
          ] as Array<[Status, string]>).map(([key, label]) => {
            const active = status === key;
            return (
              <Pressable
                key={key}
                onPress={() => setStatus(key)}
                style={[
                  styles.opt,
                  {
                    borderColor: active ? accent : colors.border,
                    backgroundColor: active ? `${accent}22` : colors.card,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? accent : colors.text,
                    fontWeight: "600",
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Field label="Your name" value={guestName} onChange={setGuestName} placeholder="Jordan Lee" colors={colors} />
        <Field
          label="A short note (optional)"
          value={message}
          onChange={setMessage}
          placeholder="Wouldn't miss it!"
          colors={colors}
          multiline
        />
        <Pressable
          onPress={() => setPlusOne((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: plusOne ? accent : colors.border,
              backgroundColor: plusOne ? accent : "transparent",
            }}
          />
          <Text style={{ color: colors.text }}>Bringing a plus one</Text>
        </Pressable>
        <Field
          label="Dietary needs (optional)"
          value={dietary}
          onChange={setDietary}
          placeholder="Vegetarian, allergies, etc."
          colors={colors}
        />

        {submitError ? (
          <Text style={{ color: "#ff5577", marginTop: 12 }}>{submitError}</Text>
        ) : null}

        <Pressable
          disabled={!canSubmit}
          onPress={onSubmit}
          style={{
            marginTop: 18,
            backgroundColor: canSubmit ? accent : `${accent}55`,
            padding: 16,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Submit RSVP</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  sub,
  color,
  divider,
}: {
  icon: string;
  label?: string;
  sub?: string;
  color: string;
  divider?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
        paddingVertical: 10,
        borderTopWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderTopColor: "rgba(127,127,127,0.25)",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: "rgba(127,127,127,0.15)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        {label ? <Text style={{ color, fontWeight: "600" }}>{label}</Text> : null}
        {sub ? <Text style={{ color, opacity: 0.7, marginTop: 2 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  colors,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  colors: { text: string; card: string; border: string };
  multiline?: boolean;
}) {
  return (
    <>
      <Text style={{ color: colors.text, opacity: 0.65, fontSize: 12, marginTop: 12, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={`${colors.text}66`}
        multiline={multiline}
        style={{
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.text,
          fontSize: 15,
          minHeight: multiline ? 70 : undefined,
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: {
    minHeight: 320,
    paddingHorizontal: 24,
    paddingBottom: 80,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroContent: { position: "relative", zIndex: 1 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  heroTitle: { color: "#fff", fontSize: 30, fontWeight: "700", marginTop: 12, letterSpacing: -0.5 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 4 },
  card: {
    marginHorizontal: 16,
    marginTop: -56,
    padding: 16,
    borderRadius: 18,
  },
  section: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.6, opacity: 0.6, marginBottom: 10 },
  opt: { flex: 1, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1.5 },
});
