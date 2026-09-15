const ORIGIN = "https://pub-fa809756ec5949e186cf91093a3d7ce9.r2.dev";
const errorHeaders = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

const worker = {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { ...errorHeaders, Allow: "GET, HEAD" },
      });
    }
    if (!/^\/hls\/(?:[\w-]+\/)*[\w.-]+\.(?:m3u8|ts|mp4|jpg)$/.test(pathname)) {
      return new Response("Not found", { status: 404, headers: errorHeaders });
    }

    const isManifest = pathname.endsWith(".m3u8");
    // prepare-home-video.mjs gives each release a content-derived directory.
    // Legacy /hls/0/seg0.ts paths can be overwritten, so never mark them immutable.
    const immutable = !isManifest && /^\/hls\/[a-f0-9]{64}\//.test(pathname);
    const ttl = isManifest ? 30 : immutable ? 31536000 : 300;
    const headers = new Headers();
    for (const name of ["Range", "If-Range", "If-None-Match", "If-Modified-Since"]) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    let upstream;
    try {
      upstream = await fetch(`${ORIGIN}${pathname}`, {
        method: request.method,
        headers,
        cf: {
          cacheEverything: true,
          cacheTtlByStatus: { "200": ttl, "206": -1, "304": ttl, "400-599": -1 },
        },
      });
    } catch {
      return new Response("Video origin unavailable", { status: 502, headers: errorHeaders });
    }

    const response = new Response(request.method === "HEAD" ? null : upstream.body, upstream);
    const cacheable = upstream.ok || upstream.status === 304;
    response.headers.set("Cache-Control", cacheable
      ? `public, max-age=${ttl}${immutable ? ", immutable" : ""}`
      : "no-store");
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, ETag");
    return response;
  },
};

export default worker;
