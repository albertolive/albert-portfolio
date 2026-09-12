#!/usr/bin/env node
/**
 * Capture hover-play preview clips for the six /projects cards.
 *
 *   node scripts/capture-previews.mjs --all
 *   node scripts/capture-previews.mjs --project esdeveniments
 *   node scripts/capture-previews.mjs --project esdeveniments --section events
 *   node scripts/capture-previews.mjs --manifest-only
 *
 * For every configured section the script opens the live URL in headless
 * Chromium at 1440x900, dismisses consent overlays, removes ad containers and
 * fixed banners, unlocks the page scroll (several sites ship
 * `body{overflow-y:hidden}`, which freezes the document in headless Chromium),
 * records ~6 s of wheel-driven smooth scroll with Playwright `recordVideo`,
 * transcodes to 1280x720 VP9/WebM (no audio) plus a 1200x675 PNG poster, and
 * rewrites PREVIEW-MANIFEST.md from the assets it actually produced.
 *
 * Two motion assertions guard the output: before recording the unlocked page
 * must actually move by MIN_SCROLL_PX (or the clip is refused), and after
 * encoding the clip's mean per-frame luma delta must clear MIN_MOTION
 * (`--min-motion`), so a frozen clip can never land in `public/`.
 *
 * Free tooling only: Playwright (Apache-2.0) + ffmpeg. No watermark, no audio,
 * no paid service, no third-party iframes baked into the output.
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const VIDEO_DIR = path.join(PUBLIC_DIR, "video", "projects");
const IMAGE_DIR = path.join(PUBLIC_DIR, "images", "projects");
const CONTENT = path.join(ROOT, "content", "projects.ts");
const WORK_DIR = path.join(os.tmpdir(), "portfolio-preview-capture");
const MANIFEST = path.join(ROOT, "PREVIEW-MANIFEST.md");

/* ------------------------------------------------------------------ config */

const VIEWPORT = { width: 1440, height: 900 };
const OUTPUT = { width: 1280, height: 720 };
const RECORD_SECONDS = 6;
const FPS = 25;
/** Best quality we try first; only busy pages escalate. */
const CRF_LADDER = [32, 34, 36];
const SIZE_TARGET = 600 * 1024;
const SIZE_HARD_CAP = 800 * 1024;
const POSTER = { width: 1200, height: 675 };
const SETTLE_BUDGET_MS = 20_000;
const NAV_TIMEOUT_MS = 90_000;
/**
 * Seconds between the start of the Playwright recording and the moment
 * `context.newPage()` resolves — the video starts when the first page of the
 * context is created, which is before that promise settles. Measured on this
 * machine (1440x900, chromium): the raw video is ~1.0 s longer than the
 * wall-clock span we can observe, so wall-clock offsets are shifted by it when
 * trimming.
 */
const VIDEO_ORIGIN_LEAD = 1.0;
/** Extra stillness kept at the head and tail of every clip. */
const HEAD_LEAD = 0.5;
/**
 * Hard floor for the pre-record assertion: after the scroll unlock, a page with
 * more scroll room than this must actually travel at least this many pixels
 * (wheel first, programmatic fallback) or the clip is refused instead of being
 * written as a still frame.
 */
const MIN_SCROLL_PX = 600;
/**
 * Hard floor for the post-encode assertion: mean per-frame luma delta of the
 * finished webm (ffmpeg `tblend=all_mode=difference,signalstats`), in 0-255
 * luma units. The four esdeveniments.cat clips measured 0.62-0.77 while their
 * scroll was locked; real scrolling clips measure 3-13. Override with
 * `--min-motion <value>`.
 */
const MIN_MOTION_DEFAULT = 2.0;
/** How long the wheel probe may take before the programmatic fallback is tried. */
const SCROLL_PROBE_MS = 1200;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

/** Ad-serving hosts that must not appear inside a recorded page. */
const AD_REQUEST_RE =
  /^https?:\/\/[^/]*(googlesyndication\.com|doubleclick\.net|googleadservices\.com|adservice\.google\.com|amazon-adsystem\.com|adsbygoogle\.js)/i;

/**
 * `label` is what the card nav shows, and the portfolio UI is English, so it is
 * the English name of the page the button previews. `asset` is the stem the
 * clip and poster for that section were captured under (`<slug>-<asset>.webm` /
 * `.png`), fixed at capture time so renaming a card label can never rename a
 * file — the assets and `content/projects.ts` point at the same paths either
 * way. `labelsVerified` records what the *site itself* calls the section (these
 * sites are Catalan) and was read from each site's own navigation on
 * 2026-09-12, re-checked on capture. Nothing here is invented.
 *
 * esdeveniments.cat  nav: Inici -> /, Agenda -> /catalunya, Noticies -> /noticies.
 *                    "Cap de setmana" is the site's own label for the weekend
 *                    segment of the agenda (/catalunya/cap-de-setmana).
 * eltempsavui.cat    nav: "El Temps Avui" -> /, "Conceptes" -> /conceptes. The
 *                    homepage section is labelled "Home" here so the card nav
 *                    does not repeat the project title; the live nav label is
 *                    recorded in the manifest.
 * culturacardedeu.com nav: Agenda -> /, Noticies -> /noticies.
 * nowcast / moveflow / garmin are one-clip projects: no section nav on the card.
 */
export const PROJECTS = [
  {
    slug: "esdeveniments",
    name: "esdeveniments.cat",
    live: "https://esdeveniments.cat",
    note: "Catalan events platform: TypeScript frontend, Java backend, automated metadata collection.",
    ads: true,
    expectTitle: /Què fer/,
    expectText: /Agenda|Què fer/,
    labelsVerified:
      "site nav, 2026-09-12: Inici → `/`, Agenda → `/catalunya`, Notícies → `/noticies`; “Cap de setmana” is the site’s own label for the weekend segment of the agenda → `/catalunya/cap-de-setmana`.",
    sections: [
      { label: "Home", href: "https://esdeveniments.cat/", path: "/" },
      { label: "Events", href: "https://esdeveniments.cat/catalunya", path: "/catalunya", asset: "agenda" },
      {
        label: "Weekend",
        href: "https://esdeveniments.cat/catalunya/cap-de-setmana",
        path: "/catalunya/cap-de-setmana",
        asset: "cap-de-setmana",
      },
      { label: "News", href: "https://esdeveniments.cat/noticies", path: "/noticies", asset: "noticies" },
    ],
  },
  {
    slug: "eltempsavui",
    name: "eltempsavui.cat",
    live: "https://eltempsavui.cat",
    note: "Local weather forecasts for Catalonia, built with Next.js and TypeScript.",
    expectTitle: /El Temps Avui/,
    expectText: /El Temps Avui|previsió/,
    labelsVerified:
      "site nav, 2026-09-12: the homepage nav item is labelled “El Temps Avui” → `/`; the card calls that page “Home” so its nav does not repeat the project title. “Conceptes” → `/conceptes`.",
    sections: [
      { label: "Home", href: "https://eltempsavui.cat/", path: "/" },
      { label: "Concepts", href: "https://eltempsavui.cat/conceptes", path: "/conceptes", asset: "conceptes" },
    ],
  },
  {
    slug: "culturacardedeu",
    name: "culturacardedeu.com",
    live: "https://culturacardedeu.com",
    note: "Independent guide to cultural events and activities in Cardedeu.",
    expectTitle: /Cultura Cardedeu/,
    expectText: /Cardedeu/,
    ads: true,
    labelsVerified: "site nav, 2026-09-12: Agenda → `/`, Notícies → `/noticies`.",
    sections: [
      { label: "Events", href: "https://culturacardedeu.com/", path: "/" },
      { label: "News", href: "https://culturacardedeu.com/noticies", path: "/noticies", asset: "noticies" },
    ],
  },
  {
    slug: "nowcast-cardedeu",
    name: "nowcast-cardedeu",
    live: "https://nowcast-cardedeu.vercel.app",
    note: "XGBoost rain nowcasting using radar, lightning, and AEMET weather data.",
    expectTitle: /Plourà a Cardedeu/,
    expectText: /Plourà a Cardedeu/,
    labelsVerified: "single page; label is the page title, 2026-09-12.",
    clipLabel: "Plourà a Cardedeu?",
    sections: [{ label: "Plourà a Cardedeu?", href: "https://nowcast-cardedeu.vercel.app/", path: "/" }],
  },
  {
    slug: "moveflow",
    name: "MoveFlow",
    live: "https://moveflow-site.vercel.app",
    note:
      "macOS menu bar app for movement reminders. Captured from moveflow-site.vercel.app, which the card also links to: " +
      "https://moveflow.app serves an unrelated product by OOMI Software, so it is not linked.",
    expectTitle: /MoveFlow/,
    expectText: /MoveFlow/,
    labelsVerified: "single page; label is the document title, 2026-09-12.",
    clipLabel: "Beat Your Sedentary Brain",
    sections: [{ label: "Beat Your Sedentary Brain", href: "https://moveflow-site.vercel.app/", path: "/" }],
  },
  {
    slug: "breathing-timer",
    name: "Breathing Timer",
    live: "https://apps.garmin.com/apps/59828c15-7638-4e14-b871-47f0ce0c66f0",
    note:
      "Guided breathing timer for Garmin watches. Clip is the live Connect IQ store listing recorded for a " +
      "logged-out visitor (consent declined, modals dismissed); poster is composed from official Garmin store imagery.",
    expectTitle: /Connect IQ Store/,
    expectText: /Breathing Timer/,
    labelsVerified: "single page; label is the store listing title, 2026-09-12.",
    clipLabel: "Connect IQ Store",
    garmin: true,
    sections: [
      {
        label: "Connect IQ Store",
        href: "https://apps.garmin.com/apps/59828c15-7638-4e14-b871-47f0ce0c66f0",
        path: "/apps/59828c15-7638-4e14-b871-47f0ce0c66f0",
      },
    ],
  },
];

const GARMIN_ICON = "https://services.garmin.com/appsLibraryExternalServices/api/icons/806f54bd-339a-4a34-b4ef-9e32f13113d6";
const GARMIN_SCREENSHOTS = [
  "https://services.garmin.com/appsLibraryExternalServices/api/screenshots/b7c772aa-bb2e-499c-8234-a4d9a95d1ee3",
  "https://services.garmin.com/appsLibraryExternalServices/api/screenshots/3c2d9e88-7cc4-4d3a-82ed-987b409f743e",
  "https://services.garmin.com/appsLibraryExternalServices/api/screenshots/15b6239a-53cb-4d72-953f-2c1aec50ef3f",
];

/* ---------------------------------------------------------------- naming */

export function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Asset names for one captured row. The default (root) page of a project owns
 * the unsuffixed `<slug>.webm` / `<slug>.png` pair, which is also what the
 * card's `image` / `video` fields point at; extra sections get the stem they
 * were captured under (`asset`), falling back to the card label for a section
 * that has no clip yet.
 */
export function assetNames(project, section) {
  const isDefault = section.path === "/";
  const suffix = isDefault || project.sections.length === 1 ? "" : `-${section.asset ?? slugify(section.label)}`;
  return {
    suffix,
    video: `/video/projects/${project.slug}${suffix}.webm`,
    poster: `/images/projects/${project.slug}${suffix}.png`,
  };
}

/**
 * `--section` accepts the card label, or the stem the clip was captured under —
 * so `--section agenda` still selects what the card now calls "Events".
 */
