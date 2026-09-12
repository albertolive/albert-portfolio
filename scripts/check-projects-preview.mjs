#!/usr/bin/env node
/**
 * Browser checks for the /projects hover-play previews and section nav.
 *
 *   npm run build && npm run start -- --port 3100
 *   node scripts/check-projects-preview.mjs [url]
 *
 * Defaults to http://localhost:3100/projects. Prints PASS/FAIL per assertion
 * and exits 1 if any of them fail.
 */

import assert from "node:assert/strict";
import { PROJECTS, assetNames, loadPlaywright, resolveChromiumExecutable } from "./capture-previews.mjs";

const URL_UNDER_TEST = process.argv[2] ?? "http://localhost:3100/projects";

/* Expected card order and links (content/projects.ts). */
const EXPECTED = [
  { title: "esdeveniments.cat", href: "https://esdeveniments.cat" },
  { title: "eltempsavui.cat", href: "https://eltempsavui.cat" },
  { title: "culturacardedeu.com", href: "https://culturacardedeu.com" },
  { title: "nowcast-cardedeu", href: "https://github.com/albertolive/nowcast-cardedeu" },
  { title: "moveflow.app", href: "https://moveflow.app" },
  {
    title: "Breathing Timer",
    href: "https://apps.garmin.com/apps/59828c15-7638-4e14-b871-47f0ce0c66f0",
  },
];

const bySlug = new Map(PROJECTS.map((p) => [p.slug, p]));
const expectedSections = (slug) => {
  const project = bySlug.get(slug);
  return { project, sections: project.sections.map((s) => ({ label: s.label, ...assetNames(project, s) })) };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The page sets `scroll-behavior: smooth` for anchor navigation, which makes
 * element coordinates stale while a scroll animates. The checks position the
 * pointer by coordinates, so they disable the animation first.
 */
async function openChecked(page) {
  await page.goto(URL_UNDER_TEST, { waitUntil: "load", timeout: 60_000 });
  await page.addStyleTag({ content: "html{scroll-behavior:auto !important}" });
  await page.evaluate(() => window.scrollTo(0, 0));
}

/**
 * Parks the pointer over the fixed site nav (top of the viewport), where no
 * card can be `:hover`, and verifies that no card is hovered afterwards.
 */
async function parkPointer(page) {
  const size = page.viewportSize();
  await page.mouse.move(size.width / 2, 6, { steps: 2 });
  await sleep(120);
  const hovered = await page.evaluate(() => document.querySelectorAll('main li[class*="card"]:hover').length);
  assert.equal(hovered, 0, "pointer is still over a card after parking it");
}

async function scrollCardIntoView(page, index) {
  await page.evaluate((i) => {
    const card = document.querySelectorAll('main li[class*="card"]')[i];
    card.scrollIntoView({ block: "center", behavior: "instant" });
  }, index);
  await sleep(120);
}

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    results.push({ name, ok: false, message: error.message });
    console.log(`FAIL  ${name} — ${error.message.split("\n")[0]}`);
  }
}

const CARD_VIDEO = 'main li[class*="card"] video';

const videoState = (page, index) =>
  page.evaluate(
    (i) => {
      const card = document.querySelectorAll('main li[class*="card"]')[i];
      const video = card.querySelector("video");
      return {
        paused: video.paused,
        currentTime: video.currentTime,
        src: video.getAttribute("src"),
        dataSrc: video.getAttribute("data-src"),
        poster: video.getAttribute("poster"),
        preload: video.preload,
        playing: !video.paused && video.currentTime > 0,
      };
    },
    index,
  );

