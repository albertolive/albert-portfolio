# Albert Olivé portfolio

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
node scripts/prepare-home-video.mjs --input ~/Downloads/hero.mp4 --out /tmp/portfolio-hls
```

The command prints a release directory and the future `src` and `poster`
URLs. It does not upload, deploy, or change `lib/video.ts`. The release ID
includes the source bytes, preparation script, encoding settings, and FFmpeg version. Completed
releases are verified and reused. A failed encode never publishes a partial
directory.

The encoder creates up to three H.264 renditions with aligned four-second
segments. It measures actual segment bitrates and omits lower-resolution
variants that save less than 20% bandwidth. It preserves aspect ratio and
avoids upscaling. The poster comes from the same input's first frame.

After reviewing the output and approving publication:

1. Upload to a **new** `hls/<release-id>/` prefix in the `hero-video` bucket.
   Upload segments and the poster first, then variant playlists, then the
   master playlist. Preserve the directory structure. Use `video/mp2t` for
   `.ts`, `application/vnd.apple.mpegurl` for `.m3u8`, and `image/jpeg` for
   the poster. For example:
   `npx wrangler@4.131.2 r2 object put hero-video/hls/RELEASE_ID/480/seg0.ts --file /tmp/portfolio-hls/RELEASE_ID/480/seg0.ts --content-type video/mp2t --remote`.
2. Verify the master and its referenced files through the Worker URL.
3. Set **both** `homeR2.src` and `homeR2.poster` in `lib/video.ts` to the printed
   URLs. Run the build and browser checks before deploying the site.
4. Keep the previous release for rollback. Never overwrite a published
   release, and do not rely on a query string to invalidate cached segments.

The current legacy `/hls/master.m3u8` remains configured until a replacement
is uploaded. Its published 480p/720p/1080p variants have nearly equal bitrates;
player changes cannot repair those existing encodings. HLS can still reduce
resolution on a slow connection. Locking 1080p would exchange softness for
buffering, not fix bandwidth.

The home player uses native HLS when supported and imports `hls.js` otherwise.
It caps quality using both cover dimensions and device pixels, pauses when
hidden, unloads for reduced motion, and offers an explicit play/pause control.
Failures retain the poster.

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
