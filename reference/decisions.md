# Decisions — what we copy, substitute, and fix

Derived from `measurements/*.md` and `observations.md`. Every "substitute"
or "fix" below is a deviation from the reference site, made for licensing,
accessibility, or scope reasons.

## D1 — Fonts (licensing)

Reference fonts are commercial: TX-02 (Territory), SF Pro (Apple),
Neue Montreal + Editorial New (Pangram Pangram). We substitute free,
metric-similar Google fonts loaded through `next/font/google`:

| Reference font | Where used | Substitute |
|---|---|---|
| TX-02 (jrands) | badge, dock labels, bottom bar | **Space Grotesk** (600) — geometric, tight, similar x-height |
| SF Pro (toryn) | whole page | **Inter** (400/500/600/700) — the standard SF stand-in |
| Neue Montreal (pedro) | bio prose | **Inter Tight** (500) — tighter tracking than Inter |
| Editorial New (pedro) | nav, counter, italics | **Newsreader** italic (Google Fonts, free) — serif editorial voice |

All substitutes are documented here and in `DESIGN.md`; no font file from
any reference site is copied.

## D2 — Colors (own brand)

We do not reuse reference brand colors:

- Toryn purple `#591cbc` → **#ff5a36 site-wide accent** (2026-09-08: Albert
  unified the accent across all pages after reviewing the purple hover on
  /projects; `--accent-projects`/`--accent-about` remain as aliases).
- Pedro red `#ff4921` → our about accent: **#ff5a36** (kept warm-red but
  distinct; about page is dark #111 like Pedro's).
- jrands lime dot `rgb(195,217,39)` → homepage "live" dot keeps the *lime*
  semantic; we use `rgb(195,217,39)` only for the status dot, not as brand.

## D3 — jrands adaptations (homepage)

**2026-09-08 revision (Albert's review):** the jrands glass dock is
**removed**. The toryn.bio navbar (icons + lowercase links) is now the
shared nav on **all four pages** (`app/_components/site-nav.tsx`). The
homepage keeps the jrands **bottom info bar** (name/role/location/clock/
year) — Albert: "homepage footer navbar is better".

- Video: reference embeds Cloudflare Stream. We keep that player as the
  full-frame muted looping background and hide it from assistive technology.
- Badge: keep shape/size/shadow/dot; link to `/projects` (reference is a
  dead div).
- Bottom bar: keep name/role/location/clock/year; clock is a client
  component (per-second, cleans up on unmount).
- Click sounds: dropped (scope; adds asset weight and a11y questions).

## D4 — toryn adaptations (projects + shared nav)

- Grid/header/card anatomy copied near-verbatim (breakpoints 686/768/1024/
  1280/1536, gap 24, double border, aspect-video, lowercase titles,
  arrow nudge, scale(1.05)+accent border hover).
- **Shared nav** (2026-09-08): toryn navbar extracted into
  `SiteNav` — brand `div` (hidden <686) + icon links, lowercase 20px,
  gap 32 (16px <768 so 320px fits), accent hover 200ms, `aria-current`,
  white blur strip on scrollable pages (`withBlur`). Tone `light` on
  dark pages (home/about), dark on projects.
  **Veil fix (2026-09-08):** the blur veil lives *inside* the nav
  stacking context (`isolation: isolate` on nav, veil at z -1 within
  it) — matches toryn's header anatomy so hovered/scrolled cards
  (z 10) pass under the veil and blur out instead of painting over
  it near the brand.
- All cards link **externally** (we have no detail pages) → add
  `target="_blank" rel="noreferrer"` (reference omits it).
- Add `:focus-visible` outlines (accent, 2px offset) — reference has none.
- Add `prefers-reduced-motion: reduce` → disable scale/arrow/border
  transitions.
- Project posters use responsive `next/image` output. Preview videos keep
  `preload="none"` and load only after pointer, focus, or touch interaction.
- Cards use `content-visibility: auto` and settle into place as they enter the
  viewport. Reduced motion disables the entrance animation.

## D5 — pedro adaptations (about)

- Dark #111 + white + grain overlay (SVG feTurbulence, opacity .2) copied.
- Reveal pills use inline `<button aria-expanded>` controls. Closed content has
  native `hidden` and `inert`; opening a pill reveals its continuation inline.
  **2026-09-08 revision:** the real ped.ro structure is *nested* — a pill's hidden text
  is the sentence continuation and contains further pills (recursive).
  `content/about.ts` now models this as an `AboutSegment` tree with 4 root
  hints and 10 total reveals;
  hidden texts are sentence continuations — no repetition of the pill
  word, 2026-09-08 fix);
  `Reveal` renders children recursively. Closing a parent does not close
  its children (matches ped.ro). Fixes kept: closed content gets `inert`
  (not tabbable), counter is `aria-live="polite"`,
  `prefers-reduced-motion` skips blur animation (instant open).
