// Caching proxy in front of the public R2 bucket.
//
// Why: r2.dev URLs are uncached and rate-limited (dev-only). This Worker
// fetches from the bucket origin once, then serves from Cloudflare's edge
// cache via fetch() `cf` options (documented "Cache using fetch" pattern,
// incl. the HLS media example: immutable segments, short-TTL manifests).
// Runs on the free workers.dev subdomain — no custom domain needed.
// Body is streamed, never buffered (128MB Worker memory limit).

const ORIGIN = "https://pub-fa809756ec5949e186cf91093a3d7ce9.r2.dev";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    const isManifest = url.pathname.endsWith(".m3u8");

    const upstream = await fetch(`${ORIGIN}${url.pathname}`, {
      cf: {
        cacheEverything: true,
        cacheTtlByStatus: {
          // Segments are content-addressed and immutable; manifests change.
          "200-299": isManifest ? 30 : 31536000,
          "400-499": 10,
          "500-599": 0,
        },
      },
    });

    // Mutable copy: keep origin content-type, force browser caching + CORS.
    const response = new Response(upstream.body, upstream);
    response.headers.set(
      "Cache-Control",
      isManifest ? "public, max-age=30" : "public, max-age=31536000, immutable",
    );
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  },
};
