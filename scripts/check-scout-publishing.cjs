// Meaningful publishing and recovery checks; never contact a real form service.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {chromium,devices}=require('playwright');
const base=(process.argv[2]||'http://127.0.0.1:18997/').replace(/\/?$/,'/');
const output=path.resolve('test-results/scout-publishing');
const moduleURL=name=>pathToFileURL(path.resolve(''+name));
async function ready(page){await page.waitForFunction(()=>!document.querySelector('#download').disabled);}
async function section(page,id){await page.locator('#content-section').selectOption(id);}
async function download(page,filename){const event=page.waitForEvent('download');await page.locator('#download').click();const file=await event;assert.equal(file.suggestedFilename(),filename);const target=path.join(output,filename);await file.saveAs(target);return target;}
(async()=>{
 await fs.mkdir(output,{recursive:true});
 const {renderSite,defaults}=await import(moduleURL('template.mjs'));
 const {readSettings,writeSettings}=await import(moduleURL('configuration.mjs'));
 const {OPTIONAL_SECTIONS,websiteDownload}=await import(moduleURL('publishing.mjs'));
 for(const version of [1,2,3]){const old=readSettings({format:'cadre-scout-website',version,settings:{type:'pack'}});assert(Object.values(old.sections).every(Boolean));assert.equal(old.announcementEnabled,false);}
 for(const settings of [{sections:{calendar:'false'}},{sections:{calendar:null}},{sections:[]},{announcementEnabled:'yes'},{announcementExpires:'2030-02-30'}])assert.throws(()=>readSettings({format:'cadre-scout-website',version:3,settings:{type:'pack',...settings}}));
 assert.equal(JSON.parse(writeSettings({type:'troop'})).version,3);
 for(const type of ['pack','troop'])for(let mask=0;mask<128;mask++){
  const sections=Object.fromEntries(OPTIONAL_SECTIONS.map((id,i)=>[id,Boolean(mask&(1<<i))]));
  const html=renderSite({type,sections},{demo:false});const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const href of html.matchAll(/href="#([^"]+)"/g))assert(ids.has(href[1]),type+' hidden sections leave no broken fragment: '+href[1]);
  for(const [id,shown] of Object.entries(sections))assert.equal(ids.has(id==='families'?'new-families':id),shown);
 }
 assert(!renderSite({type:'pack',announcementEnabled:true,announcementTitle:'Hello <script>',announcementURL:'javascript:alert(1)'},{demo:false}).includes('javascript:'));
 for(const host of ['cloudflare','github'])assert.throws(()=>websiteDownload('x'.repeat(25*1024*1024+1),host),/25 MiB/);
 assert.doesNotThrow(()=>renderSite({type:'pack',address:'\ud800 & <script>'},{demo:false}));
 console.log('PASS publishing model: legacy settings, invalid settings, all 256 section combinations, safe announcement URL and Cloudflare size guard');
 const browser=await chromium.launch();
 try{
  for(const kind of ['desktop','mobile']){
   const context=await browser.newContext(kind==='mobile'?devices['Pixel 5']:{viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],writes=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
   await page.goto(base+'customize.html');await ready(page);
   assert.equal(await page.locator('.editor-steps a').count(),3);
   const welcomeEdit=page.frameLocator('#preview').locator('.hero>.preview-edit-button');await welcomeEdit.waitFor();assert(await welcomeEdit.evaluate(el=>{const r=el.getBoundingClientRect(),header=document.querySelector('.site-header').getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top>=header.bottom&&(hit===el||el.contains(hit));}),'welcome Edit control clears the fixed header');
   await page.locator('#name').fill('Pack 456');await page.locator('#town').fill('Raleigh');await page.locator('#meeting').fill('Thursdays at 6:30 p.m.');await page.locator('#place').fill('Community Center');
   await page.locator('#address').fill('123 Main St, Raleigh, NC & Annex');await page.locator('#entrance').fill('Use the east entrance.');
   await section(page,'links');await page.locator('#formEndpoint').fill('https://forms.unit.example/contact');await page.locator('#email').fill('membership@unit.example');
   await section(page,'family');await page.locator('#copy-familyTitle').fill('Saved hidden-section copy');
   await section(page,'layout');for(const id of ['family','ranks','calendar','families','visit','about'])await page.locator('#section-'+id).uncheck();
   await section(page,'announcement');await page.locator('#announcementEnabled').check();await page.locator('#announcementTitle').fill('Come meet Pack 456');await page.locator('#announcementBody').fill('Join our open house.');await page.locator('#announcementURL').fill('https://unit.example/open-house');await page.locator('#announcementButton').fill('Plan your visit');await page.locator('#announcementExpires').fill('2030-01-01');
   await section(page,'media');await page.locator('#logoChoice').selectOption('cub-scouts-logo.png');
   await page.waitForFunction(()=>document.querySelector('#draft-status').textContent.startsWith('Draft saved'));
   await page.reload();await ready(page);assert((await page.locator('#draft-status').innerText()).includes('Restored'));
   assert.equal(await page.locator('#name').inputValue(),'Pack 456');assert.equal(await page.locator('#announcementTitle').inputValue(),'Come meet Pack 456');assert.equal(await page.locator('#section-family').isChecked(),false);assert.equal(await page.locator('#copy-familyTitle').inputValue(),'Saved hidden-section copy');assert.equal(await page.locator('#logoChoice').inputValue(),'cub-scouts-logo.png');
   const preview=page.frameLocator('#preview');await preview.locator('#unit-announcement .preview-edit-button').waitFor();
   await page.locator('#preview-phone').click();await page.waitForFunction(()=>document.querySelector('#preview').getBoundingClientRect().width<=375);assert.equal(await page.locator('#preview-phone').getAttribute('aria-pressed'),'true');
   assert.equal(await preview.locator('#family,#ranks,#calendar,#visit,#about,#new-families').count(),0);
   await preview.locator('#unit-announcement h2').click();await page.waitForFunction(()=>document.querySelector('#content-section').value==='announcement');
   await page.locator('#preview-desktop').click();assert((await page.locator('#preview').boundingBox()).width>=1000);assert.equal(await page.locator('#preview-desktop').getAttribute('aria-pressed'),'true');
   await section(page,'layout');await page.locator('#section-family').check();assert.equal(await page.locator('#copy-familyTitle').inputValue(),'Saved hidden-section copy');
   await preview.locator('#family h2').filter({hasText:'Saved hidden-section copy'}).waitFor();await page.locator('#section-family').uncheck();
   assert(!(await page.locator('#review-items').innerText()).includes('Replace the example'));
   await page.locator('#reviewed').check();
   for(const [host,filename] of [['cloudflare','unit-website-cloudflare.zip'],['netlify','unit-website-netlify.zip'],['github','index.html'],['html','index.html']]){
    await page.locator('#download-host').selectOption(host);const file=await download(page,filename);
    let html;
    if(host==='cloudflare'||host==='netlify'){
     html=execFileSync('python3',['-c','import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.namelist()==["index.html"]; assert z.testzip() is None; sys.stdout.buffer.write(z.read("index.html"))',file],{maxBuffer:40*1024*1024}).toString();
    }else html=await fs.readFile(file,'utf8');
    assert(html.includes('Pack 456')&&html.includes('Come meet Pack 456'));assert(!/data-edit-section=["']|preview-runtime|customize\.mjs|unit-website-settings|indexedDB/.test(html));
    const published=await context.newPage();await published.route('https://published.unit.example/',route=>route.fulfill({contentType:'text/html',body:html}));
    await published.clock.install({time:new Date('2030-01-02T04:59:30Z')});
    // Choose a stable visitor time zone separately from the device defaults.
    await published.goto('https://published.unit.example/');
    assert.equal(await published.locator('[data-edit-section]').count(),0);
    const icon=await published.locator('link[rel="icon"]').getAttribute('href');assert(icon.startsWith('data:image/'));
    const directions=new URL(await published.locator('.template-directions').getAttribute('href'));assert.equal(directions.searchParams.get('destination'),'123 Main St, Raleigh, NC & Annex');
    assert((await published.locator('.template-meeting').innerText()).includes('Use the east entrance.'));
    await published.close();
   }
   await page.waitForFunction(()=>document.querySelector('#draft-status').textContent.startsWith('Draft saved'));
   const backupEvent=page.waitForEvent('download');await page.locator('#save-settings').click();const backupDownload=await backupEvent,backup=path.join(output,kind+'-backup.json');await backupDownload.saveAs(backup);
   await page.locator('#download-host').selectOption('cloudflare');await page.locator('#load-settings').setInputFiles(backup);await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Settings loaded'));
   assert.equal(await page.locator('#download-host').inputValue(),'cloudflare');assert((await page.locator('#download-instructions').innerText()).includes('Upload this ZIP'));assert((await page.locator('#host-documentation').getAttribute('href')).includes('cloudflare'));
   // A same-program library selection must still apply after draft recovery.
   await page.goto(base+'customize.html?type=pack&photoChoice=pinewood-derby.jpg');await ready(page);assert.equal(await page.locator('#photoChoice').inputValue(),'pinewood-derby.jpg');
   assert(!new URL(page.url()).searchParams.has('photoChoice'),'asset URL is consumed once');await page.waitForFunction(()=>document.querySelector('#draft-status').textContent.startsWith('Draft saved'));await page.reload();await ready(page);assert.equal(await page.locator('#photoChoice').inputValue(),'pinewood-derby.jpg','library choice persists without another edit');
   await section(page,'media');await page.locator('#photoChoice').selectOption('camping-cookout.jpg');await page.waitForFunction(()=>document.querySelector('#draft-status').textContent.startsWith('Draft saved'));await page.reload();await ready(page);assert.equal(await page.locator('#photoChoice').inputValue(),'camping-cookout.jpg','reload cannot reapply an older asset URL');
   await section(page,'media');await page.locator('#photo-file').setInputFiles({name:'approved-photo.png',mimeType:'image/png',buffer:await fs.readFile('assets/cadre-logo.png')});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Image added'));await page.waitForFunction(()=>document.querySelector('#draft-status').textContent.startsWith('Draft saved'));await page.reload();await ready(page);assert((await page.frameLocator('#preview').locator('.hero__bg img').getAttribute('src')).startsWith('data:image/'),'restored upload survives the consumed asset link');

   await page.locator('.editor-files summary').click();await page.locator('#erase-draft').click();await page.waitForFunction(()=>document.querySelector('#draft-status').textContent.includes('erased'));
   assert.equal(await page.locator('#name').inputValue(),'Pack 456');await page.reload();await ready(page);assert.equal(await page.locator('#name').inputValue(),'Pack 123');assert.equal(await page.locator('#remember-draft').isChecked(),false);
   await page.screenshot({path:path.join(output,kind+'-guided-editor.png'),fullPage:false});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'editor does not overflow');assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
   await context.close();console.log('PASS guided publishing: '+kind+', draft recovery/erase, retained hidden content, preview controls, directions/icon, four hosting downloads, ZIP integrity and no server writes');
  }
  // Shared storage revisions protect newer edits and make erasure durable across tabs.
  const tabs=await browser.newContext(),a=await tabs.newPage(),b=await tabs.newPage();
  await a.goto(base+'customize.html');await ready(a);await a.locator('#name').fill('First saved version');await a.waitForFunction(()=>document.querySelector('#draft-status').textContent.startsWith('Draft saved'));
  await b.goto(base+'customize.html');await ready(b);await a.locator('#name').fill('Newer version from A');await a.waitForFunction(()=>document.querySelector('#draft-status').textContent.startsWith('Draft saved'));
  await b.locator('#town').fill('Stale B town');await b.waitForFunction(()=>document.querySelector('#draft-status').textContent.includes('Saving is paused'));assert.equal(await b.locator('#remember-draft').isDisabled(),true);
  const c=await tabs.newPage();await c.goto(base+'customize.html');await ready(c);assert.equal(await c.locator('#name').inputValue(),'Newer version from A');assert.equal(await c.locator('#town').inputValue(),'Exampletown');
  await c.locator('.editor-files summary').click();await c.locator('#erase-draft').click();await c.waitForFunction(()=>document.querySelector('#draft-status').textContent.includes('erased'));
  await a.locator('#name').fill('A stale tab cannot resurrect this');await a.waitForFunction(()=>document.querySelector('#draft-status').textContent.includes('Saving is paused'));await c.reload();await ready(c);assert.equal(await c.locator('#name').inputValue(),'Pack 123');assert.equal(await c.locator('#remember-draft').isChecked(),false);await tabs.close();
  console.log('PASS shared draft revisions: stale tabs preserve newer work and cannot undo erasure');
  // Expiration is checked on first load and while a visitor keeps the page open.
  const context=await browser.newContext({timezoneId:'America/New_York'}),page=await context.newPage();
  await page.clock.install({time:new Date('2030-01-02T04:59:00Z')});await page.clock.pauseAt(new Date('2030-01-02T04:59:30Z'));
  const html=renderSite({type:'pack',announcementEnabled:true,announcementTitle:'Local date announcement',announcementExpires:'2030-01-01'},{demo:false});
  await page.route(base+'expiry-check.html',route=>route.fulfill({contentType:'text/html',body:html}));
  await page.goto(base+'expiry-check.html');await page.locator('#unit-announcement').waitFor({state:'visible'});await page.clock.runFor(29999);assert.equal(await page.locator('#unit-announcement').isVisible(),true);await page.clock.runFor(1);assert.equal(await page.locator('#unit-announcement').isHidden(),true);await page.reload();assert.equal(await page.locator('#unit-announcement').isHidden(),true);await context.close();
  const plain=await browser.newContext({javaScriptEnabled:false}),plainPage=await plain.newPage();await plainPage.route(base+'expiry-check.html',route=>route.fulfill({contentType:'text/html',body:html}));await plainPage.goto(base+'expiry-check.html');assert.equal(await plainPage.locator('#unit-announcement').isHidden(),true);await plain.close();
  // Storage denial or corruption must not strand a new volunteer in a disabled editor.
  for(const mode of ['denied','quota','corrupt']){
   const c=await browser.newContext(),p=await c.newPage();
   if(mode==='denied')await p.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw new Error('Synthetic unavailable storage');}}));
   if(mode==='quota')await p.addInitScript(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('Synthetic full disk','QuotaExceededError');};});
   await p.goto(base+'customize.html');await ready(p);
   if(mode==='corrupt'){await p.evaluate(async()=>{const m=await import('./drafts.mjs?v=6');await m.writeDraft('{invalid',(await m.readDraft()).revision);});await p.reload();await ready(p);assert((await p.locator('#draft-status').innerText()).includes('No draft could be restored'));}
   await p.locator('#name').fill('Still editable');if(mode!=='corrupt')await p.waitForFunction(()=>document.querySelector('#draft-status').textContent.includes('could not save'));
   assert.equal(await p.locator('#download').isDisabled(),false);await c.close();
  }
  console.log('PASS announcement expiration across local midnight, reload after expiry, denied/quota/corrupt storage recovery');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
