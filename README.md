# Albert Olivé Corbella portfolio

Personal portfolio built with Next.js 16 and the App Router. The site has four
static routes: `/`, `/about`, `/experience`, and `/projects`.

## Run locally

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Validate changes

```sh
npm test
npm run lint
npm run build
npm run start -- --port 3100
```

In a second terminal, run the production browser checks:

```sh
npm run check:home
PORTFOLIO_BROWSER=webkit npm run check:home
npm run check:about
PORTFOLIO_BROWSER=webkit npm run check:about
npm run check:video:encoding
```

`npm test` checks project parsing and physics, cover-aware HLS resolution
selection, and Worker request/caching behavior. The encoding check requires
FFmpeg and ffprobe. It encodes a temporary video, verifies segment decoding
and bitrate separation, and checks safe reruns.

Browser checks use Playwright. Install missing engines with
`npx playwright install chromium webkit`. Set `PORTFOLIO_BASE_URL` to test
another local server. Home checks cover real playback, native HLS, mobile
sizing, reduced motion, pause/resume, blocked playback, failures, loops, and
cleanup. About checks cover five viewports, nested reveals, social images,
video fallbacks, pure-black background pixels, and text over a dark poster.
Screenshots are saved to `/tmp/about-fixed-<width>.png`.

## Project structure

- `app/` contains the App Router pages and interactive components.
- `content/` is the typed source for site, About, experience, and project copy.
- `public/` contains images, videos, the CV, and project previews.
- `scripts/` contains project checks and the preview capture tool.

## Replace the R2 home video

R2 stores the files; it does not encode adaptive variants. Prepare the new
video and its matching poster locally:

```sh
node scripts/prepare-home-video.mjs --input ~/Downloads/hero.mp4 --out /tmp/portfolio-hls \
  --start 0.16 --end 305
```

`--start` and `--end` are absolute offsets in the source and are re-encoded
frame-accurately, so a trim is part of the release identity. Real example:

```sh
node scripts/prepare-home-video.mjs \
  --input ~/Downloads/E2114B42-94F5-4482-91E9-33CB0E81DE5C.MP4 \
  --out /tmp/portfolio-hls --start 0.16 --end 305
```

The command prints a release directory and the future `src` and `poster`
URLs. It does not upload, deploy, or change `lib/video.ts`. The release ID
includes the source bytes, trim, preparation script, encoding settings, and
FFmpeg version. Completed releases are verified and reused. A failed encode
never publishes a partial directory.

The encoder creates up to three H.264 renditions with aligned four-second
segments. It measures actual segment bitrates and omits lower-resolution
variants that save less than 20% bandwidth. It preserves aspect ratio and
avoids upscaling. The poster comes from the first frame of the trimmed clip.

After reviewing the output and approving publication:

1. Upload to a **new** `hls/<release-id>/` prefix in the `hero-video` bucket.
   Pin the account, because the default OAuth account may not be the one that
   owns the bucket:
   `CLOUDFLARE_ACCOUNT_ID=9417d367eea41db07beaf77b0ac27d86 npx wrangler@4.131.2 r2 object put hero-video/hls/RELEASE_ID/480/seg0.ts --file /tmp/portfolio-hls/RELEASE_ID/480/seg0.ts --content-type video/mp2t --remote`.
   Upload segments first, then variant playlists, then the master playlist,
   then the poster. Preserve the directory structure. Use `video/mp2t` for
   `.ts`, `application/vnd.apple.mpegurl` for `.m3u8`, and `image/jpeg` for
   the poster. For a 300-object release, `PUT` the files through the
   Cloudflare REST API instead of one wrangler process per object:
   `curl -X PUT "https://api.cloudflare.com/client/v4/accounts/ACCOUNT/r2/buckets/hero-video/objects/hls/RELEASE_ID/480/seg0.ts" -H "Authorization: Bearer TOKEN" -H "Content-Type: video/mp2t" --data-binary @/tmp/portfolio-hls/RELEASE_ID/480/seg0.ts`.
2. Verify the master and its referenced files through the Worker URL.
3. Set `homeR2.src` in `lib/video.ts` to the printed `src` URL, and regenerate
   the local poster from the same trimmed first frame, so the frame paints
   before any stream request:
   `ffmpeg -ss 0.16 -i SOURCE -frames:v 1 -vf "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease" -q:v 5 public/images/hero-poster.jpg`.
4. Keep the previous release for rollback. Never overwrite a published
   release, and do not rely on a query string to invalidate cached segments.

### Current home release

The previous `/hls/master.m3u8` release was retired on 2026-09-15. All three of
its variants averaged ~1.5 Mbps, so no player could tell 1080p from 480p and
adaptive switching read as a quality drop.

The replacement source is 4K24 handheld footage trimmed from 0.16s to 305s.
Measured over a 12-second motion segment at 1080p, crf 19: SSIM 0.913 with a
5 Mbps peak cap, 0.923 at 6 Mbps, and 0.938 at 8.5 Mbps. The shipped 1080p rung
peaks at 6 Mbps, which keeps motion clean at roughly YouTube-1080p bandwidth.
The hero is pinned to the covering rendition, so that cost is paid once per
browser: versioned segments are immutable for a year, and a looping hero is
served from the browser cache after the first pass.

The home player uses native HLS when supported and imports `hls.js` otherwise.
The platform player (Safari, and Chrome on macOS) receives the one variant
playlist that covers the frame, so it cannot switch renditions. The `hls.js`
path starts on the rendition that covers the frame and pins the ladder there,
so quality cannot change mid-loop. It never unloads for reduced motion, pauses
while the document is hidden, retries a refused `play()` on the next gesture or
tab focus, and keeps the poster only after a fatal HLS error. `HERO_FLOOR_STEPS`
lets `hls.js` step one rung down instead of pinning; the native path always
plays the single variant it was given.

### Validate and deploy the video Worker

```sh
npx wrangler@4.131.2 dev --local --config workers/video-proxy/wrangler.toml
```

This runs the Worker locally and reads the existing public R2 origin. It does
not deploy. Wrangler must support the configured `2026-09-01` compatibility
date. Unit tests verify cache policy; a local Worker can verify real HEAD,
Range, and missing-file responses. Cloudflare edge-cache behavior must also
be checked after deployment.

With deployment approval, use
`npx wrangler@4.131.2 deploy --config workers/video-proxy/wrangler.toml`.
The Worker gives manifests a 30-second TTL, legacy media a five-minute TTL,
and content-versioned media a one-year immutable TTL. Errors use `no-store`.
A Worker deployment cannot recall one-year responses already stored in
visitors' browsers. New versioned URLs are required for replacements.

## Project previews

Capture every preview:

```sh
node scripts/capture-previews.mjs --all
```

Capture one project or section:

```sh
node scripts/capture-previews.mjs --project esdeveniments
node scripts/capture-previews.mjs --project esdeveniments --section events
```

Regenerate only the manifest labels and recheck existing assets:

```sh
node scripts/capture-previews.mjs --manifest-only
```

See `PREVIEWS-HANDOVER.md` for the capture workflow. Do not edit
`PREVIEW-MANIFEST.md` by hand.

## Reference

- `DESIGN.md` records the shipped design and interaction decisions.
- `CONTENT-NEEDED.md` tracks the original launch checklist.
- `PREVIEWS-HANDOVER.md` documents preview capture and browser verification.
