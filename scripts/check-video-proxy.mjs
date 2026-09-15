import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../workers/video-proxy/src/index.js";

const host = "https://video.test";
const version = "a".repeat(64);

for (const status of [404, 503]) {
  test(`${status} responses cannot be cached as video`, async (t) => {
    t.mock.method(globalThis, "fetch", async () => new Response("unavailable", { status }));
    const response = await worker.fetch(new Request(`${host}/hls/0/missing.ts`));
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
  });
}

test("only versioned segments are immutable", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    return new Response("media", { headers: { "content-type": "video/mp2t" } });
  });
  for (const [path, caching] of [
    ["/hls/0/seg0.ts", "public, max-age=300"],
    [`/hls/${version}/1080/seg0.ts`, "public, max-age=31536000, immutable"],
    [`/hls/${version}/master.m3u8`, "public, max-age=30"],
  ]) {
    const response = await worker.fetch(new Request(host + path));
    assert.equal(response.headers.get("cache-control"), caching);
    assert.equal(await response.text(), "media");
  }
  assert.equal(requests[0].options.cf.cacheTtlByStatus["400-599"], -1);
});

test("HEAD and Range reach R2 without forwarding visitor credentials", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    return options.method === "HEAD"
      ? new Response(null, { headers: { "content-length": "100" } })
      : new Response("part", { status: 206, headers: { "content-range": "bytes 0-3/100" } });
  });
  const head = await worker.fetch(new Request(`${host}/hls/0/seg0.ts`, { method: "HEAD" }));
  assert.equal(await head.text(), "");
  assert.equal(requests[0].options.method, "HEAD");
  const partial = await worker.fetch(new Request(`${host}/hls/0/seg0.ts`, { headers: { Range: "bytes=0-3", Cookie: "private=value" } }));
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get("content-range"), "bytes 0-3/100");
  assert.equal(requests[1].options.headers.get("range"), "bytes=0-3");
  assert.equal(requests[1].options.headers.has("cookie"), false);
});

test("invalid paths and methods do not fetch R2", async (t) => {
  t.mock.method(globalThis, "fetch", () => { throw new Error("unexpected upstream request"); });
  const post = await worker.fetch(new Request(`${host}/hls/master.m3u8`, { method: "POST" }));
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
  assert.equal((await worker.fetch(new Request(`${host}/other-file`))).status, 404);
});

test("R2 connection errors return an uncached gateway error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("network failure"); });
  const response = await worker.fetch(new Request(`${host}/hls/master.m3u8`));
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
