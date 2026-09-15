import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium, webkit } from "playwright";
import { readFileSync, readdirSync } from "node:fs";

const chunks = new URL("../.next/static/chunks/", import.meta.url);
const hlsChunks = new Set(readdirSync(chunks).filter(name => name.endsWith(".js") && readFileSync(new URL(name, chunks), "utf8").includes("hlsFragBuffered")));
assert.ok(hlsChunks.size > 0, "run npm run build before the browser checks");
const isPlayer = url => hlsChunks.has(new URL(url).pathname.split("/").at(-1));
const base = process.env.PORTFOLIO_BASE_URL ?? "http://localhost:3100";
const isSegment = url => /\/hls\/[a-f0-9]{64}\/\d+\/seg\d+\.ts$/.test(new URL(url).pathname);
const rung = url => new URL(url).pathname.split("/").at(-2);
let browser;
before(async () => { browser = await (process.env.PORTFOLIO_BROWSER === "webkit" ? webkit : chromium).launch(); });
after(async () => { await browser?.close(); });

test("hero covers every viewport, including no-JS mobile", async () => {
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 740]]) {
    const page = await browser.newPage({ viewport: { width, height }, javaScriptEnabled: false });
    try {
      await page.goto(base);
      const size = await page.evaluate(() => {
        const video = document.querySelector("video");
        const frame = document.querySelector("main");
        return { video: video.getBoundingClientRect().toJSON(), frame: frame.getBoundingClientRect().toJSON(), fit: getComputedStyle(video).objectFit, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(size.fit, "cover");
      assert.ok(Math.abs(size.video.height - size.frame.height) < 1, `${width}: video fills frame height`);
      assert.ok(Math.abs(size.video.width - size.frame.width) < 1, `${width}: video fills frame width`);
      assert.equal(size.overflow, false);
    } finally { await page.close(); }
  }
});

test("the hero autoplays for visitors who asked for reduced motion", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const media = [];
  page.on("request", request => { if (request.url().includes("workers.dev") || isPlayer(request.url())) media.push(request.url()); });
  try {
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector("video").currentTime > 0.4);
    assert.ok(media.length > 0, "reduced motion still loads and plays the hero stream");
    assert.equal(await page.getByRole("button", { name: /video/i }).count(), 0, "the hero has no pause control");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(250);
    assert.equal(await page.locator("video").evaluate(v => v.paused), false, "changing the preference does not unload the stream");
    assert.notEqual(await page.locator("video").evaluate(v => v.dataset.state), "reduced-motion");
  } finally { await page.close(); }
});

test("native HLS plays only the rendition that covers the frame", async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const segments = [];
  const players = [];
  page.on("request", request => {
    if (isSegment(request.url())) segments.push(rung(request.url()));
    if (isPlayer(request.url())) players.push(request.url());
  });
  try {
    await page.goto(base);
    if (!await page.locator("video").evaluate(v => v.canPlayType("application/vnd.apple.mpegurl"))) return;
    assert.deepEqual(players, [], "native HLS must not download hls.js");
    assert.equal(await page.locator("video").evaluate(v => getComputedStyle(v).filter), "none", "no CSS blur is involved");
    // The platform player can only stay on one rung when it is given one rung.
    await page.waitForFunction(() => document.querySelector("video").currentTime > 8);
    assert.deepEqual([...new Set(segments)], ["1080"], `only the covering rendition is fetched, got ${[...new Set(segments)].join(", ")}`);
    assert.equal(await page.locator("video").evaluate(v => v.videoWidth), 1920, "native playback decodes the pinned rendition");
    assert.match(await page.locator("video").evaluate(v => v.currentSrc), /\/1080\/index\.m3u8$/, "the element points at the variant playlist, not the master");
  } finally { await page.close(); }
});

