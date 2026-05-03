import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { uid } from "@/lib/format";
import {
  AppNotification,
  AppState,
  Event,
  Profile,
  Rsvp,
  Slider,
  Upload,
} from "@/store/types";

const STORAGE_KEY = "invitely.state.v1";

const DEFAULT_PROFILE: Profile = {
  name: "",
  email: "",
  defaultTemplate: "birthday",
  reminderHours: 24,
  onboarded: false,
  language: "en",
  billingPlan: "free",
  unlockedEventIds: [],
};

function seedState(): AppState {
  const now = new Date();
  const inTwoWeeks = new Date(now.getTime() + 14 * 86400000);
  inTwoWeeks.setHours(19, 0, 0, 0);
  const eventId = uid();

  const sampleEvent: Event = {
    id: eventId,
    title: "Maya's 30th Birthday",
    templateId: "birthday",
    heroPhotoUri: undefined,
    message:
      "Pull up to the rooftop — we're turning the music up and the candles on. Cake at 9, dancing till late.",
    startISO: inTwoWeeks.toISOString(),
    location: "The Mason Rooftop, 412 Valencia St",
    privacy: "link",
    allowGuestUploads: true,
    rsvps: [
      {
        id: uid(),
        guestName: "Jordan Lee",
        status: "yes",
        message: "Wouldn't miss it — bringing the playlist.",
        plusOne: true,
        dietary: "Vegetarian",
        createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
      },
      {
        id: uid(),
        guestName: "Priya Shah",
        status: "yes",
        plusOne: false,
        createdAt: new Date(now.getTime() - 86400000).toISOString(),
      },
      {
        id: uid(),
        guestName: "Sam Chen",
        status: "maybe",
        message: "Trying to swap a shift — fingers crossed!",
        plusOne: false,
        createdAt: new Date(now.getTime() - 3600000 * 6).toISOString(),
      },
      {
        id: uid(),
        guestName: "Alex Rivera",
        status: "no",
        message: "Out of town that weekend — celebrate hard for me.",
        plusOne: false,
        createdAt: new Date(now.getTime() - 3600000 * 2).toISOString(),
      },
    ],
    uploads: [],
    slider: { published: false, preset: "fade", orderedUploadIds: [] },
    createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
  };

  const notifications: AppNotification[] = [
    {
      id: uid(),
      eventId,
      kind: "rsvp",
      title: "Jordan said yes",
      body: "Plus one — vegetarian. \"Wouldn't miss it.\"",
      createdAt: new Date(now.getTime() - 3600000 * 36).toISOString(),
      read: false,
    },
    {
      id: uid(),
      eventId,
      kind: "rsvp",
      title: "Priya is in",
      body: "1 guest confirmed.",
      createdAt: new Date(now.getTime() - 3600000 * 18).toISOString(),
      read: false,
    },
    {
      id: uid(),
      eventId,
      kind: "reminder",
      title: "Reminder scheduled",
      body: "Guests will be nudged 24h before the event.",
      createdAt: new Date(now.getTime() - 3600000 * 4).toISOString(),
      read: true,
    },
  ];

  return {
    profile: { ...DEFAULT_PROFILE },
    events: [sampleEvent],
    notifications,
  };
}

