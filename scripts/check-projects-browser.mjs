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

  assert.deepEqual(evaluate(`{${setup} [...board.parentElement.querySelectorAll('button')].filter(b=>!board.contains(b)).map(b=>b.textContent) }`), [], "no playback or reset toolbar");
  const first = evaluate(`{${setup} positions() }`);
  browser("open", url);
  browser("wait", "--fn", `document.querySelector('ul[aria-label="Technology skills"]')?.dataset.ready === 'true'`);
  checkBoard();
  const second = evaluate(`{${setup} positions() }`);
  assert.ok(first.some((p,i)=>Math.abs(p.x-second[i].x)>10), "reload randomizes the pile");

  // Resizing remains the internal reset path, including for sleeping bodies.
  browser("set", "viewport", "1441", "1000");
  const falling = evaluate(`{${setup} positions().filter(p=>p.y<0).length }`);
  assert.ok(falling > 12, "resize reset must start above the board, including sleeping bodies");
  checkBoard();
  const motion = evaluate(`{${setup}
    const before = positions();
    const exposed = before.reduce((top, p, i) => p.y < before[top].y ? i : top, 0);
    pills[exposed].focus({preventScroll:true});
    ({before,exposed});
  }`);
  browser("press", "Escape");
  const paused = evaluate(`(async()=>{${setup} const before=positions();await wait(300);return {active:board.dataset.active,still:JSON.stringify(before)===JSON.stringify(positions())};})()`);
  assert.equal(paused.active, "false");
  assert.equal(paused.still, true, "Escape pauses the pile without a visible control");
  browser("press", "Space");
  assert.equal(evaluate(`document.querySelector('ul[aria-label="Technology skills"]').dataset.active`), "true");
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

  const scroll = evaluate(`(async()=>{
    const samples=[]; let watching=true;
    function sample(){samples.push(scrollY);if(watching)requestAnimationFrame(sample);}
    requestAnimationFrame(sample);
    document.querySelector('a[href="#projects-title"]').click();
    await new Promise(r=>setTimeout(r,1400)); watching=false;
    return {steps:new Set(samples).size,top:document.querySelector('#projects-title').getBoundingClientRect().top,focused:document.activeElement.id==='projects-title'};
  })()`);
  assert.ok(scroll.steps > 4, "Explore projects scrolls through intermediate positions instead of jumping");
  assert.ok(Math.abs(scroll.top-32)<2, "smooth scrolling reaches the heading");
  assert.equal(scroll.focused, true, "anchor navigation moves keyboard focus to the heading");
  const below = evaluate(`(async()=>{${setup} await wait(300);const a=positions();await wait(300); const scroll=document.querySelector('[class*="calendarScroll"]');scroll.scrollLeft=scroll.scrollWidth;return {offscreen:JSON.stringify(a)===JSON.stringify(positions()),calendarScroll:scroll.scrollLeft>0,images:[...document.querySelectorAll('li[class*="card"] img')].length};})()`);
  assert.equal(below.offscreen, true, "scrolling out of view freezes the pile");
  assert.equal(below.calendarScroll, true, "mobile calendar scrolls without widening the page");
  assert.equal(below.images, 6);
  evaluate(`document.querySelector('a[href="#top"]').scrollIntoView({behavior:'instant',block:'center'})`);
  browser("click", "a[href='#top']");
  browser("wait", "--fn", "scrollY === 0");
  assert.equal(evaluate("scrollY"), 0);

  for (const width of [1440, 390, 320]) {
    browser("set", "viewport", String(width), "1000");
    evaluate(`document.querySelector('button[aria-label="Launch paper plane"]').scrollIntoView({behavior:'instant',block:'center'})`);
    const flight = evaluate(`(async()=>{
      const button=document.querySelector('button[aria-label="Launch paper plane"]');
      const scene=button.parentElement;
      await scene.querySelector('img').decode();
      button.click();
      const sprite=scene.querySelector('[class*="planeFlight"]');
      const a=sprite.getAnimations()[0];if(!a)throw Error('Plane failed to launch');a.pause();
      const bounds=scene.getBoundingClientRect();
      const outside=[0,400,900,1400,2000,2600,2850].filter(time=>{
        a.currentTime=time; const p=sprite.getBoundingClientRect();
        return p.left<bounds.left||p.right>bounds.right||p.top<bounds.top||p.bottom>bounds.bottom;
      });
      button.click();
      const single=sprite.getAnimations().length===1;
      const frames=a.effect.getKeyframes().map(f=>f.transform);
      a.currentTime=0;a.play();
      return {outside,single,frames,crop:getComputedStyle(scene.querySelector('img')).objectPosition,duration:a.effect.getTiming().duration};
    })()`);
    assert.deepEqual(flight.outside, [], `plane stays inside the scene at ${width}px`);
    assert.equal(flight.single, true, "repeated clicks cannot create multiple planes");
     const expectedDuration = 3600 - Math.min(Math.hypot(0.7, -0.2), 1.2) * 1500;
     assert.equal(flight.duration, expectedDuration);
     assert.ok(flight.duration > 1800 && flight.duration < 3600, "normal motion uses the velocity-based duration range");
    assert.equal(flight.crop, width >= 640 ? "50% 65%" : "50% 50%");
    browser("wait", "--fn", `document.querySelector('[data-flying]').dataset.flying==='false'`);
    assert.equal(evaluate(`getComputedStyle(document.querySelector('[class*="planeFlight"]')).opacity`), "0");
    browser("click", 'button[aria-label="Launch paper plane"]');
    const alternate = evaluate(`document.querySelector('[class*="planeFlight"]').getAnimations()[0].effect.getKeyframes().map(f=>f.transform)`);
    assert.notDeepEqual(alternate, flight.frames, "repeat launches alternate between a glide and clumsy landing");
    browser("press", "Escape");
    browser("wait", "--fn", `document.querySelector('[data-flying]').dataset.flying==='false'`);
  }
  browser("click", 'button[aria-label="Launch paper plane"]');
  browser("set", "viewport", "390", "844");
  browser("wait", "--fn", `document.querySelector('[data-flying]').dataset.flying==='false'`);
  evaluate(`document.querySelector('button[aria-label="Launch paper plane"]').scrollIntoView({behavior:'instant',block:'center'})`);
  browser("click", 'button[aria-label="Launch paper plane"]');
  evaluate(`scrollTo({top:0,behavior:'instant'})`);
  browser("wait", "--fn", `document.querySelector('[data-flying]').dataset.flying==='false'`);

  browser("set", "media", "reduced-motion");
  browser("set", "viewport", "320", "740");
  browser("open", url);
  const reduced = evaluate(`(async()=>{${setup}await wait(300);const b=board.getBoundingClientRect();return {active:board.dataset.active,disabled:pills.every(p=>p.disabled),outside:pills.filter(p=>{const r=p.getBoundingClientRect();return r.top<b.top||r.bottom>b.bottom||r.right>innerWidth;}).map(p=>p.textContent),transformed:pills.some(p=>getComputedStyle(p).transform!=='none')};})()`);
  assert.equal(reduced.active, "false");
  assert.equal(reduced.disabled, true, "reduced-motion skills remain static, including on interaction");
  assert.equal(reduced.transformed, false);
  assert.deepEqual(reduced.outside, [], "static skills remain readable at 320px");
  assert.equal(evaluate("getComputedStyle(document.documentElement).scrollBehavior"), "auto");
  evaluate(`document.querySelector('button[aria-label="Launch paper plane"]').scrollIntoView({behavior:'instant',block:'center'})`);
  const gentle = evaluate(`(()=>{
    document.querySelector('button[aria-label="Launch paper plane"]').click();
    const a=document.querySelector('[class*="planeFlight"]').getAnimations()[0];
    return {duration:a.effect.getTiming().duration,positions:new Set(a.effect.getKeyframes().map(f=>f.transform)).size};
  })()`);
  assert.equal(gentle.duration, 200, "reduced motion uses a short fade");
  assert.equal(gentle.positions, 1, "reduced motion never flies the plane across the photo");
  browser("wait", "--fn", `document.querySelector('[data-flying]').dataset.flying==='false'`);
  console.log(`Browser checks passed: desktop/mobile/landscape, no toolbar, randomized reload, sleeping resize reset, keyboard pause/resume, keyboard nudge, pointer drag, offscreen pause, section order, real calendar, private project, contact links, smooth anchors/focus, photo crops, plane bounds/replay/cancellation, reduced motion. ${content.summary}`);
} finally {
  browser("close");
}
