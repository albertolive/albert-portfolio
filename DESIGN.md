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
- Brand `h1` "albert olivé" 20px/700 lowercase, `margin-right: auto`,
  hidden below 686px.
- Links: inline-flex, gap .4em icon+label, 20px/400 lowercase
  `#27242b` (light tone: `#fff`), color transition 200ms, hover/focus →
  `--accent`. `aria-current="page"` on active route.
- Gap: 16px below 768px (fits 320px viewport), 32px ≥768, 40px ≥1024.
- Icons: toryn hand-drawn SVGs (24×24, stroke 1.3, fill-opacity .1), size
  1.05em.
- `withBlur`: white blur strip (rgba .9, blur 12, h 100px) behind nav on
  scrollable pages — used on /projects.
- Tone: `light` (white links) on home + about, dark (toryn ink) on
  /projects.

## Page: `/` (home — jrands identity)

Layout: body `100dvh`, `overflow: hidden` on desktop only (mobile
scrolls). Frame inset 20px desktop / 12px mobile. Video cover, muted loop
`playsinline`, poster fallback. Badge top 26px centered (mobile: 14px).
Bottom bar 64px below frame. Shared toryn navbar on top (light tone) —
**the jrands glass dock is removed** (2026-09-08 review).

- Badge: white, radius 12, shadow `0 4px 16px rgba(0,0,0,.14), 0 1px 4px
  rgba(0,0,0,.08)`, Space Grotesk 600 15px, dot 10px lime with glow.
  Links to `/about`.
- Bottom bar: 14px/600 ls .84px `rgba(0,0,0,.65)` — name, role,
  location, clock, year.
- Clock: client, per-second, Europe/Madrid, unmount-safe.

## Page: `/projects` (toryn identity)

- Water backdrop uses `--water-base` (`#edfafa`), `--water-ripple`
  (`rgba(57, 151, 158, 0.38)`) and `--water-sand` (`#d9c8a4`). The
  sand token extends the palette for the requested coastal seabed.
  Native WebGL refracts a photographed sand texture beneath moving
  sunlight, shallow coastal waves, and pointer ripples behind the cards.
  Reduced motion freezes the water. Unavailable WebGL uses a static gradient.

- Shell: `max-width: 1840px` (max-w-460), `padding-top: 112px`,
  `padding-x: 32px`.
- Navbar: shared toryn `SiteNav` (dark tone, `withBlur` blur strip).
- Grid: `grid-cols-1 sm:2 lg:3 2xl:4`, gap 24px.
- Card: outer `border-2 #000` + inner `border-2 neutral-600`, aspect-video
  image, title lowercase 16px, desc `#525252ee` 16px/24, arrow translate
  0.5 200ms hover. Hover: `scale(1.05)` in `perspective(800px)`, border →
  `--accent`, z-lift. No shadow.
- Focus-visible: 2px solid `--accent`, offset 2px (our addition).

## Page: `/about` (pedro identity)

- bg `#111`, white text, SVG grain overlay fixed inset-0 opacity .2
  (`feTurbulence baseFrequency .8 numOctaves 4`, saturate 0).
- Prose: 35px/42px desktop, 28px/36px <768, letter-spacing -.01em, weight 500.
- Reveal pills: inline-block, border 1px currentColor, radius 9999px,
  padding `0 .4em`, uppercase, `font-size: .8em`. Hover: accent bg + near-black
  text. Open: `#fbd3cb` bg, dark text. Pills are **recursive** (2026-09-08):
  a pill's hidden content is the sentence continuation and can contain
  further pills (ped.ro's real shape — `content/about.ts` is a segment
  tree, 8 reveals).
- Reveal content: inline, closed = blur 6px + opacity .8 + inert; open =
  600ms unblur. Closing a parent does not close nested children.
- Counter: fixed top-right 16px, serif italic 16px, `R 0 / 8`, aria-live
  polite, hidden on `(hover: none)`.
- Navbar: shared toryn `SiteNav` (light tone).
- Video: only if content provided (see CONTENT-NEEDED.md).

## Motion

| Animation | Duration/easing | Pages |
|---|---|---|
| link color / border / arrow | 150–200ms ease | projects |
| panel/modal open | 150–300ms ease-out | home |
| reveal unblur / show fade | 600ms | about |
| video opacity fade | 666ms | home/about |
| card scale | snap (none) | projects |

`prefers-reduced-motion: reduce` → disable scale, arrow, blur animations,
video fades; keep color transitions.

## Accessibility rules (project-wide)

- Focusable elements get visible `:focus-visible` rings.
- Panels/modals: focus moves in on open, `Escape` closes, background
  content gets `inert`.
- Video never autoplays with sound; `aria-hidden` on decorative media.
- Contrast: body text ≥ 4.5:1 on all pages (jrands rgba(0,0,0,.65) on
  white = 4.6:1 measured OK).
