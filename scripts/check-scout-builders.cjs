// Contract and browser checks for editable builder downloads; no account writes.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium,devices}=require('playwright');
const base=(process.argv[2]||'http://127.0.0.1:18997/').replace(/\/?$/,'/');
const output=path.resolve('test-results/scout-builders');
function unpack(file){return JSON.parse(execFileSync('python3',['-c',`
import sys,json,zipfile,hashlib
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 names=z.namelist(); assert len(set(names))==len(names)
 assert all(not n.startswith('/') and '..' not in n.split('/') for n in names)
 print(json.dumps({'files':names,'guide':z.read('START-HERE.html').decode(),'copy':z.read('content.txt').decode(),'reference':z.read('reference.html').decode(),'pattern':json.loads(z.read('pattern.json')) if 'pattern.json' in names else None,'images':{n:hashlib.sha256(z.read(n)).hexdigest() for n in names if n.startswith('images/')}}))
`,file],{maxBuffer:50*1024*1024}));}
async function download(page,host){
 await page.locator('#download-host').selectOption(host);
 const event=page.waitForEvent('download');await page.locator('#download').click();const result=await event;
 assert.equal(result.suggestedFilename(),'unit-website-'+host+'.zip');
 const target=path.join(output,host+'.zip');await result.saveAs(target);return unpack(target);
}
(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch();
 try{
  for(const kind of ['desktop','mobile'])for(const type of ['pack','troop']){
   const context=await browser.newContext(kind==='mobile'?devices['Pixel 5']:{viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[],writes=[];
   page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))writes.push(request.url());});
   await page.goto(base+'customize.html?type='+type);await page.waitForFunction(()=>!document.querySelector('#download').disabled);
   const name=(type==='pack'?'Pack':'Troop')+' 456 & Friends';await page.locator('#name').fill(name);await page.locator('#town').fill('Raleigh');await page.locator('#address').fill('123 Main St, Raleigh, NC & Annex');
   await page.locator('#content-section').selectOption('about');await page.locator('#copy-aboutTitle').fill('Our "adventures" --> <script> & friends');
   await page.locator('#content-section').selectOption('layout');await page.locator('#section-outdoors').uncheck();
   await page.locator('#content-section').selectOption('links');await page.locator('#application').fill('https://unit.example/apply');await page.locator('#council').fill('https://council.example/');await page.locator('#formEndpoint').fill('');
   await page.locator('#content-section').selectOption('media');await page.locator('#photo-file').setInputFiles({name:'unit-photo.png',mimeType:'image/png',buffer:await fs.readFile('assets/cadre-logo.png')});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Image added'));await page.locator('#photoAlt').fill('Approved unit activity photo');
   await page.locator('#reviewed').check();await page.locator('#download-host').selectOption('wordpress');
   assert.equal(await page.locator('#builder-download-note').isVisible(),true,'builder guidance is visible');
   assert.equal(await page.locator('#formEndpoint').getAttribute('required'),null,'builder does not require a hosted form endpoint');
   assert((await page.locator('#download-instructions').innerText()).includes('pattern.json'));
   assert((await page.content()).includes('Choose your platform or host'),'served editor includes the current platform selector');
   assert.equal(await page.locator('#download').innerText(),'Download WordPress package');
   assert(await page.locator('#download').evaluate(el=>getComputedStyle(el).backgroundColor!=='rgba(0, 0, 0, 0)'),'download action is styled');
   for(const id of ['download-instructions','builder-download-note','download'])assert(await page.locator('#'+id).evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1),id+' is not clipped');
   const boxes=await Promise.all(['download-host','download-instructions','download'].map(id=>page.locator('#'+id).boundingBox()));assert(boxes[1].y>=boxes[0].y+boxes[0].height&&boxes[2].y>=boxes[1].y+boxes[1].height,'instructions sit between selector and action');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
   const wp=await download(page,'wordpress');await fs.writeFile(path.join(output,kind+'-'+type+'-pattern.json'),JSON.stringify(wp.pattern));assert.equal(wp.pattern.__file,'wp_block');assert.equal(wp.pattern.syncStatus,'unsynced');assert(wp.pattern.title.includes(name));
   assert(wp.pattern.content.includes('wp:group')&&wp.pattern.content.includes('wp:image')&&wp.pattern.content.includes('wp:buttons'));
   assert(!/wp:html|<script|data:image|<form|id="outdoors"/.test(wp.pattern.content),'native editable blocks omit scripts, raw forms, embedded images and hidden sections');
   assert(wp.pattern.content.includes('https://unit.example/apply')&&wp.pattern.content.includes('https://council.example/'),'custom and resource links survive');
   assert(wp.pattern.content.includes('Our &quot;adventures&quot; --&gt; &lt;script&gt; &amp; friends'),'copy remains escaped');
   assert(wp.pattern.content.includes('Approved unit activity photo'),'uploaded image description survives');
   for(const file of wp.files)assert(!/settings|configuration|customize|index\.html/.test(file),'no editor/settings in builder package');
   assert(wp.files.includes('ASSET-SOURCES.txt')&&Object.keys(wp.images).length>5,'selected image bytes and provenance included');
   assert(wp.guide.includes('native contact form')&&wp.guide.includes('Media Library')&&wp.guide.includes('automatic expiry'));
   assert(!/<script|action=|<fieldset(?![^>]*disabled)/.test(wp.reference),'reference cannot submit forms or execute scripts');
   const sq=await download(page,'squarespace');assert.equal(sq.pattern,null);assert(sq.guide.includes('not')&&sq.guide.includes('Squarespace template'));assert(sq.guide.includes('Email Notification')&&sq.guide.includes('Form block'));assert(sq.copy.includes(name));
   assert(sq.copy.includes('The Adventure\n'+(type==='pack'?'Starts Here':'Never Ends')),'recipe preserves headline line boundaries');
   const directions='https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination:'123 Main St, Raleigh, NC & Annex'});
   assert(sq.copy.includes(directions),'plain-text recipe preserves inline directions URL');
   assert(await page.evaluate(({guide,directions})=>new DOMParser().parseFromString(guide,'text/html').body.textContent.includes(directions),{guide:sq.guide,directions}),'illustrated recipe preserves inline directions URL');
   assert(sq.copy.includes('Link: Send a message → #contact'),'inline footer contact link is retained');assert.deepEqual(sq.images,wp.images,'both packages carry identical selected images');
   await page.locator('#download').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,kind+'-'+type+'-builder-options.png'),fullPage:false});
   await page.locator('#download-host').selectOption('cloudflare');assert.equal(await page.locator('#builder-download-note').isHidden(),true,'builder note hides for static hosting');assert.notEqual(await page.locator('#formEndpoint').getAttribute('required'),null,'static form requirement is restored');
   await page.locator('#download').click();assert((await page.locator('#status').innerText()).includes('Form service address'),'static export cannot bypass form setup after using a builder');
   assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);await context.close();console.log('PASS builder downloads: '+kind+' '+type+', native pattern, recipe, image bytes, source notes, escaped copy, hidden sections, native-form guidance and static validation');
  }
  const context=await browser.newContext(),page=await context.newPage();await page.goto(base+'customize.html');await page.waitForFunction(()=>!document.querySelector('#download').disabled);
  const contracts=await page.evaluate(async()=>{
   const {renderSite}=await import('./template.mjs?v=7'),{embeddedImages}=await import('./export-assets.mjs?v=7'),{builderDownload}=await import('./builder-downloads.mjs?v=7');
   const html=await embeddedImages(renderSite({type:'pack',announcementEnabled:true,announcementTitle:'Expired announcement sentinel',announcementExpires:'2020-01-01'},{demo:false}));
   const result=await builderDownload(html,'wordpress',{now:new Date('2026-11-06T12:00:00Z')});return Array.from(new Uint8Array(await result.blob.arrayBuffer()));
  });const expiryFile=path.join(output,'expired.zip');await fs.writeFile(expiryFile,Buffer.from(contracts));const expired=unpack(expiryFile);assert(!expired.pattern.content.includes('Expired announcement sentinel')&&!expired.reference.includes('Expired announcement sentinel'),'expired announcements are omitted from both pattern and reference');assert(expired.guide.includes('already passed was omitted'));
  await context.close();console.log('PASS builder announcement contract: expired content omitted, manual-expiry guidance retained');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