- Counter: counts currently-open reveals; hidden under
  `@media (hover: none)` like reference; resets on reload (no storage).
- Video background: **ON (2026-09-08, Albert request)** — ped.ro-style
  fixed muted loop at opacity .75 under text+grain. The 640×360 VP9 WebM uses
  a WebP poster and metadata-only preload. Grain still ships on top.

## D6 — Scope guards (from plan)

No blog, auth, CMS, analytics, filters, detail pages, or scroll-jacking.
Contact is mailto/external links only. Static rendering remains the default;
client components handle the clock, About reveals and counter, project
previews, the skills playground, the experience scroller, and the shared
Montseny interaction. The shared nav is a server component.

## D7 — Content decisions

- The site uses "Senior AI Product Engineer" as its role and builds the
  longer title from `content/site.ts`.
- Email, LinkedIn, GitHub, and project links are approved and live in the
  typed content files.
- The Projects page shows esdeveniments.cat, El Temps Avui,
  culturacardedeu.com, nowcast-cardedeu, MoveFlow, and Breathing Timer.

## D8 — Search metadata and media (2026-09-12)

- Each public route defines its own canonical URL, Open Graph fields, and
  Twitter fields. The root layout supplies `metadataBase` and shared defaults.
- The home route includes one visually hidden `h1` and a short description
  without changing the visible composition. The nav brand is a `div`, not a
  competing page heading.
- The About MP4 was replaced by a smaller VP9 WebM and WebP poster. The shared
  closing scene uses the snow Montseny panorama and remains lazily loaded.

## D9 — Home hero is a pinned, always-playing live surface (2026-09-15)

- Albert's requirement: the hero must autoplay on every device and read like a
  television feed, so quality must not change while it plays.
- The retired `/hls/master.m3u8` release encoded 1080p, 720p, and 480p at
  ~1.5 Mbps each. Adaptive bitrate could not distinguish them, which is what
  appeared as "the video changes quality and looks pixelated".
- The replacement release trims 4K24 footage to 0.16s→305s and encodes 1080p at
  crf 19 with a 6 Mbps peak, 720p at crf 23/2.4 Mbps, and 480p at crf 27/0.8
  Mbps. A 12-second motion segment measured SSIM 0.913/0.923/0.938 at 5/6/8.5
  Mbps, so the peak cap, not the crf, decides motion quality.
- Playback is pinned to the rendition that covers the frame. The platform
  player (Safari, and Chrome on macOS) receives the one variant playlist that
  covers it, so it has no ladder to climb. The `hls.js` path pins the ladder
  instead: `autoLevelCapping` caps it, `minAutoBitrate` floors it, and
  `startLevel` fixes the first fragment. `HERO_FLOOR_STEPS = 0` in
  `lib/video.ts` is the policy switch that allows one rung of degradation
  instead.
- The play/pause control was already removed by Albert; it is now gone from the
  CSS as well. The hero therefore has no WCAG 2.2.2 pause affordance.
  `HERO_HONORS_REDUCED_MOTION = true` in `lib/video.ts` restores the
  poster-only fallback for visitors who ask for reduced motion.
- Reduced motion no longer unloads the hero, because that silently turned the
  hero into a poster on devices where the preference is enabled. Measured
  evidence (2026-09-15) showed the platform player was the one changing
  quality: it ran its own adaptive ramping from 480p before hls.js could pin
  anything, even though Chromium on macOS also plays HLS natively. A refused
  `play()` (Low Power Mode, battery savers, in-app browsers) is retried on a
  delay ladder and again on the first gesture, `visibilitychange`, or
  `pageshow`; only a fatal HLS error keeps the poster.
- Safari's native HLS player still chooses its own rendition. The accurate
  bitrate separation in the master playlist is the only lever there.

