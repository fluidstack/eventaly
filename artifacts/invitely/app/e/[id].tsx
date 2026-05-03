import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

/**
 * Universal Link / App Link entry point.
 *
 * When a user taps `https://<host>/e/<id>` on a device with the app
 * installed, the OS routes the URL into the app and Expo Router resolves
 * it to this screen. We then forward to the in-app guest view, which
 * already knows how to render an event by id.
 *
 * Web users (no app installed) hit the api-server's HTML landing page
 * instead — this route is only reached inside the app.
 */
export default function InviteEntry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <Redirect href="/" />;
  return <Redirect href={`/event/${id}/guest`} />;
}
