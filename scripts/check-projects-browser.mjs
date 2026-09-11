import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Run against `npm run start -- --port 3100` with agent-browser installed.
const url = process.argv[2] ?? "http://localhost:3100/projects";
const session = `projects-check-${process.pid}`;
function browser(...args) {
  const output = execFileSync("agent-browser", ["--session", session, "--json", ...args], { encoding: "utf8", timeout: 30_000 });
  const result = JSON.parse(output);
  assert.equal(result.success, true, result.error);
  return result.data;
}
function evaluate(source) {
  return browser("eval", source).result;
}
const setup = `
  const board = document.querySelector('ul[aria-label="Technology skills"]');
  const pills = [...board.querySelectorAll('button')];
  const positions = () => pills.map(p => { const m = new DOMMatrix(getComputedStyle(p).transform); return { x: m.m41, y: m.m42 }; });
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const control = name => [...document.querySelectorAll('button')].find(p => p.textContent === name);
`;
function checkBoard() {
  const result = evaluate(`(async () => { ${setup}
    let frames = 0;
    let done = false;
    const tick = () => { frames++; if (!done) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    await wait(5000);
    done = true;
    const bounds = board.getBoundingClientRect();
    return { frames, viewport: [innerWidth, innerHeight], active: board.dataset.active, visible: document.visibilityState, first: pills[0].getBoundingClientRect().toJSON(), bounds: bounds.toJSON(), count: pills.length, height: bounds.height, overflow: document.documentElement.scrollWidth > innerWidth,
      outside: pills.filter(p => { const r = p.getBoundingClientRect(); return r.left < bounds.left - 10 || r.right > bounds.right + 10 || r.top < bounds.top - 10 || r.bottom > bounds.bottom + 10; }).map(p => p.textContent),
      small: pills.filter(p => p.offsetHeight < 44).map(p => p.textContent) };
  })()`);
  assert.equal(result.count, 24);
  assert.ok(result.height >= 340);
  assert.equal(result.overflow, false);
  assert.deepEqual(result.outside, [], `skills must settle inside the board: ${JSON.stringify(result)}`);
  assert.deepEqual(result.small, [], "skills have 44px touch targets");
}

