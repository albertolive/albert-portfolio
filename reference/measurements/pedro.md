# ped.ro — measured evidence

Captured Sep 8 2026 via agent-browser (CDP) at viewports 1440/1280/768/390/320.
Screenshots: `../screenshots/pedro/viewport-*.png`.

## Stack

Next.js App Router, Radix Themes (`.radix-themes` root, dark theme, `data-gray-color=mauve`), 3 next/font locals:
- `fontNeueMontreal` (variable, `font-variation-settings "wght" 500` on body text) — main sans
- `fontEditorialNew` (400 normal + italic) — nav, counter, italics, video-close
- `GeistMono` (100-900, unused on homepage)
All with `local("Arial")` metric-overridden fallbacks. Commercial fonts — substitute, do not copy files.

## Tokens

- `:root{--accent:#ff4921;--header-gradient-height:100px}` (Pedro's red-orange; we choose our own)
- Body: bg `rgb(17,17,17)` (#111), text white, dark theme (`color-scheme:dark`)
- `--container-4: 1136px` (main container max-width)
- `--font-size-8: calc(35px * var(--scaling))`, `--line-height-8: 42px`, `--letter-spacing-8: -0.01em` (Radix size-8)
- `--scaling` = 1 (data-scaling 100%), set via attr not media query
- `--red-1` = near-black in dark theme (text color on accent-hovered triggers)

## Layout

- Nav `.nav`: fixed top 0, z-1, padding 16px (space-4), links: Home Writing Speaking Shooting. Link = EditorialNew 16px/24px, `text-decoration: underline`, `text-decoration-color: white`, transition `text-decoration-color .1s`; hover → `text-decoration-color: var(--accent)` (underline turns accent, text stays white).
- `.nav-blur`: fixed top, height 100px, `background-image: linear-gradient(180deg, black 25%, transparent)`, pointer-events none. Fades video behind nav.
- `.counter`: fixed top 0 right 0, margin 16px 16px 0 0, EditorialNew 16px/24px color #eee, `filter: blur(.25px)`, `animation: show .6s both` delay `calc(.16s * 5)`, `user-select:none`. **`display:none` unless `@media (hover:hover)`** (hidden on touch).
- Main: `.rt-Container.rt-r-size-4` → inner max-width 1136px, starts y=180 desktop. 4 paragraphs `.home-text`.
- `.home-text`: NeueMontreal, wght 500, letter-spacing -.01em, `filter: blur(.25px)` (subtle), `animation: show .6s both` delay `calc(.16s * var(--delay))` (delays 0,1,2,3), `will-change:opacity`. Size: `rt-r-size-7 sm:rt-r-size-8` → 28px/36px mobile, 35px/42px ≥768px.
- Text color white; links `.home-link` color inherit underline-always, hover → color+underline accent.

## The reveal mechanic (core interaction)

`.reveal-trigger` — inline `<button aria-expanded>` inside flowing text:
```css
.reveal-trigger{background:none;color:inherit;outline:none;display:inline-block;
  position:relative;border:1px solid;border-radius:9999px;padding:0 .4em;
  line-height:1;text-transform:uppercase;font-size:.8em;cursor:default}
@media (hover:hover){.reveal-trigger:hover{cursor:help;background:var(--accent);
  color:var(--red-1);border-color:var(--accent)}}
.reveal-trigger[data-state=open]{--ring-color:var(--mauve-12);
  background:var(--mauve-12);color:var(--mauve-1);border-color:var(--mauve-12)}
.reveal-trigger:focus-visible{box-shadow:0 0 0 1px black,0 0 0 3px var(--ring-color,currentColor)}
```
- font-size .8em → 22.4px mobile / 28px desktop; uppercase; 1px white border pill.
- Open state: light pill (mauve-12 bg #fbd3cb, mauve-1 dark text).
- Hover (pointer only): fills accent red #ff4921 with near-black text, cursor `help`.

`.reveal-content` — sibling span, ALWAYS rendered inline (no layout shift, doc height constant):
```css
.reveal-content[data-state=closed]{filter:blur(6px);opacity:.8;overflow:hidden;
  pointer-events:none;user-select:none;color:white}
.reveal-content[data-state=open]{animation:reveal .6s both}  /* blur(.1em)→0 */
```
- Closed: blurred 6px, 80% opacity, not clickable, looks like redacted placeholder text.
- Open: blur 0, opacity 1, pointer-events auto. Same DOM node, spans keep space (Radix Collapsible vars present but height auto — no collapse animation, inline flow).
- Nested reveals work (Raycast ⊃ needed, Modulz ⊃ Radix ⊃ Stitches). **Closing a parent does NOT close nested children** (they stay open; harmless since layout is constant).
- 15 triggers on homepage: Pedro, anymore, product, Raycast, needed, hats, product(2), Rainbow, Modulz, Radix, Stitches, Barcelona, São Paulo, Norwich, 𝗑.
- Text pattern: "Yo! I'm Pedro Duarte. I'm not sure how to intro myself anymore..." — bio reads as continuous prose with pill-words you click to "decrypt".

## Counter semantics

`R 0 / 15` → counts **currently-open** reveals: open Pedro → R1, +Raycast → R2, +needed → R3, close Raycast → R2 (nested still open). Not a discovered-total. Resets on reload (no localStorage/sessionStorage — no persistence at all).

## Video

- `.video-background`: `<video src=cdn.ped.ro/video-optimised.mp4 loop muted autoplay playsinline>` absolute 100vw×100vh object-fit cover, inside fixed inset-0 wrapper z-3. `opacity 0 → .75` (data-ready, transition 666ms) → `1` when data-state=open|preview.
- `.home-video-button` ("content creation", plain button, italic EditorialNew span): hover `cursor:zoom-in` + accent color. Click → wrapper video data-state=open (opacity 1 fullscreen) + `.video-close` button appears.
- `.video-close`: absolute left 0 top 0, EditorialNew italic uppercase "Close", `mix-blend-mode: difference`, animation video-show (.6s: scale .9→1, blur 5px→.25px). Click → back to .75. No new video element, no pause — same element, opacity only.
- Counter does NOT increment for video.

## Texture overlay

```html
<svg id="texture"><filter id="noise"><feTurbulence type="fractalNoise"
  baseFrequency=".8" numOctaves="4" stitchTiles="stitch"/><feColorMatrix
  type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#noise)"/></svg>
```
`#texture{position:fixed;inset:0;z-index:9999;width:100vw;min-height:100vh;opacity:.2;pointer-events:none;filter:contrast(60%) brightness(100%)}` — film grain over everything, pure SVG, zero asset requests.

## Keyframes

```css
@keyframes show{0%{opacity:0}to{opacity:1}}
@keyframes reveal{0%{filter:blur(.1em)}to{filter:blur(0)}}
@keyframes video-show{0%{transform:scale(.9);filter:blur(5px)}to{transform:scale(1);filter:blur(.25px)}}
```

## Mobile (390×844)

- Doc scrolls (1816px > 844): content reflows into long column, container x=16.
- home-text 28px/36px; triggers 22.4px; counter 16px.
- Nav unchanged (16px padding).
- Radix sm breakpoint = 768px (size-8 text).

## A11y findings

Good: native buttons, aria-expanded, focus-visible ring (double box-shadow), counter aria-live presumably.
**Defects — do not copy:**
1. Blurred `.reveal-content` links/buttons remain keyboard-tabbable (19 hidden focusables) — we add `inert`/`visibility:hidden` on closed content.
2. Counter visible only with hover:hover — fine, but no aria-live verified.
3. Trigger click → no focus management (acceptable — inline flow).
4. No prefers-reduced-motion handling for blur/show animations.

## Reuse decisions for our /about

- Dark bg #111 + white text + film-grain SVG overlay (feTurbulence, opacity .2, z-top, pointer-events none).
- Discovery biography: continuous prose with pill-word triggers (white 1px pill, uppercase, .8em, radius 9999px), blurred content reveals on click, blur(6px)→0 + opacity .8→1.
- Counter top-right "R n / N" tracking open reveals (we: also count, hidden on touch, aria-live polite).
- Fixed nav top-left with EditorialNew-style serif links, underline→accent hover 100ms; nav gradient blur strip 100px.
- Video bg muted loop autoplay with opacity .75 + full-screen "content creation"-style zoom (optional — Albert may skip or use).
- Opens: accent-filled pill; we pick our accent (not #ff4921), keep light-open-pill vs accent-hover split if it fits palette.
- Add what Pedro missed: closed content inert to keyboard+AT, prefers-reduced-motion (skip blur animation, just toggle), children close with parent.

Open unknowns: real touch behavior (counter display none), iOS Safari rendering, whether reveal animation uses CSS animation only (yes — data-state swap, animation both directions via [data-state=open] animation), Radix collapsible vars unused (inline, no height animation).
