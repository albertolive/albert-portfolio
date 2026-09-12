# Preview clips — handover

The six cards in `/projects` play a short, muted screen recording of the live
site. Three of them (esdeveniments.cat, eltempsavui.cat, culturacardedeu.com)
also get a section nav that swaps the clip between pages of the same site.

Everything here is generated from the live sites by one script. No paid tools,
no watermark, no audio track, no third-party iframes: Playwright (Apache-2.0)
records the page, ffmpeg transcodes it.

- Assets: `public/video/projects/*.webm` (VP9, 1280×720, 6 s, no audio, ≤ 600 KB)
  and `public/images/projects/*.png` (posters, 1200×675).
- Generated: `PREVIEW-MANIFEST.md` — sizes, durations, URLs, capture dates,
  per-project notes. Never edit it by hand; rerun the script.
- Card data: `content/projects.ts` → `Project.sections[]`.
- Card behaviour: `app/projects/_components/project-preview.tsx` +
  `app/projects/page.module.css`.
- Capture tool: `scripts/capture-previews.mjs`.
- Verification: `scripts/check-projects-preview.mjs`
  (`npm run check:projects:preview`).

## Regenerate a preview

```sh
# one project (all of its sections)
node scripts/capture-previews.mjs --project esdeveniments

# a single clip — by card label, or by the stem its clip was captured under
# (`--section agenda` also selects what the card now calls "Events")
node scripts/capture-previews.mjs --project esdeveniments --section events
node scripts/capture-previews.mjs --project eltempsavui --section concepts

# everything
node scripts/capture-previews.mjs --all

# labels only: rewrite PREVIEW-MANIFEST.md from the facts already recorded in it
# (no browser, no capture) after re-checking every asset on disk
node scripts/capture-previews.mjs --manifest-only
```

Requirements and overrides:

| Need | Where |
|---|---|
| Playwright | `devDependencies` (`npm i -D playwright && npx playwright install chromium`); otherwise the script falls back to any `playwright` in the npm `_npx` cache |
| Chromium binary | `CHROME_BIN=/path/to/chrome` (otherwise auto-detected under `~/Library/Caches/ms-playwright`) |
| Playwright module | `PLAYWRIGHT_MODULE=/path/to/playwright/index.js` |
| ffmpeg + ffprobe | must be on `PATH` |
| Keep intermediate recordings | `CAPTURE_KEEP_WORK=1` (temp dir is printed-free; see `$TMPDIR/portfolio-preview-capture`) |
| Debug a failure | `CAPTURE_DEBUG=1` |

What a run does per section: open the live URL (the section URL itself, never a
composed one) at 1440×900 → refuse to continue unless the page really contains
the expected content (retried up to 3 times, so an error page or a loading shell
can never be recorded) → dismiss consent overlays and block/sweep advertising →
unlock the page scroll (`html,body{overflow-y:auto !important;height:auto
!important}` injected as CSS plus the same values as inline `!important`
styles, and the same treatment for any large non-fixed wrapper that clips its
own overflowing content) and assert the page really moves before anything is
recorded → walk the page to the bottom and back so lazy images have loaded →
screenshot the poster → record ~6 s of eased, wheel-driven scroll with
`recordVideo` → encode VP9 1280×720 (no audio), crop the poster to 1200×675, and
measure the clip's mean per-frame luma delta → print the ad assertion → rewrite
`PREVIEW-MANIFEST.md`.

Two motion assertions make a still frame impossible to ship. Pre-record: after
the unlock the page must travel at least **600 px** (mouse wheel first, which is
what a visitor does; `window.scrollTo` only as a fallback for pages that swallow
synthetic wheel events) or the clip fails — a page that genuinely fits the
viewport gets a real interaction recorded instead (a card/detail opened by a
real click) and says so in the manifest. Post-encode: the finished webm must
have a mean per-frame luma delta of at least **2.0** (ffmpeg
`tblend=all_mode=difference,signalstats`, `lavfi.signalstats.YAVG`), configurable
with `--min-motion`; a clip under the threshold is deleted and the run exits
non-zero. Per-clip values are in the manifest's `Motion energy` column.

