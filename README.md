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
npx tsc --noEmit
npm run lint
npm run check:projects
npm run build
```

The repository has no `npm test` script. `check:projects` verifies the project
data, GitHub contribution parsing, and Matter.js collision behavior.

For About and metadata regressions, start a production build on port 3100
and run `node scripts/check-about.mjs`. This checks five viewports, clear
prose after 4.5 seconds, nested reveals, social images, motion preference
changes, and blocked, failed, slow, and JavaScript-disabled video fallbacks.
Screenshots are saved to `/tmp/about-fixed-<width>.png`.

## Project structure

- `app/` contains the App Router pages and interactive components.
- `content/` is the typed source for site, About, experience, and project copy.
- `public/` contains images, videos, the CV, and project previews.
- `scripts/` contains project checks and the preview capture tool.

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
