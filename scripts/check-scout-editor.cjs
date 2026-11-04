const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium,devices}=require('playwright');
const base=(process.argv[2]||'http://127.0.0.1:18997/').replace(/\/?$/,'/');
const output=path.resolve('test-results/scout-editor');
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGOUi9JgIAUwkaR6VMOohiGlAQAc5ADATZuiNwAAAABJRU5ErkJggg==','base64');

async function showEditorField(page,selector){
 const group=await page.locator(selector).evaluate(el=>el.closest('[data-editor-panel]')?.dataset.editorPanel||el.closest('[data-section]')?.dataset.section);
 if(group)await page.locator('#content-section').selectOption(group);
}

(async()=>{
 await fs.mkdir(output,{recursive:true});
 const {CONTENT_SECTIONS,imageSlots,defaultContent}=await import(pathToFileURL(path.resolve('page-content.mjs')));
 const {readSettings,writeSettings}=await import(pathToFileURL(path.resolve('configuration.mjs')));
 const {ASSETS}=await import(pathToFileURL(path.resolve('corpus.mjs')));
 const {renderSite}=await import(pathToFileURL(path.resolve('template.mjs')));
 for(const type of ['pack','troop'])for(const slot of imageSlots(type))assert(!slot.choice||ASSETS.some(a=>a.id===slot.choice&&a.group===slot.group&&a.unitTypes.includes(type)),slot.id+' has a compatible default asset');
 const legacy=readSettings({format:'cadre-scout-website',version:1,settings:{type:'pack',name:'Legacy Pack'}});
 assert.equal(legacy.name,'Legacy Pack');assert.deepEqual(legacy.content,{});
 assert.throws(()=>readSettings({format:'cadre-scout-website',version:2,settings:{type:'troop',images:{uniform:{choice:'patch-placement.png'}}}}),/unavailable/);
 assert.throws(()=>readSettings({format:'cadre-scout-website',version:2,settings:{type:'pack',content:{heroTitle:'x'.repeat(1201)}}}),/too long/);
 const allText=Object.fromEntries(Object.keys(defaultContent('pack')).map((key,i)=>[key,`Editable ${i} <script>alert(1)</script>`]));
 const rendered=renderSite({type:'pack',content:allText,application:'https://example.org/join',calendar:'https://example.org/calendar',council:'https://example.org/council',formEndpoint:'https://forms.unit.example/contact'},{demo:false});
 assert(!rendered.includes('<script>alert(1)</script>'));assert(rendered.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
 for(const [key,text] of Object.entries(allText)){
  if(['calendarEmpty','uniformBody'].includes(key))continue;
  assert(rendered.includes(text.replaceAll('<','&lt;').replaceAll('>','&gt;')),key+' is rendered');
 }
 assert.equal(JSON.parse(writeSettings({...legacy,content:allText})).version,2);
 const changedRank=renderSite({type:'pack',images:{rank0:{choice:'rank-wolf.png'}}});
 assert(changedRank.includes('den-badge__name\">Wolf</div>'));assert(!changedRank.includes('den-badge__name\">Lion</div>'));
 assert(!renderSite({type:'pack',images:{family:{choice:''}}}).includes('split-block__image\"><img src=\"assets/display/camping-cookout.jpg.webp'),'choosing no library image clears that section image');
 const {stripJPEGMetadata}=await import(pathToFileURL(path.resolve('scripts/scout-jpeg-metadata.mjs')));
 const manifest=JSON.parse(await fs.readFile('assets/corpus-manifest.json','utf8'));
 for(const file of manifest.files.filter(f=>f.file.startsWith('assets/corpus/'))){const raw=await fs.readFile(path.join('.',file.file));assert.deepEqual(stripJPEGMetadata(raw),raw,'published downloads have no JPEG EXIF/XMP/IPTC/comment metadata: '+file.file);}
 const noisy=await fs.readFile('scripts/fixtures/noisy-scout-image.jpg');
 const segment=marker=>{const body=Buffer.from('Exif\0\0SYNTHETIC LOCATION METADATA'),header=Buffer.alloc(4);header[0]=255;header[1]=marker;header.writeUInt16BE(body.length+2,2);return Buffer.concat([header,body]);};
 for(const marker of [225,237,254]){
  assert.deepEqual(stripJPEGMetadata(Buffer.concat([noisy.subarray(0,2),segment(marker),noisy.subarray(2)])),noisy);
  assert.deepEqual(stripJPEGMetadata(Buffer.concat([noisy.subarray(0,-2),segment(marker),noisy.subarray(-2)])),noisy,'metadata after a scan is removed too');
 }
 assert.deepEqual(stripJPEGMetadata(Buffer.concat([noisy,Buffer.from('PRIVATE TRAILER')])),noisy);
 assert.throws(()=>stripJPEGMetadata(Buffer.from([255,216,255,225,0,50])),/Invalid/);

 const expansion={format:'cadre-scout-website',version:2,settings:{type:'pack',name:'Do not apply expanded images',images:Object.fromEntries(imageSlots('pack').slice(0,9).map(slot=>[slot.id,{choice:slot.choice,data:'data:image/jpeg;base64,'+noisy.toString('base64'),alt:'Synthetic noise'}]))}};
 const browser=await chromium.launch();
 try{
  for(const kind of ['desktop','mobile']){
   const context=await browser.newContext(kind==='mobile'?devices['Pixel 5']:{viewport:{width:1280,height:900}}),page=await context.newPage(),writes=[],errors=[];
   page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url())});page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'customize.html');await page.waitForFunction(()=>!document.querySelector('#download').disabled);
   assert((await page.locator('.editor-safety').innerText()).includes('cannot change the hosted website'));
   await page.locator('#reviewed').check();await showEditorField(page,'#name');await page.locator('#name').fill('');
   await page.locator('#download').click();assert.equal(await page.locator('#content-section').inputValue(),'unit');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'name','multiple invalid panels keep the first field visible and focused');
   await page.locator('#name').fill('Pack 123');await page.locator('#download').click();
   assert.equal(await page.locator('#content-section').inputValue(),'links');assert.equal(await page.evaluate(()=>document.activeElement.id),'formEndpoint');
   await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('data-preview-section=\"contact\"'));
   const preview=page.frameLocator('#preview');
   await showEditorField(page,'#copy-heroTitle');await page.locator('#copy-heroTitle').fill('Welcome <friends>');await showEditorField(page,'#copy-heroAccent');await page.locator('#copy-heroAccent').fill('Adventure together');
   await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('Welcome &lt;friends&gt;'));
   await preview.locator('h1').filter({hasText:'Welcome <friends>'}).waitFor();
   assert((await preview.locator('h1').textContent()).includes('Welcome <friends>'));
   await page.locator('#content-section').selectOption('family');
   assert.equal(await page.locator('[data-section="hero"]').isHidden(),true);
   await showEditorField(page,'#copy-familyTitle');await page.locator('#copy-familyTitle').fill('Our families explore');await showEditorField(page,'#copy-familyBody');await page.locator('#copy-familyBody').fill('Bring your questions and curiosity.');
   await showEditorField(page,'#image-family-choice');await page.locator('#image-family-choice').selectOption('hiking-trail.jpg');
   await page.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('Our families explore'));
   await preview.locator('.split-block').first().locator('h2').filter({hasText:'Our families explore'}).waitFor();
   assert.equal(await preview.locator('.split-block').first().locator('h2').textContent(),'Our families explore');
   assert.equal(await preview.locator('#family').evaluate(async el=>{if(document.readyState!=='complete')await new Promise(resolve=>addEventListener('load',resolve,{once:true}));await new Promise(resolve=>requestAnimationFrame(resolve));return el.getBoundingClientRect().top>=0&&el.getBoundingClientRect().top<innerHeight;}),true,'preview follows the selected section');
   await showEditorField(page,'#image-family-file');await page.locator('#image-family-file').setInputFiles({name:'family.png',mimeType:'image/png',buffer:pixel});
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Image added'));
   await showEditorField(page,'#image-family-alt');await page.locator('#image-family-alt').fill('Families at our picnic');
   await page.locator('#content-section').selectOption('outdoors');
   await showEditorField(page,'#image-outdoors-file');await page.locator('#image-outdoors-file').setInputFiles({name:'outdoors.png',mimeType:'image/png',buffer:pixel});
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Image added'));
   await showEditorField(page,'#image-outdoors-alt');await page.locator('#image-outdoors-alt').fill('Our outdoor adventure');
   await page.locator('#content-section').selectOption('hero');await showEditorField(page,'#image-strip0-alt');await page.locator('#image-strip0-alt').fill('Our troop on a hike');
   await page.locator('#image-strip0-alt').locator('..').getByRole('button',{name:'Hide image',exact:true}).click();
   await page.waitForFunction(()=>!document.querySelector('#preview').srcdoc.includes('alt="Our troop on a hike"'));
   await showEditorField(page,'#formEndpoint');await page.locator('#formEndpoint').fill('https://forms.unit.example/contact');
   const saveEvent=page.waitForEvent('download');await page.locator('#save-settings').click();const saved=await saveEvent;
   const settingsFile=path.join(output,kind+'-settings.json');await saved.saveAs(settingsFile);const settings=JSON.parse(await fs.readFile(settingsFile,'utf8'));
   assert.equal(settings.settings.content.familyTitle,'Our families explore');assert.equal(settings.settings.images.strip0.hidden,true);assert(settings.settings.images.family.data.startsWith('data:image/png;'));
   await page.reload();await page.waitForFunction(()=>!document.querySelector('#download').disabled);
   await page.locator('#load-settings').setInputFiles(settingsFile);await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Settings loaded'));
   assert.equal(await page.locator('#copy-heroTitle').inputValue(),'Welcome <friends>');
   await page.locator('#load-settings').setInputFiles({name:'expanding-images.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(expansion))});
   await page.waitForFunction(()=>/saved image could not be read|Settings loaded/.test(document.querySelector('#status').textContent));
   assert((await page.locator('#status').textContent()).includes('saved image could not be read'),'normalized image expansion must be rejected');
   assert.equal(await page.locator('#name').inputValue(),'Pack 123','normalized image growth cannot partially apply imported settings');
   assert.equal(await page.locator('#copy-heroTitle').inputValue(),'Welcome <friends>');
   await page.locator('#content-section').selectOption('family');assert.equal(await page.locator('#image-family-alt').inputValue(),'Families at our picnic');
   await page.locator('#reviewed').check();const downloadEvent=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadEvent;
   const exported=path.join(output,kind+'-index.html');await download.saveAs(exported);const html=await fs.readFile(exported,'utf8');
   const stress=await context.newPage();await stress.route('https://layout.unit.example/',route=>route.fulfill({contentType:'text/html',body:html}));
   await stress.goto('https://layout.unit.example/');await stress.locator('.hero p').evaluate(el=>{el.textContent='x'.repeat(600);});
   assert(await stress.locator('.hero p').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'unbroken hero invitation wraps');
   assert(await stress.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));await stress.close();
   assert(html.includes('Our families explore'));assert(html.includes('alt="Families at our picnic"'));assert(html.includes('alt="Our outdoor adventure"'));assert(!html.includes('customize.mjs'));assert(!html.includes('id="customize"'));assert.deepEqual(writes,[],'editing has no server write requests');
   const box=await page.locator('#content-section').boundingBox();assert(box.width>200);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1));
   const button=page.locator('a.button').first();assert.equal(await button.evaluate(el=>getComputedStyle(el).display),'inline-flex');
   assert.equal(await button.evaluate(el=>getComputedStyle(el).textDecorationLine),'none');
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:path.join(output,kind+'-editor.png')});
   await page.goto(base+'library.html');await page.waitForFunction(()=>document.querySelectorAll('.asset-item').length>0);
   for(const a of await page.locator('.asset-item').first().locator('div a').all()){
    assert(['inline-flex','flex'].includes(await a.evaluate(el=>getComputedStyle(el).display)));
    assert((await a.boundingBox()).height>=44);
   }
   await page.screenshot({path:path.join(output,kind+'-library.png'),fullPage:true});
   assert.deepEqual(errors,[]);await context.close();console.log('PASS section editor: '+kind+', copy/images, versioned settings, export, no server writes, styled actions and layout');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
