import { TemplateId } from "@/constants/templates";
import { HeroFilterId } from "@/lib/heroFilters";

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
};

export type AppState = {
  profile: Profile;
  events: Event[];
  notifications: AppNotification[];
};