try {
  browser("set", "viewport", "1440", "1000");
  browser("open", url);
  browser("wait", "--fn", `document.querySelector('ul[aria-label="Technology skills"]')?.dataset.ready === 'true'`);
  checkBoard();
  const content = evaluate(`({
    sections: [...document.querySelectorAll('main h2')].map(e => e.id),
    projects: document.querySelectorAll('li[class*="card"]').length,
    publicProjects: document.querySelectorAll('li[class*="card"] > a').length,
    calendarDays: document.querySelectorAll('td[title]').length,
    summary: document.querySelector('[class*="calendarSummary"]')?.textContent,
    contact: document.querySelector('a[class*="contactLink"]').href
  })`);
  assert.deepEqual(content.sections, ["skills-title", "contributions-title", "projects-title", "contact-title"]);
  assert.equal(content.projects, 6);
  assert.equal(content.publicProjects, 5);
  assert.ok(content.calendarDays >= 300, "real calendar data must load, not just the fallback");
  assert.match(content.summary, /[\d,]+ contributions/);
  assert.equal(content.contact, "https://www.linkedin.com/in/albertolivecorbella/");

  const motion = evaluate(`(async () => { ${setup}
    control('Reset').click();
    await wait(40);
    const falling = positions();
    await wait(5000);
    const first = positions();
    control('Pause').click();
    await wait(200);
    const paused = positions();
    control('Reset').click();
    await wait(5000);
    const second = positions();
    control('Pause').click();
    const before = positions();
    const exposed = before.reduce((top, p, i) => p.y < before[top].y ? i : top, 0);
    pills[exposed].focus({preventScroll:true});
    return { falling: falling.filter(p => p.y < 0).length, paused: JSON.stringify(first) === JSON.stringify(paused), randomized: first.some((p,i) => Math.abs(p.x-second[i].x)>10), before, exposed };
  })()`);
  assert.ok(motion.falling > 12, "reset must start above the board, including sleeping bodies");
  assert.equal(motion.paused, true);
  assert.equal(motion.randomized, true);
  browser("press", "ArrowUp");
  const nudged = evaluate(`(async()=>{${setup} await wait(150); return {active:board.dataset.active, positions:positions()};})()`);
  assert.equal(nudged.active, "true");
  assert.ok(Math.abs(nudged.positions[motion.exposed].y - motion.before[motion.exposed].y) > 5, "keyboard input moves an exposed physics body");

  for (const [width, height] of [[390, 844], [320, 740], [844, 390], [1440, 1000]]) {
    browser("set", "viewport", String(width), String(height));
    // Keep the simulation visible in short landscape viewports.
    evaluate(`document.querySelector('ul[aria-label="Technology skills"]').scrollIntoView({block:'end'})`);
    checkBoard();
  }

  browser("set", "viewport", "390", "844");
  browser("open", url);
  checkBoard();
  const point = evaluate(`{${setup} const top = pills.toSorted((a,b)=>a.getBoundingClientRect().top-b.getBoundingClientRect().top)[0]; const r=top.getBoundingClientRect(); ({x:r.x+r.width/2,y:r.y+r.height/2,name:top.textContent,boardTop:board.getBoundingClientRect().top}) }`);
  browser("mouse", "move", String(Math.round(point.x)), String(Math.round(point.y)));
  browser("mouse", "down");
  browser("mouse", "move", "195", String(Math.round(point.boardTop + 65)));
  const dragged = evaluate(`(async()=>{${setup} await wait(250); const p=pills.find(p=>p.textContent===${JSON.stringify(point.name)});const r=p.getBoundingClientRect();return {y:r.y+r.height/2,focused:document.activeElement===p};})()`);
  browser("mouse", "up");
  assert.ok(Math.abs(dragged.y - (point.boardTop + 65)) < 60, "native pointer drag follows the cursor");
  assert.equal(dragged.focused, true);
  checkBoard();

  browser("click", "a[href='#projects-title']");
  const below = evaluate(`(async()=>{${setup} await wait(300);const a=positions();await wait(300); const scroll=document.querySelector('[class*="calendarScroll"]');scroll.scrollLeft=scroll.scrollWidth;return {offscreen:JSON.stringify(a)===JSON.stringify(positions()),calendarScroll:scroll.scrollLeft>0,images:[...document.querySelectorAll('li[class*="card"] img')].length};})()`);
  assert.equal(below.offscreen, true, "scrolling out of view freezes the pile");
  assert.equal(below.calendarScroll, true, "mobile calendar scrolls without widening the page");
  assert.equal(below.images, 6);
  browser("scrollintoview", "a[href='#top']");
  browser("click", "a[href='#top']");
  assert.equal(evaluate("scrollY"), 0);

  browser("set", "media", "reduced-motion");
  browser("set", "viewport", "320", "740");
  browser("open", url);
  const reduced = evaluate(`(async()=>{${setup}await wait(300);const b=board.getBoundingClientRect();return {active:board.dataset.active,play:!!control('Play'),outside:pills.filter(p=>{const r=p.getBoundingClientRect();return r.top<b.top||r.bottom>b.bottom||r.right>innerWidth;}).map(p=>p.textContent),transformed:pills.some(p=>getComputedStyle(p).transform!=='none')};})()`);
  assert.equal(reduced.active, "false");
  assert.equal(reduced.play, true);
  assert.equal(reduced.transformed, false);
  assert.deepEqual(reduced.outside, [], "static skills remain readable at 320px");
  console.log(`Browser checks passed: desktop/mobile/landscape, randomized entry, sleeping reset, pause, keyboard, pointer drag, offscreen pause, section order, real calendar, private project, contact links, reduced motion. ${content.summary}`);
} finally {
  browser("close");
}
