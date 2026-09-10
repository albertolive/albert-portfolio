# Reference evidence

This directory holds the evidence gathered from the three reference sites
before any code was written. The goal was a close visual reproduction of each
site's feel — not a uniform look across pages.

## Sites and what we took from each

| Route | Reference | What it informs |
|---|---|---|
| `/` | jrands.com | Video hero, frame + inset layout, floating glass dock nav, status badge, bottom bar with live clock |
| `/projects` | toryn.bio/projects | Absolute header with lowercase nav, double-bordered project card grid, hover scale + accent border |
| `/about` | ped.ro | Dark palette, prose biography with reveal pills (blur → text), R counter, SVG film-grain overlay |

## Contents

- `measurements/jrands.md` — layout geometry, dock/badge/modal styles, video pipeline, a11y defects
- `measurements/toryn.md` — header, grid breakpoints, card anatomy, hover behavior (real CDP hover), motion inventory
- `measurements/pedro.md` — reveal-trigger mechanic, counter semantics, fonts/tokens, video background, grain overlay, keyframes
- `screenshots/<site>/` — desktop 1440×900, 1280×800, 768×1024, 390×844, 320×740 (jrands also has an annotated desktop shot)

## Method

All measurements were captured with agent-browser (CDP) at the viewports
above: DOM geometry via `getBoundingClientRect`, computed styles, real
synthesized hover events, and network request logs. The raw values live in
the measurement files; decisions derived from them live in
`decisions.md` and `DESIGN.md`.

## Known gaps

- jrands `.bar-state` text and Home panel content were not captured
  (recorded in `measurements/jrands.md`).
- Reference fonts are commercial (TX-02, SF Pro, Neue Montreal,
  Editorial New) — substituted with metric-compatible free fonts,
  documented in `DESIGN.md`.
- Real iOS Safari behavior was not verified; measurements are
  Chromium-based.
