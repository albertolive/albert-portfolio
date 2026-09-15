import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium, webkit } from "playwright";
import { readFileSync, readdirSync } from "node:fs";

const chunks = new URL("../.next/static/chunks/", import.meta.url);
const hlsChunks = new Set(readdirSync(chunks).filter(name => name.endsWith(".js") && readFileSync(new URL(name, chunks), "utf8").includes("hlsFragBuffered")));
assert.ok(hlsChunks.size > 0, "run npm run build before the browser checks");
const isPlayer = url => hlsChunks.has(new URL(url).pathname.split("/").at(-1));
const base = process.env.PORTFOLIO_BASE_URL ?? "http://localhost:3100";
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

test("reduced motion loads neither HLS media nor the HLS player", async () => {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const media = [];
  page.on("request", request => { if (request.url().includes("workers.dev") || isPlayer(request.url())) media.push(request.url()); });
  try {
    await page.goto(base);
    await page.waitForTimeout(750);
    assert.deepEqual(media, []);
    assert.equal(await page.locator("video").evaluate(v => v.paused && !v.getAttribute("src")), true);
    assert.equal(await page.getByRole("button", { name: /video/i }).count(), 0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(() => document.querySelector("video").currentTime > 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => document.querySelector("video").paused && !document.querySelector("video").getAttribute("src"));
  } finally { await page.close(); }
});

test("real HLS plays without CSS blur, pause sticks, and navigation cleans up", async () => {
  const page = await browser.newPage();
  const errors = [];
  const players = [];
  page.on("request", request => { if (isPlayer(request.url())) players.push(request.url()); });
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector("video").currentTime > 1);
    if (await page.locator("video").evaluate(v => v.canPlayType("application/vnd.apple.mpegurl"))) assert.deepEqual(players, [], "native HLS must not download hls.js");
    assert.equal(await page.locator("video").evaluate(v => getComputedStyle(v).filter), "none");
    await page.getByRole("button", { name: "Pause video", exact: true }).click();
    const time = await page.locator("video").evaluate(v => v.currentTime);
    await page.waitForTimeout(1500);
    assert.equal(await page.locator("video").evaluate(v => v.currentTime), time);
    await page.getByRole("button", { name: "Play video", exact: true }).click();
    await page.waitForFunction(time => document.querySelector("video").currentTime > time + 0.2, time);
    await page.getByRole("button", { name: "Pause video", exact: true }).click();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !document.querySelector("video").getAttribute("src"));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    assert.equal(await page.locator("video").evaluate(v => v.paused), true);
    await page.getByRole("button", { name: "Play video", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("video").currentTime > 0.2);
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

test("blocked autoplay has a working explicit play button", async () => {
  const page = await browser.newPage();
  try {
    await page.addInitScript(() => {
      const play = HTMLMediaElement.prototype.play;
      let allowed = false;
      document.addEventListener("click", event => {
        if (event.isTrusted && event.target instanceof Element && event.target.closest("button")) allowed = true;
      }, true);
      HTMLMediaElement.prototype.play = function () {
        if (!allowed) return Promise.reject(new DOMException("Blocked", "NotAllowedError"));
        return play.call(this);
      };
    });
    await page.goto(base);
    await page.getByRole("button", { name: "Play video", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("video").currentTime > 0);
  } finally { await page.close(); }
});

test("a late HLS import cannot restart video after reduced motion", async () => {
  const page = await browser.newPage();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let requested;
  const started = new Promise(resolve => { requested = resolve; });
  try {
    // Exercise the asynchronous JS-player path even in browsers with native HLS.
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
    await page.emulateMedia({ reducedMotion: "reduce" });
    release();
    await page.waitForTimeout(500);
    assert.equal(await page.locator("video").evaluate(v => v.paused && !v.getAttribute("src")), true);
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
