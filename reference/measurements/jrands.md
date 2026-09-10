# jrands.com — measured evidence (2026-09-08)

Method: agent-browser (Chrome, CDP), JS-enabled, cookies allowed. Viewports: 1440x900, 1280x800, 768x1024, 390x844, 320x740 (DPR 1). Fonts awaited via document.fonts. All values computed styles / bounding boxes, captured per viewport where relevant.

## Page model
Single page, no router. #page is height:100vh-like (body 100dvh overflow hidden). Layout regions:
- #frame-wrap: inset ~20px desktop / 12px mobile (640px breakpoint), fills remainder.
- #frame (video container, overflow hidden) inside #frame-wrap.
- #clay-badge: absolute, top 26px, centered horizontally (desktop); link? NO — plain div, not clickable.
- #shell (dock): absolute, bottom ~10px desktop (inset bottom:-18px), centered horizontally, width 320px (min(320px, 100vw-40px) at <=640px).
- #bottom-bar: static, below #frame-wrap, height 64px desktop / auto (grid 2 cols) <=640px.

## Hero video
- iframe#bg-stream src = Cloudflare Stream iframe embed: `?loop=true&autoplay=true&muted=true&poster=.../thumbnail.jpg?time=&height=600&controls=false`.
- iframe inline style width: calc(100% + 25px)? Measured iframe rect wider than frame (1440: 1451x816 starting x=-5) — the iframe is oversized and horizontally centered/offset (crop). Video crop changes with aspect: at 390x844 iframe 1396x785 at x=-503 — heavily cropped horizontally on narrow screens (portrait video 1080x1920 presumably).
- Network: poster thumbnail.jpg?height=600 requested by iframe Document URL (shown in iframe src). Player requests: embed/sdk.latest.js; then MSE streaming: video/{240,360,480,1080}/init.mp4 + seg_N.mp4 (~4s segments), audio/130k track alongside video segments (audio fetched even though muted — reference fetches audio track too).
- Adaptive: yes — rendition ladder observed 240/360/480/1080 during one session (started 240, ramped to 1080).
- No user pause control found: no .stream-controls, no custom pause button. controls=false. (Accessibility defect; we do NOT copy this.)
- No lite/quality toggle. No captions.

## Status badge (#clay-badge)
- Position absolute, top 26px (desktop), horizontally centered (inset left/right ~440px auto at 1440).
- Size 258x46 desktop; padding 11px 20px; radius 12px; background white; shadow: 0 4px 16px rgba(0,0,0,.14), 0 1px 4px rgba(0,0,0,.08); font: TX-02 600 15px; content: dot + "Currently at" + logo img (ClayLogo.png, alt "Clay", height ~24px desktop / 18px mobile).
- Dot: 10px circle, bg rgb(195, 217, 39) (lime), glow shadow rgba(195,217,39,.77) 0 0 7.8px 1.56px; ::after has animation (pulse) disabled under prefers-reduced-motion.
- Mobile (<=640): top 14px, padding 8px 14px, font 12px, radius 10px, dot 8px, logo height 18px, gap 8px.
- Not a link in reference. Our decision: our badge will link to status destination when supplied (see decisions.md).

