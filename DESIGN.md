# DESIGN.md — albert-portfolio design system

Derived from reference evidence (`reference/measurements/*.md`,
`reference/decisions.md`). Each page keeps the visual identity of its
reference site; this file defines the tokens each page consumes. Values are
the measured reference values; substitutions are flagged.

## Global

- **Rendering**: Next.js App Router, static; client components only where
  interaction requires them.
- **Fonts** (all self-hosted, `next/font/local` or next/font/google, with
  `display: swap`):

| Token | Font | Weights | Used on | Substitutes |
|---|---|---|---|---|
| `--font-sans` | Inter | 400 500 600 700 | all pages (base) | SF Pro (toryn) |
| `--font-dock` | Space Grotesk | 500 600 700 | home (badge, dock, bottom bar) | TX-02 (jrands) |
| `--font-tight` | Inter Tight | 500 | about prose | Neue Montreal (pedro) |
| `--font-serif` | Newsreader italic | 400 italic | about nav/counter/italics | Editorial New (pedro) |

- **Breakpoints** (project-wide, from references): 640px (jrands mobile),
  686px (toryn sm), 768px (md), 1024px (lg), 1280px (xl), 1536px (2xl).

## Colors

**2026-09-08: one accent site-wide** (Albert's review) — `#ff5a36`:

| Token | Value | Used on | Note |
|---|---|---|---|
| `--accent` | `#ff5a36` | all pages | unified site accent (hover, focus rings, pill hover) |
| `--accent-projects` | `#ff5a36` | /projects | alias of `--accent` |
| `--accent-about` | `#ff5a36` | /about | alias of `--accent` |
| `--ink` | `#111` | /about bg | measured Pedro |
| `--ink-0` | `#111111` | home glass bg base | jrands shell rgba(26,26,30,.38)→rgba(12,12,14,.5) |
| `--live-dot` | `rgb(195,217,39)` | home badge dot | jrands lime |
| `--toryn-black` | `#000` / `#27242b` | /projects text | toryn link color |
| `--mauve-text` | `#fbd3cb` | /about open pill bg | Pedro mauve-12 |
| `--ring` | `currentColor` | focus rings | all pages |

## Shared navbar (all pages — toryn identity)

**2026-09-08 (Albert's review):** the toryn navbar replaces the jrands dock
on every page. `app/_components/site-nav.tsx`:

- `nav[aria-label="Primary navigation"]`, absolute top, z-99.
- Brand `div` "albert olivé" 20px/700 lowercase, `margin-right: auto`,
  hidden below 686px.
- Links: inline-flex, gap .4em icon+label, 20px/400 lowercase
  `#27242b` (light tone: `#fff`), color transition 200ms, hover/focus →
  `--accent`. `aria-current="page"` on active route.
- Gap: 16px below 768px (fits 320px viewport), 32px ≥768, 40px ≥1024.
- Icons: toryn hand-drawn SVGs (24×24, stroke 1.3, fill-opacity .1), size
  1.05em.
- `withBlur`: white blur strip (rgba .9, blur 12, h 100px) behind nav on
  scrollable pages — used on /projects.
- Tone: `light` (white links) on /about; dark on home, /projects, and /experience.

## Page: `/` (home — jrands identity)

Layout: a `100dvh` flex column on desktop; mobile can scroll. The frame has
32px horizontal margins on desktop and 20px on mobile. The native video fills
the frame with `object-fit: cover`, muted looping playback, `playsInline`, and
a matching poster fallback. The badge sits 72px from the frame top, or 56px
on mobile. The dark-on-white navbar is in normal flow above the video.
The bottom bar sits below the frame. There is no play/pause control: the hero
is an always-on "live" surface (2026-09-15) that reads as a television feed.

HLS uses R2 through the video Worker, with native HLS preferred over a dynamic
`hls.js` import. Playback starts on the rendition that covers the frame
(`coverLevel` accounts for both cover dimensions and device pixels) and is
pinned there. The platform player (Safari, and Chrome on macOS, which also
plays HLS natively) receives the one variant playlist that covers the frame,
so it has no ladder to climb. The `hls.js` path pins the ladder instead:
`minAutoBitrate` floors it, `autoLevelCapping` caps it, and `startLevel` fixes
the first fragment. `HERO_FLOOR_STEPS` in `lib/video.ts` is the policy switch that allows one rung
of degradation instead. Reduced motion, a hidden document, and a refused
`play()` all still keep the stream loaded; playback resumes on
`visibilitychange`, `pageshow`, or the first gesture, and only a fatal HLS
error falls back to the poster. `HERO_HONORS_REDUCED_MOTION` in `lib/video.ts`
restores the poster for reduced-motion visitors.
Video replacement and versioned caching are documented in `README.md`.

The document keeps the visual treatment unchanged while providing one
visually hidden `h1` and a short description for search engines and assistive
technology.

- Badge: white, radius 12, shadow `0 4px 16px rgba(0,0,0,.14), 0 1px 4px
  rgba(0,0,0,.08)`, Space Grotesk 600 15px, dot 10px lime with glow.
  Links to `/projects`.
- Bottom bar: 14px/600 ls .84px `rgba(0,0,0,.65)` — name, role,
  location, clock, year.
- Clock: client, per-second, Europe/Madrid, unmount-safe.

## Page: `/projects` (toryn identity)

- Page order: opening hero with the playable skills pile, GitHub contribution
  calendar, six image-first project cards, then a dark “Let’s work together”
  section linking to LinkedIn. GitHub, LinkedIn, and Back to top finish the page.
- Skills playground: 24 confirmed technology labels rain from randomized
  positions into a full-width Matter.js pile. The board uses 40svh with a
  340px minimum on desktop, 400px on mobile, and 520px below 361px to fit
  the pile. Pills have 44px minimum touch targets. Pointer throws transfer
  momentum; keyboard arrows add velocity, with Shift for a stronger nudge.
  No visible playback or reset buttons. With a skill focused, Space or Enter
  toggles playback and Escape pauses. The pile also pauses offscreen without
  teleporting. Resizing an active board restarts the rain to prevent overlapping
  bodies. Reduced motion keeps a naturally sized, readable static list and
  disables physics interactions.
- Motion: a staggered heading/lede entrance, short image zoom and arrow
  movement on fine-pointer hover, and progressive CSS scroll reveals where
  view timelines are supported. All have reduced-motion alternatives.
- No visitor count: the site has no configured shared counter or analytics
  store. A local or invented number would not represent actual visitors.
- GitHub contributions: server-fetched native GitHub contribution HTML with
  one-hour revalidation, a seven-second timeout, strict date/level/count
  parsing, Sunday–Saturday grouping from dates, and an honest unavailable
  state. No event-derived or fabricated contribution data.
- Project details remain separate from the drag surfaces. The private
  opportunity-radar entry is labelled and is not rendered as a link.

- Shell: coordinated `max-width: 1120px`, `padding-top: 112px`; the physics
  zone alone spans the viewport width.
- Navbar: shared toryn `SiteNav` (dark tone, `withBlur` blur strip).
- Detail grid: one column mobile, two columns from 640px, gap 16px.
- Card: one subtle `rgba(17,17,17,.08)` border, 12px radius, no shadow or
  scale. The existing 16:9 project image is edge-to-edge; content is 16px
  mobile / 20px desktop, title 16px/500, description 14px/1.75, with text
  technology labels and an explicit website/code action where public. Cards
  use `content-visibility: auto`; preview videos keep `preload="none"` and
  load only after pointer, focus, or touch interaction.
- Focus-visible: 2px solid `--accent`, offset 2px (our addition).
- Verification: `npm run check:projects` checks contribution parsing and
  Matter.js collision transfer. With `agent-browser` installed and a production
  server running via `npm run start -- --port 3100`, run
  `npm run check:projects:browser`. Pass a different URL after `--` if needed.
  The browser check requires live GitHub data and exercises desktop/mobile
  resizing, randomized reloads, absence of toolbar controls, keyboard pause/resume,
  keyboard/pointer input, scrolling, section
  order, public/private project links, and reduced motion.

## Page: `/about` (pedro identity)

- An opaque `#000` content layer with `mix-blend-mode: multiply` keeps the
  background black while white glyphs show the video. The poster, video, and
  SVG grain share a 75%-opacity media layer over white. Grain stays behind
  the black layer, so it cannot turn the background gray. Nav and counter
  remain outside the blend.
- Prose: 35px/42px desktop, 28px/36px <768, letter-spacing -.01em, weight 500.
- Reveal pills: inline-block, border 1px currentColor, radius 9999px,
  padding `0 .4em`, uppercase, `font-size: .8em`. Hover: accent bg + near-black
  text. Open: `#fbd3cb` bg, dark text. Pills are **recursive** (2026-09-08):
  a pill's hidden content is the sentence continuation and can contain
  further pills (ped.ro's real shape — `content/about.ts` is a segment
  tree with 4 root hints and 10 total reveals). GitHub, LinkedIn, and email
  remain ordinary prose links.
- Reveal content: closed = inline, blurred 6px, opacity .8, and `inert`;
  open = inline, full opacity, blur animates to zero over .6s. Closing a parent
  preserves nested children, which remain inert through their ancestor until
  reopened. Prose has a resting .25px blur and four staggered paragraph
  entrances. Paragraph boundaries live in `content/about.ts`, not array slices
  in the page component. Reduced motion disables the animations.
- Counter: fixed top-right 16px, serif italic 13px, `R 0 / 10`, aria-live
  polite, hidden on `(hover: none)`.
- Navbar: shared toryn `SiteNav` (light tone).
- Video: decorative VP9 WebM (`public/video/about.webm`) with a WebP poster
  (`public/images/about-poster.webp`) and `preload="metadata"`. It is muted,
  loops, plays inline, and is hidden from assistive technology. The wrapper
  paints the poster independently. Sources attach only after checking motion
  preference. Reduced motion unloads video, including when changed live.
  Blocked playback or failed loading leaves the poster visible.

## Metadata and media

- `/`, `/about`, `/experience`, and `/projects` define self-referencing
  canonicals and route-specific Open Graph and Twitter metadata.
- `app/opengraph-image.tsx` generates the 1200×630 social image.
  `app/sitemap.ts`, `app/robots.ts`, `app/icon.png`, and
  `app/apple-icon.png` provide the remaining search and icon assets.
- The shared closing scene uses
  `public/images/montseny-snow-panorama.jpg`. It stays lazy because it appears
  after the main page content.

## Motion

| Animation | Duration/easing | Pages |
|---|---|---|
| link color / border / arrow | 150–200ms ease | projects |
| panel/modal open | 150–300ms ease-out | home |
| video opacity fade | 666ms | home/about |

`prefers-reduced-motion: reduce` → replace the falling skills simulation with
a static wrapped list; disable blur animations and video fades.

## Accessibility rules (project-wide)

- Focusable elements get visible `:focus-visible` rings.
- Panels/modals: focus moves in on open, `Escape` closes, background
  content gets `inert`.
- Video never autoplays with sound; `aria-hidden` on decorative media.
- Contrast: body text ≥ 4.5:1 on all pages (jrands rgba(0,0,0,.65) on
  white = 4.6:1 measured OK).