function sectionMatches(section, wanted) {
  const needle = slugify(wanted);
  return (
    slugify(section.label) === needle ||
    section.label.toLowerCase() === String(wanted).toLowerCase() ||
    (section.asset != null && slugify(section.asset) === needle)
  );
}

/* ------------------------------------------------------- toolchain lookup */

export function resolvePlaywright() {
  const attempts = [];
  if (process.env.PLAYWRIGHT_MODULE) attempts.push(process.env.PLAYWRIGHT_MODULE);
  attempts.push("playwright");
  const require_ = createRequire(import.meta.url);
  for (const attempt of attempts) {
    try {
      return { modulePath: require_.resolve(attempt), via: attempt };
    } catch {
      /* try next */
    }
  }
  return null;
}

async function packageVersion(modulePath) {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(path.dirname(modulePath), "package.json"), "utf8"));
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

export async function loadPlaywright() {
  const found = resolvePlaywright();
  if (found) {
    const mod = await import(pathToFileURL(found.modulePath).href);
    const pw = mod.default ?? mod;
    if (pw?.chromium) return { pw, via: found.modulePath, version: await packageVersion(found.modulePath) };
  }
  const npxRoot = path.join(os.homedir(), ".npm", "_npx");
  try {
    for (const entry of await fs.readdir(npxRoot)) {
      const candidate = path.join(npxRoot, entry, "node_modules", "playwright", "index.js");
      if (!existsSync(candidate)) continue;
      const mod = await import(pathToFileURL(candidate).href);
      const pw = mod.default ?? mod;
      if (pw?.chromium) return { pw, via: candidate, version: await packageVersion(candidate) };
    }
  } catch {
    /* fall through */
  }
  throw new Error(
    "Playwright not found. Install it with `npm i -D playwright && npx playwright install chromium`, " +
      "or point PLAYWRIGHT_MODULE at a playwright/index.js.",
  );
}

export async function resolveChromiumExecutable() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  const names = [
    path.join("chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
    path.join("chrome-mac", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"),
    path.join("chrome-linux", "chrome"),
  ];
  let entries = [];
  try {
    entries = await fs.readdir(cache);
  } catch {
    return null;
  }
  const builds = entries.filter((e) => /^chromium-\d+$/.test(e)).sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const build of builds) {
    for (const name of names) {
      const candidate = path.join(cache, build, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function run(cmd, args, { quiet = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ out, err });
      else reject(new Error(`${cmd} ${args.slice(0, 6).join(" ")}… exited ${code}\n${quiet ? err.slice(-1200) : err}`));
    });
  });
}

async function ffprobeJson(file) {
  const { out } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration,size,format_name",
    "-show_entries",
    "stream=codec_name,width,height,r_frame_rate,nb_frames",
    "-of",
    "json",
    file,
  ]);
  return JSON.parse(out);
}

/* --------------------------------------------------------- page hygiene JS */

/**
 * Removes Google ad containers and their wrappers, and (optionally) hides
 * consent / banner overlays. Runs before recording and is re-run by a
 * MutationObserver while the page settles, because ads and consent dialogs are
 * injected late.
 */
const SWEEP_ADS = `(() => {
  const SEL = [
    'ins.adsbygoogle', 'ins[data-ad-client]', 'ins[data-ad-slot]',
    'iframe[src*="googlesyndication"]', 'iframe[src*="doubleclick"]',
    'iframe[src*="googleads"]', 'iframe[src*="adservice"]', 'iframe[src*="amazon-adsystem"]',
    'iframe[id^="aswift"]', 'iframe[id*="google_ads"]', 'iframe#google_esf',
    '[id*="div-gpt-ad"]', '[id*="google_ads"]', '[class*="adsbygoogle"]',
    '[data-ad]', '[data-ad-slot]', '[data-ad-client]', '[aria-label*="advertisement" i]',
  ];
  let removed = 0;
  const seen = new Set();
  const kill = (el, why) => {
    if (!el || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    const key = why + ':' + el.tagName + '#' + (el.id || '') + '.' + String(el.className).slice(0, 40) + ':' + Math.round(r.width) + 'x' + Math.round(r.height);
    if (seen.has(key)) return;
    seen.add(key);
    removed += 1;
    (window.__adRemovals ||= []).push(key);
    el.remove();
  };
  for (const sel of SEL) for (const el of document.querySelectorAll(sel)) kill(el, sel);
  // Ad slot wrappers: containers that exist only to hold a Google ad slot.
  for (const el of document.querySelectorAll('div, aside, section')) {
    const id = (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '');
    if (!/(^|[-_\\s])(ad|ads|advert|advertisement|adsbygoogle|publicitat)([-_\\s]|$)/i.test(id)) continue;
    if (!/(slot|wrapper|container|banner|holder|unit)/i.test(id)) continue; // ad boxes, not ad-ish words elsewhere
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 20) continue;
    if (el.querySelector('article, h1, h2, h3, nav')) continue; // never eat real content
    if (el.querySelector('img, video, picture, svg, input, button')) continue;
    kill(el, 'ad-wrapper');
  }
  // Empty ad boxes that held a slot but were not matched above (the slot itself
  // is gone, only its reserved space would remain and show up as a blank band).
  for (const el of document.querySelectorAll('div, aside, section')) {
    const r = el.getBoundingClientRect();
    if (r.height < 80 || r.width < 200) continue;
    if (!/(ad|ads|publicitat|sponsor)/i.test((el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : ''))) continue;
    if ((el.innerText || '').trim().length > 0) continue;
    if (el.querySelector('img, video, picture, svg, iframe, button, input, a')) continue;
    kill(el, 'empty-ad-box');
  }
  return removed;
})()`;

/**
 * Consent overlays. Verified live on 2026-09-12:
 *  - Google Funding Choices (esdeveniments.cat, culturacardedeu.com):
 *    `.fc-consent-root` holding a floating choice dialog and a help dialog.
 *  - TrustArc (apps.garmin.com): `#consent_blackbar` / `#truste-consent-content`.
 * Preference is "decline" where the site offers it, so no consent state is
 * recorded; the container is removed either way.
 */
const DISMISS_CONSENT = (preference) => `(() => {
  const log = (window.__consentLog ||= []);
  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.05;
  };
  const clickFirst = (selectors) => {
    for (const sel of selectors) {
      for (const el of document.querySelectorAll(sel)) {
        if (!visible(el)) continue;
        el.click();
        log.push('clicked ' + sel);
        return true;
      }
    }
    return false;
  };
  const PREFERENCE = ${JSON.stringify(preference)};
  const decline = [
    '.fc-cta-do-not-consent', '[class*="do-not-consent"]', '[class*="decline"]', '[class*="reject"]',
    '#truste-consent-required', '#onetrust-reject-all-handler', '.onetrust-close-btn-handler',
    '[data-testid="uc-deny-all-button"]', '#didomi-notice-disagree-button',
  ];
  const accept = [
    '.fc-cta-consent', '[class*="accept-all"]', '#truste-consent-button', '#onetrust-accept-btn-handler',
    '[data-testid="uc-accept-all-button"]', '#didomi-notice-agree-button',
  ];
  const close = ['.fc-help-dialog-close-button', '.fc-close-button', '[aria-label*="close" i]'];
  const order = PREFERENCE === 'accept' ? [...accept, ...decline, ...close] : [...decline, ...accept, ...close];
  let acted = clickFirst(order);
  if (!acted) {
    // Text match inside a known consent container.
    const re = PREFERENCE === 'accept'
      ? /^(accept|accept all|accepta|consentir|d'acord|i agree|got it|ok|allow)/i
      : /^(decline|reject|rebutj|refus|deny|do not consent|consentir|disagree|no gr\u00e0cies)/i;
    for (const el of document.querySelectorAll('.fc-consent-root button, #consent_blackbar button, [class*="consent" i] button, [id*="consent" i] button')) {
      const text = (el.textContent || '').replace(/\\s+/g, ' ').trim();
      if (text.length > 0 && text.length <= 40 && re.test(text) && visible(el)) { el.click(); log.push('clicked "' + text + '"'); acted = true; break; }
    }
  }
  // Whatever the site did with the click, the consent chrome must not be recorded.
  let hidden = 0;
  for (const sel of ['.fc-consent-root', '.fc-dialog-overlay', '.fc-dialog-container', '.fc-help-dialog-container',
                     '#consent_blackbar', '#truste-consent-track', '#onetrust-consent-sdk', '#didomi-host',
                     '[id*="cookie-banner" i]', '[class*="cookie-banner" i]', '[class*="consent-banner" i]']) {
    for (const el of document.querySelectorAll(sel)) { el.remove(); hidden += 1; }
  }
  // Dialogs injected after the click (e.g. Garmin's ratings modal).
  for (const el of document.querySelectorAll('[role="dialog"], [aria-modal="true"], [class*="Modal"][class*="verlay"], [class*="modal-backdrop" i]')) {
    if (!visible(el)) continue;
    const closer = el.querySelector('[aria-label*="close" i], [aria-label*="dismiss" i], button');
    if (closer && visible(closer)) { closer.click(); log.push('dismissed modal'); }
    if (el.isConnected && el.getBoundingClientRect().height > innerHeight * 0.35) { el.remove(); hidden += 1; }
  }
  return { acted, hidden, log };
})()`;

/** Fixed/sticky bars that are not the site's own navigation. */
const HIDE_BANNERS = `(() => {
  const hidden = [];
  for (const el of document.querySelectorAll('body > div, body > aside, body > section, body > header + div')) {
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.height < 24 || r.height > innerHeight * 0.5) continue;
    if (r.width < innerWidth * 0.5) continue;
    if (r.top > innerHeight * 0.85 && r.height < 80) continue; // toast/attribution corner
    if (el.querySelector('nav, header') || /nav|header/i.test(el.id + ' ' + String(el.className))) continue;
    const links = el.querySelectorAll('a[href]');
    if (links.length >= 3) continue; // real navigation, keep it
    el.style.setProperty('display', 'none', 'important');
    hidden.push((el.id || '') + '.' + String(el.className).slice(0, 50));
  }
  return hidden;
})()`;

/** Starts a per-frame ad assertion used while the scroll is recorded. */
const INSTALL_AD_ASSERT = `(() => {
  window.__adWatch = { ticks: 0, violations: [] };
  const AD_LIKE = /googlesyndication|doubleclick|googleads|adservice|amazon-adsystem|adsbygoogle/i;
  window.__adTick = () => {
    window.__adWatch.ticks += 1;
    const nodes = document.querySelectorAll('ins, iframe, [data-ad], [data-ad-slot], [data-ad-client], [id*="div-gpt-ad"], [class*="adsbygoogle"]');
    for (const el of nodes) {
      const sig = (el.getAttribute('src') || '') + ' ' + el.tagName + ' ' + String(el.className) + ' ' + el.id;
      if (!AD_LIKE.test(sig)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.02) continue;
      window.__adWatch.violations.push(sig.replace(/\\s+/g, ' ').trim().slice(0, 120));
    }
  };
  const CONSENT = ['.fc-consent-root', '.fc-dialog-overlay', '#consent_blackbar', '#truste-consent-track', '#onetrust-consent-sdk', '[class*="cookie-banner" i]', '[class*="consent-banner" i]'];
  const AD_NODES = [
    'ins.adsbygoogle', 'ins[data-ad-client]', '[class*="adsbygoogle"]',
    'iframe[src*="googlesyndication"]', 'iframe[src*="doubleclick"]', 'iframe[src*="googleads"]',
    'iframe[src*="adservice"]', '[id*="div-gpt-ad"]', '[id*="aswift"]',
  ];
  window.__hygieneTick = () => {
    const removed = window.__consentRemoved ||= [];
    for (const sel of [...CONSENT, ...AD_NODES]) {
      for (const el of document.querySelectorAll(sel)) {
        const why = sel + '@' + Math.round(performance.now()) + 'ms';
        if (!removed.includes(why)) removed.push(why);
        el.remove();
      }
    }
  };
  // Consent bars (TrustArc especially) are injected after load, so sweep on a
  // timer from before the poster is taken until the recording stops.
  window.__hygieneTimer = setInterval(() => window.__hygieneTick(), 100);
})()`;

