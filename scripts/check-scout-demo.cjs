const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const {chromium,devices}=require('playwright');
const base=(process.argv[2]||'http://127.0.0.1:18996/').replace(/\/?$/,'/');
const output=path.resolve('test-results/scout-demo');
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGOUi9JgIAUwkaR6VMOohiGlAQAc5ADATZuiNwAAAABJRU5ErkJggg==','base64');
async function geometry(page){
 const findings=await page.evaluate(()=>{
  const bad=[];
  if(document.documentElement.scrollWidth>document.documentElement.clientWidth+1)bad.push('horizontal overflow');
  for(const el of document.querySelectorAll('h1,h2,h3,p,li,label,button,.button')){
   const r=el.getBoundingClientRect();
   // Pack 39's condensed headings intentionally let glyph ink exceed their
   // line boxes. Keep checking widths and real clipping; visible heading ink
   // alone is not clipped text. The source style comparison below pins this.
   const visibleHeading=/^H[123]$/.test(el.tagName)&&getComputedStyle(el).overflowY==='visible';
   if(r.width&&r.height&&(el.scrollWidth>el.clientWidth+1||(!visibleHeading&&el.scrollHeight>el.clientHeight+1)))bad.push('clipped '+el.textContent.trim().slice(0,70));
  }
  return bad;
 });
 assert.deepEqual(findings,[]);
}
async function mobileMenu(page){
 const toggle=page.locator('.menu-toggle'),nav=page.locator('.main-navigation');
 assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 assert.equal(await nav.locator('a').first().isVisible(),false);
 await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 assert.equal(await nav.locator('a').first().evaluate(e=>document.activeElement===e),true);
 await toggle.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 assert.equal(await toggle.evaluate(e=>document.activeElement===e),true);
 await toggle.click();await nav.locator('a').last().focus();await page.keyboard.press('Tab');assert.equal(await toggle.evaluate(e=>document.activeElement===e),true);
 await nav.locator('a').first().click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 await page.waitForFunction(()=>document.querySelector('.site-header').classList.contains('scrolled'));
 await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>!document.querySelector('.site-header').classList.contains('scrolled'));
}

async function showEditorField(page,selector){
 const group=await page.locator(selector).evaluate(el=>el.closest('[data-editor-panel]')?.dataset.editorPanel||el.closest('[data-section]')?.dataset.section);
 if(group)await page.locator('#content-section').selectOption(group);
}

