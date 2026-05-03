import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const eventsTable = pgTable("invitely_events", {
  id: text("id").primaryKey(),
  publishToken: text("publish_token").notNull(),
  inviteToken: text("invite_token"),
  title: text("title").notNull(),
  templateId: text("template_id").notNull(),
  heroPhotoUri: text("hero_photo_uri"),
  heroFilter: text("hero_filter"),
  customName: text("custom_name"),
  customTagline: text("custom_tagline"),
  customAccent: text("custom_accent"),
  message: text("message").notNull().default(""),
  startISO: text("start_iso").notNull(),
  location: text("location").notNull().default(""),
  privacy: text("privacy").notNull().default("link"),
  hostName: text("host_name").notNull().default(""),
  allowGuestUploads: boolean("allow_guest_uploads").notNull().default(true),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rsvpsTable = pgTable("invitely_rsvps", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => eventsTable.id, { onDelete: "cascade" }),
  guestName: text("guest_name").notNull(),
  status: text("status").notNull(),
  message: text("message"),
  plusOne: boolean("plus_one").notNull().default(false),
  dietary: text("dietary"),
  source: text("source").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EventRow = typeof eventsTable.$inferSelect;
export type InsertEventRow = typeof eventsTable.$inferInsert;
export type RsvpRow = typeof rsvpsTable.$inferSelect;
export type InsertRsvpRow = typeof rsvpsTable.$inferInsert;
