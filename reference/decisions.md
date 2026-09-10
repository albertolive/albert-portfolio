# Decisions — what we copy, substitute, and fix

Derived from `measurements/*.md` and `observations.md`. Every "substitute"
or "fix" below is a deviation from the reference site, made for licensing,
accessibility, or scope reasons.

## D1 — Fonts (licensing)

Reference fonts are commercial: TX-02 (Territory), SF Pro (Apple),
Neue Montreal + Editorial New (Pangram Pangram). We substitute free,
metric-similar families, self-hosted via `next/font/local`:

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
shared nav on **all three pages** (`app/_components/site-nav.tsx`). The
homepage keeps the jrands **bottom info bar** (name/role/location/clock/
year) — Albert: "homepage footer navbar is better".

- Video: reference embeds Cloudflare Stream (portrait source, cropped
  heavily, audio segments fetched despite muted). We use a **local muted
  looping mp4/webm with poster**, `playsinline`, sized to cover — no
  third-party stream, no wasted audio fetch.
- Badge: keep shape/size/shadow/dot; link to `/about` (reference is a
  dead div).
- Bottom bar: keep name/role/location/clock/year; clock is a client
  component (per-second, cleans up on unmount).
- Click sounds: dropped (scope; adds asset weight and a11y questions).

## D4 — toryn adaptations (projects + shared nav)

- Grid/header/card anatomy copied near-verbatim (breakpoints 686/768/1024/
  1280/1536, gap 24, double border, aspect-video, lowercase titles,
  arrow nudge, scale(1.05)+accent border hover).
- **Shared nav** (2026-09-08): toryn navbar extracted into
  `SiteNav` — brand `h1` (hidden <686) + icon links, lowercase 20px,
  gap 32 (16px <768 so 320px fits), accent hover 200ms, `aria-current`,
  white blur strip on scrollable pages (`withBlur`). Tone `light` on
  dark pages (home/about), dark on projects.
  **Veil fix (2026-09-08):** the blur veil lives *inside* the nav
  stacking context (`isolation: isolate` on nav, veil at z -1 within
  it) — matches toryn's header anatomy so hovered/scrolled cards
  (z 10) pass under the veil and blur out instead of painting over
  it near the brand h1.
- All cards link **externally** (we have no detail pages) → add
  `target="_blank" rel="noreferrer"` (reference omits it).
- Add `:focus-visible` outlines (accent, 2px offset) — reference has none.
- Add `prefers-reduced-motion: reduce` → disable scale/arrow/border
  transitions.
- First card image `priority`, rest lazy (reference eager-loads first).

## D5 — pedro adaptations (about)

- Dark #111 + white + grain overlay (SVG feTurbulence, opacity .2) copied.
- Reveal pills: same mechanic (inline `<button aria-expanded>`, blur 6px
  closed → animated unblur open, layout-stable sibling span). **2026-09-08
  revision:** the real ped.ro structure is *nested* — a pill's hidden text
  is the sentence continuation and contains further pills (recursive).
  `content/about.ts` now models this as `AboutSegment` tree (8 reveals;
  hidden texts are sentence continuations — no repetition of the pill
  word, 2026-09-08 fix);
  `Reveal` renders children recursively. Closing a parent does not close
  its children (matches ped.ro). Fixes kept: closed content gets `inert`
  (not tabbable), counter is `aria-live="polite"`,
  `prefers-reduced-motion` skips blur animation (instant open).
- Counter: counts currently-open reveals; hidden under
  `@media (hover: none)` like reference; resets on reload (no storage).
- Video background: **ON (2026-09-08, Albert request)** — ped.ro-style
  fixed muted loop at opacity .75 under text+grain. Ships with a
  generated placeholder (`public/video/about.mp4`); real footage pending
  (`CONTENT-NEEDED.md` M4). Grain still ships on top.

## D6 — Scope guards (from plan)

No blog, auth, CMS, analytics, filters, detail pages, or scroll-jacking.
Contact is mailto/external links only. Static rendering everywhere;
client components only for: clock (home), reveal pills + counter (about).
The shared nav is a server component.

## D7 — Content decisions pending Albert

- Title variant: docs contain 10+ variants; we ship the CV one
  ("Engineering leader · Staff/Senior AI Engineer · Forward Deployed
  Engineer") as placeholder, flagged in `CONTENT-NEEDED.md` for approval.
- Contact email/LinkedIn/GitHub/esdeveniments.cat exist in source docs but
  are masked pending approval — placeholders in `content/`.
- Projects shown: nowcast-cardedeu, esdeveniments.cat, MoveFlow,
  culturacardedeu, opportunity-radar (needs public link or stays
  unlinked), MetaMask Extension. opportunity-radar is private — placeholder
  href flagged.