(async()=>{
 await fs.mkdir(output,{recursive:true});
 const {httpsURL,renderSite,validEmail}=await import(pathToFileURL(path.resolve('template.mjs')));
 assert.equal(httpsURL('javascript:alert(1)'), '');
 assert.equal(httpsURL('https://user:pass@example.org/'), '');
 assert.equal(validEmail('a@example.org\r\nBcc:x@bad.org'),false);
 assert(renderSite({type:'pack',name:'<script>bad</script>'},{demo:false}).includes('&lt;script&gt;bad&lt;/script&gt;'));
 const {ASSETS}=await import(pathToFileURL(path.resolve('corpus.mjs')));
 const {SITE_RUNTIME}=await import(pathToFileURL(path.resolve('runtime.mjs')));
 const manifest=JSON.parse(await fs.readFile('assets/corpus-manifest.json','utf8'));
 assert.deepEqual(manifest.assets,ASSETS);assert.equal(ASSETS.length,91);
 assert.equal(new Set(ASSETS.map(a=>a.id)).size,ASSETS.length);
 for(const file of manifest.files)assert.equal(createHash('sha256').update(await fs.readFile(path.join('.',file.file))).digest('hex'),file.sha256,file.file);
 assert(ASSETS.some(a=>a.id==='hero-mountain.jpg'));
 assert(ASSETS.filter(a=>a.id.startsWith('patch-placement.')).every(a=>a.unitTypes.join(',')==='pack'));
 assert.equal(await fs.readFile('site-runtime.js','utf8'),SITE_RUNTIME);
 const browser=await chromium.launch({headless:true});
 try{
  for(const name of (process.env.SCOUT_ONLY==='mobile'?['mobile']:['desktop','mobile'])){
   const context=await browser.newContext(name==='mobile'?{...devices['Pixel 5']}:{viewport:{width:1280,height:900}});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   // Simulate an old unversioned renderer still in a returning visitor's cache.
   await context.route('**/template.mjs',route=>route.fulfill({contentType:'text/javascript',body:'throw new Error("Stale template was loaded");'}));
   for(const file of ['index.html','pack.html','troop.html','library.html','setup.html','customize.html']){
    const res=await page.goto(base+file);assert.equal(res.status(),200);
    await page.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode()));await document.fonts.ready;});
    await geometry(page);
    assert(await page.locator('main h1').innerText());
    const styles=await page.locator('.button,a[download],.setup-steps a').first().evaluate(el=>{
     const probe=document.createElement('a');document.body.append(probe);
     const result=[getComputedStyle(el).backgroundColor,getComputedStyle(probe).backgroundColor];probe.remove();return result;
    });if(!['library.html','setup.html'].includes(file))assert.notEqual(styles[0],styles[1]);
    if(file==='pack.html'||file==='troop.html'){
     // Compare against measured Pack 39 styles, not a second copy of our CSS.
     const reference=JSON.parse(await fs.readFile(`scripts/fixtures/pack39-${name}-styles.json`,'utf8'));
     for(const [selector,properties] of Object.entries(reference)){
      const actual=await page.locator(selector).first().evaluate((el,keys)=>{const s=getComputedStyle(el);return Object.fromEntries(keys.map(key=>[key,s[key==='background'?'backgroundColor':key]]));},Object.keys(properties));
      assert.deepEqual(actual,properties,`${name} ${selector} matches Pack 39`);
     }
     assert.equal(await page.locator('.hero__bg img').getAttribute('src'),file==='pack.html'?'assets/display/hero-mountain.jpg.webp':'assets/display/platform/photos/ridge-summit.jpg.webp');
     assert.equal(await page.locator('img[src$="patch-placement.png.webp"]').count(),file==='pack.html'?1:0);
     if(name==='mobile')await mobileMenu(page);
    }
    if(file==='pack.html'){
     const visit=await page.locator('main .button').first().getAttribute('href');assert.equal(visit,'#visit');
     assert.equal(await page.locator('#visit a.button').getAttribute('href'),'#contact');
     assert.equal(await page.locator('form').count(),1);assert.equal(await page.locator('#contact-form button').isDisabled(),true);assert.equal(await page.locator('#contact-form').getAttribute('action'),null);
     await page.screenshot({path:path.join(output,`${name}-pack-firstscreen.png`)});
    }
    if(file==='troop.html')assert((await page.locator('body').innerText()).includes('Scouts learn to plan'));
    if(file==='library.html'){
     assert.equal(await page.locator('.asset-item').count(),91);
     await page.locator('#asset-program').selectOption('troop');await page.locator('#asset-group').selectOption('Uniform guides');
     assert.equal(await page.locator('.asset-item:has-text("patch-placement")').count(),0);
     await page.locator('#asset-program').selectOption('pack');await page.locator('#asset-search').fill('patch-placement');
     assert.equal(await page.locator('.asset-item').count(),2);
     await page.locator('#asset-search').fill('');await page.locator('#asset-group').selectOption('Photos');
     const choice=page.locator('.asset-item').filter({hasText:'Pack 39 mountain hero'});
     assert.equal(await choice.count(),1);
     assert.equal(await choice.locator('a[download]').getAttribute('href'),'assets/corpus/hero-mountain.jpg');
     assert((await choice.locator('a:has-text("Use this photo")').getAttribute('href')).includes('photoChoice=hero-mountain.jpg'));
     await page.locator('#asset-program').selectOption('');await page.locator('#asset-group').selectOption('');
    }
    if(file==='customize.html'){
     await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('<style>'));
     for(const hidden of await page.locator('[hidden]').all())assert.equal(await hidden.isHidden(),true);
     const preview=page.frameLocator('#preview');
     await preview.locator('body').evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode()));await document.fonts.ready;});
     assert.equal(await preview.locator('body').evaluate(()=>[...document.fonts].some(face=>face.family==='Barlow Condensed'&&face.status==='loaded')),true,'preview step numbers use the original display font');
     assert((await preview.locator('.unit-wordmark').textContent()).includes('Pack 123'));
     await preview.locator('.preview-edit-button').first().waitFor();
     await preview.locator('.hero .button').first().click();
     await page.waitForFunction(()=>document.querySelector('#content-section').value==='hero');
     assert.equal(await preview.locator('#visit').count(),1);
     assert.equal(await page.locator('#preview').getAttribute('sandbox'),'allow-scripts');
     // The runtime must work inside the opaque preview under the actual CSP.
     await preview.locator('.menu-toggle').evaluate(e=>e.click());
     assert.equal(await preview.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
     await preview.locator('.menu-toggle').press('Escape');
     assert.equal(await preview.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
     await showEditorField(page,'#photoChoice');await page.locator('#photoChoice').selectOption('camping-cookout.jpg');
     await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('src="assets/display/camping-cookout.jpg.webp" alt=""'));
     await showEditorField(page,'#logoChoice');await page.locator('#logoChoice').selectOption('cub-scouts-logo.png');
     await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('class="custom-logo" src="assets/display/cub-scouts-logo.png.webp"'));
     await showEditorField(page,'#type');await page.locator('#type').selectOption('troop');
     await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('Troop 123'));
     await showEditorField(page,'#name');await page.locator('#name').fill('Troop <127> & Friends');
     await showEditorField(page,'#email');await page.locator('#email').fill('join@unit.example');
     await showEditorField(page,'#photo-file');await page.locator('#photo-file').setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
     await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Choose a JPG'));
     await showEditorField(page,'#logo-file');await page.locator('#logo-file').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:pixel});
     await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Image added'));
     assert(await preview.locator('.identity img').getAttribute('src').then(x=>x.startsWith('data:image/png;base64,')));
     await page.locator('#clear-logo').click();
     assert.equal(await preview.locator('.identity img').count(),0);
     await showEditorField(page,'#formEndpoint');await page.locator('#formEndpoint').fill('https://forms.unit.example/contact');
     await showEditorField(page,'#application');await page.locator('#application').fill('javascript:alert(1)');
     await page.locator('#reviewed').check();
     await page.locator('#download').click();
     await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('https://'));
     await showEditorField(page,'#application');await page.locator('#application').fill('https://example.org/apply');
     await showEditorField(page,'#photo-file');await page.locator('#photo-file').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:pixel});
     await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Image added'));
     await page.locator('#download').click();
     await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Describe the photo'));
     await showEditorField(page,'#photoAlt');await page.locator('#photoAlt').fill('A test image');
     const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();
     const download=await downloadPromise;await download.saveAs(path.join(output,name+'-export.html'));
     const html=await fs.readFile(path.join(output,name+'-export.html'),'utf8');
     assert(html.includes('Troop &lt;127&gt; &amp; Friends'));assert(html.includes('https://example.org/apply'));
     assert(html.includes('data:font/')||html.includes('data:application/'));
     assert(html.includes(`<script>${SITE_RUNTIME}</script>`));assert.equal((html.match(/<script/g)||[]).length,1);assert(!html.includes('<aside class="template-demo-bar"'));assert(!html.includes('Sample visit'));
     const standalone=await context.newPage();const remote=[];standalone.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url())});await context.setOffline(true);await standalone.goto(pathToFileURL(path.join(output,name+'-export.html')).href);
     assert.equal(await standalone.locator('h1').innerText(),'THE ADVENTURE\nNEVER ENDS');
     assert.equal(await standalone.locator('.unit-wordmark').textContent(),'Troop <127> & Friends');
     assert.equal(await standalone.locator('#contact .template-email-backup a').getAttribute('href'),'mailto:join@unit.example');
     assert.equal(await standalone.locator('#contact-form').getAttribute('action'),'https://forms.unit.example/contact');
     assert(await standalone.locator('img').evaluateAll(images=>images.every(img=>img.src.startsWith('data:image/'))));
     await standalone.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode()));await document.fonts.ready;});
     assert.deepEqual(remote,[],'export needs no network resources');
     if(name==='mobile')await mobileMenu(standalone);
     await geometry(standalone);await standalone.close();await context.setOffline(false);
     await page.reload();await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('<style>'));
     assert.equal(await page.locator('#name').inputValue(),'Pack 123');
     assert.equal(await page.locator('#photo-file').inputValue(),'');
    }
    await page.screenshot({path:path.join(output,`${name}-${file.replace('.html','')}.png`),fullPage:true});
   }
   if(name==='desktop'){
    const race=await context.newPage();
    await race.addInitScript(()=>{
     const decode=window.createImageBitmap.bind(window);window.pendingDecodes=[];
     window.createImageBitmap=async(...args)=>{const bitmap=await decode(...args);return new Promise(resolve=>window.pendingDecodes.push(()=>resolve(bitmap)));};
    });
    await race.goto(base+'customize.html');
    await race.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('<style>'));
    await showEditorField(race,'#logo-file');await race.locator('#logo-file').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:pixel});
    await race.waitForFunction(()=>window.pendingDecodes.length===1);
    await race.locator('#clear-logo').click();
    await race.evaluate(()=>window.pendingDecodes.shift()());
    await race.waitForFunction(()=>!document.querySelector('#download').disabled);
    assert.equal(await race.frameLocator('#preview').locator('.identity img').count(),0,'removing an image must invalidate pending decoding');
    await showEditorField(race,'#logo-file');await race.locator('#logo-file').setInputFiles({name:'older.png',mimeType:'image/png',buffer:pixel});
    await race.waitForFunction(()=>window.pendingDecodes.length===1);
    await showEditorField(race,'#logo-file');await race.locator('#logo-file').setInputFiles({name:'newer.png',mimeType:'image/png',buffer:await fs.readFile('assets/cadre-logo.png')});
    await race.waitForFunction(()=>window.pendingDecodes.length===2);
    await race.evaluate(()=>window.pendingDecodes.pop()());
    await race.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('data:image/png;base64,'));
    const newest=await race.frameLocator('#preview').locator('.identity img').getAttribute('src');
    await race.evaluate(()=>window.pendingDecodes.shift()());
    await race.waitForFunction(()=>!document.querySelector('#download').disabled);
    assert.equal(await race.frameLocator('#preview').locator('.identity img').getAttribute('src'),newest,'an older decode must not replace a newer selection');
    await race.close();
    const chosen=await context.newPage();await chosen.goto(base+'customize.html?type=troop&photoChoice=platform%2Fphotos%2Fcanyon-hike.jpg&logoChoice=bsa-fleur-de-lis-color.png');
    await chosen.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('<style>'));
    assert.equal(await chosen.locator('#photoChoice').inputValue(),'platform/photos/canyon-hike.jpg');
    assert.equal(await chosen.locator('#logoChoice').inputValue(),'bsa-fleur-de-lis-color.png');
    assert((await chosen.frameLocator('#preview').locator('.hero__bg img').getAttribute('src')).endsWith('canyon-hike.jpg.webp'));
    const defaultPack=await context.newPage();await defaultPack.goto(base+'customize.html');await defaultPack.waitForFunction(()=>!document.querySelector('#download').disabled);await showEditorField(defaultPack,'#formEndpoint');await defaultPack.locator('#formEndpoint').fill('https://forms.unit.example/contact');await defaultPack.locator('#reviewed').check();
    const packDownload=defaultPack.waitForEvent('download');await defaultPack.locator('#download').click();const packFile=await packDownload;const savedPack=path.join(output,'default-pack-export.html');await packFile.saveAs(savedPack);
    assert((await fs.stat(savedPack)).size<5*1024*1024,'default Pack export must stay under 5 MiB with its fonts and images');
    const defaultOffline=await context.newPage();await context.setOffline(true);await defaultOffline.goto(pathToFileURL(savedPack).href);await defaultOffline.evaluate(async()=>{for(const img of document.images)img.loading='eager';await Promise.all([...document.images].map(img=>img.decode()));await document.fonts.ready;});
    assert.equal(await defaultOffline.locator('img[src^="data:"]').count(),await defaultOffline.locator('img').count());
    assert.equal(await defaultOffline.evaluate(()=>[...document.fonts].some(face=>face.family==='Font Awesome 6 Free'&&face.status==='loaded')),true);
    assert.equal(await defaultOffline.evaluate(()=>[...document.fonts].some(face=>face.family==='Barlow Condensed'&&face.status==='loaded')),true,'offline step numbers use the original display font');
    await defaultOffline.locator('summary').click();await geometry(defaultOffline);await defaultOffline.screenshot({path:path.join(output,'offline-pack.png'),fullPage:true});await defaultOffline.close();await context.setOffline(false);await defaultPack.close();
    const broken='**/assets/display/platform/photos/canyon-hike.jpg.webp';await chosen.route(broken,route=>route.abort());
    await showEditorField(chosen,'#formEndpoint');await chosen.locator('#formEndpoint').fill('https://forms.unit.example/contact');await chosen.locator('#reviewed').check();await chosen.locator('#download').click();
    await chosen.waitForFunction(()=>document.querySelector('#status').textContent.includes('could not be included'));
    assert.equal(await chosen.locator('#download').isDisabled(),false);
    await chosen.unroute(broken);const retried=chosen.waitForEvent('download');await chosen.locator('#download').click();await retried;await chosen.close();
    const failed=await context.newPage();
    await failed.route('**/assets/azimuth/fonts/*.woff2',route=>route.abort());
    await failed.goto(base+'customize.html');
    await failed.waitForFunction(()=>document.querySelector('#status').textContent.includes('could not load'));
    assert.equal(await failed.locator('#download').isDisabled(),true);
    await showEditorField(failed,'#photo-file');await failed.locator('#photo-file').setInputFiles({name:'photo.png',mimeType:'image/png',buffer:pixel});
    await failed.waitForFunction(()=>/Image (processed|added)/.test(document.querySelector('#status').textContent));
    assert.equal(await failed.locator('#download').isDisabled(),true,'incomplete resources must not permit an offline export');
    assert.equal(await failed.locator('#preview').getAttribute('srcdoc'),null);
    await failed.close();
   }
   assert.deepEqual(errors,[]);await context.close();console.log(`PASS scout starter: ${name}, editing, image handling, safe export, and layout`);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