/**
 * Scroll unlock. Reproduced on 2026-09-12: esdeveniments.cat ships
 * `body { overflow-y: hidden }`, and in headless Chromium the document then
 * cannot scroll at all — `window.scrollTo`, `page.mouse.wheel` and
 * `PageDown` all leave `scrollY` at 0 while `body.scrollHeight` is ~7900 px.
 * Injecting `html,body{overflow-y:auto;height:auto}` makes the identical wheel
 * event scroll immediately, so this is a capture-only neutralisation of the
 * lock (plus the inline styles as a belt-and-braces fallback) and not a change
 * to how the page looks: the recording shows the page as a visitor sees it,
 * only not frozen. Big non-fixed wrappers that clip their own overflowing
 * content are unlocked the same way, so an app shell that hides the scroll in
 * a `div` is covered too.
 */
const UNLOCK_SCROLL = `(() => {
  const report = { htmlBody: [], wrappers: [], bodyOverflowBefore: 'n/a', bodyOverflowAfter: 'n/a' };
  if (!document.body) return report;
  report.bodyOverflowBefore = getComputedStyle(document.body).overflowY;
  if (!document.getElementById('__preview_scroll_unlock')) {
    const style = document.createElement('style');
    style.id = '__preview_scroll_unlock';
    style.textContent =
      'html,body{overflow-y:auto !important;height:auto !important;max-height:none !important;overscroll-behavior:auto !important}';
    (document.head || document.documentElement).appendChild(style);
  }
  for (const el of [document.documentElement, document.body]) {
    el.style.setProperty('overflow-y', 'auto', 'important');
    el.style.setProperty('height', 'auto', 'important');
    el.style.setProperty('max-height', 'none', 'important');
    el.style.setProperty('overscroll-behavior', 'auto', 'important');
    report.htmlBody.push(el.tagName);
  }
  const vh = innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.overflowY !== 'hidden' && s.overflowY !== 'clip') continue;
    if (s.position === 'fixed' || s.position === 'sticky') continue; // overlays, not the page shell
    const r = el.getBoundingClientRect();
    if (r.height < vh * 0.5) continue;
    if (el.scrollHeight <= el.clientHeight + 80) continue;
    el.style.setProperty('overflow-y', 'auto', 'important');
    el.style.setProperty('max-height', 'none', 'important');
    report.wrappers.push(el.tagName + '#' + (el.id || '') + '.' + String(el.className).slice(0, 40));
  }
  report.bodyOverflowAfter = getComputedStyle(document.body).overflowY;
  return report;
})()`;

/**
 * Finds the inner scrollers once, so they can be sampled and driven. The
 * document's own boxes come first: on some layouts `html` does not overflow and
 * `body` is a scroll container in its own right (apps.garmin.com), where
 * `window.scrollY` stays 0 and only `body.scrollTop` moves.
 */
const FIND_INNER_SCROLLERS = `(() => {
  const vh = innerHeight;
  const candidates = [];
  const seen = new Set();
  const add = (el) => {
    if (!el || seen.has(el)) return;
    seen.add(el);
    candidates.push(el);
  };
  add(document.scrollingElement);
  add(document.documentElement);
  add(document.body);
  for (const el of document.querySelectorAll('main, [role="main"], [class*="scroll" i], [class*="feed" i], div, section')) add(el);
  const found = [];
  for (const el of candidates) {
    if (found.length >= 4) break;
    if (!el.isConnected) continue;
    if (el.scrollHeight <= el.clientHeight + 160) continue;
    if (el.clientHeight < vh * 0.35) continue;
    const documentLevel = el === document.documentElement || el === document.body || el === document.scrollingElement;
    const s = getComputedStyle(el);
    // A hidden box still scrolls programmatically (that is often exactly the
    // scroll lock being worked around), but arbitrary clipping wrappers are
    // left alone; only the document-level boxes qualify.
    const scrollable = s.overflowY === 'auto' || s.overflowY === 'scroll' || (documentLevel && s.overflowY === 'hidden');
    if (!scrollable) continue;
    found.push(el);
  }
  window.__innerScrollers = found;
  return found.length;
})()`;

/**
 * Position of the document plus every known inner scroller, and the limits.
 * window.scrollY covers the html element; the body box is counted separately
 * because a layout that scrolls the body leaves scrollY at 0.
 */
const SCROLL_STATE = `(() => {
  const doc = document.documentElement;
  const inner = window.__innerScrollers || [];
  let innerY = 0;
  let innerMax = 0;
  for (const el of inner) {
    if (!el.isConnected) continue;
    if (el === document.scrollingElement && el !== document.body) continue; // already in window.scrollY
    innerY += el.scrollTop;
    innerMax += Math.max(0, el.scrollHeight - el.clientHeight);
  }
  const docY = window.scrollY || doc.scrollTop || 0;
  const docMax = Math.max(0, Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0) - innerHeight);
  return {
    docY, innerY, total: docY + innerY, docMax, innerMax,
    // The document and its scrolling body box describe the same travel, so the
    // usable room is the larger of the two, never their sum.
    room: Math.max(docMax, innerMax),
    innerScrollers: inner.length,
    bodyOverflow: document.body ? getComputedStyle(document.body).overflowY : 'n/a',
  };
})()`;

/** Puts every scroller (document, body, inner boxes) back at the top. */
const RESET_SCROLL = `(() => {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
  for (const el of window.__innerScrollers || []) if (el.isConnected) el.scrollTop = 0;
  for (const el of document.querySelectorAll('*')) {
    if (el.scrollTop > 0 && el.scrollHeight - el.clientHeight > 40) el.scrollTop = 0;
  }
  return true;
})()`;

/**
 * Programmatic fallback driver, used when wheel events do not move the page.
 * The first argument is the document target in px, the second scales inner
 * scrollers (they travel at most 1.6 viewports); the scrolling element is
 * skipped because window.scrollTo already set it.
 */
const PROGRAMMATIC_SET = (px, fraction) => `(() => {
  const y = ${Math.round(Number(px) || 0)};
  const f = ${Number(fraction)};
  window.scrollTo(0, y);
  for (const el of window.__innerScrollers || []) {
    if (!el.isConnected || el === document.scrollingElement) continue;
    const elMax = Math.max(0, el.scrollHeight - el.clientHeight);
    el.scrollTop = Math.round(Math.min(elMax, Math.round(innerHeight * 1.6)) * f);
  }
  return true;
})()`;

/** Full-range programmatic walk used to prime lazy content before recording. */
const PROGRAMMATIC_SET_FULL = (fraction) => `(() => {
  const f = ${Number(fraction)};
  const doc = document.documentElement;
  const max = Math.max(0, Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0) - innerHeight);
  window.scrollTo(0, Math.round(max * f));
  for (const el of window.__innerScrollers || []) {
    if (!el.isConnected || el === document.scrollingElement) continue;
    const elMax = Math.max(0, el.scrollHeight - el.clientHeight);
    el.scrollTop = Math.round(elMax * f);
  }
  return true;
})()`;

/**
 * Ad/consent watches have to keep ticking while the scroll is driven from
 * Node (the old in-page RAF loop owned that job), so the recording is wrapped
 * in a page-side interval instead.
 */
const START_TICKS = `(() => {
  window.__stopTicks = () => { if (window.__tickTimer) clearInterval(window.__tickTimer); window.__tickTimer = null; };
  window.__tickTimer = setInterval(() => {
    if (typeof window.__adTick === 'function') window.__adTick();
    if (typeof window.__hygieneTick === 'function') window.__hygieneTick();
  }, 100);
  return true;
})()`;

const STOP_TICKS = `(() => {
  if (typeof window.__stopTicks === 'function') window.__stopTicks();
  if (typeof window.__adTick === 'function') window.__adTick();
  return window.__adWatch ? { ticks: window.__adWatch.ticks, violations: window.__adWatch.violations } : { ticks: 0, violations: [] };
})()`;

/** Page snapshot used for the manifest and for the expect-content checks. */
const PAGE_SNAPSHOT = `(() => {
  const text = (document.body.innerText || '').replace(/\\s+/g, ' ').trim();
  return { title: document.title, finalUrl: location.href, text, textLength: text.length };
})()`;

/**
 * Interaction fallback for pages that genuinely fit the viewport (no scroll
 * room anywhere): a real click on a card/detail/button, so the clip shows the
 * page doing something instead of being a still frame. Chosen candidates are
 * big, visible, inside the main content, and either same-origin links or
 * buttons — nothing that would leave the captured site.
 */
const FIND_INTERACTION = `(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 60) return false;
    if (r.bottom < 0 || r.top > innerHeight) return false;
    const s = getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.1;
  };
  const roots = [document.querySelector('main'), document.querySelector('[role="main"]'), document.body].filter(Boolean);
  const seen = new Set();
  for (const root of roots) {
    const candidates = root.querySelectorAll('article, li, button, a[href], [role="button"], [class*="card" i], [class*="tile" i]');
    for (const el of candidates) {
      if (el.closest('nav, header, footer')) continue;
      if (el.closest('[aria-hidden="true"]')) continue;
      const href = el.getAttribute('href') || '';
      if (el.tagName === 'A' && href && !href.startsWith('#') && !href.startsWith('/')) {
        try { if (new URL(href, location.href).origin !== location.origin) continue; } catch { continue; }
      }
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      const key = el.tagName + ':' + (el.id || '') + ':' + String(el.className).slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      return {
        x: Math.round(r.left + r.width / 2),
        y: Math.round(r.top + Math.min(r.height / 2, 80)),
        tag: el.tagName,
        label: ((el.getAttribute('aria-label') || el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60)),
      };
    }
  }
  return null;
})()`;


/* ------------------------------------------------------------- recording */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

const sampleScroll = (page) => page.evaluate(SCROLL_STATE);

/**
 * Drives the page from Node. Wheel is the primary driver because it is what a
 * visitor does and it works on every page whose scroll was only blocked by CSS;
 * the programmatic fallback exists for pages that swallow synthetic wheel
 * events. Either way the actual movement is sampled from the page and
 * accumulated, so the caller asserts on what really happened rather than on
 * what was requested.
 */
async function driveScroll(page, { durationMs, target, mode = "wheel", sampleMs = 100 }) {
  const start = Date.now();
  let issued = 0;
  let accumulated = 0;
  let previous = await sampleScroll(page);
  const first = previous;
  let nextSample = 0;
  for (;;) {
    const elapsed = Date.now() - start;
    const t = Math.min(1, elapsed / durationMs);
    const want = Math.round(target * easeInOut(t));
    if (mode === "wheel") {
      const delta = want - issued;
      if (delta > 0) {
        const step = Math.min(delta, 240);
        await page.mouse.wheel(0, step).catch(() => {});
        issued += step;
      }
    } else if (elapsed >= nextSample) {
      await page.evaluate(PROGRAMMATIC_SET(want, t)).catch(() => {});
      issued = want;
    }
    if (elapsed >= nextSample) {
      const now = await sampleScroll(page);
      accumulated += Math.abs(now.total - previous.total);
      previous = now;
      nextSample = elapsed + sampleMs;
    }
    if (t >= 1 && (mode === "wheel" ? want - issued <= 0 : true)) break;
    await sleep(mode === "wheel" ? 24 : 32);
  }
  // Synthetic wheel events can keep animating after the last one; keep counting
  // until the page has been still for a moment so nothing is missed.
  const settleEnd = Date.now() + 600;
  while (Date.now() < settleEnd) {
    await sleep(120);
    const now = await sampleScroll(page);
    accumulated += Math.abs(now.total - previous.total);
    previous = now;
  }
  return { accumulated, first, final: previous };
}

