import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, gt } from "drizzle-orm";
import { db, eventsTable, rsvpsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const RsvpStatus = z.enum(["yes", "no", "maybe"]);

const PublishEventSchema = z.object({
  id: z.string().min(6).max(64),
  publishToken: z.string().min(8).max(128),
  inviteToken: z.string().min(8).max(128).optional().nullable(),
  title: z.string().min(1).max(200),
  templateId: z.string().min(1).max(64),
  heroPhotoUri: z.string().max(4096).optional().nullable(),
  heroFilter: z.string().max(64).optional().nullable(),
  customName: z.string().max(120).optional().nullable(),
  customTagline: z.string().max(200).optional().nullable(),
  customAccent: z.string().max(32).optional().nullable(),
  message: z.string().max(4000).optional().default(""),
  startISO: z.string().min(1).max(64),
  location: z.string().max(500).optional().default(""),
  privacy: z.enum(["link", "invite-only"]).default("link"),
  hostName: z.string().max(120).optional().default(""),
  allowGuestUploads: z.boolean().optional().default(true),
});

const RsvpSubmitSchema = z.object({
  guestName: z.string().min(1).max(120),
  status: RsvpStatus,
  message: z.string().max(2000).optional().nullable(),
  plusOne: z.boolean().optional().default(false),
  dietary: z.string().max(200).optional().nullable(),
  inviteToken: z.string().max(128).optional().nullable(),
});

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function newId(prefix = "rsvp"): string {
  return (
    prefix +
    "_" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9)
  );
}

/**
 * Mobile owner: publish (insert or update) an event.
 * The mobile client owns the event id and the publishToken (a per-event
 * secret generated locally on first publish). Subsequent updates must
 * present the same token via the X-Publish-Token header.
 */
router.put(
  "/events/:id",
  asyncHandler(async (req, res) => {
    const parsed = PublishEventSchema.safeParse({
      ...req.body,
      id: String(req.params.id),
    });
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_event", details: parsed.error.issues });
    }
    const ev = parsed.data;

    const headerToken = (req.header("X-Publish-Token") ?? "").trim();
    if (!headerToken || headerToken !== ev.publishToken) {
      return res
        .status(401)
        .json({ error: "publish_token_required" });
    }

    const existing = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, ev.id))
      .limit(1);

    if (existing.length > 0 && existing[0].publishToken !== ev.publishToken) {
      return res.status(403).json({ error: "publish_token_mismatch" });
    }

    const now = new Date();
    const row = {
      id: ev.id,
      publishToken: ev.publishToken,
      inviteToken: ev.inviteToken ?? null,
      title: ev.title,
      templateId: ev.templateId,
      heroPhotoUri: ev.heroPhotoUri ?? null,
      heroFilter: ev.heroFilter ?? null,
      customName: ev.customName ?? null,
      customTagline: ev.customTagline ?? null,
      customAccent: ev.customAccent ?? null,
      message: ev.message ?? "",
      startISO: ev.startISO,
      location: ev.location ?? "",
      privacy: ev.privacy,
      hostName: ev.hostName ?? "",
      allowGuestUploads: ev.allowGuestUploads ?? true,
      data: null,
      updatedAt: now,
    };

    if (existing.length > 0) {
      await db.update(eventsTable).set(row).where(eq(eventsTable.id, ev.id));
    } else {
      await db.insert(eventsTable).values({ ...row, createdAt: now });
    }

    return res.json({ ok: true, id: ev.id });
  }),
);

/**
 * Mobile owner: pull RSVPs (since timestamp) for an event so the host can
 * merge web-submitted RSVPs into local state.
 */
router.get(
  "/events/:id/rsvps",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const headerToken = (req.header("X-Publish-Token") ?? "").trim();
    const ev = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, id))
      .limit(1);
    if (ev.length === 0) return res.status(404).json({ error: "not_found" });
    if (!headerToken || headerToken !== ev[0].publishToken) {
      return res.status(401).json({ error: "publish_token_required" });
    }

    const sinceRaw = typeof req.query.since === "string" ? req.query.since : "";
    const sinceDate = sinceRaw ? new Date(sinceRaw) : null;

    const baseWhere = eq(rsvpsTable.eventId, id);
    const whereExpr =
      sinceDate && !isNaN(sinceDate.getTime())
        ? and(baseWhere, gt(rsvpsTable.createdAt, sinceDate))
        : baseWhere;

    const rows = await db
      .select()
      .from(rsvpsTable)
      .where(whereExpr)
      .orderBy(desc(rsvpsTable.createdAt));

    return res.json({
      rsvps: rows.map((r) => ({
        id: r.id,
        guestName: r.guestName,
        status: r.status,
        message: r.message ?? undefined,
        plusOne: r.plusOne,
        dietary: r.dietary ?? undefined,
        source: r.source,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  }),
);

/**
 * Public: get an event for the web RSVP page (also used by the JSON endpoint
 * the landing page hydrates from). For invite-only events the client must
 * pass `?t=<inviteToken>`.
 */
router.get(
  "/events/:id/public",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const ev = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, id))
      .limit(1);
    if (ev.length === 0) return res.status(404).json({ error: "not_found" });
    const row = ev[0];
    if (row.privacy === "invite-only") {
      const t = typeof req.query.t === "string" ? req.query.t : "";
      if (!row.inviteToken || t !== row.inviteToken) {
        return res.status(403).json({ error: "invite_token_required" });
      }
    }
    return res.json({
      id: row.id,
      title: row.title,
      templateId: row.templateId,
      heroPhotoUri: row.heroPhotoUri ?? null,
      customName: row.customName ?? null,
      customTagline: row.customTagline ?? null,
      customAccent: row.customAccent ?? null,
      message: row.message,
      startISO: row.startISO,
      location: row.location,
      privacy: row.privacy,
      hostName: row.hostName,
    });
  }),
);

/**
 * Public: submit an RSVP from the web landing page.
 */
router.post(
  "/events/:id/rsvps",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const parsed = RsvpSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "invalid_rsvp", details: parsed.error.issues });
    }
    const ev = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, id))
      .limit(1);
    if (ev.length === 0) return res.status(404).json({ error: "not_found" });
    const row = ev[0];
    if (row.privacy === "invite-only") {
      if (!row.inviteToken || parsed.data.inviteToken !== row.inviteToken) {
        return res.status(403).json({ error: "invite_token_required" });
      }
    }

    const r = parsed.data;
    const inserted = {
      id: newId("rsvp"),
      eventId: id,
      guestName: r.guestName.trim(),
      status: r.status,
      message: r.message?.trim() || null,
      plusOne: !!r.plusOne,
      dietary: r.dietary?.trim() || null,
      source: "web",
      createdAt: new Date(),
    };
    await db.insert(rsvpsTable).values(inserted);
    return res.json({
      ok: true,
      rsvp: {
        id: inserted.id,
        guestName: inserted.guestName,
        status: inserted.status,
        message: inserted.message ?? undefined,
        plusOne: inserted.plusOne,
        dietary: inserted.dietary ?? undefined,
        source: inserted.source,
        createdAt: inserted.createdAt.toISOString(),
      },
    });
  }),
);

export default router;
