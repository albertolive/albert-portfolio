export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const aboutVideo = {
  sources: [{ src: "/video/about.webm", type: "video/webm" }],
  poster: "/images/about-poster.webp",
  preload: "metadata",
  loop: true,
} as const;

// For replacements, use the versioned URL emitted by prepare-home-video.mjs.
export const homeR2 = {
  src: "https://hero-video-proxy.albertolivecorbella.workers.dev/hls/master.m3u8",
  poster: "/images/hero-poster.jpg",
} as const;

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
