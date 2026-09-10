# toryn.bio/projects — measured evidence

Captured 2026-09-08 via agent-browser (Chrome CDP), public page, no login.
Final URL: https://toryn.bio/projects · title: `projects — toryn thompson`.
Stack observed: Next.js App Router + Tailwind v4 (CSS custom props like `--spacing: .25rem`), custom webfont `sfProText` (400/700 loaded via document.fonts; no .woff in perf entries — likely inlined/self-hosted module font).

## Page shell

- Body: `bg-white`, text `rgb(0,0,0)`, font `sfProText, "sfProText Fallback"`, 16px base.
- Main container: class `max-w-460 mx-auto pt-28 px-8` → max-width **1840px** (Tailwind arbitrary: 460 × 0.25rem), padding-top **112px**, side padding **32px**. Same padding at every viewport (390px → 326px content col).
- Visible page heading: none — `<h1 class="sr-only">projects</h1>` only. Grid starts directly.
- Footer: none.
- Font tokens: `--font-sans` = system stack; `--font-mono` = ui-monospace SFMono stack (unused on this page).
- Body class includes `min-h-screen w-full bg-white`.

## Header (absolute, not sticky)

```
header.absolute top-0 inset-x-0 z-99 text-lg sm:text-xl
└─ div.relative.w-full.flex
   └─ nav.flex justify-center p-6 w-full max-w-460 mx-auto md:justify-end xl:pt-8  [aria-label="Primary navigation"]
      ├─ h1.hidden lowercase font-bold mr-auto sm:block  → "toryn thompson" (brand, LEFT; hidden below 686px)
      └─ ul.flex list-none items-center justify-center gap-8 lg:gap-10 lg:justify-end
         ├─ li > a → "/" (home)
         ├─ li > a[aria-current=page] → "/projects"
         └─ li > a → "/about"
```

- Header height at rest: **87.5px** (p-6 = 24px all around, content 39.5px line).
- Behind nav: a sibling div `absolute inset-0 -top-2 bg-white blur-xs -z-10` (white strip w/ 4px blur, `transition-opacity duration-300`) — fades in (scroll backdrop). Header itself `absolute` — scrolls away with page.
- Nav links: **20px** (`text-lg`; `sm:text-xl` = 20px at ≥686px), weight 400, **lowercase**, color **#27242b**, hover → `--accent-purple`, `transition-colors duration-200` (200ms).
- Each link: `<span class="inline-flex items-center gap-[0.4em]">` containing a **hand-drawn SVG icon (24×24 viewBox, stroke 1.3, size 1.05em ≈ 21px)** + text label. Icons: house (home), grid/monitor (projects), person (about). SVG paths have inline `style` transform attrs (React-animated on hover — `transform-box:fill-box`, g elements).
- Active state: `aria-current="page"` + `data-active="true"` attribute — **no visual CSS difference** observed in computed styles (same color/weight; the icon likely animates). No `:focus-visible` rules in stylesheets (a11y defect — do not copy).
- Brand h1: 20px, weight **700**, lowercase, `mr-auto` pushes nav right. `hidden` below sm → nav becomes centered (`justify-center` default, `md:justify-end` ≥768px).
- Nav gap: **32px** (`gap-8`), **40px** ≥1024px (`lg:gap-10`).

## Grid

- `ul` class: `m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`
- gap-6 = **24px** both axes.
- Column count measured: 1 col at 320/390 → 2 cols at 768 → 3 cols at 1280/1440 → 4 cols at ≥1536.
- Exact @media conditions (from stylesheet):
  - `@media (min-width: 42.875rem)` = **686px**: `grid-cols-2`, `text-xl`
  - `@media (min-width: 48rem)` = 768px: `md:justify-end` (nav), `max-w-72`
  - `@media (min-width: 64rem)` = 1024px: `grid-cols-3`, `gap-10` nav
  - `@media (min-width: 80rem)` = 1280px: `xl:pt-8` nav
  - `@media (min-width: 96rem)` = 1536px: `grid-cols-4`
- 1440×900: 3 cols ≈ 442.7px each; grid x=32 (px-8).

## Card anatomy (measured 442.7×346.2 at 1440)

```html
<li class="group relative transform-3d will-change-transform hover:z-10" style="transform:perspective(800px)">
  <a class="block h-full w-full border-2 border-black p-px group-hover:border-(--accent-purple) transition-[border-color]"
     href="/projects/led-cube">
    <div class="flex h-full w-full flex-col border-2 border-neutral-600">
      <div class="relative w-full h-fit select-none aspect-video border-b border-black">
        <img class="object-cover" (next/image fill, srcset 256w…3840w, sizes="(max-width:640px) 90vw, (max-width:1024px) 48vw, 32vw")>
      </div>
      <div class="px-3 py-2.5">   <!-- 12px sides, 10px top/bottom -->
        <p><span class="lowercase">8x8x8 Music-Reactive LED Cube</span>
           <span aria-hidden class="inline-block align-middle transition-transform duration-200 group-hover:translate-x-0.5">
             <svg viewBox="0 0 24 24"><path d="M6 13h6v4l6-5-6-5v4H6z"/></svg>  <!-- right arrow -->
           </span></p>
        <p class="text-neutral-600/90">a 512-LED cube using a custom PCB and firmware…</p>
      </div>
    </div>
  </a>
</li>
```

