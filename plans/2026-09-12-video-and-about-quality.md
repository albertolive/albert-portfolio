# Video and About Quality Plan

## User decisions

- The homepage video is meaningful page content.
- The about video is a background layer behind readable content.
- No pause control is wanted.
- Own-hosted videos are preferred for the about page.
- Adaptive streaming is under consideration for the homepage.

## Recommendation

Use native `<video>` for the about background. Keep one element, a poster, muted autoplay, looping, and `object-fit: cover`. Do not add a player SDK or streaming iframe for one short atmospheric loop.

Use adaptive streaming for the homepage only if the homepage video is long or measured transfer and startup costs justify it. Cloudflare Stream improves rendition selection and delivery, but adds an iframe/player dependency and still does not solve the no-pause accessibility tradeoff. Measure the current asset before choosing it.

Treat the homepage video as meaningful media. Provide a text equivalent or nearby explanation, preserve the no-pause product decision, and document that decision. Treat the about video as decorative and keep it `aria-hidden`.

## Phase 1: establish evidence

1. Capture `/`, `/about`, and all current reference viewports with the browser smoke tooling.
2. Measure each video asset's duration, dimensions, codec, bitrate, file size, and keyframe interval.
3. Record poster paint, first frame, transferred bytes, decoded frames, dropped frames, CPU, and memory.
4. Test autoplay blocked, reduced motion, slow network, mobile viewport changes, and unsupported-source failure.
5. Compare results with `reference/measurements/pedro.md` and `reference/measurements/jrands.md`.

## Phase 2: implement video contracts

1. Add a shared typed video configuration for source, poster, role, fallback, and motion policy.
2. Keep the about page on native video with WebM and a tested MP4 fallback when browser evidence requires it.
3. Add poster-first loading and an explicit ready/error state for the about fade.
4. Respect reduced motion by keeping the about poster visible and avoiding autoplay.
5. Use `100dvh` where viewport tests show an improvement.
6. Preserve the homepage's adaptive streaming decision until measurements prove native delivery is insufficient.
7. If streaming is selected, isolate the provider behind one component and preserve the existing crop and loading states.

## Phase 3: fix page architecture and semantics

1. Add one accessible `h1` to `/about` without changing the visual composition.
2. Keep both videos' semantics explicit. Homepage media gets a text equivalent; about media stays `aria-hidden`.
3. Replace the module-global reveal event bus with page-owned reveal state.
4. Derive the open counter from state so unmounts and nested reveals cannot desynchronize it.
5. Define and implement parent-close behavior for nested reveals.
6. Add stable `aria-controls` relationships where browser testing confirms they help.
7. Verify `inert`, focus order, keyboard operation, and focus-visible styling.

## Phase 4: SEO and quality checks

1. Audit rendered heading structure, canonical URL, metadata, Open Graph, robots, sitemap, and internal links.
2. Remove duplicated metadata strings through a small shared metadata helper if it reduces drift.
3. Check font loading and decide whether self-hosting is needed for reliable builds and privacy.
4. Run `npm run lint` and `npm run build`.
5. Repeat browser captures and performance measurements.
6. Update the reference notes and this plan with final asset facts and intentional deviations.

## Cross-cutting audit workstreams

### Performance

- Measure real startup and transfer behavior before changing delivery.
- Avoid duplicate video elements, unnecessary player SDKs, and eager secondary media.
- Keep poster-first rendering and explicit loading/error states.
- Check layout stability, long tasks, GPU cost from grain and blur, and mobile battery impact.
- Use responsive media dimensions and verify no unexpected cumulative layout shift.

### SEO

- Ensure `/about` has one logical `h1`, valid heading order, crawlable links, and a useful text equivalent.
- Verify canonical, title, description, Open Graph, Twitter, robots, and sitemap output from the built app.
- Confirm metadata URLs resolve against `metadataBase` in production.
- Check that decorative media does not replace indexable page content.

### Architecture

- Keep content data separate from rendering and interaction state.
- Use one explicit video state model per page contract.
- Remove the module-global reveal bus and derive counts from a single owner of state.
- Keep provider-specific streaming code behind one boundary so the page does not depend on Cloudflare details.
- Prefer existing Next.js and browser primitives before adding dependencies.

### Best practices

- Follow the installed Next.js 16 guidance in `node_modules/next/dist/docs/` before implementation.
- Keep server components server-side and isolate client state to interactive components.
- Use stable keys and IDs for recursive reveals.
- Test keyboard, reduced motion, autoplay blocking, failed media, and narrow viewports.
- Keep comments limited to non-obvious constraints and document measured media choices.

## Acceptance checks

- `/about` matches the Pedro reveal geometry at all five reference viewports.
- Closed reveals preserve layout and cannot receive focus or pointer events.
- The reveal counter equals the actual number of open reveals after open, close, nested, parent-close, and navigation sequences.
- About poster remains usable when autoplay is blocked or reduced motion is enabled.
- Homepage video behavior remains intentional and documented without a pause control.
- No avoidable duplicate downloads occur in the browser network log.
- Build, lint, SEO metadata inspection, and browser smoke checks pass.

## Additional findings from deeper audit

- `npm run build` currently passes with Next.js 16.3.4, TypeScript, and static prerendering.
- The homepage Cloudflare Stream iframe is marked `aria-hidden="true"` even though the homepage video is now classified as meaningful media. The plan must either expose an equivalent text description or explicitly reclassify the media as decorative.
- `/about` still has no `h1`; `/`, `/experience`, and `/projects` do have page headings.
- `/about` has no video `onError` fallback or runtime ready-state transition. A poster exists, but the CSS fade is not tied to successful media readiness.
- The about video has only a WebM source. Browser coverage must determine whether an MP4 fallback is required.
- The global `video { max-width: 100% }` rule can interact with absolute full-viewport sizing. Verify computed dimensions at every viewport.
- Project preview videos are dynamically swapped through one element, which is good for element count, but source changes and preload behavior need network verification.
- The site has no visible `viewport` or manifest route issue from the build output, but the rendered head still needs inspection rather than inference.
- Metadata is repeated in every route. This is maintainable today but remains a drift risk.