/** Hover a card and measure how long the card takes to actually play. */
async function hoverAndMeasure(page, index) {
  await page.evaluate((i) => {
    const card = document.querySelectorAll('main li[class*="card"]')[i];
    window.__probe = { elapsed: -1 };
    card.addEventListener(
      "pointerenter",
      () => {
        const start = performance.now();
        const video = card.querySelector("video");
        const tick = () => {
          if (!video.paused && video.currentTime > 0) {
            window.__probe.elapsed = performance.now() - start;
            return;
          }
          if (performance.now() - start < 3000) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { once: true },
    );
  }, index);
  await scrollCardIntoView(page, index);
  const box = await page.evaluate(
    (i) => {
      const card = document.querySelectorAll('main li[class*="card"]')[i];
      const media = card.querySelector('[class*="imageWrap"]').getBoundingClientRect();
      return { x: media.x, y: media.y, width: media.width, height: media.height };
    },
    index,
  );
  // Middle of the media box: over the poster, clear of the section strip.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  const elapsed = await page
    .evaluate(async () => {
      const deadline = performance.now() + 3000;
      while (window.__probe.elapsed < 0 && performance.now() < deadline) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      return window.__probe.elapsed;
    })
    .catch(() => -1);
  return elapsed;
}

async function main() {
  const { pw, via } = await loadPlaywright();
  const executablePath = await resolveChromiumExecutable();
  console.log(`playwright: ${via}`);
  console.log(`url:        ${URL_UNDER_TEST}\n`);

  const browser = await pw.chromium.launch({ headless: true, executablePath: executablePath ?? undefined });

  /* ------------------------------------------------ desktop: order, hover */
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await openChecked(page);

  await check("six cards in the required order", async () => {
    const cards = await page.evaluate(() =>
      [...document.querySelectorAll('main li[class*="card"]')].map((li) => ({
        title: li.querySelector('[class*="cardTitle"]').textContent.trim(),
        href: li.querySelector("a").getAttribute("href"),
      })),
    );
    assert.equal(cards.length, 6, `found ${cards.length} cards`);
    assert.deepEqual(cards, EXPECTED);
    return cards.map((c) => c.title).join(" → ");
  });

  await check("previews carry no raw poster URL and fetch no clip up front", async () => {
    const previews = await page.evaluate(
      (selector) =>
        [...document.querySelectorAll(selector)].map((v) => ({
          src: v.getAttribute("src"),
          dataSrc: v.getAttribute("data-src"),
          muted: v.muted,
          loop: v.loop,
          playsInline: v.playsInline,
          preload: v.preload,
          poster: v.getAttribute("poster"),
        })),
      CARD_VIDEO,
    );
    assert.equal(previews.length, 6);
    assert.ok(previews.every((v) => !v.src), "no clip is fetched before it is needed");
    assert.ok(
      previews.every((v) => v.poster === null),
      `a poster attribute would bypass next/image and fetch the full-size PNG: ${JSON.stringify(previews.map((v) => v.poster))}`,
    );
    assert.ok(
      previews.every(
        (v) =>
          v.dataSrc?.startsWith("/video/projects/") &&
          v.dataSrc.endsWith(".webm") &&
          v.muted &&
          v.loop &&
          v.playsInline &&
          v.preload === "none",
      ),
      JSON.stringify(previews),
    );
    return "preload=none, local webm, no poster attribute, muted/loop/playsinline";
  });

  await check("first load requests no raw /images/projects/ asset", async () => {
    const raw = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((e) => new URL(e.name).pathname)
        .filter((path) => path.startsWith("/images/projects/")),
    );
    assert.deepEqual(raw, [], `raw poster paths fetched: ${raw.join(", ")}`);
    const stills = await page.evaluate(
      (selector) =>
        [...document.querySelectorAll(selector)].map((v) => v.parentElement.querySelector("img")?.getAttribute("src")),
      CARD_VIDEO,
    );
    assert.equal(stills.length, 6);
    assert.ok(
      stills.every((src) => src?.startsWith("/_next/image?")),
      `every still must go through next/image: ${JSON.stringify(stills)}`,
    );
    return "0 raw PNG requests, 6 optimised stills";
  });

  await check("hover starts playback within 200 ms (cold start reported)", async () => {
    // First hover of the session: the clip has never been fetched, so the
    // browser still has to run its media pipeline. That number is reported and
    // bounded loosely; the 200 ms budget is asserted on the next hover, which
    // is what a visitor sees while moving across the cards.
    const cold = await hoverAndMeasure(page, 0);
    const coldState = await videoState(page, 0);
    assert.ok(coldState.playing, `video did not start (paused=${coldState.paused}, currentTime=${coldState.currentTime})`);
    assert.ok(cold >= 0 && cold <= 1000, `cold start took ${cold.toFixed(0)} ms`);
    await parkPointer(page);
    await sleep(200);
    const warm = await hoverAndMeasure(page, 0);
    const state = await videoState(page, 0);
    assert.ok(state.playing, `video did not start on the second hover (paused=${state.paused})`);
    assert.ok(warm >= 0 && warm <= 200, `warm hover took ${warm.toFixed(0)} ms`);
    return `cold ${cold.toFixed(0)} ms, warm ${warm.toFixed(0)} ms, src=${state.src}`;
  });

  await check("leaving pauses and rewinds to the start", async () => {
    // Chromium settles a rewound clip on its first frame, so currentTime reads
    // one frame (1/25 s) rather than exactly 0. Anything above that means the
    // clip kept its position.
    const FRAME = 1 / 25 + 0.01;
    await parkPointer(page);
    const deadline = Date.now() + 1000;
    let state = await videoState(page, 0);
    while (Date.now() < deadline && (state.playing || state.currentTime > FRAME)) {
      await sleep(50);
      state = await videoState(page, 0);
    }
    assert.equal(state.paused, true, "video is still playing");
    assert.ok(state.currentTime <= FRAME, `currentTime=${state.currentTime.toFixed(3)}s (more than one frame)`);
    return `paused, currentTime=${state.currentTime.toFixed(3)}s (first frame)`;
  });

  await check("hovering a second card leaves only one playing", async () => {
    const elapsed = await hoverAndMeasure(page, 1);
    const second = await videoState(page, 1);
    const first = await videoState(page, 0);
    assert.ok(second.playing, `second card did not play (${elapsed} ms)`);
    assert.equal(first.paused, true, "first card is still playing");
    assert.ok(first.currentTime <= 1 / 25 + 0.01, `first card was not rewound (currentTime=${first.currentTime.toFixed(3)}s)`);
    return `card 2 playing after ${elapsed.toFixed(0)} ms, card 1 paused at ${first.currentTime.toFixed(3)}s (first frame)`;
  });

  await check("keyboard focus starts playback, moving focus away resets it", async () => {
    await parkPointer(page);
    await sleep(150);
    const cardIndexOf = () =>
      page.evaluate(() => {
        const cards = [...document.querySelectorAll('main li[class*="card"]')];
        return cards.findIndex((card) => card.contains(document.activeElement));
      });
    let landed = -1;
    for (let i = 0; i < 80 && landed < 0; i += 1) {
      await page.keyboard.press("Tab");
      landed = await cardIndexOf();
    }
    assert.ok(landed >= 0, "tabbing through the page never reached a project card");
    const started = Date.now();
    let state = await videoState(page, landed);
    while (Date.now() - started < 1500 && !state.playing) {
      await sleep(40);
      state = await videoState(page, landed);
    }
    assert.ok(state.playing, `card ${landed} did not play when it received keyboard focus`);

    let left = false;
    for (let i = 0; i < 12 && !left; i += 1) {
      await page.keyboard.press("Tab");
      left = (await cardIndexOf()) !== landed;
    }
    assert.ok(left, "focus never moved off the card");
    const deadline = Date.now() + 1000;
    state = await videoState(page, landed);
    while (Date.now() < deadline && (state.playing || state.currentTime !== 0)) {
      await sleep(40);
      state = await videoState(page, landed);
    }
    assert.equal(state.paused, true, "leaving the card did not pause playback");
    assert.ok(state.currentTime <= 1 / 25 + 0.01, `leaving the card did not rewind (currentTime=${state.currentTime.toFixed(3)}s)`);
    return `card ${landed} played on Tab focus, paused and rewound when focus moved on`;
  });

  await check("esdeveniments section buttons swap the clip", async () => {
    const { sections } = expectedSections("esdeveniments");
    const cardIndex = EXPECTED.findIndex((e) => e.title === "esdeveniments.cat");
    const card = page.locator('main li[class*="card"]').nth(cardIndex);
    const buttons = card.locator('[class*="sectionButton"]');
    assert.equal(await buttons.count(), sections.length, "section button count");
    const labels = await buttons.allTextContents();
    assert.deepEqual(
      labels.map((l) => l.trim()),
      sections.map((s) => s.label),
    );
    const seen = [];
    for (const [i, section] of sections.entries()) {
      await buttons.nth(i).hover();
      await sleep(200);
      const state = await videoState(page, cardIndex);
      assert.equal(state.src, section.video, `"${section.label}" should preview ${section.video}, got ${state.src}`);
      const pressed = await buttons.nth(i).getAttribute("aria-pressed");
      assert.equal(pressed, "true", `"${section.label}" is not marked aria-pressed`);
      seen.push(`${section.label}→${state.src.split("/").pop()}`);
    }
    const url = page.url();
    assert.equal(url, URL_UNDER_TEST, "hovering a section button navigated the page");
    return seen.join(", ");
  });

  await check("only one preview plays at a time with sections involved", async () => {
    const playing = await page.evaluate(
      (selector) => [...document.querySelectorAll(selector)].filter((v) => !v.paused && v.currentTime > 0).length,
      CARD_VIDEO,
    );
    assert.equal(playing, 1, `${playing} videos playing at once`);
    return "1 of 6 playing";
  });

  await check("no Google ad element is present in the portfolio page", async () => {
    const offenders = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll("iframe, ins, script, link, img, a")];
      return nodes
        .map((el) => `${el.tagName}:${el.getAttribute("src") || el.getAttribute("href") || ""}`)
        .filter((sig) => /googlesyndication|doubleclick|googleads|adsbygoogle/i.test(sig))
        .filter((sig) => {
          const el = [...document.querySelectorAll("iframe, ins, script, link, img, a")].find(
            (n) => `${n.tagName}:${n.getAttribute("src") || n.getAttribute("href") || ""}` === sig,
          );
          const rect = el.getBoundingClientRect();
          return rect.width > 1 && rect.height > 1;
        });
    });
    assert.deepEqual(offenders, [], `visible ad elements: ${offenders.join(", ")}`);
    const iframes = await page.evaluate(() => document.querySelectorAll("iframe").length);
    assert.equal(iframes, 0, `${iframes} iframe(s) on the page`);
    return "0 ad elements, 0 iframes";
  });

  await check("no console errors on /projects", async () => {
    const relevant = consoleErrors.filter((text) => !/favicon|Download the React DevTools/i.test(text));
    assert.deepEqual(relevant, []);
    return "clean console";
  });

  await desktop.close();

  /* ------------------------------------------------------------- touch */
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobile = await touch.newPage();
  await openChecked(mobile);

  await check("touch: no autoplay, labelled tap-to-play control, 44px targets", async () => {
    const media = await mobile.evaluate(() => ({
      hoverNone: matchMedia("(hover: none), (pointer: coarse)").matches,
      autoplaying: [...document.querySelectorAll('main li[class*="card"] video')].filter((v) => !v.paused).length,
      withSrc: [...document.querySelectorAll('main li[class*="card"] video')].filter((v) => v.getAttribute("src")).length,
    }));
    assert.equal(media.hoverNone, true, "coarse-pointer media query did not match");
    assert.equal(media.autoplaying, 0, `${media.autoplaying} video(s) autoplayed on touch`);
    assert.equal(media.withSrc, 0, "a clip was fetched before the visitor asked for it");

    const button = mobile.locator('[class*="previewPlay"]').first();
    assert.equal(await button.isVisible(), true, "tap-to-play control is not visible");
    const label = (await button.textContent()).trim();
    assert.equal(label, "Play preview", `control label is "${label}"`);
    const box = await button.boundingBox();
    assert.ok(box.height >= 44, `play control is ${box.height.toFixed(0)}px tall`);
    const sectionBox = await mobile.locator('[class*="sectionButton"]').first().boundingBox();
    assert.ok(sectionBox.height >= 44, `section button is ${sectionBox.height.toFixed(0)}px tall`);
    return `label "${label}", ${box.height.toFixed(0)}px / ${sectionBox.height.toFixed(0)}px targets`;
  });

  await check("touch: tapping play starts the clip, the card link still opens the site", async () => {
    const href = await mobile.evaluate(() => document.querySelectorAll('main li[class*="card"] a')[0].getAttribute("href"));
    await scrollCardIntoView(mobile, 0);
    await mobile.locator('[class*="previewPlay"]').first().tap();
    assert.equal(mobile.url(), URL_UNDER_TEST, "tapping the control navigated instead of playing");
    const deadline = Date.now() + 3000;
    let state = await videoState(mobile, 0);
    while (Date.now() < deadline && !state.playing) {
      await sleep(60);
      state = await videoState(mobile, 0);
    }
    assert.ok(state.playing, `tap did not start playback (paused=${state.paused}, currentTime=${state.currentTime}, src=${state.src})`);
    assert.ok(href?.startsWith("http"), "card link missing");
    const label = (await mobile.locator('[class*="previewPlay"]').first().textContent()).trim();
    assert.equal(label, "Pause preview", `control did not switch to pause ("${label}")`);
    await mobile.locator('[class*="previewPlay"]').first().tap();
    await sleep(200);
    const after = await videoState(mobile, 0);
    assert.equal(after.paused, true, "second tap did not pause");
    return "tap plays and pauses, no navigation";
  });

  await check("touch: a section tap swaps the source without playing", async () => {
    const { sections } = expectedSections("esdeveniments");
    const card = mobile.locator('main li[class*="card"]').first();
    const buttons = card.locator('[class*="sectionButton"]');
    await buttons.nth(1).tap();
    await sleep(250);
    const state = await videoState(mobile, 0);
    assert.equal(state.src, sections[1].video, `source is ${state.src}`);
    assert.equal(state.paused, true, "a section tap started playback");
    return `poster/clip switched to ${sections[1].label}, still paused`;
  });

  await touch.close();

  /* --------------------------------------------------- reduced motion */
  const reduced = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const still = await reduced.newPage();
  await openChecked(still);

  await check("reduced motion: nothing plays, no clip is fetched", async () => {
    await hoverAndMeasure(still, 0).catch(() => -1);
    await still.evaluate(() => document.querySelectorAll('main li[class*="card"] a')[1].focus());
    await sleep(600);
    const state = await still.evaluate(
      (selector) => ({
        videos: [...document.querySelectorAll(selector)].map((v) => ({
          paused: v.paused,
          currentTime: v.currentTime,
          src: v.getAttribute("src"),
          hidden: getComputedStyle(v).display === "none",
        })),
        playVisible: [...document.querySelectorAll('[class*="previewPlay"]')].some((b) => b.offsetParent !== null),
      }),
      CARD_VIDEO,
    );
    assert.ok(state.videos.every((v) => v.paused && v.currentTime === 0 && !v.src), JSON.stringify(state.videos));
    assert.equal(state.playVisible, false, "the play control is visible under reduced motion");
    return "6 posters only, playback never starts";
  });

  await check("reduced motion: section buttons swap the poster only", async () => {
    const { sections } = expectedSections("esdeveniments");
    const card = still.locator('main li[class*="card"]').first();
    await scrollCardIntoView(still, 0);
    const before = await card.locator("img").first().getAttribute("src");
    await card.locator('[class*="sectionButton"]').nth(1).click();
    await sleep(300);
    const after = await card.locator("img").first().getAttribute("src");
    assert.notEqual(after, before, `poster did not change (before=${before}, after=${after})`);
    assert.ok(
      typeof after === "string" && after.includes(sections[1].poster.split("/").pop().replace(".png", "")),
      `poster is ${after}`,
    );
    const state = await videoState(still, 0);
    assert.ok(!state.src && state.paused, "a clip loaded under reduced motion");
    return `poster ${before?.split("/").pop()} → ${after.split("/").pop()}`;
  });

  await reduced.close();
  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log(`failed: ${failed.map((f) => f.name).join("; ")}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
