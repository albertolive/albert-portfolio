import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const base = process.argv[2] ?? process.env.PORTFOLIO_BASE_URL ?? "http://localhost:3100";
const browser = await (process.env.PORTFOLIO_BROWSER === "webkit" ? webkit : chromium).launch();
try {
  const page = await browser.newPage();
  for (const route of ["/", "/about", "/experience", "/projects"]) {
    await page.goto(`${base}${route}`);
    assert.equal(await page.locator('meta[property="og:image"]').count(), 1, route);
    assert.equal(await page.locator('meta[name="twitter:image"]').count(), 1, route);
  }
  for (const [width, height] of [[1440,900],[1280,800],[768,1024],[390,844],[320,740]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/about`);
    await page.getByRole("button", { name: /^AI product engineer$/i }).click();
    await page.getByRole("button", { name: /^engineering teams$/i }).click();
    assert.equal(await page.locator('p[aria-live="polite"]').textContent(), "R 2 / 10");
    await page.getByRole("button", { name: /^AI product engineer$/i }).click();
    assert.equal(await page.locator('p[aria-live="polite"]').textContent(), "R 1 / 10");
    assert.equal(await page.locator('#about-reveal-product-engineer').getAttribute('inert'), "");
    assert.equal(await page.locator('#about-reveal-engineering-teams').getAttribute('inert'), null);
    await page.getByRole("button", { name: /^AI product engineer$/i }).click();
    assert.equal(await page.locator('p[aria-live="polite"]').textContent(), "R 2 / 10");
    await page.waitForTimeout(4500);
    const result = await page.evaluate(() => {
      const prose = document.querySelector("main > p");
      const open = document.querySelector('[id^="about-reveal-"]:not([inert])');
      return { filter: getComputedStyle(prose).filter, opacity: getComputedStyle(prose).opacity,
        openFilter: getComputedStyle(open).filter, openOpacity: getComputedStyle(open).opacity,
        animations: prose.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length,
        overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.deepEqual(result, { filter: "blur(0.25px)", opacity: "1", openFilter: "blur(0px)", openOpacity: "1", animations: 0, overflow: false });
    await page.screenshot({ path: `/tmp/about-fixed-${width}.png`, fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForTimeout(500);
  assert.equal(await page.locator("video source").count(), 0);
  assert.equal(await page.locator("video").getAttribute("autoplay"), null);
  assert.ok(await page.locator("video").evaluate(element => getComputedStyle(element.parentElement).backgroundImage.includes("about-poster.webp")));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(() => document.querySelector("video").dataset.ready === "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => document.querySelector("video").paused && !document.querySelector("video source"));
  for (const mode of ["blocked", "failed", "slow", "no-js"]) {
    const context = await browser.newContext({ javaScriptEnabled: mode !== "no-js" });
    if (mode === "blocked") await context.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("Blocked", "NotAllowedError")); });
    if (mode === "failed") await context.route("**/about.webm", route => route.abort());
    if (mode === "slow") await context.route("**/about.webm", async route => { await new Promise(resolve => setTimeout(resolve, 2000)); await route.abort(); });
    const fallback = await context.newPage();
    await fallback.goto(`${base}/about`, { waitUntil: "domcontentloaded" });
    await fallback.waitForTimeout(500);
    assert.ok(await fallback.locator("video").evaluate(element => getComputedStyle(element.parentElement).backgroundImage.includes("about-poster.webp")), mode);
    assert.equal(await fallback.locator("video").evaluate(element => getComputedStyle(element).opacity), "0", mode);
    await context.close();
  }
  console.log("PASS metadata, five viewports, settled ped.ro text blur, preserved nested reveals, motion changes, blocked/failed/slow/no-JS poster");
} finally {
  await browser.close();
}