/** Returns the page to the top before the poster and the recording. */
async function resetScroll(page) {
  await page.evaluate(RESET_SCROLL).catch(() => {});
  await sleep(250);
  let state = await sampleScroll(page);
  if (state.total > 8) {
    // A scroller we could not zero programmatically: wheel it back instead.
    await page.mouse.move(Math.round(VIEWPORT.width / 2), Math.round(VIEWPORT.height / 2));
    await page.mouse.wheel(0, -Math.max(900, state.total + 400)).catch(() => {});
    await sleep(300);
    state = await sampleScroll(page);
  }
  return state;
}

/**
 * Applies the scroll unlock and *proves* the page moves before anything is
 * recorded. Three outcomes:
 *   - `wheel` / `programmatic`: the page has scroll room and the probe moved it
 *     by at least MIN_SCROLL_PX with that driver;
 *   - `interactive`: the page genuinely fits the viewport (no scroll room
 *     anywhere) — the clip has to show a real interaction instead;
 *   - anything else throws, so a page that refuses to move fails its clip
 *     instead of silently producing a still frame.
 */
async function planScroll(page, { minScroll = MIN_SCROLL_PX } = {}) {
  const unlock = await page.evaluate(UNLOCK_SCROLL).catch(() => null);
  await sleep(250);
  const innerScrollers = await page.evaluate(FIND_INNER_SCROLLERS).catch(() => 0);
  const state = await sampleScroll(page);
  const notes = {
    driver: null,
    room: state.room,
    docMax: state.docMax,
    innerMax: state.innerMax,
    innerScrollers,
    unlock,
    probePx: 0,
    wheelProbePx: null,
    interaction: null,
  };

  if (state.room < minScroll) {
    // Shorter than one screen: nothing to scroll, so open something instead.
    notes.driver = "interactive";
    notes.interaction = { candidate: await page.evaluate(FIND_INTERACTION).catch(() => null), changed: false, pixels: 0 };
    if (!notes.interaction.candidate) {
      throw new Error(
        `page fits the viewport (${state.room} px of scroll room) and offers nothing to click for motion — ` +
          `refusing to record a still frame`,
      );
    }
    return { mode: "interactive", target: 0, notes };
  }

  const target = Math.min(state.room, Math.round(VIEWPORT.height * 2.2));
  const probeTarget = Math.max(minScroll, Math.round(VIEWPORT.height * 0.9));
  // Start from the top: an unlocked body-scroller can already sit at its
  // bottom, and a downward probe from there would move nothing.
  await resetScroll(page);
  await page.mouse.move(Math.round(VIEWPORT.width / 2), Math.round(VIEWPORT.height / 2));
  const wheel = await driveScroll(page, { durationMs: SCROLL_PROBE_MS, target: probeTarget, mode: "wheel" });
  if (wheel.accumulated >= minScroll) {
    notes.driver = "wheel";
    notes.probePx = wheel.accumulated;
    await resetScroll(page);
    return { mode: "wheel", target, notes };
  }

  await resetScroll(page);
  const programmatic = await driveScroll(page, { durationMs: SCROLL_PROBE_MS, target: probeTarget, mode: "programmatic" });
  notes.wheelProbePx = wheel.accumulated;
  if (programmatic.accumulated >= minScroll) {
    notes.driver = "programmatic";
    notes.probePx = programmatic.accumulated;
    await resetScroll(page);
    return { mode: "programmatic", target, notes };
  }
  throw new Error(
    `page will not scroll even after the overflow unlock: ${state.room} px of scroll room, ` +
      `wheel moved ${wheel.accumulated} px, programmatic moved ${programmatic.accumulated} px ` +
      `(body overflow-y "${state.bodyOverflow}") — refusing to record a still frame`,
  );
}

/**
 * Records a real interaction on a page that fits the viewport: hover, then
 * click a card/detail/button. If what opened has scroll room of its own, the
 * rest of the clip scrolls it, otherwise the live page motion carries the clip
 * (the post-encode assertion still has to pass).
 */
async function performInteraction(page, candidate, { durationMs }) {
  const started = Date.now();
  const before = await page.evaluate(PAGE_SNAPSHOT).catch(() => ({ finalUrl: "", textLength: 0 }));
  await page.mouse.move(candidate.x, candidate.y).catch(() => {});
  await sleep(350);
  await page.mouse.click(candidate.x, candidate.y).catch(() => {});
  await sleep(600);
  const after = await page.evaluate(PAGE_SNAPSHOT).catch(() => ({ finalUrl: "", textLength: 0 }));
  const changed = after.finalUrl !== before.finalUrl || Math.abs(after.textLength - before.textLength) > 40;

  await page.evaluate(FIND_INNER_SCROLLERS).catch(() => 0);
  const state = await sampleScroll(page);
  let pixels = 0;
  if (state.room >= MIN_SCROLL_PX) {
    const remaining = Math.max(900, durationMs - (Date.now() - started));
    const driven = await driveScroll(page, {
      durationMs: remaining,
      target: Math.min(state.room, Math.round(VIEWPORT.height * 1.4)),
      mode: "wheel",
    });
    pixels = driven.accumulated;
  }
  const rest = durationMs - (Date.now() - started);
  if (rest > 0) await sleep(rest);
  if (!changed && pixels < MIN_SCROLL_PX) {
    throw new Error(
      `page fits the viewport and the interaction ("${candidate.label}") changed nothing ` +
        `(${before.textLength} → ${after.textLength} chars, url ${before.finalUrl} → ${after.finalUrl}) — ` +
        `refusing to record a still frame`,
    );
  }
  return {
    clicked: `${candidate.tag}${candidate.label ? ` "${candidate.label}"` : ""}`,
    changed,
    pixels,
    beforeUrl: before.finalUrl,
    afterUrl: after.finalUrl,
  };
}

/**
 * Mean per-frame luma delta of the finished clip, measured with ffmpeg
 * (`tblend` difference + `signalstats` YAVG, 0-255 luma units). This is the
 * post-encode assertion: a clip that somehow came out static is deleted and
 * the run fails instead of shipping it.
 */
async function measureMotion(file) {
  const { out, err } = await run("ffmpeg", [
    "-v", "info",
    "-i", file,
    "-an",
    "-vf", "tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG",
    "-f", "null", os.devNull,
  ]);
  const values = [...`${out}${err}`.matchAll(/lavfi\.signalstats\.YAVG=([0-9.eE+-]+)/g)].map((m) => Number(m[1]));
  if (values.length === 0) return { mean: null, max: null, frames: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return { mean: Number(mean.toFixed(3)), max: Number(Math.max(...values).toFixed(3)), frames: values.length };
}

async function settlePage(page) {
  for (let i = 0; i < 10; i += 1) {
    await page.evaluate(DISMISS_CONSENT("decline")).catch(() => {});
    await page.evaluate(SWEEP_ADS).catch(() => {});
    const state = await page
      .evaluate(() => ({
        fonts: document.fonts ? document.fonts.status : "loaded",
        pending: [...document.images].filter((img) => !img.complete && img.currentSrc).length,
        consent: document.querySelectorAll(".fc-consent-root, #consent_blackbar, #onetrust-consent-sdk").length,
      }))
      .catch(() => ({ fonts: "loading", pending: 9, consent: 1 }));
    if (state.fonts === "loaded" && state.pending === 0 && state.consent === 0) break;
    await sleep(350);
  }
  await page
    .evaluate(async (budget) => {
      const deadline = Date.now() + budget;
      if (document.fonts) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, budget))]);
      while (Date.now() < deadline) {
        if ([...document.images].every((img) => img.complete)) break;
        await new Promise((r) => setTimeout(r, 150));
      }
    }, SETTLE_BUDGET_MS)
    .catch(() => {});
}

/**
 * Client-rendered pages (nowcast fetches a forecast, the Garmin store hydrates
 * its listing) finish after `load`. Wait until the rendered text stops growing
 * so a clip never opens on a loading state.
 */
async function waitForStableText(page, { budget = 15_000, quiet = 1200 } = {}) {
  await page
    .evaluate(
      async ({ budget, quiet }) => {
        const deadline = Date.now() + budget;
        let last = -1;
        let stableSince = Date.now();
        while (Date.now() < deadline) {
          const length = (document.body.innerText || "").replace(/\\s+/g, " ").trim().length;
          if (length !== last) {
            last = length;
            stableSince = Date.now();
          } else if (Date.now() - stableSince >= quiet && length > 400) {
            return length;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        return last;
      },
      { budget, quiet },
    )
    .catch(() => {});
}

/**
 * Walks the page to the bottom and back before recording so lazy images have
 * already loaded — otherwise photos pop in mid-scroll and shift the layout.
 */
async function primePage(page) {
  const max = await page
    .evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - innerHeight)
    .catch(() => 0);
  if (max < 40) return;
  for (let i = 1; i <= 4; i += 1) {
    await page.evaluate(PROGRAMMATIC_SET_FULL(i / 4)).catch(() => {});
    await sleep(450);
  }
  await page
    .evaluate(async () => {
      const deadline = Date.now() + 6000;
      while (Date.now() < deadline) {
        if ([...document.images].every((img) => img.complete)) break;
        await new Promise((r) => setTimeout(r, 200));
      }
    })
    .catch(() => {});
  await page.evaluate(PROGRAMMATIC_SET_FULL(0)).catch(() => {});
  await sleep(500);
}

/**
 * Loads the page, settles overlays, and refuses to continue when the site
 * serves an error page or a loading shell instead of the page we asked for.
 * Garmin's store listing intermittently renders its "not found" branch on the
 * first hit, so this retries before giving up.
 */
async function loadVerifiedPage(page, url, project, attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
    await settlePage(page);
    await waitForStableText(page);
    const seen = await page.evaluate(() => ({
      title: document.title,
      finalUrl: location.href,
      text: (document.body.innerText || "").replace(/\\s+/g, " ").trim(),
    }));
    const broken = /not found|no trobada|access denied|are you a robot/i.test(seen.text) || seen.text.length < 400;
    if (project.expectText.test(seen.text) && !broken) return seen;
    console.log(
      `    retry ${attempt}/${attempts}: "${url}" did not render the expected page ` +
        `(title "${seen.title.slice(0, 60)}", ${seen.text.length} chars${broken ? ", error page" : ""})`,
    );
    await sleep(2000 + attempt * 2000);
  }
  return null;
}

