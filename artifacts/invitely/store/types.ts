import { TemplateId } from "@/constants/templates";
import { HeroFilterId } from "@/lib/heroFilters";

export type CustomPreset = {
  id: string;
  name: string;
  tagline: string;
  accent: string;
  heroPhotoUri?: string;
  heroFilter?: HeroFilterId;
  createdAt: string;
};

export type RsvpStatus = "yes" | "no" | "maybe";

export type Rsvp = {
  id: string;
  guestName: string;
  status: RsvpStatus;
  message?: string;
  plusOne: boolean;
  dietary?: string;
  createdAt: string;
};

export type UploadStatus = "pending" | "approved" | "rejected";

export type Upload = {
  id: string;
  uri: string;
  caption?: string;
  guestName: string;
  consent: boolean;
  status: UploadStatus;
  createdAt: string;
  width?: number;
  height?: number;
};

export type SliderPreset = "fade" | "stack" | "reel";

export type Slider = {
  published: boolean;
  preset: SliderPreset;
  orderedUploadIds: string[];
  publishedAt?: string;
};

export type InviteChannel = "sms" | "whatsapp" | "email" | "share";

export type InvitedGuest = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  channel: InviteChannel;
  sentAt: string;
};

export type EventPrivacy = "link" | "invite-only";

export type Event = {
  id: string;
  title: string;
  templateId: TemplateId;
  heroPhotoUri?: string;
  heroFilter?: HeroFilterId;
  customName?: string;
  customTagline?: string;
  customAccent?: string;
  /** When the custom template values came from a saved preset, remember which
   * one so the picker can highlight it on the edit screen. */
  customPresetId?: string;
  message: string;
  startISO: string;
  location: string;
  privacy: EventPrivacy;
  allowGuestUploads: boolean;
  rsvps: Rsvp[];
  uploads: Upload[];
  invited: InvitedGuest[];
  slider: Slider;
  createdAt: string;
  /**
   * Demo events seeded for new installs. Excluded from the free-tier active
   * event quota so a new user can still create their own first event.
   */
  isSample?: boolean;
  /**
   * Per-event secret used as the bearer between the host's mobile install
   * and the api-server's /events/:id endpoints. Generated on first publish
   * and persisted with the event so subsequent edits and RSVP pulls
   * authenticate as the same owner.
   */
  publishToken?: string;
  /**
   * For invite-only events, an additional unguessable token included in the
   * shareable URL (?t=...). The web RSVP page and POST /rsvps both require
   * it to match.
   */
  inviteToken?: string;
  /**
   * ISO timestamp of the most recent successful RSVP pull from the server,
   * used as the `?since=` cursor for incremental syncs.
   */
  lastRsvpSyncAt?: string;
};

export type AppNotification = {
  id: string;
  eventId?: string;
  title: string;
  body: string;
  kind: "rsvp" | "upload" | "reminder" | "slider" | "system";
  createdAt: string;
  read: boolean;
};

export type Profile = {
  /**
   * Stable per-install user id used as RevenueCat appUserID so entitlements
   * follow the user even if they reinstall and restore.
   */
  id: string;
  name: string;
  email: string;
  defaultTemplate: TemplateId;
  reminderHours: number;
  onboarded: boolean;
  language: string;
  billingPlan: "free" | "premium";
  unlockedEventIds: string[];
  /**
   * Audit trail of Event Pro consumable purchases that have been applied to a
   * specific event. Each entry binds a RevenueCat non-subscription
   * transactionIdentifier to an eventId. Used to:
   *   - prune unlocks if a transaction is refunded (transaction disappears
   *     from customerInfo.nonSubscriptionTransactions),
   *   - prevent the same purchase from being claimed twice,
   *   - allow a future server-side rehydration after reinstall by writing the
   *     same data to a RevenueCat subscriber attribute on every change.
   */
  eventProClaims: { transactionId: string; eventId: string }[];
  /** Saved Custom-template presets the user can reuse across events. */
  customPresets: CustomPreset[];
};

export type AppState = {
  profile: Profile;
  events: Event[];
  notifications: AppNotification[];
};
