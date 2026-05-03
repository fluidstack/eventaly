import { TemplateId } from "@/constants/templates";

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

export type EventPrivacy = "link" | "invite-only";

export type Event = {
  id: string;
  title: string;
  templateId: TemplateId;
  heroPhotoUri?: string;
  message: string;
  startISO: string;
  location: string;
  privacy: EventPrivacy;
  allowGuestUploads: boolean;
  rsvps: Rsvp[];
  uploads: Upload[];
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
  name: string;
  email: string;
  defaultTemplate: TemplateId;
  reminderHours: number;
  onboarded: boolean;
  language: string;
  billingPlan: "free" | "premium";
};

export type AppState = {
  profile: Profile;
  events: Event[];
  notifications: AppNotification[];
};
