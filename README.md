# Invitely

Invitely is an end-to-end invitation, RSVP, and shared-photo platform built as
a pnpm monorepo. The product is shipped as an **Expo (React Native) mobile
app** for hosts and guests, backed by an **Express + Postgres API server**
that also renders a public **web RSVP page** so anyone with the link can
respond — even before installing the app.

This README documents what every piece of the project does and how the user
flows hang together.

---

## What the app does (at a glance)

1. **Hosts create an event** in the mobile app from a template (Birthday,
   Wedding, Dinner, Baby Shower, Christmas, NYE, Christening, Bucks, Hens) or
   a fully customized one.
2. They pick a hero photo (with built-in filters), set the date/time/location,
   write an invite message, and choose a privacy mode (public link or
   invite-only with an access token).
3. They share the event via a single **`https://invitely.replit.app/e/<id>`
   link** — sent over SMS, WhatsApp, email, AirDrop, the system share sheet,
   or as a generated **QR code**.
4. **Guests who tap the link**:
   - If they have the app installed → the OS opens Invitely directly into the
     in-app RSVP screen (Universal Links on iOS, App Links on Android).
   - If they don't → they hit a server-rendered web page that shows the
     invite, lets them RSVP from the browser, and offers App Store / Play
     Store install buttons plus an explicit “Open in Invitely” deep-link.
5. **RSVPs flow back to the host's app** automatically. Web-submitted RSVPs
   sync into the host's local store the next time they open the event.
6. Hosts can collect **guest photo uploads**, build a **shared photo slider**
   for the day-of, manage their guest list, and upgrade with **RevenueCat**
   to unlock premium templates and higher guest caps (Event Pro per event, or
   Host Plus subscription).

---

## Repository layout

```
.
├── artifacts/
│   ├── invitely/          # Expo (React Native) mobile app — the product
│   ├── api-server/        # Express 5 API + public web RSVP landing page
│   └── mockup-sandbox/    # Vite preview server for design iterations
├── lib/
│   ├── db/                # Drizzle ORM schema + Postgres client (@workspace/db)
│   ├── api-zod/           # Shared Zod schemas
│   └── api-client-react/  # Generated React Query hooks (Orval)
├── pnpm-workspace.yaml    # Monorepo wiring
└── package.json
```

The repo is a pnpm workspace; every package owns its own `package.json`,
TypeScript config, and dependencies, and they reference each other via
`workspace:*` / `@workspace/<name>` aliases.

---

## Mobile app — `artifacts/invitely`

### Stack
- **Expo SDK 54** with React Native new architecture enabled
- **expo-router 6** for filesystem-based navigation
- **AsyncStorage** for local persistence (events, RSVPs, profile, plan)
- **expo-image-picker / expo-contacts / expo-haptics / expo-blur /
  expo-linear-gradient / expo-glass-effect** for native UX
- **RevenueCat** for in-app purchases (Event Pro + Host Plus)
- **TanStack Query** for any networked data
- Custom **InviteStore** React context as the single source of truth for app
  state (no Redux, no Zustand)

### App routes (`artifacts/invitely/app/`)
- `(tabs)/` — bottom-tab home, plus the host's event list and profile
- `onboarding.tsx` — first-run flow
- `event/new.tsx` — create event wizard (template + photo + details)
- `event/[id]/index.tsx` — host dashboard for one event
- `event/[id]/edit.tsx` — edit existing event
- `event/[id]/guest.tsx` — guest-facing RSVP screen for events the user owns
- `event/[id]/invite.tsx` — share sheet, copy link, QR code
- `event/[id]/contacts.tsx` — pick contacts to invite (on-device only)
- `event/[id]/guests.tsx` — guest list + RSVP management
- `event/[id]/upload.tsx` / `uploads.tsx` — capture and review guest photos
- `event/[id]/slider.tsx` — build the day-of photo slideshow
- `event/preset/...` — custom-template tweaks (accent, fonts, presets)
- `e/[id].tsx` — **Universal/App Link entry point**. If the event lives
  locally, redirects the host to the dashboard; otherwise hydrates from the
  API and renders a self-contained RSVP screen for the guest, posting back
  through the public RSVP endpoint.
