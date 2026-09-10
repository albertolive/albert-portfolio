# CONTENT-NEEDED.md — items requiring Albert's input

Everything below is required before this portfolio goes public. Each item
lists what is currently shipped as placeholder, and where to change it.

## 1. Media (blocking for home page quality)

| # | Item | Status | Where to put it |
|---|---|---|---|
| M1 | Hero video (mp4/webm, ~5–15s loop, muted, landscape or portrait ≥1080) | **MISSING** — home currently uses `public/video/hero-poster.png` static poster only | `public/video/hero.mp4` (+ `hero.webm` optional) |
| M2 | Poster image (video first frame or any 1920×1080 still) | **MISSING** — using a neutral gray placeholder PNG | `public/video/hero-poster.png` (replace) |
| M3 | Project card images (6×, 16:9, ≥1280×720) | **MISSING** — neutral placeholder PNG | `public/images/projects/<slug>.png` — slugs listed in `content/projects.ts` |
| M4 | About video (ped.ro-style background, muted loop) | **PLACEHOLDER** — generated dark animated-gradient mp4 (5.8MB) in place; replace with real footage if you have it | `public/video/about.mp4` |
| M5 | Favicon / app icon | Uses default Next.js | `app/icon.png` |

Project slugs needing images (M3): `nowcast-cardedeu`, `esdeveniments`,
`moveflow`, `culturacardedeu`, `opportunity-radar`, `metamask-extension`.

## 2. Copy decisions (blocking for correctness)

| # | Item | Options from your docs | Current placeholder |
|---|---|---|---|
| C1 | Homepage title/role line | 10+ variants exist (README/CV/LINKEDIN) — pick ONE for the homepage badge + bottom bar | "Engineering leader · Staff/Senior AI Engineer · Forward Deployed Engineer" (CV variant) |
| C2 | Homepage short bio (About panel text, 2–3 sentences) | several bios in PLAN.md/README.md | condensed CV summary |
| C3 | Work panel: which projects, in what order, subtitle + year per row | nowcast / esdeveniments / moveflow / culturacardedeu / opportunity-radar / metamask listed | all 6, CV order |
| C4 | Project descriptions (1 sentence each, for /projects cards) | README blurbs | first line of each README blurb |
| C5 | About page biography prose (with marked reveal words) | CV experience + PLAN bio | drafted from CV, 12 reveal pills |
| C6 | Reveal pill *hidden* texts (what each word decrypts to) | none exist — needs writing | drafted by me, flagged inline |
| C7 | About page "currently" section (what you're doing now) | PLAN "looking for" | from PLAN.md |

## 3. Links & credentials (masked in source docs — need approval to publish)

| # | Item | Current placeholder |
|---|---|---|
| L1 | Email address | `PLACEHOLDER-EMAIL` in `content/site.ts` |
| L2 | LinkedIn URL | `https://www.linkedin.com/in/PLACEHOLDER` |
| L3 | GitHub URL | `https://github.com/PLACEHOLDER` |
| L4 | esdeveniments.cat link | `https://esdeveniments.cat` (public, keep?) |
| L5 | opportunity-radar href | `#` (private project — link or leave unlinked?) |
| L6 | nowcast-cardedeu href | GitHub repo URL (confirm which) |
| L7 | MoveFlow href | `https://moveflow.app` (confirm) |
| L8 | culturacardedeu href | `https://culturacardedeu.com` (confirm) |

## 4. Metadata

| # | Item | Current placeholder |
|---|---|---|
| MD1 | Domain (canonical URL) | none set — `metadataBase` unset |
| MD2 | OG image (1200×630) | missing |
| MD3 | Site title / description | "Albert Olivé Corbella — Engineering leader & full-stack builder" |

## 5. Optional (not blocking)

- O1: Home panel (jrands Home dock card) content — reference had none
  captured; ours links the three routes.
- O2: Click sounds — dropped (see `reference/decisions.md` D3).
- O3: nowcast live screenshot (radar loop) as project image if available.

## How to update

All text/content lives in three typed files — no CMS:

- `content/site.ts` — name, role, location, links (L1–L4)
- `content/projects.ts` — cards (C3/C4, L5–L8, M3 mapping)
- `content/about.ts` — biography + reveal pills (C5–C7)

Drop media files into `public/` per the paths above; no code changes
needed for image swaps (filenames are fixed).
