# Observations — three reference sites

Cross-site notes distilled from the measurement files in
`measurements/`. Per-site numbers live there; this file records what the
three sites *share* and where they deliberately diverge.

## Shared patterns (all three)

1. **Typographic identity from one distinctive font** — jrands uses TX-02,
   Toryn SF Pro (via next/font local), Pedro Neue Montreal + Editorial New.
   None use a webfont CDN; all self-host or would.
2. **Navigation is a real list of links** — `<nav aria-label>` + `<ul>` + real
   `<a href>`. No burger menus even at 320px (jrands dock shrinks, Toryn
   centers the nav, Pedro keeps 4 short links).
3. **Motion is small and fast** — 150–666ms range. No scroll-jacking, no
   parallax, no keyframe-heavy sequences. Toryn's card scale is the only
   transform over ~30px and it *snaps* (no transition).
4. **Content is hard-coded** — none of the three sites has a CMS, auth, or
   analytics visible in the network log. Static content in code.
5. **Accessibility basics are present but each site has defects** — Toryn is
   the strongest (sr-only h1, aria-current, descriptive alts); Pedro has
   native buttons + aria-expanded but leaves blurred content tabbable;
   jrands has no focus management at all.

## Deliberate divergences (what we keep per-page)

| Aspect | jrands `/` | toryn `/projects` | pedro `/about` |
|---|---|---|---|
| Theme | dark video, glass UI | white, black borders | dark #111, grain |
| Nav model | floating dock, icon cards that expand on activation | in-flow absolute header, text links | fixed top text links |
| Hover/active | active-state expansion (not hover) | border color + scale snap + arrow nudge | pill fill + underline accent |
| Media | looping muted video, cropped | static images, aspect-video | grain overlay + optional video |
| Motion duration | 150–300ms, plus 666ms video fade | 150–200ms | .6s reveal/show |
| Typography scale | 14px bar, 13px panels, 15px badge | 16–20px | 28/35px prose |

## Interaction models worth copying exactly

- **jrands dock**: labels expand on *activation* (click), not hover —
  keyboard/pointer symmetric. Panels grow the dock upward; the work panel
  rows open a modal; URL never changes.
- **toryn grid**: whole card is one `<a>`; hover lifts `scale(1.05)` inside
  `perspective(800px)` and flips the double border to accent — a strong
  effect from two properties.
- **pedro reveals**: the hidden content always occupies layout space
  (inline span, blur 6px + opacity .8) so opening a pill never reflows the
  page. The counter counts *currently open* reveals, resets on reload.

## Interaction defects observed (do not reproduce)

Recorded per site in the measurement files. Summary:

- jrands: no pause control for the video, no aria labels on dock cards,
  no focus move into the modal, hidden panel focusables stay tabbable.
- toryn: no `:focus-visible` styles anywhere, no `prefers-reduced-motion`,
  external links lack `target=_blank`/`rel`, first card image eager-loads.
- pedro: 19 blurred focusables remain tabbable behind the blur, no
  `prefers-reduced-motion` for the reveal/show animations.

## Production notes

- Toryn and Pedro are Next.js App Router; jrands is a single static HTML
  page. Our build (Next.js App Router) matches two of three references.
- All three ship self-hosted fonts with `font-display` behavior via
  next/font or @font-face. Font licensing is why we substitute (see
  `decisions.md`).
- Pedro's grain is a zero-asset SVG feTurbulence filter at opacity .2 —
  cheaper than any texture image.