async function captureOne({ browser, project, section, workdir, minMotion = MIN_MOTION_DEFAULT }) {
  // Navigate the canonical section URL itself: `live` can already contain a
  // path (Garmin's store listing), so joining host + path is not safe.
  const url = section.href;
  const { video: videoPath, poster: posterPath } = assetNames(project, section);
  const videoName = path.basename(videoPath);
  const posterName = path.basename(posterPath);

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: project.slug === "breathing-timer" ? "en-US" : "ca-ES",
    userAgent: UA,
    colorScheme: "light",
    reducedMotion: "no-preference",
    recordVideo: { dir: workdir, size: VIEWPORT },
  });
  // Google Auto Ads inject anchor/vignette containers long after `load`; stop
  // the ad requests at the network layer so nothing can render mid-recording.
  // The DOM sweeps below stay as a second line of defence and report counts.
  await context.route(AD_REQUEST_RE, (route) => route.abort());
  const page = await context.newPage();
  const t0 = Date.now();
  const rawVideo = path.join(workdir, "raw.webm");
  if (process.env.CAPTURE_DEBUG) {
    const stamp = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(5);
    page.on("console", (m) => {
      if (m.type() === "error") console.log(`      [${stamp()}s console] ${m.text().replace(/\s+/g, " ").slice(0, 150)}`);
    });
    page.on("pageerror", (e) => console.log(`      [${stamp()}s pageerror] ${String(e).replace(/\s+/g, " ").slice(0, 200)}`));
    page.on("requestfailed", (r) =>
      console.log(`      [${stamp()}s failed] ${r.url().slice(0, 110)} :: ${r.failure()?.errorText}`),
    );
    page.on("response", (r) => {
      if (/asw\/apps|languages|deviceTypes/.test(r.url())) {
        console.log(`      [${stamp()}s api] ${r.status()} ${r.url().slice(0, 110)}`);
      }
    });
  }

  try {
    const loaded = await loadVerifiedPage(page, url, project);
    if (!loaded) {
      throw new Error(
        `${project.slug}${section.path}: page never rendered the expected content ` +
          `(${project.expectText}); last title "${(await page.title().catch(() => "")) || "n/a"}"`,
      );
    }
    if (process.env.CAPTURE_DEBUG) console.log(`    loaded: "${loaded.title.slice(0, 70)}" (${loaded.text.length} chars)`);

    // Scrollbars: nothing should be captured mid-scroll.
    await page.addStyleTag({
      content: "html{scroll-behavior:auto !important} *::-webkit-scrollbar{width:0 !important;height:0 !important}",
    });

    // Unlock the page scroll and prove it moves *before* priming or recording:
    // esdeveniments.cat ships `body{overflow-y:hidden}`, which leaves the
    // document frozen in headless Chromium, and a clip recorded from a frozen
    // page is a still frame. planScroll() throws instead.
    const plan = await planScroll(page);
    const unlockNote =
      `scroll unlock: body overflow-y ${plan.notes.unlock?.bodyOverflowBefore ?? "?"} → ` +
      `${plan.notes.unlock?.bodyOverflowAfter ?? "?"}, ${plan.notes.unlock?.wrappers.length ?? 0} clipping wrapper(s), ` +
      `driver ${plan.notes.driver}, probe ${Math.round(plan.notes.probePx)} px of ${Math.round(plan.notes.room)} px room`;
    console.log(`    ${unlockNote}`);

    await primePage(page);
    await waitForStableText(page, { budget: 6_000, quiet: 800 });
    await page.evaluate(DISMISS_CONSENT("decline")).catch(() => {});
    const adRemovals = await page.evaluate(SWEEP_ADS).catch(() => 0);
    const bannersHidden = await page.evaluate(HIDE_BANNERS).catch(() => []);
    const unlockAgain = await page.evaluate(UNLOCK_SCROLL).catch(() => null);
    if (unlockAgain?.bodyOverflowAfter && unlockAgain.bodyOverflowAfter !== "auto" && unlockAgain.bodyOverflowAfter !== "scroll") {
      throw new Error(
        `${project.slug}${section.path}: the page re-locked its scroll after the settle pass ` +
          `(body overflow-y "${unlockAgain.bodyOverflowAfter}")`,
      );
    }
    await page.evaluate(INSTALL_AD_ASSERT).catch(() => {});
    await page.evaluate(() => {
      window.__consentLog = [];
      window.__adWatch = { ticks: 0, violations: [] };
    });

    // Poster: the settled page at rest, the same state the clip opens on.
    await resetScroll(page);
    await sleep(700);
    const posterPng = path.join(workdir, "poster.png");
    await page.screenshot({ path: posterPng, type: "png" });

    await page.evaluate(START_TICKS).catch(() => {});
    const scrollStart = Date.now();
    const movement =
      plan.mode === "interactive"
        ? await performInteraction(page, plan.notes.interaction.candidate, { durationMs: RECORD_SECONDS * 1000 })
        : await driveScroll(page, { durationMs: RECORD_SECONDS * 1000, target: plan.target, mode: plan.mode });
    const adWatch = await page.evaluate(STOP_TICKS).catch(() => ({ ticks: 0, violations: [] }));
    const consentLog = await page.evaluate(() => window.__consentLog ?? []).catch(() => []);
    const consentSweeps = await page.evaluate(() => window.__consentRemoved ?? []).catch(() => []);
    const report = { ...(await page.evaluate(PAGE_SNAPSHOT)), ...movement };

    await page.close();
    await page.video().saveAs(rawVideo);

    const adAssertion = {
      ok: adWatch.ticks > 0 && adWatch.violations.length === 0,
      ticks: adWatch.ticks,
      violations: [...new Set(adWatch.violations)].slice(0, 5),
      removed: adRemovals,
    };
    console.log(
      `    ads: removed=${adRemovals} swept=${bannersHidden.length} assertion=${adAssertion.ok ? "PASS" : "FAIL"} ` +
        `(ticks=${adWatch.ticks}, visible googlesyndication/doubleclick while recording=${adWatch.violations.length})`,
    );
    console.log(
      `    consent: ${consentLog.length ? consentLog.join("; ") : "none present"}` +
        (consentSweeps.length ? `; overlay(s) removed after the settle pass: ${[...new Set(consentSweeps)].join(", ")}` : ""),
    );
    if (!adAssertion.ok) throw new Error(`${project.slug}${section.path}: ad assertion failed — ${adAssertion.violations.join(", ")}`);

    if (report.textLength < 300) {
      throw new Error(`${project.slug}${section.path}: page looks empty (${report.textLength} chars of text, title "${report.title}")`);
    }
    // A 404, a consent wall or a bot check would still be a valid capture: refuse it.
    if (/not found|no trobada|404|access denied|are you a robot/i.test(report.title)) {
      throw new Error(`${project.slug}${section.path}: server returned an error page — "${report.title}"`);
    }
    if (project.expectTitle && !project.expectTitle.test(loaded.title)) {
      throw new Error(`${project.slug}${section.path}: expected a title matching ${project.expectTitle}, got "${loaded.title}"`);
    }
    if (!project.expectText.test(loaded.text)) {
      throw new Error(
        `${project.slug}${section.path}: page text does not contain ${project.expectText} — ` +
          `first 120 chars: "${loaded.text.slice(0, 120)}"`,
      );
    }

    // Post-record half of the pre-record assertion: the probe proved the page
    // can move, so the recording itself must have moved it too.
    const movedPx = plan.mode === "interactive" ? movement.pixels : movement.accumulated;
    if (plan.mode !== "interactive" && movedPx < MIN_SCROLL_PX) {
      throw new Error(
        `${project.slug}${section.path}: page moved only ${Math.round(movedPx)} px during the recording ` +
          `(floor ${MIN_SCROLL_PX} px, driver ${plan.mode}) — clip would be a still frame`,
      );
    }

    const rawProbe = await ffprobeJson(rawVideo);
    const offsetSeconds = Math.max(0, (scrollStart - t0) / 1000 - VIDEO_ORIGIN_LEAD - HEAD_LEAD);
    const video = path.join(VIDEO_DIR, videoName);
    const encoding = await encodeClip(rawVideo, video, offsetSeconds);
    const outProbe = await ffprobeJson(video);
    const outStream = outProbe.streams.find((s) => s.width) ?? {};

    // Post-encode assertion: the file on disk must actually move. A clip that
    // failed is deleted, not left behind for the site to pick up.
    const motionEnergy = await measureMotion(video);
    const motionOk = motionEnergy.mean != null && motionEnergy.mean >= minMotion;
    console.log(
      `    motion: ${motionEnergy.mean ?? "n/a"} mean luma delta over ${motionEnergy.frames} frames ` +
        `(min ${minMotion.toFixed(2)}, peak ${motionEnergy.max ?? "n/a"}) ${motionOk ? "PASS" : "FAIL"}`,
    );
    if (!motionOk) {
      await fs.rm(video, { force: true }).catch(() => {});
      throw new Error(
        `${project.slug}${section.path}: clip is static — mean per-frame luma delta ` +
          `${motionEnergy.mean ?? "n/a"} < ${minMotion} (${Math.round(movedPx)} px of recorded motion, driver ${plan.notes.driver}). ` +
          `Failing the run rather than shipping a still frame.`,
      );
    }

    const poster = path.join(IMAGE_DIR, posterName);
    if (project.garmin) await buildGarminPoster(workdir, poster);
    else await renderPoster(posterPng, poster);
    const posterProbe = await ffprobeJson(poster).catch(() => null);
    const posterStream = posterProbe?.streams?.[0] ?? {};

    const entry = {
      slug: project.slug,
      name: project.name,
      live: project.live,
      label: project.clipLabel ?? section.label,
      sectionLabel: section.label,
      sectionHref: section.href,
      capturedUrl: report.finalUrl || url,
      requestedUrl: url,
      title: report.title,
      video: videoPath,
      poster: posterPath,
      width: outStream.width,
      height: outStream.height,
      codec: outStream.codec_name,
      durationSeconds: Number(Number(outProbe.format.duration).toFixed(3)),
      videoBytes: Number(outProbe.format.size),
      crf: encoding.crf,
      bitrateKbps: encoding.bitrateKbps,
      posterWidth: posterStream.width ?? POSTER.width,
      posterHeight: posterStream.height ?? POSTER.height,
      capturedAt: new Date().toISOString().slice(0, 10),
      rawSeconds: Number(Number(rawProbe.format.duration).toFixed(2)),
      motion: {
        driver: plan.mode,
        pixels: Math.round(movedPx),
        target: plan.target,
        room: plan.notes.room,
        probePx: Math.round(plan.notes.probePx),
        wheelProbePx: plan.notes.wheelProbePx == null ? null : Math.round(plan.notes.wheelProbePx),
        innerScrollers: plan.notes.innerScrollers,
        energy: motionEnergy.mean,
        peak: motionEnergy.max,
        frames: motionEnergy.frames,
        threshold: minMotion,
        interaction: plan.mode === "interactive" ? movement : null,
      },
      ads: { removed: adRemovals, assertion: adAssertion.ok ? "PASS" : "FAIL", violations: adAssertion.violations.length },
      consent: consentLog.length ? consentLog.slice(0, 3).join("; ") : "none present",
      lateOverlaysRemoved: [...new Set(consentSweeps)].length,
      note: project.note,
      garmin: project.garmin === true,
    };
    console.log(
      `    ok  ${videoPath}  ${entry.width}x${entry.height} ${entry.codec} ${entry.durationSeconds}s ` +
        `${(entry.videoBytes / 1024).toFixed(0)} KB crf${entry.crf}${entry.bitrateKbps ? ` @${entry.bitrateKbps}kbps` : ""} ` +
        `| poster ${entry.posterWidth}x${entry.posterHeight} | motion ${entry.motion.pixels}px via ${entry.motion.driver}, energy ${entry.motion.energy}`,
    );
    return entry;
  } finally {
    await context.close().catch(() => {});
  }
}