type Ctx = {
  state: AppState;
  ready: boolean;
  // events
  createEvent: (
    e: Omit<Event, "id" | "rsvps" | "uploads" | "slider" | "createdAt">,
  ) => Event;
  updateEvent: (id: string, patch: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  getEvent: (id: string) => Event | undefined;
  // rsvp
  upsertRsvp: (eventId: string, rsvp: Omit<Rsvp, "id" | "createdAt">) => void;
  // uploads
  addUpload: (
    eventId: string,
    upload: Omit<Upload, "id" | "createdAt" | "status">,
  ) => Upload;
  setUploadStatus: (
    eventId: string,
    uploadId: string,
    status: Upload["status"],
  ) => void;
  removeUpload: (eventId: string, uploadId: string) => void;
  // slider
  updateSlider: (eventId: string, patch: Partial<Slider>) => void;
  // profile
  updateProfile: (patch: Partial<Profile>) => void;
  unlockEvent: (eventId: string) => void;
  completeOnboarding: (name: string, email: string) => void;
  // notifications
  markAllRead: () => void;
  pushNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  resetData: () => void;
};

const InviteCtx = createContext<Ctx | null>(null);

export function InviteStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => seedState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as AppState;
          if (!parsed.profile.unlockedEventIds) {
            parsed.profile.unlockedEventIds = [];
          }
          setState(parsed);
        }
      } catch {
        // ignore — fall back to seed
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const pushNotification = useCallback(
    (n: Omit<AppNotification, "id" | "createdAt" | "read">) => {
      setState((s) => ({
        ...s,
        notifications: [
          {
            ...n,
            id: uid(),
            createdAt: new Date().toISOString(),
            read: false,
          },
          ...s.notifications,
        ],
      }));
    },
    [],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      ready,
      createEvent: (e) => {
        const ev: Event = {
          ...e,
          id: uid(),
          rsvps: [],
          uploads: [],
          slider: { published: false, preset: "fade", orderedUploadIds: [] },
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, events: [ev, ...s.events] }));
        return ev;
      },
      updateEvent: (id, patch) => {
        setState((s) => ({
          ...s,
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
      },
      deleteEvent: (id) => {
        setState((s) => ({
          ...s,
          events: s.events.filter((e) => e.id !== id),
          notifications: s.notifications.filter((n) => n.eventId !== id),
        }));
      },
      getEvent: (id) => state.events.find((e) => e.id === id),
      upsertRsvp: (eventId, rsvp) => {
        setState((s) => ({
          ...s,
          events: s.events.map((e) => {
            if (e.id !== eventId) return e;
            const existingIdx = e.rsvps.findIndex(
              (r) => r.guestName.trim().toLowerCase() === rsvp.guestName.trim().toLowerCase(),
            );
            const next = [...e.rsvps];
            if (existingIdx >= 0) {
              next[existingIdx] = {
                ...next[existingIdx],
                ...rsvp,
                createdAt: new Date().toISOString(),
              };
            } else {
              next.unshift({
                ...rsvp,
                id: uid(),
                createdAt: new Date().toISOString(),
              });
            }
            return { ...e, rsvps: next };
          }),
        }));
        const labels: Record<string, string> = {
          yes: "is in",
          no: "can't make it",
          maybe: "is a maybe",
        };
        pushNotification({
          eventId,
          kind: "rsvp",
          title: `${rsvp.guestName} ${labels[rsvp.status]}`,
          body: rsvp.message ?? (rsvp.plusOne ? "Bringing a plus one." : "RSVP submitted."),
        });
      },
      addUpload: (eventId, upload) => {
        const u: Upload = {
          ...upload,
          id: uid(),
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === eventId ? { ...e, uploads: [u, ...e.uploads] } : e,
          ),
        }));
        pushNotification({
          eventId,
          kind: "upload",
          title: `${upload.guestName} added a photo`,
          body: upload.caption ? `"${upload.caption}"` : "Awaiting your review.",
        });
        return u;
      },
      setUploadStatus: (eventId, uploadId, status) => {
        setState((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  uploads: e.uploads.map((u) =>
                    u.id === uploadId ? { ...u, status } : u,
                  ),
                }
              : e,
          ),
        }));
      },
      removeUpload: (eventId, uploadId) => {
        setState((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  uploads: e.uploads.filter((u) => u.id !== uploadId),
                  slider: {
                    ...e.slider,
                    orderedUploadIds: e.slider.orderedUploadIds.filter(
                      (id) => id !== uploadId,
                    ),
                  },
                }
              : e,
          ),
        }));
      },
      updateSlider: (eventId, patch) => {
        setState((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === eventId ? { ...e, slider: { ...e.slider, ...patch } } : e,
          ),
        }));
        if (patch.published) {
          pushNotification({
            eventId,
            kind: "slider",
            title: "Slider published",
            body: "Guests have been notified to view the slider.",
          });
        }
      },
      updateProfile: (patch) => {
        setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
      },
      unlockEvent: (eventId) => {
        setState((s) => {
          const existing = s.profile.unlockedEventIds ?? [];
          if (existing.includes(eventId)) return s;
          return {
            ...s,
            profile: {
              ...s.profile,
              unlockedEventIds: [...existing, eventId],
            },
          };
        });
      },
      completeOnboarding: (name, email) => {
        setState((s) => ({
          ...s,
          profile: { ...s.profile, name, email, onboarded: true },
        }));
      },
      markAllRead: () => {
        setState((s) => ({
          ...s,
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        }));
      },
      pushNotification,
      resetData: () => setState(seedState()),
    }),
    [state, ready, pushNotification],
  );

  return <InviteCtx.Provider value={value}>{children}</InviteCtx.Provider>;
}

export function useInviteStore(): Ctx {
  const ctx = useContext(InviteCtx);
  if (!ctx) throw new Error("useInviteStore must be used within InviteStoreProvider");
  return ctx;
}

export function useEvent(id: string | undefined) {
  const { state } = useInviteStore();
  return state.events.find((e) => e.id === id);
}
