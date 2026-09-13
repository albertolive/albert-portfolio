// Shared typed video configuration (plan Phase 2.1): source, poster,
// role, fallback, and motion policy in one place so pages don't hardcode
// media props. Measured 2026-09-13: public/video/about.webm is 630,799 B;
// no MP4 variants exist in public/, so the about config is WebM-only and
// the <video> renders a second <source> automatically when one is added.

export type VideoRole = "meaningful" | "decorative";

export type VideoSource = {
  src: string;
  type: string;
};

export type VideoConfig = {
  sources: VideoSource[];
  poster?: string;
  role: VideoRole;
  preload: "metadata" | "none" | "auto";
  loop: boolean;
};

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// About background: decorative layer behind readable content, own-hosted.
export const aboutVideo: VideoConfig = {
  sources: [{ src: "/video/about.webm", type: "video/webm" }],
  poster: "/images/about-poster.webp",
  role: "decorative",
  preload: "metadata",
  loop: true,
};

// Homepage: meaningful content delivered via Cloudflare Stream (adaptive).
// Preserved per plan Phase 2.6: measurements have not proven native
// delivery insufficient, so no native switch.
export const homeStream = {
  role: "meaningful" as VideoRole,
  embedUrl:
    "https://customer-r2fmo0h2bms2itla.cloudflarestream.com/6c867869f199be1a7e96b65435fd6293/iframe?loop=true&autoplay=true&muted=true&poster=https%3A%2F%2Fcustomer-r2fmo0h2bms2itla.cloudflarestream.com%2F6c867869f199be1a7e96b65435fd6293%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600&controls=false",
  title: "Montseny landscape background",
} as const;
