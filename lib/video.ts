export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const aboutVideo = {
  sources: [{ src: "/video/about.webm", type: "video/webm" }],
  poster: "/images/about-poster.webp",
  preload: "auto",
  loop: true,
} as const;

// For replacements, use the versioned URL emitted by prepare-home-video.mjs.
// The poster stays local so the frame paints before any stream request.
export const homeR2 = {
  src: "https://hero-video-proxy.albertolivecorbella.workers.dev/hls/ae741609baa4356b787a2a75b2d5f8ef987a64d0392bb976966c8e0eb2231da5/master.m3u8",
  poster: "/images/hero-poster.jpg",
} as const;

// The home hero is an always-on "live" surface (Albert, 2026-09-15): it must
// look the same on every device and from the first fragment. Both constants are
// policy switches, not tuning knobs.
//
// HERO_HONORS_REDUCED_MOTION: false keeps the hero playing for visitors whose
// device asks for reduced motion, because that request silently turned the
// hero into a poster on some devices. Set true to show the poster instead.
export const HERO_HONORS_REDUCED_MOTION = false;

// HERO_FLOOR_STEPS: how many rungs below the covering rendition adaptive
// playback may step. 0 pins the rendition that covers the frame, so the hero
// never changes quality. 1 allows one step down when measured bandwidth cannot
// sustain the pinned rung, at the cost of a visible quality change.
export const HERO_FLOOR_STEPS = 0;

// object-fit: cover must satisfy BOTH dimensions, including device pixels.
// hls.js's built-in square-size cap can choose 480p for a tall portrait frame.
export function coverLevel(
  levels: readonly { width: number; height: number }[],
  width: number,
  height: number,
  pixelRatio: number,
): number {
  let largest = -1;
  let fitting = -1;
  for (const [index, level] of levels.entries()) {
    const area = level.width * level.height;
    if (largest === -1 || area > levels[largest].width * levels[largest].height) largest = index;
    if (level.width >= width * pixelRatio && level.height >= height * pixelRatio &&
      (fitting === -1 || area < levels[fitting].width * levels[fitting].height)) fitting = index;
  }
  return fitting === -1 ? largest : fitting;
}

// Native HLS players (Safari, and Chrome on macOS) run their own adaptive
// bitrate and open on a low rendition before climbing, which is what a visitor
// sees as "the video changes quality while it plays". Reading the ladder lets
// the native path ask for the single rendition that covers the frame, with no
// ladder left to switch through.
export function parseLevels(
  master: string,
  base: string,
): { url: string; width: number; height: number }[] {
  const levels: { url: string; width: number; height: number }[] = [];
  const lines = master.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.startsWith("#EXT-X-STREAM-INF")) continue;
    const resolution = /RESOLUTION=(\d+)x(\d+)/.exec(line);
    const uri = lines.slice(index + 1).find((next) => next.trim() !== "" && !next.startsWith("#"));
    if (!resolution || !uri) continue;
    levels.push({
      url: new URL(uri.trim(), base).href,
      width: Number(resolution[1]),
      height: Number(resolution[2]),
    });
  }
  return levels;
}

// The lowest rendition adaptive playback may select, measured in whole rungs
// below the cover level. Levels are not assumed to be in bitrate order.
export function floorLevel(
  levels: readonly { width: number; height: number }[],
  cover: number,
  steps: number = HERO_FLOOR_STEPS,
): number {
  if (cover < 0) return -1;
  const area = (index: number) => levels[index].width * levels[index].height;
  let floor = cover;
  for (let step = 0; step < steps; step += 1) {
    let lower = -1;
    for (const [index] of levels.entries()) {
      if (index === floor) continue;
      if (area(index) < area(floor) && (lower === -1 || area(index) > area(lower))) lower = index;
    }
    if (lower === -1) break;
    floor = lower;
  }
  return floor;
}

