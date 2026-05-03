# What's needed to ship Invitely to production

Nothing here blocks the dev preview — these are only required for the
published build so invite links open the real app on real devices and the
web invite page can install it.

---

## 1. A production domain

You need one stable HTTPS host where the api-server lives. Options:

- **Easiest**: publish the project on Replit and use the auto-generated
  `*.replit.app` domain.
- **Best for branding**: a custom domain (e.g. `invite.yourbrand.com`)
  pointed at the Replit deployment.

Whatever you pick, the same host has to appear in three places (currently
all three are set to `invitely.replit.app` as a placeholder):

- `artifacts/invitely/lib/inviteLink.ts` → `DEFAULT_PUBLIC_HOST`
- `artifacts/invitely/app.json` → `ios.associatedDomains` and
  `android.intentFilters[].data.host`
- The `expo-router` plugin `origin` in `app.json`

Send me the domain and I'll line all three up.

---

## 2. Apple App Store details (iOS Universal Links + install button)

- **Apple Team ID** — 10-character string from your Apple Developer
  account, e.g. `ABCDE12345`
- **iOS bundle identifier** — currently `com.invitely.app`. Keep it or
  give me the one you want.
- **App Store URL** — once the app is listed, e.g.
  `https://apps.apple.com/app/id1234567890`

These become:

- `INVITELY_APPLE_APP_ID` env var → `<TeamID>.<bundleId>` (drives
  `apple-app-site-association`)
- `INVITELY_APP_STORE_URL` env var → the install button on the web invite
  page

---

## 3. Google Play details (Android App Links + install button)

- **Android package name** — currently `com.invitely.app`. Keep or change.
- **SHA-256 signing certificate fingerprint** of the release keystore
  (from `keytool` or the Play Console → *Setup → App integrity*)
- **Play Store URL** — e.g.
  `https://play.google.com/store/apps/details?id=com.invitely.app`

These become:

- `INVITELY_ANDROID_PACKAGE` env var
- `INVITELY_ANDROID_SHA256` env var (drives `assetlinks.json`)
- `INVITELY_PLAY_STORE_URL` env var

---

## 4. (Optional) Push notifications for new web RSVPs

Only needed if you want hosts pinged the moment a guest RSVPs from the
web. Requires an Expo push notification setup — happy to wire that in
later.

---

## Minimum to ship

Items 1–3. Once you have those values (or even just the domain + bundle
IDs to start), drop them in and I'll plug everything in and verify the
install buttons + universal links open the app correctly.