Advertising never reaches the recording, in three layers: requests to
`googlesyndication.com`, `doubleclick.net`, `googleadservices.com`,
`adservice.google.com` and `amazon-adsystem.com` are blocked at the network
layer (Google Auto Ads injects anchor/vignette containers after `load`, which
is exactly when a screenshot-based capture would pick them up); ad containers,
iframes, `div-gpt-ad` wrappers and the boxes they leave behind are removed from
the DOM before recording and re-swept every 100 ms while it runs; and every
recorded frame is asserted to contain no visible `googlesyndication` /
`doubleclick` element — the run fails loudly if one appears. Consent overlays
are declined where the site offers it (Google Funding Choices, TrustArc) and
then removed on the same timer.

The card nav labels are English, because the portfolio UI is English: each one
names the page its clip previews, and the same string lives in
`content/projects.ts` and in the `PROJECTS` config. What the *site* calls that
section is recorded separately in `labelsVerified` (these sites are Catalan) and
printed in the manifest's `Label verified as` column, so the docs still say
"Inici → `/`" where that is what the live nav says. A section's clip and poster
are named after the stem it was captured under (`asset` in the config), never
after the card label, so relabelling a section cannot rename a file; when only
labels change, `node scripts/capture-previews.mjs --manifest-only` rewrites
`PREVIEW-MANIFEST.md` after re-verifying every asset on disk. If a site renames
or moves a section, update `href` + `labelsVerified` in the config and the
`href` in `content/projects.ts`, then re-capture that project.

## Swap or remove one clip without touching the others

Asset names come from the project slug plus the stem the section was captured
under (`asset` in the config — not the card label); the root page of a project
owns the unsuffixed pair. `scripts/capture-previews.mjs` is the source of truth
(`assetNames()`), and `scripts/check-projects-preview.mjs` asserts the same paths
in the browser.

| Project | Section | Clip | Poster |
|---|---|---|---|
| esdeveniments | Home | `esdeveniments.webm` | `esdeveniments.png` |
| esdeveniments | Events | `esdeveniments-agenda.webm` | `esdeveniments-agenda.png` |
| esdeveniments | Weekend | `esdeveniments-cap-de-setmana.webm` | `esdeveniments-cap-de-setmana.png` |
| esdeveniments | News | `esdeveniments-noticies.webm` | `esdeveniments-noticies.png` |
| eltempsavui | Home | `eltempsavui.webm` | `eltempsavui.png` |
| eltempsavui | Concepts | `eltempsavui-conceptes.webm` | `eltempsavui-conceptes.png` |
| culturacardedeu | Events | `culturacardedeu.webm` | `culturacardedeu.png` |
| culturacardedeu | News | `culturacardedeu-noticies.webm` | `culturacardedeu-noticies.png` |
| nowcast-cardedeu | (single clip) | `nowcast-cardedeu.webm` | `nowcast-cardedeu.png` |
| moveflow | (single clip) | `moveflow.webm` | `moveflow.png` |
| breathing-timer | (single clip) | `breathing-timer.webm` | `breathing-timer.png` |

**Swap one clip.** Re-run the capture for that one section: it overwrites only
that `.webm` and its poster and refreshes only that manifest row
(`--project <slug> --section <label>`). To use a recording you made yourself,
replace the file with the same name — it must be VP9/WebM, 1280×720, no audio,
≤ 600 KB, with a 1200×675 PNG poster — and rerun the capture script for that
section afterwards, because the manifest's size/duration columns are generated
from the assets and would otherwise drift from what is on disk.

**Add or remove a section.** Add/remove the entry in `content/projects.ts` →
`Project.sections[]` *and* in the `PROJECTS` config of
`scripts/capture-previews.mjs` (same label order; give a non-root section its
`asset` stem so the clip name is fixed), then run `--all` so the manifest is
rewritten for every configured section. A card with no `sections`
(or with a single one) renders no section nav and behaves exactly like before:
poster, hover/focus to play.

**Remove previews entirely.** Delete `sections`, `video` and `image` usage from
the card in `app/projects/page.tsx` and the assets; the poster `<Image>` is the
only part that has to stay for the card to keep its 16:9 media box.

## How the section nav is wired