- **Double border look**: outer `a` = 2px black + 1px padding (`p-px`); inner div = 2px `neutral-600` (gray). So image sits inside two nested frames.
- Image wrapper: `aspect-video` (16:9), `border-b border-black` (2px black divider under image). Card image measured 432.7×242.4 (16:9 ✓). `object-fit: cover`, `next/image` responsive srcset, `loading="eager" decoding="async"`.
- Title: 16px / 400 / lowercase / black, followed by inline arrow SVG that nudges **+2px right** on hover (`translate-x-0.5`, duration 200ms).
- Description: 16px / 400 / `text-neutral-600/90` (Tailwind neutral-600 at 90% alpha ≈ `rgba(82,82,82,.9)` on lab color — compute as #525252ee), line-height 24px.
- Whole card is ONE link. No title/link duplication.

### Hover behavior (real CDP hover verified)

- `li` transform: `matrix3d(1.05, …)` → **scale(1.05)** within parent `perspective(800px)`, `transform-style: preserve-3d`, `hover:z-10` lifts above siblings.
- `a` border-color: **black → #591cbc** (`--accent-purple`), transition `[border-color]` (default 150ms cubic-bezier(.4,0,.2,1)).
- No shadow, no overlay, no image zoom. Just scale + border color + arrow nudge.

### Cards inventory (8 items, hrefs recorded)

1. `/projects/led-cube` (internal detail page) — LED cube
2. `/projects/pcb-badges` (internal) — TreeHacks 2026 PCB badges
3. `https://teamtomorrow.com/` (external)
4. `https://pindrop.toryn.bio/` (external)
5. `https://github.com/ttorynn/badges` (external)
6. `https://github.com/ttorynn/licer` (external)
7. `https://github.com/ttorynn/swift-challenge-24` (external)
8. `https://github.com/ttorynn/loxrs` (external)

Mixed internal/external in ONE grid, no badges distinguishing them. External links: no `target=_blank` (target attr empty), no rel noopener observed.

## Accent color

- `--accent-purple: #591cbc` (defined in :root). Used for: nav link hover color, card border hover. That's all on this page.

## Motion

- Nav link color: 200ms.
- Card border: 150ms default (cubic-bezier(.4,0,.2,1)).
- Arrow: 200ms translate.
- Card scale: instant on :hover (no transition on transform — snaps).
- Backdrop blur strip: opacity 300ms.
- No scroll animations, no reveals, no keyframe animations on this page (`wrong-flash` keyframes exist in CSS but unused here).

## A11y observations

Good (keep): sr-only h1 per page, `aria-label="Primary navigation"` on nav, `aria-current="page"` on active link, descriptive alt text on every image, decorative arrow `aria-hidden`, whole-card single link.
Defects (do NOT copy): no `:focus-visible` styling at all; no `prefers-reduced-motion` handling for the scale/border motion; external links without target/rel provide no signal; grid images `loading="eager"` (first card) — LCP cost.

## Homepage diff (https://toryn.bio, checked briefly)

- Same nav (`home` active, aria-current=page), same absolute header, white bg.
- Main: `home select-none isolate h-svh` (100svh homepage, no scroll).
- Brand: homepage nav has NO h1 (h1 is page content "toryn thompson" instead).

## Known unknowns

- sfProText webfont file URL (not in perf entries — self-hosted via next/font local module, `sfprotext_…module__U8z01W`); fallback is the standard system stack.
- The nav icons' hover animation (React state → inline transform styles on SVG paths) — we will approximate with a static hand-drawn-style icon or simple CSS transform, not replicate the JS choreography.
- Whether the white blur strip behind header appears on scroll only (opacity transitions — likely tied to scroll position; homepage doesn't scroll so can't confirm trigger).
- Real touch-device behavior.

## Reuse decisions for our /projects page

1. Header: absolute (scrolls away), brand left (hidden <sm, nav centered), nav right with lowercase 20px links, gap 32px, accent hover 200ms, `aria-current`. We ADD: focus-visible ring + reduced-motion respect.
2. Grid: `1 / 2@686 / 3@1024 / 4@1536`, gap 24px, container max-w-1840 px-32 pt-112.
3. Cards: double border (black outer 2px + gray-600 inner 2px, 1px gap), aspect-video image w/ 2px black divider, lowercase title + arrow (nudges 2px on hover), gray desc, whole-card link, scale(1.05)+z-lift+accent border on hover.
4. Accent: single `--accent-purple`-equivalent for our brand (pick Albert's accent; #591cbc is Toryn's brand — we choose our own, documented in DESIGN.md).
5. Keep: sr-only h1, aria-current, descriptive alts. Fix: focus-visible styles, eager→priority first image only.
6. Our destinations: since we have NO detail pages, ALL cards are external links (repo/site). We keep target=_blank + rel for externals (improvement, documented).