/* ------------------------------------------------------------ post-process */

function encodeArgs(input, { crf, kbps, pass, offsetSeconds, passlog }) {
  const args = ["-y", "-i", input];
  // Seek after the input so the trim is frame-accurate; the head of every clip
  // is still, so a few hundred ms either way is invisible.
  if (offsetSeconds != null && offsetSeconds > 0) args.push("-ss", offsetSeconds.toFixed(3));
  args.push(
    "-an",
    "-t", String(RECORD_SECONDS),
    "-vf", `scale=${OUTPUT.width}:${OUTPUT.height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${OUTPUT.width}:${OUTPUT.height},format=yuv420p`,
    "-r", String(FPS),
    "-c:v", "libvpx-vp9",
    "-deadline", "good",
    "-cpu-used", "2",
    "-row-mt", "1",
    "-auto-alt-ref", "1",
    "-lag-in-frames", "25",
    "-g", String(FPS * 2),
    "-crf", String(crf),
  );
  if (kbps) args.push("-b:v", `${kbps}k`);
  else args.push("-b:v", "0");
  if (pass) args.push("-pass", String(pass), "-passlogfile", passlog);
  args.push("-f", "webm");
  return args;
}

/**
 * Encodes the captured clip to VP9/WebM at 1280x720, no audio.
 *
 * Quality first: CRF 32 is tried before anything else, and only a clip that
 * busts the 600 KB budget drops to a two-pass bitrate-constrained encode at
 * the same CRF. `kbps` is bits per second (target bytes x 8 / duration), so the
 * constrained pass lands just under the budget instead of overshooting it.
 */
async function encodeClip(input, output, offsetSeconds) {
  let best = null;
  for (const crf of CRF_LADDER) {
    const tmp = `${output}.crf${crf}.webm`;
    await run("ffmpeg", [...encodeArgs(input, { crf, offsetSeconds }), tmp]);
    const { size } = await fs.stat(tmp);
    if (best) await fs.rm(best.tmp, { force: true });
    best = { tmp, size, crf, bitrateKbps: null };
    if (size <= SIZE_TARGET) break;
  }

  if (best.size > SIZE_TARGET) {
    const passlog = `${output}.passlog`;
    const constrained = await encodeConstrained(input, output, offsetSeconds, passlog);
    await fs.rm(`${passlog}-0.log`, { force: true }).catch(() => {});
    if (constrained && constrained.size < best.size) {
      await fs.rm(best.tmp, { force: true });
      best = constrained;
    }
  }

  if (best.size > SIZE_HARD_CAP) {
    await fs.rm(best.tmp, { force: true });
    throw new Error(
      `encoded clip is ${(best.size / 1024).toFixed(0)} KB (crf ${best.crf}${best.bitrateKbps ? `, ${best.bitrateKbps} kbps` : ""}), ` +
        `over the ${SIZE_HARD_CAP / 1024} KB hard cap`,
    );
  }

  await fs.rm(output, { force: true });
  await fs.rename(best.tmp, output);
  return { size: best.size, crf: best.crf, bitrateKbps: best.bitrateKbps, withinPreferred: best.crf === CRF_LADDER[0] };
}

async function encodeConstrained(input, output, offsetSeconds, passlog) {
  const desiredBytes = SIZE_TARGET * 0.9;
  let kbps = Math.max(150, Math.round((desiredBytes * 8) / RECORD_SECONDS / 1000));
  let best = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await run("ffmpeg", [...encodeArgs(input, { crf: CRF_LADDER[0], kbps, pass: 1, offsetSeconds, passlog }), os.devNull]);
    const tmp = `${output}.br${kbps}.webm`;
    await run("ffmpeg", [...encodeArgs(input, { crf: CRF_LADDER[0], kbps, pass: 2, offsetSeconds, passlog }), tmp]);
    const { size } = await fs.stat(tmp);
    if (best) await fs.rm(best.tmp, { force: true });
    best = { tmp, size, crf: CRF_LADDER[0], bitrateKbps: kbps };
    if (size <= SIZE_TARGET || attempt === 1) break;
    kbps = Math.max(150, Math.round(kbps * 0.8));
  }
  return best;
}

async function renderPoster(pngFile, output) {
  await run("ffmpeg", [
    "-y",
    "-i", pngFile,
    "-vf", `scale=${POSTER.width}:${POSTER.height}:force_original_aspect_ratio=increase,crop=${POSTER.width}:${POSTER.height},format=rgb24`,
    "-frames:v", "1",
    "-compression_level", "9",
    output,
  ]);
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/png,image/*,*/*;q=0.8" } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  return buf.length;
}

/** Poster for the Garmin card, composed from the official Connect IQ store imagery. */
async function buildGarminPoster(workdir, output) {
  const icon = path.join(workdir, "garmin-icon.png");
  const shots = [];
  await download(GARMIN_ICON, icon);
  for (const [i, url] of GARMIN_SCREENSHOTS.entries()) {
    const dest = path.join(workdir, `garmin-shot-${i}.png`);
    await download(url, dest);
    shots.push(dest);
  }
  const [W, H] = [POSTER.width, POSTER.height];
  const shot = 250;
  const gap = 30;
  const iconSize = 130;
  const groupWidth = iconSize + 56 + shots.length * shot + (shots.length - 1) * gap;
  const left = Math.round((W - groupWidth) / 2);
  const inputs = [
    "-f", "lavfi", "-i", `color=c=#f5f4ef:s=${W}x${H}:d=1`,
    "-i", icon,
    ...shots.flatMap((s) => ["-i", s]),
  ];
  const filters = [`[1:v]scale=${iconSize}:${iconSize}:flags=lanczos,setsar=1[ic]`];
  shots.forEach((_, i) => filters.push(`[${i + 2}:v]scale=${shot}:${shot}:flags=lanczos,setsar=1[s${i}]`));
  const steps = [`[0:v][ic]overlay=${left}:${Math.round((H - iconSize) / 2)}[o0]`];
  shots.forEach((_, i) => {
    steps.push(
      `[o${i}][s${i}]overlay=${left + iconSize + 56 + i * (shot + gap)}:${Math.round((H - shot) / 2)}[o${i + 1}]`,
    );
  });
  await run("ffmpeg", [
    "-y",
    ...inputs,
    "-filter_complex", [...filters, ...steps].join(";"),
    "-map", `[o${shots.length}]`,
    "-frames:v", "1",
    "-compression_level", "9",
    output,
  ]);
}

/* ------------------------------------------------------------------ driver */

function parseArgs(argv) {
  const out = { all: false, project: null, section: null, manifestOnly: false, help: false, minMotion: MIN_MOTION_DEFAULT };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--all") out.all = true;
    else if (a === "--project") out.project = argv[++i];
    else if (a === "--section") out.section = argv[++i];
    else if (a === "--manifest-only") out.manifestOnly = true;
    else if (a === "--min-motion") out.minMotion = Number(argv[++i]);
    else if (a === "--help" || a === "-h") out.help = true;
  }
  if (!Number.isFinite(out.minMotion) || out.minMotion < 0) out.minMotion = MIN_MOTION_DEFAULT;
  return out;
}

