import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const base = process.argv[2] ?? process.env.PORTFOLIO_BASE_URL ?? "http://localhost:3100";
const browser = await (process.env.PORTFOLIO_BROWSER === "webkit" ? webkit : chromium).launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await page.goto(`${base}/about`);
  await page.evaluate(() => document.fonts.ready);

  async function pixels(clip) {
    const png = (await page.screenshot({ clip })).toString("base64");
    return page.evaluate(async (png) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return [...context.getImageData(0, 0, canvas.width, canvas.height).data].filter((_, i) => i % 4 !== 3);
    }, png);
  }

  const black = await pixels({ x: 4, y: 100, width: 8, height: 8 });
  assert.equal(Math.max(...black), 0, "background pixels must be pure black, including grain compositing");

  // A black poster is the worst case for multiply text, including blocked playback.
  await page.route("**/about-poster.webp", route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="black"/></svg>',
  }));
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  const text = await page.locator("main > p > span").first().boundingBox();
  assert.ok(text);
  const glyphs = await pixels({ x: Math.ceil(text.x), y: Math.ceil(text.y), width: Math.floor(text.width), height: Math.floor(text.height) });
  assert.ok(Math.max(...glyphs) >= 63, "white backing must keep text visible even over an all-black poster");
  assert.equal(await page.locator("video source").count(), 0, "reduced motion must not load video");
  console.log("PASS About pixel compositing: pure black background and visible text over a black poster");
} finally {
  await browser.close();
}