test("hls.js pins the covering rendition on the first fragment", async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const segments = [];
  let master = false;
  page.on("request", request => {
    if (isSegment(request.url())) segments.push(rung(request.url()));
    if (request.url().endsWith("/master.m3u8")) master = true;
  });
  try {
    await page.addInitScript(() => {
      const canPlayType = HTMLMediaElement.prototype.canPlayType;
      HTMLMediaElement.prototype.canPlayType = function (type) {
        return type.includes("mpegurl") ? "" : canPlayType.call(this, type);
      };
    });
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector("video").currentTime > 5);
    assert.equal(master, true, "the JS player drives from the master ladder");
    assert.deepEqual([...new Set(segments)], ["1080"], `only the covering rendition is fetched, got ${[...new Set(segments)].join(", ")}`);
    assert.equal(await page.locator("video").evaluate(v => v.videoWidth), 1920, "the first decoded frame is the pinned rendition");
  } finally { await page.close(); }
});

test("navigation unloads the hero and returning starts it again", async () => {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector("video").currentTime > 0.5);
    await page.evaluate(() => { window.previousVideo = document.querySelector("video"); });
    await page.locator('nav a[href="/about"]').click();
    await page.waitForURL(`${base}/about`);
    await page.waitForFunction(() => window.previousVideo.paused && !window.previousVideo.getAttribute("src"));
    await page.locator('nav a[href="/"]').first().click();
    await page.waitForURL(`${base}/`);
    await page.waitForFunction(() => document.querySelector("video").currentTime > 0);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test("backgrounding pauses playback and the loop restarts at the end", async () => {
  const page = await browser.newPage();
  try {
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector("video").currentTime > 0);
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    assert.equal(await page.locator("video").evaluate(v => v.paused), true);
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForFunction(() => !document.querySelector("video").paused);
    await page.locator("video").evaluate(v => { v.currentTime = v.duration - 0.4; });
    await page.waitForFunction(() => { const v = document.querySelector("video"); return v.currentTime < 2 && !v.paused; });
  } finally { await page.close(); }
});

test("autoplay refused before a gesture resumes on the first tap", async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      let granted = false;
      document.addEventListener("pointerdown", event => { if (event.isTrusted) granted = true; }, true);
      HTMLMediaElement.prototype.play = function () {
        if (!granted) return Promise.reject(new DOMException("Blocked", "NotAllowedError"));
        return play.call(this);
      };
    });
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector("video").dataset.state === "blocked");
    assert.equal(await page.locator("video").evaluate(v => getComputedStyle(v).opacity), "0", "the poster stays up while playback is refused");
    await page.mouse.click(640, 400);
    await page.waitForFunction(() => document.querySelector("video").currentTime > 0);
  } finally { await page.close(); }
});

test("a late player import cannot attach after the page is left", async () => {
  const page = await browser.newPage();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let requested;
  const started = new Promise(resolve => { requested = resolve; });
  const media = [];
  try {
    // Exercise the asynchronous player path in browsers with native HLS too.
    await page.addInitScript(() => {
      const canPlayType = HTMLMediaElement.prototype.canPlayType;
      HTMLMediaElement.prototype.canPlayType = function (type) {
        return type.includes("mpegurl") ? "" : canPlayType.call(this, type);
      };
    });
    await page.route("**/*.js", async route => {
      if (isPlayer(route.request().url())) { requested(); await gate; }
      await route.continue();
    });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await started;
    await page.locator('nav a[href="/about"]').click();
    await page.waitForURL(`${base}/about`);
    page.on("request", request => { if (request.url().includes("workers.dev")) media.push(request.url()); });
    release();
    await page.waitForTimeout(500);
    assert.deepEqual(media, [], "a player created after navigation must not load the stream");
  } finally { release(); await page.close(); }
});

test("failed HLS keeps the poster instead of a broken video", async () => {
  const page = await browser.newPage();
  try {
    await page.route("**/hls/**", route => route.fulfill({ status: 404, body: "missing" }));
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector("video").dataset.state === "error");
    assert.equal(await page.locator("video").evaluate(v => getComputedStyle(v).opacity), "0");
    assert.equal(await page.locator("video").evaluate(v => getComputedStyle(v.parentElement).backgroundImage.includes("hero-poster.jpg")), true);
  } finally { await page.close(); }
});