/** Video paths the site actually references, read from content/projects.ts. */
export async function wiredPaths() {
  const source = await fs.readFile(CONTENT, "utf8");
  const bySlug = new Map();
  const blocks = source.split(/\n\s*\{\s*\n\s*slug: "/).slice(1);
  for (const block of blocks) {
    const slug = block.slice(0, block.indexOf('"'));
    bySlug.set(slug, [...block.matchAll(/`?(\/(?:video|images)\/projects\/[^`"']+)`?/g)].map((m) => m[1]));
  }
  return bySlug;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage:
  node scripts/capture-previews.mjs --all
  node scripts/capture-previews.mjs --project <slug> [--section <label>] [--min-motion 2.0]
  node scripts/capture-previews.mjs --manifest-only

Every clip is scroll-unlocked, asserted to move before recording, and asserted to
move again after encoding (mean per-frame luma delta >= --min-motion, default
${MIN_MOTION_DEFAULT}).

--manifest-only rewrites PREVIEW-MANIFEST.md from the facts already recorded in
it (no browser, no capture), re-checking every one of them against the assets in
public/ first. Use it when only the card labels change; --section accepts a card
label or the stem its clip was captured under.

Slugs:   ${PROJECTS.map((p) => p.slug).join(", ")}
Sections: ${PROJECTS.map((p) => `${p.slug}: ${p.sections.map((s) => s.label).join(" | ")}`).join("\n           ")}`);
    return;
  }
  if (args.manifestOnly) {
    await writeManifestOnly();
    return;
  }
  if (!args.all && !args.project) {
    console.error("Pass --all, --project <slug> or --manifest-only. Use --help for usage.");
    process.exit(2);
  }

  const { pw, via, version } = await loadPlaywright();
  const executablePath = await resolveChromiumExecutable();
  const ffmpeg = (await run("ffmpeg", ["-version"])).out.split("\n")[0];
  console.log(`playwright: ${version ?? "unknown"} (${via})`);
  console.log(`chromium:   ${executablePath ?? "(playwright default)"}`);
  console.log(`ffmpeg:     ${ffmpeg}`);
  console.log(`assertions: pre-record scroll >= ${MIN_SCROLL_PX}px, post-encode motion >= ${args.minMotion}`);

  await fs.mkdir(VIDEO_DIR, { recursive: true });
  await fs.mkdir(IMAGE_DIR, { recursive: true });
  await fs.mkdir(WORK_DIR, { recursive: true });

  const selected = PROJECTS.filter((p) => (args.all ? true : p.slug === args.project));
  if (selected.length === 0) {
    console.error(`unknown project "${args.project}". Known: ${PROJECTS.map((p) => p.slug).join(", ")}`);
    process.exit(2);
  }

  const browser = await pw.chromium.launch({
    headless: true,
    executablePath: executablePath ?? undefined,
    args: ["--hide-scrollbars", "--force-device-scale-factor=1"],
  });
  const chromiumVersion = browser.version();
  console.log(`chromium:   ${chromiumVersion}`);

  const results = [];
  const failures = [];

  for (const project of selected) {
    const sections = args.section ? project.sections.filter((s) => sectionMatches(s, args.section)) : project.sections;
    if (sections.length === 0) {
      console.error(`! ${project.slug}: no section matching "${args.section}" (have: ${project.sections.map((s) => s.label).join(", ")})`);
      process.exit(2);
    }
    for (const section of sections) {
      console.log(`\n> ${project.slug} / ${section.label}\n  ${section.href}`);
      const workdir = path.join(WORK_DIR, `${project.slug}${assetNames(project, section).suffix}`);
      await fs.rm(workdir, { recursive: true, force: true });
      await fs.mkdir(workdir, { recursive: true });
      try {
        results.push(await captureOne({ browser, project, section, workdir, minMotion: args.minMotion }));
      } catch (error) {
        failures.push({ label: `${project.slug} / ${section.label}`, message: error.message });
        console.log(`  FAIL ${error.message.split("\n")[0]}`);
        if (process.env.CAPTURE_DEBUG) console.log(error.stack);
      } finally {
        if (!process.env.CAPTURE_KEEP_WORK) await fs.rm(workdir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  await browser.close();

  if (results.length > 0) {
    await writeManifest(results, {
      playwrightVersion: version,
      chromiumVersion,
      ffmpegVersion: ffmpeg,
      minMotion: args.minMotion,
    });
    console.log(`\nmanifest: ${path.relative(ROOT, MANIFEST)} (${results.length} clip${results.length === 1 ? "" : "s"} this run)`);
  }
  if (failures.length > 0) {
    console.error(`\n${failures.length} capture(s) failed:`);
    for (const f of failures) console.error(`  - ${f.label}: ${f.message.split("\n")[0]}`);
    process.exit(1);
  } else {
    console.log(`\nall ${results.length} clip(s) passed the scroll and motion assertions.`);
  }
}

/* ---------------------------------------------------------------- manifest */

const KB = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

/** One generated `| … |` table line as trimmed cells, or null if it is not one. */
function tableCells(line) {
  if (!line.startsWith("|")) return null;
  const cells = line.split("|").map((cell) => cell.trim().replace(/^`(.*)`$/, "$1"));
  if (cells.length < 4 || cells[0] !== "" || cells[cells.length - 1] !== "") return null;
  return cells.slice(1, -1);
}

/** Rows of the generated `## Assets` table, exactly as recorded there. */
function parseAssetTable(source) {
  const table = source.split("## Assets")[1]?.split("## Per-project notes")[0] ?? "";
  const rows = [];
  for (const line of table.split("\n")) {
    // Project | Section | Section URL | Video | Poster | Dimensions | Duration |
    // Size | Codec | CRF | [Motion energy |] Captured | Wired to site
    const cells = tableCells(line);
    if (!cells || !/^\/video\/projects\/.+\.webm$/.test(cells[3] ?? "")) continue;
    const hasMotion = cells.length >= 13;
    const dimensions = (cells[5] ?? "").match(/^(\d+)×(\d+)$/);
    const duration = (cells[6] ?? "").match(/^([\d.]+) s$/);
    const size = (cells[7] ?? "").match(/^([\d.]+) KB$/);
    const crf = (cells[9] ?? "").match(/^\d+$/);
    const capturedAt = hasMotion ? cells[11] : cells[10];
    if (!dimensions || !duration || !size || !crf || !/^\d{4}-\d{2}-\d{2}$/.test(capturedAt ?? "")) continue;
    rows.push({
      video: cells[3],
      poster: cells[4],
      width: Number(dimensions[1]),
      height: Number(dimensions[2]),
      durationSeconds: Number(duration[1]),
      videoBytes: Math.round(Number(size[1]) * 1024),
      codec: cells[8],
      crf: Number(crf[0]),
      motionEnergy: hasMotion && cells[10] !== "–" ? Number(cells[10]) : null,
      capturedAt,
    });
  }
  return rows;
}

/**
 * The per-project notes of the generated manifest, keyed by clip path. They
 * carry what the Assets table does not: the captured URL, whether the clip went
 * out as a single CRF pass or two-pass, the poster size, the ad assertion, the
 * consent handling and the scroll details. A row whose `Recorded …` line does
 * not parse is left out entirely, so a caller that needs those facts can tell.
 */
function parseRowNotes(source) {
  const notes = new Map();
  const section = source.split("## Per-project notes")[1]?.split("## Reproducing")[0] ?? "";
  let current = null;
  for (const line of section.split("\n")) {
    const recorded = line.match(
      /^- Recorded `([^`]+)` on (\d{4}-\d{2}-\d{2}) → `(\/video\/projects\/[^`]+)` \((\d+)×(\d+), ([^,]+), ([\d.]+) s, ([\d.]+) KB(?:, (?:two-pass at (\d+) kbps|crf (\d+)))?\), poster `([^`]+)` \((\d+)×(\d+)\)\.$/,
    );
    if (recorded) {
      const [, capturedUrl, capturedAt, video, , , , , , kbps, crf, poster, posterWidth, posterHeight] = recorded;
      current = {
        video,
        capturedUrl,
        capturedAt,
        bitrateKbps: kbps ? Number(kbps) : null,
        crf: crf ? Number(crf) : null,
        poster,
        posterWidth: Number(posterWidth),
        posterHeight: Number(posterHeight),
        ads: null,
        consent: null,
        motion: null,
      };
      notes.set(video, current);
      continue;
    }
    if (!current) continue;
    const ads = line.match(/^- Ad assertion: \*\*(\w+)\*\* — (\d+) ad element\(s\) removed, (\d+) visible googlesyndication\/doubleclick element\(s\) during recording\.$/);
    if (ads) {
      current.ads = { assertion: ads[1], removed: Number(ads[2]), violations: Number(ads[3]) };
      continue;
    }
    const consent = line.match(/^- Consent handling: (.+)\.$/);
    if (consent) {
      current.consent = consent[1];
      continue;
    }
    const motion = line.match(
      /^- Motion: (\d+) px of (\w+)-driven scroll over [\d.]+ s \(target (\d+) px of (\d+) px available(?:, (\d+) inner scroller\(s\))?\); pre-record probe moved (\d+) px\.$/,
    );
    if (motion) {
      current.motion = {
        ...(current.motion ?? {}),
        driver: motion[2],
        pixels: Number(motion[1]),
        target: Number(motion[3]),
        room: Number(motion[4]),
        probePx: Number(motion[6]),
        wheelProbePx: null,
        innerScrollers: Number(motion[5] ?? 0),
        interaction: null,
      };
      continue;
    }
    const interactive = line.match(
      /^- Motion: interactive — the page fits the viewport, so the clip opens (.+?) instead of scrolling \(page changed: (yes|no)(?:, plus (\d+) px of scroll inside what opened)?\)\.$/,
    );
    if (interactive) {
      current.motion = {
        ...(current.motion ?? {}),
        driver: "interactive",
        pixels: Number(interactive[3] ?? 0),
        interaction: { clicked: interactive[1], changed: interactive[2] === "yes", pixels: Number(interactive[3] ?? 0) },
      };
      continue;
    }
    const energy = line.match(
      /^- Motion energy: \*\*([\d.]+)\*\* mean per-frame luma delta over (\d+) frames \(threshold ([\d.]+), peak ([\d.]+)\), measured with ffmpeg/,
    );
    if (energy) {
      current.motion = {
        ...(current.motion ?? {}),
        energy: Number(energy[1]),
        frames: Number(energy[2]),
        threshold: Number(energy[3]),
        peak: Number(energy[4]),
      };
    }
  }
  return notes;
}

/** Toolchain facts for the manifest header, as recorded by the last capture. */
function readToolchain(source) {
  const capture = source.match(/^- Capture: Playwright `([^`]+)` driving headless Chromium `([^`]+)`/m);
  const ffmpeg = source.match(/^- Post-process: `([^`]+)`\./m);
  if (!capture || !ffmpeg) {
    throw new Error(`${path.relative(ROOT, MANIFEST)} has no toolchain block to carry over — run a capture first`);
  }
  const minMotion = source.match(/`--min-motion` \(default ([\d.]+)\)/m);
  return {
    playwrightVersion: capture[1],
    chromiumVersion: capture[2],
    ffmpegVersion: ffmpeg[1],
    minMotion: minMotion ? Number(minMotion[1]) : MIN_MOTION_DEFAULT,
  };
}

/**
 * The recorded facts of the current manifest, as rows the generator can render
 * again. Rows are matched to the config by the asset paths they point at —
 * never by the card label, so relabelling a section cannot orphan or duplicate
 * its recorded facts.
 */
async function readExistingRows() {
  const source = await fs.readFile(MANIFEST, "utf8").catch(() => "");
  if (!source) return new Map();
  const byVideo = new Map();
  for (const project of PROJECTS) {
    for (const section of project.sections) byVideo.set(assetNames(project, section).video, { project, section });
  }
  const notes = parseRowNotes(source);
  const rows = new Map();
  for (const raw of parseAssetTable(source)) {
    const target = byVideo.get(raw.video);
    if (!target) continue;
    const { project, section } = target;
    const detail = notes.get(raw.video) ?? {};
    rows.set(raw.video, {
      slug: project.slug,
      name: project.name,
      live: project.live,
      label: project.clipLabel ?? section.label,
      sectionLabel: section.label,
      sectionHref: section.href,
      capturedUrl: detail.capturedUrl ?? "",
      video: raw.video,
      poster: raw.poster,
      width: raw.width,
      height: raw.height,
      codec: raw.codec,
      durationSeconds: raw.durationSeconds,
      videoBytes: raw.videoBytes,
      crf: detail.crf ?? raw.crf,
      bitrateKbps: detail.bitrateKbps ?? null,
      posterWidth: detail.posterWidth ?? POSTER.width,
      posterHeight: detail.posterHeight ?? POSTER.height,
      capturedAt: raw.capturedAt,
      ads: detail.ads ?? null,
      consent: detail.consent ?? null,
      motion:
        detail.motion ?? {
          driver: null,
          pixels: null,
          target: null,
          room: null,
          probePx: null,
          wheelProbePx: null,
          innerScrollers: null,
          energy: raw.motionEnergy,
          peak: null,
          frames: null,
          threshold: null,
          interaction: null,
        },
      note: project.note,
      garmin: project.garmin === true,
    });
  }
  return rows;
}

/** Re-checks every recorded fact that can be read back off the assets on disk. */
async function verifyRowsOnDisk(rows) {
  const problems = [];
  for (const row of rows) {
    const videoFile = path.join(PUBLIC_DIR, row.video);
    const posterFile = path.join(PUBLIC_DIR, row.poster);
    if (!existsSync(videoFile)) problems.push(`${row.video}: not on disk`);
    if (!existsSync(posterFile)) problems.push(`${row.poster}: not on disk`);
    if (!existsSync(videoFile) || !existsSync(posterFile)) continue;
    const video = await ffprobeJson(videoFile).catch(() => null);
    const poster = await ffprobeJson(posterFile).catch(() => null);
    const check = (what, recorded, onDisk) => {
      if (recorded == null || onDisk == null) return;
      if (String(recorded) !== String(onDisk)) problems.push(`${row.video}: ${what} is ${onDisk} on disk, the manifest says ${recorded}`);
    };
    const stream = video?.streams?.find((s) => s.width) ?? {};
    check("width", row.width, stream.width);
    check("height", row.height, stream.height);
    check("codec", row.codec, stream.codec_name);
    if (video) {
      check("duration", row.durationSeconds.toFixed(1), Number(Number(video.format.duration).toFixed(3)).toFixed(1));
      check("size", KB(row.videoBytes), KB(Number(video.format.size)));
    }
    const shot = poster?.streams?.find((s) => s.width) ?? {};
    check("poster width", row.posterWidth, shot.width);
    check("poster height", row.posterHeight, shot.height);
  }
  return problems;
}

/**
 * Rewrites the manifest without capturing anything. The facts are read back out
 * of the manifest (they were measured on the capture run and cannot be
 * re-derived offline: capture URL, ad assertion, consent handling, motion), but
 * every one that can be read off disk is re-checked against the asset first —
 * size, duration, dimensions, codec, poster size — so a rewrite can never make
 * the file describe something other than what is in `public/`. Used when only
 * the card labels change.
 */
async function writeManifestOnly() {
  const source = await fs.readFile(MANIFEST, "utf8").catch(() => "");
  if (!source) {
    throw new Error(`${path.relative(ROOT, MANIFEST)} not found — run a capture (--all or --project <slug>) first`);
  }
  const toolchain = readToolchain(source);
  const rows = [...(await readExistingRows()).values()];
  const expected = PROJECTS.flatMap((project) => project.sections.map((section) => assetNames(project, section).video));
  const missing = expected.filter((video) => !rows.some((row) => row.video === video));
  if (missing.length > 0) {
    throw new Error(`no recorded row for ${missing.join(", ")} — capture those sections before rewriting the manifest`);
  }
  const incomplete = rows.filter(
    (row) =>
      !row.capturedUrl ||
      !row.ads ||
      row.motion == null ||
      row.motion.energy == null ||
      (row.motion.driver !== "interactive" && row.motion.pixels == null),
  );
  if (incomplete.length > 0) {
    throw new Error(
      `the recorded rows for ${incomplete.map((row) => row.video).join(", ")} are missing facts ` +
        `(capture URL, ad assertion, consent or motion) — re-capture them instead of rewriting the manifest`,
    );
  }
  const problems = await verifyRowsOnDisk(rows);
  if (problems.length > 0) {
    throw new Error(
      `the manifest does not match the assets on disk:\n  - ${problems.join("\n  - ")}\n` +
        "re-capture the affected sections: --manifest-only never writes a row it could not verify",
    );
  }
  await writeManifest([], toolchain);
  console.log(
    `manifest: ${path.relative(ROOT, MANIFEST)} rewritten from the recorded facts (${rows.length} clip(s)); ` +
      `${rows.length} video(s) + ${rows.length} poster(s) verified on disk — size, duration, dimensions, codec`,
  );
}

async function writeManifest(newEntries, toolchain) {
  const merged = await readExistingRows();
  for (const entry of newEntries) merged.set(entry.video, entry);
  const rows = [...merged.values()];
  const wired = await wiredPaths();

  const lines = [];
  const push = (...text) => lines.push(...text);

  push("# Preview manifest — /projects hover-play clips", "");
  push("Generated by `scripts/capture-previews.mjs`. Do not edit by hand: rerun the script so this file");
  push("cannot drift from the assets on disk.", "");
  push("## Toolchain", "");
  push(`- Capture: Playwright \`${toolchain.playwrightVersion ?? "unknown"}\` driving headless Chromium \`${toolchain.chromiumVersion}\` at 1440×900, recording with \`recordVideo\`.`);
  push(`- Post-process: \`${(toolchain.ffmpegVersion ?? "ffmpeg").split(" Copyright")[0].trim()}\`.`);
  push(`- Output: VP9 / WebM, ${OUTPUT.width}×${OUTPUT.height}, ${FPS} fps, \`-an\` (no audio track), CRF ${CRF_LADDER[0]} preferred,`);
  push(`  two-pass bitrate-constrained at the same CRF when a clip busts ${SIZE_TARGET / 1024} KB (hard cap ${SIZE_HARD_CAP / 1024} KB).`);
  push(`- Posters: PNG ${POSTER.width}×${POSTER.height}, one per section, cropped from the same settled page.`);
  push("- Ad hosts blocked during capture: `googlesyndication.com`, `doubleclick.net`, `googleadservices.com`,");
  push("  `adservice.google.com`, `amazon-adsystem.com`.");
  push("- Everything is free and open source. No watermark, no paid service, no subscription, no audio, no third-party iframes.");
  push("- A page that renders an error/not-found state or does not contain the expected content is retried and then refused:");
  push("  the script never writes a clip it could not verify.");
  push("- Scroll unlock: before recording, `html,body{overflow-y:auto !important;height:auto !important;overscroll-behavior:auto !important}`");
  push("  is injected (plus the same values as inline `!important` styles, and the same treatment for any large non-fixed wrapper that");
  push("  clips its own overflowing content). Several sites ship `body{overflow-y:hidden}`, which freezes the document in headless");
  push("  Chromium: the page then cannot scroll at all and every clip would be a still frame.");
  push(`- Motion assertions, both hard: before recording the unlocked page must actually move by \`${MIN_SCROLL_PX} px\` (wheel-driven,`);
  push("  programmatic fallback) or the clip is refused; after encoding the clip's mean per-frame luma delta must be at least");
  push(`  \`--min-motion\` (default ${toolchain.minMotion ?? MIN_MOTION_DEFAULT}), measured with ffmpeg`);
  push("  `tblend=all_mode=difference,signalstats` (`lavfi.signalstats.YAVG`, 0-255 luma units). A clip that fails is deleted and the");
  push("  run exits non-zero. This is why no shipped clip is a static frame.");
  push(`- Consent overlays: declined where the site offers it (Google Funding Choices, TrustArc), then removed and re-swept;`);
  push("  a late-injected overlay cannot appear in a recorded frame.");
  push("");
  push("## Reuse and permission notes", "");
  push("- The clips are screen recordings of live sites Albert Olivé builds and operates, stored in this repository");
  push("  purely as portfolio previews of that work.");
  push("- Third-party content visible inside a recorded page (event listings, venue photos, weather data, store chrome)");
  push("  belongs to its respective owners; the clips are illustrative previews and are not relicensed.");
  push("- Garmin (`breathing-timer`): the clip is the live Connect IQ store listing; the poster is composed from official");
  push("  Garmin store imagery served by `services.garmin.com/appsLibraryExternalServices/api/` (app icon");
  push("  `806f54bd-339a-4a34-b4ef-9e32f13113d6` plus the three official preview screenshots), used unmodified as store imagery.");
  push("- moveflow: captured from and linked to `https://moveflow-site.vercel.app`, the real project.");
  push("  `https://moveflow.app` serves an unrelated product (\"MoveFlow – Business Management Platform\", OOMI Software),");
  push("  so the card does not link to it.");
  push("- Consent overlays are declined/dismissed and ad containers removed before recording, so no consent state and no");
  push("  advertising is recorded.");
  push("");
  push("## Live sources and section labels", "");
  push("`Section` is what the card nav shows — the portfolio UI is English, so the card uses the English name of");
  push("the page it previews. `Label verified as` records what the site itself calls that page, read from its own");
  push("navigation on the capture date (these sites are Catalan; nothing is invented), and `Section URL` is the");
  push("page the clip and the card link point at.");
  push("");
  push("| Project | Card link | Captured source | Section | Section URL | Label verified as |");
  push("|---|---|---|---|---|---|");
  for (const project of PROJECTS) {
    const sections = project.sections;
    for (const [i, section] of sections.entries()) {
      const shown = project.clipLabel ?? section.label;
      const cardLink = i === 0 ? project.live : "〃";
      const source = i === 0 ? project.live : "〃";
      const verified = i === 0 ? project.labelsVerified : "〃";
      push(`| ${project.name} | ${cardLink} | ${source} | ${shown} | ${section.href} | ${verified} |`);
    }
  }
  push("");
  push("## Assets", "");
  push("One row per clip. `Wired to site` is checked against `content/projects.ts`.");
  push("`Motion energy` is the mean per-frame luma delta of the encoded clip (higher = more movement);");
  push(`a clip below \`${toolchain.minMotion ?? MIN_MOTION_DEFAULT}\` fails the run instead of being written.`);
  push("");
  push("| Project | Section | Section URL | Video | Poster | Dimensions | Duration | Size | Codec | CRF | Motion energy | Captured | Wired to site |");
  push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const project of PROJECTS) {
    for (const section of project.sections) {
      const shown = project.clipLabel ?? section.label;
      const row = rows.find((r) => r.video === assetNames(project, section).video);
      if (!row) {
        push(`| ${project.name} | ${shown} | ${section.href} | _not captured_ | _not captured_ | – | – | – | – | – | – | – | – |`);
        continue;
      }
      const referenced = wired.get(project.slug) ?? [];
      const ok = referenced.includes(row.video) && referenced.includes(row.poster);
      const energy = row.motion?.energy;
      push(
        `| ${project.name} | ${shown} | ${section.href} | \`${row.video}\` | \`${row.poster}\` | ${row.width}×${row.height} | ` +
          `${row.durationSeconds.toFixed(1)} s | ${KB(row.videoBytes)} | ${row.codec} | ${row.crf} | ` +
          `${energy == null ? "–" : Number(energy).toFixed(2)} | ${row.capturedAt} | ${ok ? "yes" : "NO"} |`,
      );
    }
  }
  push("");
  push("## Per-project notes", "");
  for (const project of PROJECTS) {
    push(`### ${project.name}`, "");
    push(`- Live URL: ${project.live}`);
    push(`- ${project.note}`);
    push(`- Section labels — ${project.labelsVerified}`);
    const projectRows = rows.filter((r) => r.slug === project.slug);
    if (project.ads) {
      push("- Advertising is kept out of the recording in three layers: (1) requests to the ad hosts below are blocked at the");
      push("  network layer, so Auto Ads cannot inject anchor/vignette containers after load; (2) `ins.adsbygoogle`,");
      push("  `iframe[src*=googlesyndication|doubleclick]`, `[id*=div-gpt-ad]` and their wrappers — plus ad boxes left empty by");
      push("  layer 1 — are removed from the DOM before recording and re-swept every 100 ms while it runs; (3) every recorded");
      push("  frame is checked and the run fails if a visible `googlesyndication`/`doubleclick` element ever appears.");
      push("  The counts printed per clip below come from the run that produced the file.");
    }
    for (const row of projectRows) {
      push("");
      push(`**${row.label}** — [${row.sectionHref}](${row.sectionHref})`);
      push("");
      push(`- Recorded \`${row.capturedUrl || row.sectionHref}\` on ${row.capturedAt} → \`${row.video}\` (${row.width}×${row.height}, ${row.codec}, ${row.durationSeconds.toFixed(1)} s, ${KB(row.videoBytes)}${row.bitrateKbps ? `, two-pass at ${row.bitrateKbps} kbps` : `, crf ${row.crf}`}), poster \`${row.poster}\` (${row.posterWidth}×${row.posterHeight}).`);
      if (row.ads) push(`- Ad assertion: **${row.ads.assertion}** — ${row.ads.removed} ad element(s) removed, ${row.ads.violations} visible googlesyndication/doubleclick element(s) during recording.`);
      if (row.consent) push(`- Consent handling: ${row.consent}.`);
      if (row.motion?.driver === "interactive") {
        const i = row.motion.interaction ?? {};
        push(
          `- Motion: interactive — the page fits the viewport, so the clip opens ${i.clicked ?? "a card"} instead of scrolling ` +
            `(page changed: ${i.changed ? "yes" : "no"}${i.pixels ? `, plus ${i.pixels} px of scroll inside what opened` : ""}).`,
        );
      } else if (row.motion?.pixels != null) {
        push(
          `- Motion: ${row.motion.pixels} px of ${row.motion.driver}-driven scroll over ${RECORD_SECONDS} s ` +
            `(target ${row.motion.target} px of ${row.motion.room} px available${row.motion.innerScrollers ? `, ${row.motion.innerScrollers} inner scroller(s)` : ""}); ` +
            `pre-record probe moved ${row.motion.probePx} px.`,
        );
      }
      if (row.motion?.energy != null) {
        push(
          `- Motion energy: **${Number(row.motion.energy).toFixed(2)}** mean per-frame luma delta over ${row.motion.frames} frames ` +
            `(threshold ${row.motion.threshold}, peak ${row.motion.peak}), measured with ffmpeg \`tblend=all_mode=difference,signalstats\`.`,
        );
      }
    }
    push("");
  }
  push("## Reproducing", "");
  push("```sh");
  push("node scripts/capture-previews.mjs --all");
  push("node scripts/capture-previews.mjs --project esdeveniments --section events");
  push("node scripts/capture-previews.mjs --manifest-only   # relabel card nav only; re-verifies every asset on disk");
  push("```");
  push("");
  await fs.writeFile(MANIFEST, lines.join("\n"), "utf8");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
