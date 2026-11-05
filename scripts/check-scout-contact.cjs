const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium,devices}=require('playwright');
const base=(process.argv[2]||'http://127.0.0.1:18997/').replace(/\/?$/,'/');
const output=path.resolve('test-results/scout-contact');
const endpoint='https://forms.unit.example/contact',published='https://unit-website.example/index.html';
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGOUi9JgIAUwkaR6VMOohiGlAQAc5ADATZuiNwAAAABJRU5ErkJggg==','base64');

async function showEditorField(page,selector){
 const group=await page.locator(selector).evaluate(el=>el.closest('[data-editor-panel]')?.dataset.editorPanel||el.closest('[data-section]')?.dataset.section);
 if(group)await page.locator('#content-section').selectOption(group);
}

(async()=>{
 await fs.mkdir(output,{recursive:true});
 const {renderSite,httpsURL}=await import(pathToFileURL(path.resolve('template.mjs')));
 const {readSettings}=await import(pathToFileURL(path.resolve('configuration.mjs')));
 assert.equal(httpsURL('https://user:secret@forms.unit.example/contact'),'');
 assert(!renderSite({type:'pack',formEndpoint:'javascript:alert(1)'},{demo:false}).includes('action="javascript:'));
 assert.throws(()=>readSettings({format:'cadre-scout-website',version:4,settings:{type:'pack'}}));
 let exported;
 const {checkImageSize,imageDimensions}=await import(pathToFileURL(path.resolve('image-limits.mjs')));
 const {ASSETS}=await import(pathToFileURL(path.resolve('corpus.mjs')));
 for(const asset of ASSETS)await checkImageSize(new Blob([await fs.readFile(path.join('.',asset.original))]));
 const oversized=await fs.readFile('scripts/fixtures/oversized-scout-image.png');assert(oversized.length<300000);assert.deepEqual(imageDimensions(oversized),{width:8192,height:8192});
 await assert.rejects(checkImageSize(new Blob([oversized])),/too large/);
 const browser=await chromium.launch();
 try{
  for(const kind of ['desktop','mobile']){
   const context=await browser.newContext(kind==='mobile'?devices['Pixel 5']:{viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[],posts=[];
   page.on('pageerror',e=>errors.push(e.message));context.on('request',r=>{if(r.method()==='POST')posts.push(r.url())});
   await page.goto(base+'pack.html');assert.equal(await page.locator('#contact-form').getAttribute('data-mode'),'demo');
   await page.locator('#contact-form button').evaluate(el=>el.click());assert.deepEqual(posts,[]);
   await page.goto(base+'customize.html');await page.waitForFunction(()=>!document.querySelector('#download').disabled);
   await page.locator('#reviewed').check();await page.locator('#download').click();
   assert.equal(await page.locator('#formEndpoint').evaluate(el=>el.validity.valueMissing),true,'a final website requires its delivery endpoint');
   await showEditorField(page,'#name');await page.locator('#name').fill('Pack <127> & Friends');await showEditorField(page,'#email');await page.locator('#email').fill('');
   await showEditorField(page,'#formEndpoint');await page.locator('#formEndpoint').fill('http://forms.unit.example/contact');await page.locator('#download').click();
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('https://'));
   await showEditorField(page,'#formEndpoint');await page.locator('#formEndpoint').fill(endpoint);await showEditorField(page,'#photoChoice');await page.locator('#photoChoice').selectOption('camping-cookout.jpg');
   await showEditorField(page,'#logo-file');await page.locator('#logo-file').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:pixel});
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Image added'));
   const savedPromise=page.waitForEvent('download');await page.locator('#save-settings').click();const saved=await savedPromise;
   const savedFile=path.join(output,kind+'-settings.json');await saved.saveAs(savedFile);const settings=JSON.parse(await fs.readFile(savedFile,'utf8'));
   assert.equal(settings.settings.name,'Pack <127> & Friends');assert(settings.settings.logo.startsWith('data:image/png;'));
   await page.waitForFunction(()=>document.querySelector('#draft-status').textContent.startsWith('Draft saved'));await page.reload();await page.waitForFunction(()=>!document.querySelector('#download').disabled);assert.equal(await page.locator('#name').inputValue(),'Pack <127> & Friends');await showEditorField(page,'#name');await page.locator('#name').fill('Temporary edit before import');
   await page.locator('#load-settings').setInputFiles(savedFile);await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Settings loaded'));
   assert.equal(await page.locator('#name').inputValue(),'Pack <127> & Friends');assert.equal(await page.locator('#formEndpoint').inputValue(),endpoint);
   assert.equal(await page.locator('#email').inputValue(),'');assert.equal(await page.locator('#photoChoice').inputValue(),'camping-cookout.jpg');assert.equal(await page.locator('#reviewed').isChecked(),false);
   const preview=page.frameLocator('#preview');assert.equal(await preview.locator('#contact-form').getAttribute('data-mode'),'preview');assert.equal(await preview.locator('#contact-form').getAttribute('action'),null);
   assert.equal(await preview.locator('#contact-form button').isDisabled(),true);assert((await preview.locator('.custom-logo').getAttribute('src')).startsWith('data:image/png;'));
   await page.locator('#load-settings').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{nope')});
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('could not be read'));assert.equal(await page.locator('#name').inputValue(),'Pack <127> & Friends');
   const invalid=structuredClone(settings);invalid.settings.logo='data:image/svg+xml,<svg onload="alert(1)"/>';
   await page.locator('#load-settings').setInputFiles({name:'bad-image.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('not a supported image'));assert.equal(await page.locator('#name').inputValue(),'Pack <127> & Friends');
   for(const logo of ['data:image/png;base64,AAAA','data:image/png;base64,'+oversized.toString('base64')]){
    const bad=structuredClone(settings);bad.settings.logo=logo;
    await page.locator('#load-settings').setInputFiles({name:'broken-image.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
    await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('saved image could not be read'));
    assert.equal(await page.locator('#name').inputValue(),'Pack <127> & Friends','a corrupt or compressed huge image cannot replace current settings');
   }
   await page.locator('#reviewed').check();const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadPromise;
   const file=path.join(output,kind+'-index.html');await download.saveAs(file);const html=await fs.readFile(file,'utf8');exported=html;
   assert(html.includes('action="'+endpoint+'"'));assert(!html.includes('mailto:join@example.org'));assert(!html.includes('name="to"'));assert(!html.includes('name="recipients"'));assert.deepEqual(posts,[],'editing and previewing never sends a message');
   const web=await context.newPage();await web.route(published,route=>route.fulfill({contentType:'text/html',body:html}));
   let fail=true,submitted=[];
   await context.route(endpoint,route=>{assert.equal(route.request().method(),'POST');submitted.push(new URLSearchParams(route.request().postData()));return route.fulfill({status:fail?503:200,contentType:'text/html',body:fail?'<h1>Service temporarily unavailable</h1>':'<h1>Message accepted by the test provider</h1>'});});
   await web.goto(published);assert.equal(await web.locator('#contact-form button').isDisabled(),false);
   await web.locator('#visitor-name').fill('Test Parent');await web.locator('#visitor-email').fill('invalid');await web.locator('#visitor-message').fill('A synthetic class test.');
   await web.locator('#contact-form button').click();assert.equal(submitted.length,0,'invalid email must not submit');
   await web.locator('#visitor-email').fill('parent@example.test');
   const failureResponse=web.waitForNavigation();await web.locator('#contact-form button').click();assert.equal((await failureResponse).status(),503);
   assert.equal(await web.locator('h1').innerText(),'Service temporarily unavailable');
   await web.goBack();assert.equal(await web.locator('#contact-form button').isDisabled(),false,'Back restores a usable submit button');
   assert.equal(await web.locator('#visitor-message').inputValue(),'A synthetic class test.','provider failure and Back retain the composed message');
   await web.locator('#visitor-name').fill('Test Parent');await web.locator('#visitor-email').fill('parent@example.test');await web.locator('#visitor-message').fill('A synthetic class test.');
   await web.locator('#contact-form').screenshot({path:path.join(output,kind+'-contact-form.png')});
   fail=false;const success=web.waitForNavigation();await web.locator('#contact-form button').click();assert.equal((await success).status(),200);
   assert.equal(await web.locator('h1').innerText(),'Message accepted by the test provider');
   assert.equal(submitted.length,2);assert.deepEqual([...submitted[1].keys()].sort(),['_gotcha','email','message','name','subject']);
   assert.equal(submitted[1].get('email'),'parent@example.test');assert.equal(submitted[1].get('subject'),'Pack <127> & Friends website inquiry');assert.equal(submitted[1].get('_gotcha'),'');
   const blocked=await context.newPage();await blocked.route(published,route=>route.fulfill({contentType:'text/html',headers:{'content-security-policy':"form-action 'self'"},body:html}));
   await blocked.goto(published);await blocked.locator('#visitor-name').fill('Test Parent');await blocked.locator('#visitor-email').fill('parent@example.test');await blocked.locator('#visitor-message').fill('Preserve this blocked message');
   await blocked.locator('#contact-form button').click({noWaitAfter:true});await blocked.waitForFunction(()=>document.querySelector('[role="status"]').textContent.includes('could not open'));
   assert.equal(submitted.length,2);assert.equal(await blocked.locator('#visitor-message').inputValue(),'Preserve this blocked message');assert.equal(await blocked.locator('#contact-form button').isDisabled(),false);await blocked.close();
   const disconnected=await context.newPage();await disconnected.route(published,route=>route.fulfill({contentType:'text/html',body:html}));await disconnected.goto(published);
   await disconnected.locator('#visitor-name').fill('Test Parent');await disconnected.locator('#visitor-email').fill('parent@example.test');await disconnected.locator('#visitor-message').fill('Preserve this offline message');
   await context.setOffline(true);await disconnected.waitForFunction(()=>!navigator.onLine);await disconnected.locator('#contact-form button').click();await disconnected.waitForFunction(()=>document.querySelector('[role="status"]').textContent.includes('appear to be offline'));
   assert.equal(submitted.length,2);assert.equal(await disconnected.locator('#visitor-message').inputValue(),'Preserve this offline message');await context.setOffline(false);await disconnected.close();
   const offline=await context.newPage();await context.setOffline(true);await offline.goto(pathToFileURL(file).href);
   await offline.locator('#visitor-name').fill('Test Parent');await offline.locator('#visitor-email').fill('parent@example.test');await offline.locator('#visitor-message').fill('Offline test');
   await offline.locator('#contact-form button').click();assert((await offline.locator('[role="status"]').innerText()).includes('Publish this website'));
   assert.equal(submitted.length,2);await context.setOffline(false);await offline.close();await web.close();
   assert.deepEqual(errors,[]);await context.close();console.log(`PASS contact forms: ${kind}, settings round trip, safe preview, native POST, provider failure/retry, offline guard`);
  }
  // Loading a saved configuration must invalidate older pending uploads.
  const raceContext=await browser.newContext(),race=await raceContext.newPage();
  await race.addInitScript(()=>{const decode=window.createImageBitmap.bind(window);window.pending=[];window.createImageBitmap=async(...args)=>{const bitmap=await decode(...args);return new Promise(resolve=>window.pending.push(()=>resolve(bitmap)));};});
  await race.goto(base+'customize.html');await race.waitForFunction(()=>!document.querySelector('#download').disabled);
  await showEditorField(race,'#logo-file');await race.locator('#logo-file').setInputFiles({name:'pending.png',mimeType:'image/png',buffer:pixel});await race.waitForFunction(()=>window.pending.length===1);
  const clean={format:'cadre-scout-website',version:1,settings:{type:'troop',name:'Troop saved',formEndpoint:endpoint,photoChoice:'platform/photos/ridge-summit.jpg'}};
  await race.locator('#load-settings').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(clean))});
  await race.waitForFunction(()=>document.querySelector('#status').textContent.includes('Settings loaded'));await race.evaluate(()=>window.pending.shift()());
  await race.waitForFunction(()=>!document.querySelector('#download').disabled);assert.equal(await race.locator('#name').inputValue(),'Troop saved');
  assert.equal(await race.frameLocator('#preview').locator('.site-branding img').count(),0,'an upload from before the imported configuration cannot overwrite it');await raceContext.close();
  const delayedContext=await browser.newContext(),delayed=await delayedContext.newPage();
  await delayed.addInitScript(()=>{const text=File.prototype.text;File.prototype.text=function(){return this.name==='slow.json'?new Promise(resolve=>{window.releaseSettings=async()=>resolve(await text.call(this));}):text.call(this);};});
  await delayed.goto(base+'customize.html');await delayed.waitForFunction(()=>!document.querySelector('#download').disabled);
  await delayed.locator('#load-settings').setInputFiles({name:'slow.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(clean))});await delayed.waitForFunction(()=>!!window.releaseSettings);
  await showEditorField(delayed,'#name');await delayed.locator('#name').fill('A newer edit');await delayed.evaluate(()=>window.releaseSettings());await delayed.waitForFunction(()=>document.querySelector('#status').textContent.includes('newer edit'));
  assert.equal(await delayed.locator('#name').inputValue(),'A newer edit');await delayedContext.close();
  const coldContext=await browser.newContext(),cold=await coldContext.newPage();let releaseFonts;const fontGate=new Promise(resolve=>releaseFonts=resolve);let fontRequested;const sawFont=new Promise(resolve=>fontRequested=resolve);
  await cold.route('**/assets/azimuth/fonts/*.woff2',async route=>{fontRequested();await fontGate;await route.continue();});
  await cold.goto(base+'customize.html',{waitUntil:'commit'});await sawFont;
  assert.equal(await cold.locator('#load-settings').isDisabled(),true);assert.equal(await cold.locator('#name').isDisabled(),true);assert.equal(await cold.locator('#photo-file').isDisabled(),true);
  releaseFonts();await cold.waitForFunction(()=>!document.querySelector('#download').disabled);assert.equal(await cold.locator('#load-settings').isDisabled(),false);assert.equal(await cold.locator('#name').isDisabled(),false);await coldContext.close();
  const plain=await browser.newContext({javaScriptEnabled:false}),page=await plain.newPage();let delivered=false;
  await plain.route(published,route=>route.fulfill({contentType:'text/html',body:exported}));await plain.route(endpoint,route=>{assert.equal(route.request().method(),'POST');delivered=true;return route.fulfill({contentType:'text/html',body:'<h1>Native form accepted</h1>'})});
  await page.goto(published);await page.locator('#visitor-name').fill('Test Parent');await page.locator('#visitor-email').fill('parent@example.test');await page.locator('#visitor-message').fill('Without JavaScript');
  await page.locator('#contact-form button').focus();await Promise.all([page.waitForURL(endpoint),page.keyboard.press('Enter')]);assert(delivered);await plain.close();console.log('PASS contact form: native submission also works without JavaScript');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