- `upgrade.tsx` — RevenueCat paywall (Event Pro / Host Plus)
- `+not-found.tsx` — fallback

### Key libraries (`artifacts/invitely/lib/`)
- `inviteLink.ts` — single source of truth for the public host. Resolves
  `EXPO_PUBLIC_API_HOST` / `EXPO_PUBLIC_DOMAIN` / `expoConfig.extra.publicHost`
  in dev, falls back to the production host (`invitely.replit.app`) so builds
  always emit a real `https://…/e/<id>` link.
- `sync.ts` — talks to the API server:
  - `publishEventRemote(event, hostName)` — owner write, sends
    `X-Publish-Token`
  - `fetchEventRsvpsRemote(event, since)` — owner pull with `?since=` cursor
  - `fetchPublicEvent(id, t?)` — public read for deep-linked guests
  - `submitPublicRsvp(id, payload)` — public RSVP submit (mirrors the web
    landing page; sends invite token in the body for invite-only events)
- `useRsvpSync.ts` — runs on the event dashboard, pulls new web RSVPs and
  merges them into local store on mount.
- `format.ts` — date/time/initials/relative-time helpers
- `heroFilters.ts` — built-in photo filters
- `inviteText.ts` — preset invite copy
- `gating.ts` — plan-based feature gates (free vs Event Pro vs Host Plus)
- `revenuecat.tsx` — RevenueCat SDK wiring + paywall context

### State (`artifacts/invitely/store/`)
- `types.ts` — `Event`, `Rsvp`, `Profile`, `Notification`, etc.
- `InviteStore.tsx` — the React context store. Hydrates from AsyncStorage,
  migrates older payloads (including back-filling `publishToken` /
  `inviteToken` for legacy events), exposes actions:
  - `createEvent`, `updateEvent`, `deleteEvent`
  - `upsertRsvp`, `mergeRemoteRsvps`
  - `addUpload`, `removeUpload`, slider helpers
  - `updateProfile`, plan / claim management

### UI
- `components/` — `Screen`, `EventCard`, `Field`, `LockBadge`, hero photo
  editor, custom-template fields, animated splash, error boundary, etc.
- `constants/colors.ts` — light + dark palette
- `constants/templates.ts` — template catalogue, with `FREE_TEMPLATE_IDS` and
  `PREMIUM_TEMPLATE_IDS` controlling gating

### Native deep-linking config (`app.json`)
- `scheme: "invitely"` for the in-app `invitely://` fallback
- iOS `associatedDomains: ["applinks:invitely.replit.app"]`
- Android `intentFilters` claim `https://invitely.replit.app/e/*` with
  `autoVerify: true`
- `expo-router` plugin `origin` set to the production host so HTTPS URLs are
  routed through the file-system router

---

## API server — `artifacts/api-server`

A small Express 5 service (ESM, bundled with esbuild, structured logs via
pino). It serves three things:

1. **JSON API under `/api/...`** for the mobile app
2. **Public HTML landing page at `/e/:id`** for guests without the app
3. **`.well-known/` endpoints** for Universal Link / App Link verification

### Routes (`artifacts/api-server/src/routes/`)

#### `health.ts`
- `GET /api/healthz` — liveness probe

#### `events.ts`
- `PUT /api/events/:id` — owner publish/update.
  Requires `X-Publish-Token` header. Validates payload with Zod (including a
  strict hex-color regex on `customAccent` to prevent CSS injection).
- `GET /api/events/:id` and `GET /api/events/:id/public` — public event read
  used by the web landing page and the in-app deep-link guest screen.
  Invite-only events require `?t=<inviteToken>` and return `403` otherwise.
- `POST /api/events/:id/rsvps` — public RSVP submit (web + in-app guest).
  Invite-only events require `inviteToken` in the body.
