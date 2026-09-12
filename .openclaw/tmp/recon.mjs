import pw from '/Users/albertolive/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.js';
const { chromium } = pw;
const targets = [
  ['esdeveniments','https://esdeveniments.cat'],
  ['eltempsavui','https://eltempsavui.cat'],
  ['culturacardedeu','https://culturacardedeu.com'],
  ['moveflow','https://moveflow.app'],
  ['garmin','https://apps.garmin.com/apps/59828c15-7638-4e14-b871-47f0ce0c66f0'],
];
const b = await chromium.launch({ executablePath: process.env.CHROME_BIN });
for (const [name,url] of targets) {
  const ctx = await b.newContext({ viewport:{width:1440,height:900} });
  const p = await ctx.newPage();
  try {
    await p.goto(url, { waitUntil:'load', timeout:45000 });
    await p.waitForTimeout(3500);
    const info = await p.evaluate(() => {
      const links = [...document.querySelectorAll('nav a, header a, [role="navigation"] a')].slice(0,25)
        .map(a=>({t:(a.textContent||'').trim().slice(0,28), h:a.getAttribute('href')}));
      const imgs = [...document.querySelectorAll('img')].slice(0,15).map(i=>({src:i.currentSrc||i.src, w:i.naturalWidth,h:i.naturalHeight, alt:(i.alt||'').slice(0,50)}));
      const og = document.querySelector('meta[property="og:image"]')?.content;
      return { title: document.title, links, imgs, og, h: document.body.scrollHeight, h1: document.querySelector('h1')?.textContent?.trim().slice(0,80) };
    });
    await p.screenshot({ path:`.openclaw/tmp/recon-${name}.png` });
    console.log('==='+name+'===\n'+JSON.stringify(info,null,1));
  } catch(e) { console.log('==='+name+'=== ERROR '+e.message); }
  await ctx.close();
}
await b.close();
