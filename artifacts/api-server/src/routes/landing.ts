import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, eventsTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * iOS Universal Link config. Apps with team id + bundle id matching are
 * allowed to handle https://<host>/e/* without going through Safari.
 *
 * Set INVITELY_APPLE_APP_ID (e.g. "TEAMID.com.example.invitely") to enable.
 * When unset we still serve a valid-shaped JSON with no apps so we don't
 * 404 the well-known path.
 */
router.get("/.well-known/apple-app-site-association", (_req, res) => {
  const appID = process.env["INVITELY_APPLE_APP_ID"] ?? "";
  const apps = appID ? [appID] : [];
  res
    .type("application/json")
    .json({
      applinks: {
        apps: [],
        details: apps.length
          ? [
              {
                appID,
                paths: ["/e/*"],
              },
            ]
          : [],
      },
    });
});

/**
 * Android App Links verification file.
 *
 * Set INVITELY_ANDROID_PACKAGE (e.g. "com.example.invitely") and
 * INVITELY_ANDROID_SHA256 (colon-separated cert fingerprint) to enable.
 */
router.get("/.well-known/assetlinks.json", (_req, res) => {
  const pkg = process.env["INVITELY_ANDROID_PACKAGE"] ?? "";
  const sha = process.env["INVITELY_ANDROID_SHA256"] ?? "";
  const list = pkg && sha
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: pkg,
            sha256_cert_fingerprints: [sha],
          },
        },
      ]
    : [];
  res.type("application/json").json(list);
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const APP_STORE_URL =
  process.env["INVITELY_APP_STORE_URL"] ??
  "https://apps.apple.com/app/invitely/id000000000";
const PLAY_STORE_URL =
  process.env["INVITELY_PLAY_STORE_URL"] ??
  "https://play.google.com/store/apps/details?id=com.invitely.app";

function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

router.get(
  "/e/:id",
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);
    const token = typeof req.query.t === "string" ? req.query.t : "";
    const rows = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).type("html").send(notFoundPage());
      return;
    }
    const ev = rows[0];

    if (ev.privacy === "invite-only" && (!ev.inviteToken || token !== ev.inviteToken)) {
      res.status(403).type("html").send(privatePage());
      return;
    }

    const accent = ev.customAccent || "#6366F1";
    const title = ev.customName?.trim() || ev.title;
    const tagline = ev.customTagline?.trim() || "";
    const host = ev.hostName?.trim() || "your host";
    const when = formatDateTime(ev.startISO);
    const location = ev.location || "";

    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${escapeHtml(title)} — Invitely</title>