## Floating dock (#shell / #dock)
- #shell: absolute, centered, width 320px, height 50px, radius 16px, background: linear-gradient(rgba(26,26,30,.38), rgba(12,12,14,.5)); border-ish shadow: inset 0 1px 0 rgba(255,255,255,.18), inset 0 -1px 0 rgba(255,255,255,.05), 0 0 0 .5px rgba(0,0,0,.25), 0 24px 60px rgba(0,0,0,.22), 0 6px 16px rgba(0,0,0,.12). transition: opacity/transform .55s cubic-bezier(.22,1,.36,1).
- #dock: flex, gap 3px, padding 5px.
- .card (nav item): flex 75x38, padding 0 8px, border-radius 10px, border 1px transparent, transition color/background/border .2s. Icon-only by default; label (12px) hidden via max-width:0/opacity:0. On click (active panel): label expands (max-width 90px, opacity 1), card bg rgba(255,255,255,.11), border rgba(255,255,255,.25).
- Hover: bg rgba(255,255,255,.04), border stays transparent (labels do NOT expand on hover — only active state expands).
- Cards: Home / Work / About / Contact(mailto). Hrefs: "#", "#", "#", "mailto:...". So panels for Home/Work/About; Contact is mailto.
- Work panel: 5 work rows (36px thumb, title 13px/500 white .9, sub 11px white .35, year 11px white .22; row 56px, gap 12px, padding 10px 16px). #panel 318px wide, height animated 0→340. #shell grows upward. Height 340px desktop; min(340px, 42vh) <=640px.
- About panel: bio (13px/400 white .72, line-height 20.15px) + 2 social links (LinkedIn, X) 137x33 each.
- Home panel: appears empty (empty #panel? no — Home panel opens… not observed opening content; Home card href="#"). [Home panel not further inspected; unknown]
- Contact card: mailto link directly.
- No aria-labels on cards. No focus management. (Defects; do not copy.)
- Work rows open modal (below).

## Bottom bar (#bottom-bar)
- Desktop: flex space-between, two .bar-groups. Left: name ("Justin Rands") + role ("Brand Engineer · Designer · CD"). Right: "Sebastopol, California [state] [live-time] " + year "2026".
- .bar-item: TX-02 600 14px/14px, letter-spacing .84px, color rgba(0,0,0,.65) (over video, light-on-dark video in ref).
- #live-time: same font, updates every second (JS clock).
- Mobile: grid 2 cols (auto auto), row-gap 5px, font 10px, letter-spacing .04em, .bar-state (clock state word?) hidden, items reordered.
- .bar-state: 74x16, same font — text content not captured (what does it say? unknown — likely a clock state like "on/off" or availability). [text of .bar-state NOT captured — unknown]

## Project modal (#tw-overlay/#tw-modal)
- Overlay: fixed inset 0, opacity 0→1 (.38s cubic-bezier(.16,1,.3,1)), pointer-events none→all. No dim background (transparent).
- Modal: 760x520 desktop, radius 20px, same glass gradient (rgba(24,24,28,.52)→rgba(10,10,12,.66)), shadow like dock + big drop. Resize handle #tw-resize (resizable via CSS resize? #tw-resize bottom-right 26x26).
- Header: "← Work" back button (65x24, border rgba(255,255,255,.1), bg rgba(255,255,255,.07), radius 6px, 12px/500) + "✕" close (26x26, radius 50%, bg rgba(255,255,255,.08)).
- Left column 226px: labels (10px/600 ls .7px white .28) "Role/Team/About" + values; title 22px (mobile) hidden until open (display none → block).
- Right column: media gallery (img GIF + autoplay loop videos .tw-media-item, class reveal = scroll-reveal).
- Modal open: no focus move (activeElement stays BODY), no aria-hidden on overlay when closed (relies on opacity), focusables remain tabbable when hidden? overlay has 2 focusable (back/close). [Focus trap not present.]
- Escape: closes overlay (opacity→0, class removed). ✕ closes. Back button also closes.
- Open/close + click sounds (mp3 fetched on load, played on interaction).
- Mobile (<=640): modal width calc(100vw-20px), height 84vh, body flex-direction column, left col padding 18px, title 22px, resize hidden.
- A work-row opens the modal with per-project content: TinyWins → role "Executive Creative Director", team list, about text, media list.
- URL never changes (no hash). Back button does nothing for modal (page state unchanged). [Browser Back during modal not tested further.]

## Fonts
- TX-02 (self-hosted .ttf, weight 600) for badge/bottom-bar/badge text.
- System stack (-apple-system, SF Pro Text) for dock/panels/modal.
- TX-02 is commercial (Territory — do not reuse font file). Substitute: Inter/system with 600 weights + letter-spacing to approximate. Document substitution.

## Viewport geometry (key)
| viewport | frame-wrap | iframe (video crop) | badge | shell(dock) | bottom-bar |
|---|---|---|---|---|---|
| 1440x900 | 20,20 1400x816 | -5,20 1451x816 | 591,46 258x46 | 560,804 320x50 | 20,836 1400x64 |
| 1280x800 | 20,20 1240x716 | 5→4,20 1273x716 | 511,46 25 Work | 480,704 320x50 | 20,736 24ish0x64 |
| 1000x(?) not captured | | | | | |
| 768x1024 | 20,20 728x940 | -452,20 1671x940 | 255,46 258x46 | 224,928 320x50 | 20,960 728x64 |
| 390x844 | 12,12 366x785 | -503,12 1396x785 | 96,26 197x34 | 35,737 320x50 | 12,797 366x47 |
| 1280 row correction | 20,20 1240x716 | 4,20 1273x729 → use x=4, w=1273, h=716 | 511,46 258x46 | 480,404? → 704 | 20,736 1240x64 |

## Unknowns / not verified
- .bar-state text content (clock state label) — not captured.
- Home panel content (Home card opens nothing? not verified).
- Real mobile Safari behavior (desktop emulation only).
- Internal player pixel dimensions/codec details (cross-origin; headers visible but codec not read). Poster transfer size hidden (cross-origin).
- Modal media load strategy (lazy by scroll-reveal class; GIF + videos loaded eagerly on open).
- Whether navigation vid pauses when modal open — not observed (video keeps playing behind modal — no pause on modal open observed).
- Sounds played on open/close (UIClick, Workopen mp3s fetched on load).