```
content/projects.ts           sections: [{ label, href, video, image }]
        │
app/projects/page.tsx         <ProjectPreview title href image imageAlt video sections>
        │                          └── children = the card body (title/description/meta/action)
app/projects/_components/project-preview.tsx
        │   • <li> owns pointer + focus handling
        │   • <a class=cardLink> wraps the media and the body (the whole card is still one link)
        │   • <div class=previewControls> is a *sibling* of the link, absolutely positioned over
        │     the 16:9 media box → the buttons are real <button>s, never nested in the anchor
        │   • module-level `activePlayer` guarantees one playing clip per page
        └── page.module.css   .previewControls / .sectionNav / .sectionButton / .previewPlay
```

Behaviour matrix (all of it lives in `project-preview.tsx`):

| Input | Result |
|---|---|
| Mouse hover on a card (`hover: hover`, `pointer: fine`, motion allowed) | Clip of the active section plays, looped and muted; poster stays underneath |
| Mouse leaves the card | Pause + rewind to the start |
| Keyboard focus lands anywhere in the card (Tab) | Same playback, so keyboard users get the preview too |
| Focus leaves the card (or `blur` to outside) | Pause + rewind; moving focus between controls inside the card does *not* reset |
| Hover/focus/click a section button | Active section changes and the clip `src` switches; playback continues from 0 if the card was already playing (on touch the swap never starts playback); arrows ←/→, Home/End move along the strip |
| Hovering another card | Previous card pauses and rewinds — only one preview ever plays |
| Touch (`hover: none` / `pointer: coarse`) | No autoplay: poster + a labelled "Play preview" button (44 px). Tap plays, tap again pauses. Section buttons swap the source without starting playback |
| `prefers-reduced-motion: reduce` | No playback at all, no clip fetched (`display: none`), no play button; the section nav still swaps the poster only |
| Any state | `preload="none"`, `src` assigned only when a clip is actually needed, video `aria-hidden`, and **no `poster` attribute**: a poster URL bypasses `next/image` and pulls the full-size PNG on first load, so the still is always the optimised `<Image>` underneath (which carries the alt text) |

Accessibility: real `<button type="button">` elements with `aria-pressed`,
grouped in `role="group"` labelled "Preview sections of <project>"; visible
`:focus-visible` rings (`--accent-projects`, 2px, offset 2px); ≥ 44 px targets on
coarse pointers; the card link, its label and its order are unchanged.

## Verify a change

```sh
npm run build                                  # must exit 0
npm run start -- --port 3100                   # production server, separate shell
npm run check:projects:preview                 # previews + section nav, PASS/FAIL per assertion
node scripts/check-projects.mjs                # existing contribution/Matter.js checks
npm run check:projects:browser                 # optional, needs agent-browser + live GitHub data
```

`check-projects-preview.mjs` accepts a URL argument if you serve on another
port (`npm run check:projects:preview -- http://localhost:4000/projects`, or run
the script directly with `node scripts/check-projects-preview.mjs <url>`). It runs 15 assertions (PASS/FAIL each, exit 1 on any failure): card order
and links, lazy local posters with `preload="none"`, hover starts playback
within 200 ms (the cold-start number of the first hover of the session is
reported next to it — measured 98 ms cold, ~0–120 ms warm, since the first
hover also pays for the media pipeline), leaving pauses and rewinds to 0, Tab
focus plays and moving focus away rewinds, only one clip playing at a time,
the four esdeveniments section buttons swapping the clip and `aria-pressed`,
touch = no autoplay + labelled 44 px tap-to-play + a section tap that does not
start playback, reduced motion = nothing plays and no clip is fetched while
section buttons still swap the poster, no `googlesyndication`/`doubleclick`
element or iframe on the page, and a clean console.

`npm run check:projects:browser` (the older `agent-browser` suite) could not be
run on this machine — `agent-browser` is not installed. Its project-card
assertions (six cards, six public links, local lazy posters) are covered by
`check-projects-preview.mjs`; its skills-pile and paper-plane assertions are
untouched by this work.

## Roll back

- **Whole change:** `git revert <commit>` (or reset to the previous commit) and
  redeploy. The clips and posters are ordinary files in the repo, so the old
  previews come back with the old code — nothing lives outside git.
- **One clip misbehaves:** `git checkout <previous-commit> -- public/video/projects/<file>.webm public/images/projects/<file>.png`
  and rereploy; or re-run the capture for that section if the live site was the
  problem.
