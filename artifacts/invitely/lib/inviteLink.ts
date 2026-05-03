import Constants from "expo-constants";
import { Platform } from "react-native";

import type { Event } from "@/store/types";

/**
 * Production fallback host. Kept in lockstep with the `associatedDomains`
 * + Android `intentFilters` host in `app.json` so the same URL that the
 * app emits is the same URL the OS knows how to intercept. Override with
 * `EXPO_PUBLIC_API_HOST` (or `EXPO_PUBLIC_DOMAIN`) in dev / preview builds.
 */
export const DEFAULT_PUBLIC_HOST = "invitely.replit.app";

/**
 * Public host that serves the api-server (HTTP API + the /e/:id web RSVP
 * landing page + the .well-known files for Universal Links / App Links).
 *
 * Resolution order:
 *  1. `EXPO_PUBLIC_API_HOST` / `EXPO_PUBLIC_DOMAIN` env (set by dev script
 *     to the active Replit dev domain so QR/share URLs work in-preview).
 *  2. `expoConfig.extra.publicHost` (overrideable per build profile).
 *  3. On web, the current `window.location.host`.
 *  4. The hardcoded production `DEFAULT_PUBLIC_HOST` so builds can never
 *     silently emit a non-https deep link (which would break Universal /
 *     App Link interception).
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
  return DEFAULT_PUBLIC_HOST;
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
  const host = getPublicHost() || DEFAULT_PUBLIC_HOST;
  const base = `https://${host}/e/${encodeURIComponent(event.id)}`;
  if (event.privacy === "invite-only" && event.inviteToken) {
    return `${base}?t=${encodeURIComponent(event.inviteToken)}`;
  }
  return base;
}