<meta name="description" content="${escapeHtml(host)} invited you to ${escapeHtml(title)}." />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(host)} invited you. Tap to RSVP." />
${ev.heroPhotoUri ? `<meta property="og:image" content="${escapeHtml(ev.heroPhotoUri)}" />` : ""}
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #0B0B12; color: #fff; -webkit-font-smoothing: antialiased;
  }
  .hero {
    position: relative; min-height: 360px; padding: 28px 24px 80px;
    background: ${ev.heroPhotoUri ? `url(${JSON.stringify(ev.heroPhotoUri)}) center/cover` : `linear-gradient(160deg, ${accent}, #0B0B12)`};
    display: flex; flex-direction: column; justify-content: flex-end;
  }
  .hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); pointer-events: none; }
  .hero > * { position: relative; z-index: 1; }
  .pill { display: inline-block; padding: 6px 12px; border-radius: 999px; background: ${accent}; color: #fff; font-size: 12px; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; }
  h1 { margin: 12px 0 6px; font-size: 30px; line-height: 1.15; letter-spacing: -0.5px; }
  .host { color: rgba(255,255,255,0.85); font-size: 14px; }
  .card {
    margin: -56px 16px 0; background: #16161F; border-radius: 18px; padding: 18px; position: relative; z-index: 2;
    box-shadow: 0 12px 30px rgba(0,0,0,0.35);
  }
  .row { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; }
  .row + .row { border-top: 1px solid rgba(255,255,255,0.06); }
  .row .ico { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center; font-size: 18px; }
  .row .label { font-weight: 600; font-size: 14px; }
  .row .sub { color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 2px; }
  section { padding: 22px 16px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.6px; color: rgba(255,255,255,0.55); font-weight: 600; margin: 0 0 10px; }
  .options { display: flex; gap: 8px; }
  .opt {
    flex: 1; background: #16161F; border: 1.5px solid rgba(255,255,255,0.08); color: #fff; padding: 14px 8px;
    border-radius: 14px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.15s;
  }
  .opt[aria-pressed="true"] { border-color: ${accent}; background: ${accent}22; color: ${accent}; }
  label { display: block; font-size: 12px; color: rgba(255,255,255,0.65); margin: 12px 0 6px; }
  input[type=text], textarea {
    width: 100%; background: #16161F; border: 1px solid rgba(255,255,255,0.1);
    color: #fff; padding: 12px 14px; border-radius: 12px; font-size: 15px; font-family: inherit;
  }
  textarea { min-height: 70px; resize: vertical; }
  .check { display: flex; align-items: center; gap: 10px; margin-top: 12px; cursor: pointer; user-select: none; }
  .check input { width: 18px; height: 18px; accent-color: ${accent}; }
  button.primary {
    width: 100%; margin-top: 18px; background: ${accent}; color: #fff; border: none;
    padding: 16px; border-radius: 14px; font-size: 16px; font-weight: 700; cursor: pointer;
  }
  button.primary[disabled] { opacity: 0.5; cursor: not-allowed; }
  .install {
    margin: 8px 16px 32px; padding: 18px; background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
  }
  .install h3 { margin: 0 0 6px; font-size: 16px; }
  .install p { margin: 0 0 12px; color: rgba(255,255,255,0.7); font-size: 13px; }
  .stores { display: flex; gap: 10px; flex-wrap: wrap; }
  .stores a {
    flex: 1; min-width: 140px; text-align: center; padding: 12px 14px; border-radius: 12px;
    background: #fff; color: #0B0B12; text-decoration: none; font-weight: 600; font-size: 14px;
  }
  .stores a.android { background: #16161F; color: #fff; border: 1px solid rgba(255,255,255,0.15); }
  .success {
    margin: 18px 16px; padding: 22px; background: ${accent}1a; border: 1px solid ${accent}66;
    border-radius: 16px; text-align: center;
  }
  .success h2 { color: ${accent}; margin: 0 0 6px; font-size: 22px; text-transform: none; letter-spacing: 0; }
  .footer { text-align: center; padding: 22px; color: rgba(255,255,255,0.4); font-size: 12px; }
  @media (prefers-color-scheme: light) {
    body { background: #f7f7fb; color: #0B0B12; }
    .card, .opt, input[type=text], textarea { background: #fff; color: #0B0B12; border-color: rgba(0,0,0,0.08); }
    .row + .row { border-top-color: rgba(0,0,0,0.06); }
    .row .ico { background: rgba(0,0,0,0.05); }
    h2 { color: rgba(0,0,0,0.55); }
    label { color: rgba(0,0,0,0.6); }
    .install { background: #fff; border-color: rgba(0,0,0,0.08); }
    .install p { color: rgba(0,0,0,0.6); }
    .stores a.android { background: #0B0B12; color: #fff; border: none; }
    .footer { color: rgba(0,0,0,0.4); }
  }
</style>
</head>
<body>
<div class="hero">
  <span class="pill">You're invited</span>
  <h1>${escapeHtml(title)}</h1>
  ${tagline ? `<div class="host">${escapeHtml(tagline)}</div>` : ""}
  <div class="host">Hosted by ${escapeHtml(host)}</div>
</div>

<div class="card">
  <div class="row">
    <div class="ico">📅</div>
    <div><div class="label">${escapeHtml(when)}</div></div>
  </div>
  ${location ? `
  <div class="row">
    <div class="ico">📍</div>
    <div><div class="label">${escapeHtml(location)}</div></div>
  </div>` : ""}
  ${ev.message ? `
  <div class="row">
    <div class="ico">✨</div>
    <div><div class="sub">${escapeHtml(ev.message)}</div></div>
  </div>` : ""}
</div>

<section id="rsvp-section">
  <h2>Will you be there?</h2>
  <div class="options" role="radiogroup">
    <button type="button" class="opt" data-status="yes" aria-pressed="false">I'm in</button>
    <button type="button" class="opt" data-status="maybe" aria-pressed="false">Maybe</button>
    <button type="button" class="opt" data-status="no" aria-pressed="false">Can't make it</button>
  </div>
  <form id="rsvp-form" autocomplete="on">
    <label for="name">Your name</label>
    <input type="text" id="name" name="name" required autocomplete="name" placeholder="Jordan Lee" />
    <label for="message">A short note (optional)</label>
    <textarea id="message" name="message" placeholder="Wouldn't miss it!"></textarea>
    <label class="check"><input type="checkbox" id="plusOne" name="plusOne" /> Bringing a plus one</label>
    <label for="dietary">Dietary needs (optional)</label>
    <input type="text" id="dietary" name="dietary" placeholder="Vegetarian, allergies, etc." />
    <button type="submit" class="primary" id="submit-btn" disabled>Submit RSVP</button>
  </form>
</section>

<div class="install">
  <h3>Get the Invitely app</h3>
  <p>Open this invite in the app to RSVP, see updates and add to your calendar.</p>
  <div class="stores">
    <a href="${escapeHtml(APP_STORE_URL)}">App Store</a>
    <a class="android" href="${escapeHtml(PLAY_STORE_URL)}">Google Play</a>
  </div>
</div>

<div class="footer">Sent with Invitely</div>

<script>
(function(){
  var EVENT_ID = ${JSON.stringify(ev.id)};
  var INVITE_TOKEN = ${JSON.stringify(ev.privacy === "invite-only" ? token : "")};
  var status = null;
  var opts = document.querySelectorAll(".opt");
  var btn = document.getElementById("submit-btn");
  var form = document.getElementById("rsvp-form");
  var nameEl = document.getElementById("name");
  function refresh() {
    btn.disabled = !(status && nameEl.value.trim());
  }
  opts.forEach(function(o){
    o.addEventListener("click", function(){
      status = o.getAttribute("data-status");
      opts.forEach(function(x){ x.setAttribute("aria-pressed", x === o ? "true" : "false"); });
      refresh();
    });
  });
  nameEl.addEventListener("input", refresh);
  form.addEventListener("submit", function(e){
    e.preventDefault();
    if (!status) return;
    btn.disabled = true;
    btn.textContent = "Sending…";
    var payload = {
      guestName: nameEl.value.trim(),
      status: status,
      message: document.getElementById("message").value.trim() || undefined,
      plusOne: document.getElementById("plusOne").checked,
      dietary: document.getElementById("dietary").value.trim() || undefined,
      inviteToken: INVITE_TOKEN || undefined,
    };
    fetch("/api/events/" + encodeURIComponent(EVENT_ID) + "/rsvps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function(r){ if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function(){
        var sec = document.getElementById("rsvp-section");
        var msg = status === "yes" ? "in" : status === "maybe" ? "a maybe" : "out";
        sec.innerHTML = '<div class="success"><h2>You\\'re ' + msg + '.</h2><p>We let the host know.</p></div>';
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch(function(){
        btn.disabled = false;
        btn.textContent = "Try again";
      });
  });
  // If the app is installed, the OS will intercept this URL before this
  // script ever runs (Universal Links / App Links). No JS-side detection needed.
})();
</script>
</body>
</html>`);
  }),
);

function notFoundPage(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invite not found</title>
<style>body{font-family:-apple-system,sans-serif;background:#0B0B12;color:#fff;padding:40px;text-align:center}</style>
</head><body><h1>Invite not found</h1><p style="color:rgba(255,255,255,0.7)">This link may have expired or been deleted.</p></body></html>`;
}

function privatePage(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Private invite</title>
<style>body{font-family:-apple-system,sans-serif;background:#0B0B12;color:#fff;padding:40px;text-align:center}</style>
</head><body><h1>This invite is private</h1><p style="color:rgba(255,255,255,0.7)">You need the original link to view this event.</p></body></html>`;
}

export default router;