## Video runbook for future own-hosted videos

1. Encode a short H.264 MP4 for broad fallback support and a WebM version when its measured size or decode cost is better.
2. Keep the source resolution close to the largest displayed size. Avoid shipping 4K to a full-screen 1440px background.
3. Use a representative poster generated from the video. The poster must look correct before JavaScript or autoplay succeeds.
4. Keep background videos muted, looping, inline, and without native controls.
5. Use `preload="metadata"` by default. Change it only after measured startup evidence.
6. Fade from poster to video after `loadeddata` or `canplay`.
7. Provide a source error fallback that leaves the poster or a solid background visible.
8. Test Chrome, Safari, Firefox, iOS Safari, Android Chrome, reduced motion, slow 3G, and autoplay blocking.
9. Record file size, duration, dimensions, codec, bitrate, and the reason for each encoding choice in `reference/measurements`.

### Replacing the current videos

- About: put your encoded files under `public/video/` and the poster under
  `public/images/`. Update `aboutVideo.sources` and `aboutVideo.poster` in
  `lib/video.ts`. Order sources by preference and give each its actual MIME
  type. The poster is painted independently of playback. The video has no
  source until JavaScript checks reduced motion. Playback rejection or media
  failure keeps the poster; changing to reduced motion unloads the video.
- Homepage: upload your own video to your Cloudflare Stream account and
  wait for processing. Replace `homeStream.embedUrl` in `lib/video.ts` with
  your embed URL and its encoded thumbnail URL. Preserve `loop=true`,
  `autoplay=true`, `muted=true`, and `controls=false`. Update the title and
  text equivalent in `app/page.tsx` to describe the actual footage.
- No pause control is added. This remains an intentional accessibility
  limitation for automatically moving content, including decorative media.
- Run the production browser check after replacement. Real Safari/device
  support and the quality of new footage need separate checks; Chromium
  tests do not establish codec coverage or adaptive streaming efficiency.

## Approval gate

Implementation starts after this plan is approved. The first implementation slice is the measured video contract and `/about` semantics; streaming changes wait for the homepage measurements.

## Implementation notes (2026-09-13)

Done: shared typed video config (`lib/video.ts`); about native video with
poster-first `data-ready` fade on loadeddata/canplay, error fallback to
poster, JS reduced-motion guard (poster visible, no autoplay); `100dvh`
video sizing; homepage Cloudflare iframe preserved behind
`app/_components/home-stream.tsx` with a visually-hidden text equivalent and
the documented no-pause decision; accessible `h1` on `/about` with no visual
change; module-global reveal bus removed in favor of page-owned
`RevealProvider` with a derived counter, parent-close cascade, and stable
`aria-controls` ids; metadata deduplicated via `lib/metadata.ts` (experience
OG drift fixed); fonts unchanged (`next/font` self-hosted, per docs).
`npm run lint` and `npm run build` (Next.js 16.3.4) pass; rendered HTML
verified from the built app (one `h1`, canonical, OG/Twitter, robots,
sitemap per route).

Deviations: no MP4 fallback binary shipped — the `<video>` renders one
`<source>` per configured source, so adding an MP4 to the config needs no
code change; `public/video/about.webm` is 630,799 B. The five reference
viewports are 1440x900, 1280x800, 768x1024, 390x844, and 320x740, recorded
in the reference notes and screenshot filenames. The initial implementation
did not capture them, so visual parity was not verified. Interactive checks
still needed a browser session:
open/close/nested/parent-close counter, keyboard/focus order, reduced
motion, autoplay blocking, slow network, and the duplicate-download network
log.

Browser-verified 2026-09-13 (production build, real Chrome):
open → R 1/10, nested open → R 2/10, parent close → R 0/10 with zero
open pills, reopen parent → R 1/10 (child stays closed); keyboard
focus + Enter toggles; about video `data-ready="true"`, playing 640x360,
exactly one `about.webm` request (631,099 B, no duplicates); homepage
iframe attrs, text equivalent, and badge intact; projects (6 cards,
`preload="none"`) and experience (7 companies) render with clean consoles.
Note: `next dev` (Turbopack) in this environment did not hydrate client
components, so verification ran against `next start`; still pending:
reduced-motion, autoplay-blocked, slow-network, and multi-viewport passes.

## Review fixes and verification (2026-09-13)

The metadata helper now supplies social images explicitly. Next.js replaces
nested metadata objects rather than inheriting their missing properties.
The poster is independent of video opacity. Reduced motion is checked before
loading sources and observed while the page is open. Only playback reveals
the video; failed or blocked playback keeps the poster.

Readable About prose and open reveals have no blur, opacity animation, or
grain over them. Closed reveals retain their inline blurred placeholders.
The page has a dark fallback behind the fixed media for long-page rendering.

`node scripts/check-about.mjs` verifies social images on all four routes,
all five reference sizes, text filters and opacity after 4.5 seconds, nested
counter transitions, initial and live reduced motion, and poster visibility
with blocked playback, failed/slow media, and JavaScript disabled. Screenshots
are written to `/tmp/about-fixed-<width>.png`. Build and lint pass.

These checks establish Chromium behavior, not exact Pedro pixel parity,
real-device Safari compatibility, or CPU/battery improvements. Those claims
still require separate measurements. No deployment is performed here.