- `GET /api/events/:id/rsvps?since=<iso>` — owner pull of web-submitted
  RSVPs. Requires `X-Publish-Token`.

#### `landing.ts`
- `GET /e/:id` — server-rendered HTML invite + RSVP form. Includes:
  - hero, title, host, date/time, location, message
  - RSVP options (yes / maybe / no), name, note, plus-one, dietary
  - “Open in Invitely” deep-link to `invitely://e/<id>` (with `?t=` for
    invite-only)
  - App Store / Play Store CTA buttons (URLs from
    `INVITELY_APP_STORE_URL` / `INVITELY_PLAY_STORE_URL` env)
  - Defensive re-validation of `customAccent` before interpolation into CSS
- `GET /.well-known/apple-app-site-association` — driven by
  `INVITELY_APPLE_APP_ID`
- `GET /.well-known/assetlinks.json` — driven by `INVITELY_ANDROID_PACKAGE`
  + `INVITELY_ANDROID_SHA256`
- `notFoundPage()` and `privatePage()` HTML fallbacks

### App composition (`src/app.ts`)
- CORS, JSON parsing, cookie parsing, pino-http logging
- Mounts `/api` (events + health) and the landing routes outside of `/api`
- `.replit-artifact/artifact.toml` exposes paths `["/api","/e","/.well-known"]`

### Build / run
- `pnpm --filter @workspace/api-server run dev` — local dev (auto-reload)
- `pnpm --filter @workspace/api-server run typecheck`
- Production bundle is built with esbuild

---

## Database — `lib/db`

Postgres + Drizzle ORM, with schema files under `lib/db/src/schema/`:

### `invitely_events`
Persists everything the public landing page or the deep-link guest screen
needs to render an event without the mobile app:
`id`, `title`, `templateId`, `heroPhotoUri`, `heroFilter`, `customName`,
`customTagline`, `customAccent`, `message`, `startISO`, `location`,
`privacy` (`link` or `invite-only`), `allowGuestUploads`, `hostName`,
`publishToken`, `inviteToken`, timestamps.

### `invitely_rsvps`
Web-submitted RSVPs that the host pulls back into their app:
`id`, `eventId`, `guestName`, `status` (`yes` | `no` | `maybe`), `message`,
`plusOne`, `dietary`, `source`, `createdAt`.

### Schema management
- `pnpm --filter @workspace/db run push` — `drizzle-kit push` (no migration
  files; schema is pushed directly in this monorepo)
- `pnpm --filter @workspace/db run push-force` — same with `--force`
- Connection string is read from `DATABASE_URL`

---

## Design / mockup workspace — `artifacts/mockup-sandbox`

Vite preview server used for rapidly prototyping React components in
isolation. Each component gets its own `/preview/<slug>` URL which can be
embedded as an iframe on the Replit canvas to compare design variants
side-by-side. Not part of the shipped product.

---

## Authentication & access control

There is no per-user login. Trust is event-scoped via two tokens generated
by the mobile app at event creation (and back-filled into legacy events
during store hydration):

- **`publishToken`** — owner-only secret. Sent as `X-Publish-Token` header
  on `PUT /api/events/:id` and `GET /api/events/:id/rsvps`. The API rejects
  any mismatch with `401 unauthorized`.
- **`inviteToken`** — included in `?t=` for invite-only links. The API
  enforces it on the public event read, the web RSVP submit, and the landing
  page render.

Public links (`privacy: "link"`) skip the invite token entirely; anyone with
the URL can RSVP. Owner endpoints always require the publish token.

---

## Universal Links / App Links

The same URL works in three modes:

| Surface | Behavior |
| --- | --- |
| App installed (iOS) | `applinks:invitely.replit.app` claim opens the app at `/e/:id`, which routes into either the host dashboard (if the event is local) or the in-app guest RSVP screen (after fetching `/api/events/:id`). |
| App installed (Android) | The `https/.../e/*` intent filter with `autoVerify: true` does the same. |
| App not installed (any browser) | The api-server renders the HTML landing page with an RSVP form, an explicit `invitely://e/:id` "Open in Invitely" button, and store install CTAs. |

