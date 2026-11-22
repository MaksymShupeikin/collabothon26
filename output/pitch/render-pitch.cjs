const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('/Users/mshupeikin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const root = process.cwd();
  await fs.mkdir(path.join(root,'tmp/pdfs'),{recursive:true});
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(pathToFileURL(path.join(root,'output/pitch/finance-quest.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const count = await page.evaluate(() => window.pitch.slideCount);
  if(count !== 10) throw new Error('The deck must have exactly 10 slides');
  if(await page.locator('.slide-number,.brandbar .topic,#counter').count()) throw new Error('Unwanted slide labels remain');
  const headingDots = await page.locator('.slide h1,.slide h2,.slide h3').evaluateAll(headings => headings.filter(h=>/\.(?=\s|$)/.test(h.innerText)).map(h=>h.innerText));
  if(headingDots.length) throw new Error('Periods remain in slide headings: '+headingDots.join(', '));
  if(await page.locator('.agent-path-note').count()!==1) throw new Error('Planned MCP learning step is missing');
  const order = await page.locator('.path-step strong').allTextContents();
  if(order.join('/') !== 'Get a hint/Try it/Get feedback/Understand why/Ask your agent') throw new Error('Guided practice sequence is incorrect');
  const checks = [];
  for (let i=0;i<count;i++) {
    await page.evaluate(i => window.pitch.show(i), i);
    checks.push(await page.locator('.slide.active').evaluate(el => {
      const box=el.getBoundingClientRect();
      const overflowing=Array.from(el.querySelectorAll('h1,h2,p,strong,.pill,.topic,.bank-services,.final-action,th,td')).filter(child=>{
        if(!child.getClientRects().length) return false;
        const r=child.getBoundingClientRect();
        return r.left<box.left-2||r.right>box.right+2||r.top<box.top-2||r.bottom>box.bottom+2||child.scrollWidth>child.clientWidth+2;
      }).map(el=>({text:el.textContent.trim(),width:el.clientWidth,scroll:el.scrollWidth}));
      const ring=el.querySelector('.backdrop-ring').getBoundingClientRect();
      return {slide:Number(el.dataset.index)+1,title:el.querySelector('h1').textContent,overflowing,circularBackground:Math.abs(ring.width-ring.height)<1};
    }));
  }
  await page.evaluate(()=>window.pitch.show(0));
  await page.keyboard.press('ArrowRight');
  if(await page.locator('.slide.active').getAttribute('data-index')!=='1') throw new Error('Keyboard navigation failed');
  await page.locator('#notes').click();
  if(!await page.locator('#speaker').isVisible()) throw new Error('Speaker notes did not open');
  await page.locator('#notes').click();
  await page.locator('#overview').click();
  await page.locator('[data-slide="9"]').click();
  if(await page.locator('.slide.active').getAttribute('data-index')!=='9') throw new Error('Overview navigation failed');
  await page.clock.install();
  await page.locator('#play').click();
  await page.clock.runFor(5900);
  if(await page.locator('.slide.active').getAttribute('data-index')!=='0') throw new Error('The first slide advanced before 6 seconds');
  await page.clock.runFor(200);
  if(await page.locator('.slide.active').getAttribute('data-index')!=='1') throw new Error('Timed presentation did not advance after 6 seconds');
  for(let i=2;i<count;i++){
    await page.clock.runFor(6000);
    if(await page.locator('.slide.active').getAttribute('data-index')!==String(i)) throw new Error('Incorrect timed transition to slide '+(i+1));
  }
  await page.clock.runFor(6000);
  if(await page.locator('#play').textContent()!=='Play 60s') throw new Error('Timed presentation did not stop at 60 seconds');
  await page.evaluate(()=>window.pitch.show(0));
  await page.locator('.slide.active').screenshot({path:path.join(root,'tmp/pdfs/html-cover.png')});
  await page.emulateMedia({media:'print',reducedMotion:'reduce'});
  await page.pdf({path:path.join(root,'output/pdf/finance-quest.pdf'),width:'1280px',height:'720px',printBackground:true,preferCSSPageSize:true,margin:{top:0,right:0,bottom:0,left:0}});
  await fs.writeFile(path.join(root,'tmp/pdfs/html-validation.json'),JSON.stringify({errors,checks},null,2));
  console.log(JSON.stringify({pdf:'output/pdf/finance-quest.pdf',slides:count,wordCount:await page.evaluate(()=>window.pitch.sentences.join(' ').split(/\s+/).length),errors,overflowing:checks.filter(x=>x.overflowing.length),circularBackgrounds:checks.every(x=>x.circularBackground)}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
