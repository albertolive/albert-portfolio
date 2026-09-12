import pw from '/Users/albertolive/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.js';
const { chromium } = pw;
const targets = [
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
    await p.waitForTimeout(4000);
    const info = await p.evaluate(() => {
      const links = [...document.querySelectorAll('nav a, header a, [role="navigation"] a')].slice(0,20)
        .map(a=>((a.textContent||'').trim().slice(0,24))+' -> '+a.getAttribute('href'));
      const big = [...document.querySelectorAll('img')].map(i=>({s:(i.currentSrc||i.src).slice(0,110), w:i.naturalWidth,h:i.naturalHeight})).filter(i=>i.w>=400).slice(0,6);
      const og = document.querySelector('meta[property="og:image"]')?.content;
      const modal = [...document.querySelectorAll('[class*=modal],[class*=Modal],[id*=cookie],[class*=consent],[class*=cookie]')].map(e=>e.className?.toString().slice(0,40)).slice(0,6);
      return { title: document.title, links, big, og, modal, h: document.body.scrollHeight };
    });
    await p.screenshot({ path:`.openclaw/tmp/recon-${name}.png`, fullPage:false });
    console.log('==='+name+'===\n'+JSON.stringify(info,null,1));
  } catch(e) { console.log('==='+name+'=== ERROR '+e.message); }
  await ctx.close();
}
await b.close();