- **Live site:** Vercel → Deployments → promote the previous deployment. No
  database, env var or external service is involved.

## Still unverified / known limits

- `esdeveniments.cat` (all four clips) serves `body { overflow-y: hidden }`, so
  the document cannot scroll at all in headless Chromium: `window.scrollTo`,
  `page.mouse.wheel` and `PageDown` all leave `scrollY` at 0 while
  `body.scrollHeight` is ~7900 px. The capture injects
  `html,body{overflow-y:auto !important;height:auto !important;
  overscroll-behavior:auto !important}` (plus inline `!important` styles and the
  same treatment for large non-fixed clipping wrappers), which makes the page
  scroll normally and leaves the layout at the top of the page unchanged —
  verified by comparing posters before and after the change. If the site ever
  hides the scroll differently, the pre-record assertion fails the clip loudly
  instead of shipping a still frame.
- With the unlock applied, `body` can itself become the scroll container — this
  is what happens on the Garmin store listing, where `window.scrollY` stays 0
  and only `body.scrollTop` moves. The driver therefore samples and resets
  `document.scrollingElement`, `html` and `body` in addition to any inner
  scroll boxes, and the usable room is reported as the larger of the document
  and body travel, never their sum (otherwise the eased scroll would reach the
  bottom early and sit still for the rest of the clip).

- Captures ran in headless Chromium on macOS only. Real iOS Safari / Android
  Chrome touch behaviour (tap-to-play, `playsinline` autoplay policies) is
  exercised through Playwright device emulation, not on physical devices.
- Firefox is not covered: Playwright drives Chromium here, and Safari/Firefox
  VP9/WebM support (especially on older iOS) is assumed, not measured.
- The clips are recordings of live third-party pages: event listings, weather
  data, venue photos and Garmin store chrome are whatever the sites served on
  the capture date, and they age. The sites' own section labels are re-verified
  on each capture, not continuously.
- Garmin's "ratings" modal did not appear during the recorded session; the
  dismiss sweep ran anyway (logged in the manifest as consent handling). If it
  starts appearing, it is dismissed or removed by the same sweep.
- Ad removal is asserted for esdeveniments.cat and culturacardedeu.com on every
  capture (PASS = zero visible `googlesyndication` / `doubleclick` elements in
  every recorded frame). At the last capture esdeveniments.cat served no ad
  elements at all, so the assertion passes with 0 removals.
- `moveflow`: the card links to `https://moveflow-site.vercel.app` (the project
  itself, `200` on 2026-09-12) and the clip is recorded from that same origin.
  `https://moveflow.app` serves an unrelated product by OOMI Software, so it is
  neither linked nor captured; the card title that named that domain was changed
  to **MoveFlow** with the link.
- The eltempsavui homepage section is labelled **Home** on the card, like the
  rest of the nav; the site's own nav item that links there is labelled
  "El Temps Avui". The card label is the one that avoids repeating the project
  title — see the manifest's `Label verified as` column.
- Intro/outro of each clip is still while the scroll eases in and out, so a
  looping preview does not jump; frame-exact loop points are not guaranteed.
- Clips are 1280×720 recordings of a 1440×900 viewport, centre-cropped to 16:9,
  so ~80 px of page height is trimmed top and bottom. It matches the poster
  crop exactly, but a detail sitting in the top or bottom 40 px of the viewport
  is not in the clip.
- The first hover of a session pays for fetching and starting the clip
  (measured 98 ms including the media pipeline); later hovers are served from
  the HTTP cache in ~0–120 ms. Nothing is prefetched, so a visitor who never
  hovers downloads no video at all.
- Seven clips (all four esdeveniments sections, eltempsavui Home,
  culturacardedeu Events and the Garmin listing) needed the two-pass
  bitrate-constrained path to stay under 600 KB; their CRF is not the
  single-pass 32–36 ladder. Files and dates are in the manifest.
- Rewinding is requested as `currentTime = 0`; Chromium settles a paused clip
  on its first frame, so the property reads 0.04 s (1/25 s) rather than exactly
  0. The visitor sees the clip restart from its first frame, and
  `check-projects-preview.mjs` allows one frame and says so in its output.