For verification to actually succeed in production builds, the deployment
must set `INVITELY_APPLE_APP_ID`, `INVITELY_ANDROID_PACKAGE`, and
`INVITELY_ANDROID_SHA256`, and the deployed host must match
`DEFAULT_PUBLIC_HOST` in `artifacts/invitely/lib/inviteLink.ts` and the
`associatedDomains` / `intentFilters` host in `artifacts/invitely/app.json`.

---

## Monetization

RevenueCat-backed in-app purchases (`artifacts/invitely/lib/revenuecat.tsx`):

- **Free** — 2 free templates (Birthday, Wedding), capped guest count.
- **Event Pro** — one-time unlock per event: removes the guest cap and
  unlocks all templates for that event.
- **Host Plus** — subscription: unlocks every template and every event for
  the host.

Plan state (`Profile.eventProClaims`, `Profile.isHostPlus`) lives in the
local `InviteStore` and gates access via `lib/gating.ts` in the wizard,
edit screen, and dashboard.

---

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | api-server, db | Postgres connection string |
| `EXPO_PUBLIC_DOMAIN` / `EXPO_PUBLIC_API_HOST` | mobile (dev) | Override the public host so QR / share URLs resolve to the dev API server |
| `INVITELY_APPLE_APP_ID` | api-server | iOS Team ID + bundle, drives AASA |
| `INVITELY_ANDROID_PACKAGE` | api-server | Android package name, drives assetlinks |
| `INVITELY_ANDROID_SHA256` | api-server | Android signing fingerprint |
| `INVITELY_APP_STORE_URL` | api-server | Install button on the web landing |
| `INVITELY_PLAY_STORE_URL` | api-server | Install button on the web landing |

Secrets are managed through the Replit secrets panel — never committed.

---

## Common commands

```bash
# Whole monorepo
pnpm install
pnpm run typecheck
pnpm run build

# API server
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/api-server run typecheck

# Mobile app (Expo)
pnpm --filter @workspace/invitely run dev
pnpm --filter @workspace/invitely run typecheck

# Database
pnpm --filter @workspace/db run push        # apply schema to DATABASE_URL

# Mockup sandbox
pnpm --filter @workspace/mockup-sandbox run dev
```

The Replit workflow runner already configures all three long-running services
(API Server, Expo, Component Preview Server) so they boot together when the
project starts.

---

## Typical user flows

### Host creates and shares an event
1. Open Invitely → tap **+** → pick a template → fill in date, location,
   message, hero photo → save.
2. App generates a `publishToken` + `inviteToken`, persists locally, and
   pushes the event to the API server.
3. Host taps **Share** → app opens the system sheet with
   `https://invitely.replit.app/e/<id>` (and a QR code on the invite screen).

### Guest with the app installed
1. Taps the link in iMessage / WhatsApp / email.
2. iOS / Android open the app at `/e/:id`.
3. The deep-link screen sees that the event isn't local, fetches it from
   `/api/events/:id`, renders the in-app RSVP UI, and posts the RSVP via
   the public endpoint.
4. The host opens the event next time → `useRsvpSync` pulls the new RSVP
   into local state.

### Guest without the app
1. Taps the link → browser loads `/e/:id`.
2. Sees the styled invite, picks an RSVP option, fills in name/note,
   submits. The server writes to `invitely_rsvps`.
3. Optionally taps **Open in Invitely** (deep-link) or installs from the
   store buttons.

### Invite-only event
- Same flow, but every link includes `?t=<inviteToken>` and the API / web
  page reject anyone without the matching token.

---

## Status

- Task #15 (HTTPS invite links + Universal/App Links + web RSVP page +
  host sync) is **MERGED**.
- Open follow-ups (proposed): production native IDs for Universal Links
  verification (#16), real App Store / Play Store URLs (#17), in-app /
  push notifications when a web RSVP arrives (#18).
