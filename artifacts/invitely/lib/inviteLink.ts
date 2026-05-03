import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

import type { Event } from "@/store/types";

/**
 * Public host that serves the api-server (HTTP API + the /e/:id web RSVP
 * landing page + the .well-known files for Universal Links / App Links).
 *
 * In dev we resolve from the Replit dev domain. In a real build, ship the
 * production host as `EXPO_PUBLIC_API_HOST` (or `EXPO_PUBLIC_DOMAIN`).
 */
export function getPublicHost(): string {
  const explicit =
    process.env.EXPO_PUBLIC_API_HOST ||
    process.env.EXPO_PUBLIC_DOMAIN ||
    (Constants.expoConfig?.extra as Record<string, string> | undefined)?.publicHost;
  if (explicit) {
    return explicit.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.host;
  }
  return "";
}

export function getApiBase(): string {
  const host = getPublicHost();
  if (!host) return "";
  return `https://${host}/api`;
}

/**
 * The shareable invite URL used everywhere we ask the user to send the link
 * out (share sheet, SMS, WhatsApp, email, copy, QR code). The same URL also
 * deep-links into the app via Universal Links / App Links when installed.
 */
export function getInviteUrl(event: Pick<Event, "id" | "privacy" | "inviteToken">): string {
  const host = getPublicHost();
  if (!host) {
    // Fallback to the in-app scheme when no public host is configured (e.g.
    // running in an isolated dev build with no env). Keeps QR/share flows
    // functional even if the link won't resolve on the open web.
    return Linking.createURL(`/event/${event.id}/guest`);
  }
  const base = `https://${host}/e/${encodeURIComponent(event.id)}`;
  if (event.privacy === "invite-only" && event.inviteToken) {
    return `${base}?t=${encodeURIComponent(event.inviteToken)}`;
  }
  return base;
}
