// Copyright 2026 Cadre Software. SPDX-License-Identifier: GPL-2.0-or-later
import {CONTENT_SECTIONS,defaultContent,imageSlots} from './page-content.mjs?v=5';
import {defaults,renderSite,validEmail,httpsURL} from './template.mjs?v=5';
import {ASSETS} from './corpus.mjs?v=5';
import {templateStyles,embeddedImages} from './export-assets.mjs?v=5';
import {readSettings,writeSettings,SETTINGS_MAX_BYTES} from './configuration.mjs?v=5';
import {checkImageSize,SAVED_IMAGE_PIXELS,ImageInputError,imageDimensions} from './image-limits.mjs?v=5';
const form=document.querySelector('#customize'),frame=document.querySelector('#preview'),status=document.querySelector('#status'),download=document.querySelector('#download');
const params=new URLSearchParams(location.search),type=params.get('type')==='troop'?'troop':'pack';
const media={logo:'',photo:'',images:{}},generation={logo:0,photo:0};
let currentType=type,loading=0,exporting=false,css='',editGeneration=0,previewToken='';
function show(message,error=false){status.textContent=message;status.classList.toggle('error',error);}
function busy(){download.disabled=loading>0||exporting||!css;document.querySelector('#save-settings').disabled=loading>0||exporting;}
function values(){
 const fields=Object.fromEntries(new FormData(form));
 const content=Object.fromEntries(CONTENT_SECTIONS.flatMap(section=>section.fields.map(([key])=>[key,form.elements[`copy-${key}`].value])));
 return {...defaults[currentType],...fields,...media,content,type:currentType};
}
const sectionSelect=document.querySelector('#content-section');
function chooseSection(){
 for(const panel of form.querySelectorAll('[data-editor-panel]'))panel.hidden=panel.dataset.editorPanel!==sectionSelect.value;
 document.querySelector('#page-content').hidden=!CONTENT_SECTIONS.some(s=>s.id===sectionSelect.value);
 for(const section of document.querySelectorAll('.content-controls'))section.hidden=section.dataset.section!==sectionSelect.value;
}
let handlingInvalid=false;
form.addEventListener('invalid',event=>{
 event.preventDefault();if(handlingInvalid)return;handlingInvalid=true;setTimeout(()=>{handlingInvalid=false;},0);
 const panel=event.target.closest('[data-editor-panel]');if(panel){selectSection(panel.dataset.editorPanel);}
 const label=event.target.labels?.[0]?.textContent||'This field';show(`${label}: ${event.target.validationMessage}`,true);event.target.focus();
},true);
function selectSection(value){sectionSelect.value=value;chooseSection();update();}
sectionSelect.addEventListener('change',()=>selectSection(sectionSelect.value));
function buildImageControls(){
 for(const key of Object.keys(generation))if(key.startsWith('image-'))generation[key]++;
 media.images={};
 for(const group of document.querySelectorAll('.section-images'))group.replaceChildren();
 for(const slot of imageSlots(currentType)){
  const key=`image-${slot.id}`,group=document.querySelector(`[data-images="${slot.section}"]`),box=document.createElement('div');box.className='image-control';
  const title=document.createElement('h3');title.textContent=slot.label;box.append(title);group.append(box);
  const select=document.createElement('select');select.id=key+'-choice';
  const label=document.createElement('label');label.htmlFor=select.id;label.textContent='Library image';box.append(label,select);
  populate(select,slot.group,'No library image');select.value=slot.choice;
  const fileLabel=document.createElement('label'),file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.id=key+'-file';fileLabel.htmlFor=file.id;fileLabel.textContent='Upload a replacement';
  const altLabel=document.createElement('label'),alt=document.createElement('input');alt.id=key+'-alt';alt.maxLength=200;altLabel.htmlFor=alt.id;altLabel.textContent=slot.id.startsWith('rank')?'Badge name / image description':'Image description';
  const remove=document.createElement('button');remove.type='button';remove.className='button secondary small';remove.textContent='Hide image';
  const clear=document.createElement('button');clear.type='button';clear.className='button secondary small';clear.textContent='Use library image';
  box.append(fileLabel,file,altLabel,alt,clear,remove);
  media.images[slot.id]={choice:slot.choice,data:'',alt:'',hidden:false};
  generation[key]??=0;
  select.addEventListener('change',()=>{generation[key]++;Object.assign(media.images[slot.id],{choice:select.value,data:'',hidden:false});file.value='';remove.textContent='Hide image';update();show('Library image selected.');});
  alt.addEventListener('input',()=>{media.images[slot.id].alt=alt.value;update();});
  clear.addEventListener('click',()=>{editGeneration++;generation[key]++;Object.assign(media.images[slot.id],{data:'',hidden:false});file.value='';remove.textContent='Hide image';update();show('Using the selected library image.');});
  remove.addEventListener('click',()=>{editGeneration++;generation[key]++;const image=media.images[slot.id];image.hidden=!image.hidden;remove.textContent=image.hidden?'Show image':'Hide image';update();});
  file.addEventListener('change',async()=>{
   const selected=++generation[key],image=media.images[slot.id],chosen=file.files[0];if(!chosen)return;
   if(chosen.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(chosen.type)){file.value='';show('Choose a JPG, PNG, or WebP image up to 8 MB.',true);return;}
   loading++;busy();show('Processing image…');
   try{
    const data=await rasterize(chosen);if(selected!==generation[key])return;
    checkImageBudget({...values(),images:{...media.images,[slot.id]:{...image,data}}});
    Object.assign(image,{data,hidden:false});remove.textContent='Hide image';update();show('Image added to the preview. It stays in this browser tab.');
   }catch(error){if(selected===generation[key])show(error instanceof ImageInputError?error.message:'That image could not be read or exceeds the total image limit. Try a smaller JPG, PNG, or WebP.',true);}
   finally{loading--;busy();}
  });
 }
}
function syncImageControls(){
 for(const slot of imageSlots(currentType)){
  const image=media.images[slot.id];
  document.querySelector(`#image-${slot.id}-choice`).value=image.choice;
  document.querySelector(`#image-${slot.id}-alt`).value=image.alt;
  const box=document.querySelector(`#image-${slot.id}-alt`).closest('.image-control');box.querySelector('button:last-child').textContent=image.hidden?'Show image':'Hide image';
 }
}
function dataBlob(data){
 const [header,encoded]=data.split(',');if(encoded.length>16*1024*1024)throw new Error('Saved image too large');
 const binary=atob(encoded),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return {bytes,blob:new Blob([bytes],{type:header.slice(5,header.indexOf(';'))})};
}
function checkImageBudget(settings){
 const data=[settings.logo,settings.photo,...Object.values(settings.images||{}).map(image=>image.data)].filter(Boolean);
 let pixels=0,characters=0;
 for(const image of data){const {width,height}=imageDimensions(dataBlob(image).bytes);pixels+=width*height;characters+=image.length;}
 if(pixels>24_000_000||characters>24*1024*1024)throw new ImageInputError('Your uploaded images exceed the total limit. Use smaller images or library images before continuing.');
}

function update(){
 if(!css)return;
 previewToken=[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');
 frame.srcdoc=renderSite(values(),{demo:false,css,preview:true,previewToken,previewParent:location.origin,previewSelected:sectionSelect.value,previewSection:({families:'new-families',links:'contact'}[sectionSelect.value]||sectionSelect.value),runtimeURL:new URL('site-runtime.js?v=5',location.href).href,previewRuntimeURL:new URL('preview-runtime.js?v=5',location.href).href});
}
window.addEventListener('message',event=>{
 const data=event.data;
 if(event.source!==frame.contentWindow||event.origin!=='null'||!data||typeof data!=='object'||Array.isArray(data)||data.type!=='cadre-preview-select'||!previewToken||data.token!==previewToken)return;
 if(typeof data.section!=='string'||![...sectionSelect.options].some(option=>option.value===data.section))return;
 if(typeof data.field!=='string'||data.field.length>64)return;
 let target=null;
 if(data.field){
  target=document.getElementById(data.field);
  if(!target||!form.contains(target)||(target.closest('[data-section]')?.dataset.section||target.closest('[data-editor-panel]')?.dataset.editorPanel)!==data.section)return;
 }
 sectionSelect.value=data.section;chooseSection();
 const panel=target?.closest('.image-control')||document.querySelector(`[data-section="${data.section}"]`)||document.querySelector(`[data-editor-panel="${data.section}"]`);
 const heading=panel?.querySelector('h2,h3,legend')||panel;if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({block:'start',behavior:'instant'});}
 show('Editing '+sectionSelect.selectedOptions[0].textContent+'. Changes stay in your local draft.');
});
function makeSelect(name,label,before){
 const title=document.createElement('label');title.htmlFor=name;title.textContent=label;
 const select=document.createElement('select');select.id=name;select.name=name;
 before.before(title,select);return select;
}
const logoSelect=makeSelect('logoChoice','Choose a Scouting logo',document.querySelector('label[for="logo-file"]'));
const photoSelect=makeSelect('photoChoice','Choose a photo from the library',document.querySelector('label[for="photo-file"]'));
const library=document.createElement('p'),link=document.createElement('a');link.href='library.html';link.textContent='Browse the asset library';link.className='button secondary small';library.append(link);photoSelect.after(library);
function populate(select,group,empty){
 select.replaceChildren();if(empty)select.add(new Option(empty,''));
 for(const asset of ASSETS.filter(a=>a.group===group&&a.unitTypes.includes(currentType)))select.add(new Option(asset.label,asset.id));
}
function load(flavor){
 currentType=flavor;populate(logoSelect,'Scouting emblems','Use the unit name or upload your logo');populate(photoSelect,'Photos');
 for(const [key,value] of Object.entries(defaults[flavor]))if(form.elements[key])form.elements[key].value=value;
 for(const [key,value] of Object.entries(defaultContent(flavor)))form.elements[`copy-${key}`].value=value;
 buildImageControls();chooseSection();update();
}
function saveFile(text,name,type){
 const url=URL.createObjectURL(new Blob([text],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function rasterize(blob,maxPixels){
 await checkImageSize(blob,maxPixels);
 const bitmap=await createImageBitmap(blob);
 try{
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');
 }finally{bitmap.close();}
}
async function restoreImage(data){
 if(!data)return '';
 try{
  return await rasterize(dataBlob(data).blob,SAVED_IMAGE_PIXELS);
 }catch{throw new Error('A saved image could not be read. Choose a settings file saved by this editor.');}
}
show('Loading the website styles and fonts…');
try{css=await templateStyles();show('');}catch{show('The preview could not load. Reload this page to try again.',true);}
load(type);
for(const [field,group] of [['logoChoice','Scouting emblems'],['photoChoice','Photos']]){
 const requested=params.get(field),asset=ASSETS.find(a=>a.id===requested&&a.group===group&&a.unitTypes.includes(type));
 if(asset)form.elements[field].value=asset.id;
}
update();busy();
document.querySelector('#save-settings').addEventListener('click',()=>{
 if(loading){show('Wait for your images or settings to finish loading before saving.',true);return;}
 try{saveFile(writeSettings(values()),'unit-website-settings.json','application/json');show('Settings saved, including your selected and uploaded images. Keep this file for future updates.');}
 catch(error){show(error.message,true);}
});
let settingsGeneration=0;
document.querySelector('#load-settings').addEventListener('change',async event=>{
 const file=event.target.files[0],selected=++settingsGeneration,editsAtStart=editGeneration;if(!file)return;
 loading++;busy();show('Loading saved settings…');
 try{
  if(file.size>SETTINGS_MAX_BYTES)throw new Error('Choose a settings file smaller than 32 MB.');
  const settings=readSettings(JSON.parse(await file.text()));if(selected!==settingsGeneration)return;
  // Validate and normalize image bytes before changing any current settings.
  try{checkImageBudget(settings);}catch{throw new Error('A saved image could not be read. Choose a settings file saved by this editor.');}
  try{
   settings.logo=await restoreImage(settings.logo);checkImageBudget(settings);
   settings.photo=await restoreImage(settings.photo);checkImageBudget(settings);
   for(const image of Object.values(settings.images)){image.data=await restoreImage(image.data);checkImageBudget(settings);}
  }catch{throw new Error('A saved image could not be read. Choose a settings file saved by this editor.');}
  if(selected!==settingsGeneration)return;
  if(editsAtStart!==editGeneration){show('Settings were not loaded because you made a newer edit. Load the file again to replace those edits.');return;}
  // Invalidate every pending image decode before replacing the document state.
  for(const key of Object.keys(generation))generation[key]++;
  for(const key of ['logo','photo']){media[key]='';document.querySelector(`#${key}-file`).value='';}
  form.reset();load(settings.type);
  for(const [key,value] of Object.entries(settings))if(form.elements[key])form.elements[key].value=value;
  for(const [key,value] of Object.entries(settings.content))form.elements[`copy-${key}`].value=value;
  media.images={...media.images,...settings.images};syncImageControls();
  media.logo=settings.logo;media.photo=settings.photo;update();show('Settings loaded. Review the preview and publishing checklist.');
 }catch(error){if(selected===settingsGeneration)show(error instanceof SyntaxError?'That file could not be read as website settings.':error.message,true);}
 finally{loading--;busy();if(selected===settingsGeneration)event.target.value='';}
});
form.addEventListener('input',()=>{editGeneration++;update();});
form.elements.type.addEventListener('change',event=>{load(event.target.value);show('Program example changed. Review the sample copy before publishing.');});
for(const key of ['logo','photo']){
 const fileInput=document.querySelector(`#${key}-file`),select=key==='logo'?logoSelect:photoSelect;
 select.addEventListener('change',()=>{generation[key]++;media[key]='';fileInput.value='';update();show('Library image selected.');});
 fileInput.addEventListener('change',async()=>{
  const selected=++generation[key],file=fileInput.files[0];if(!file)return;
  if(file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){fileInput.value='';show('Choose a JPG, PNG, or WebP image up to 8 MB.',true);return;}
  loading++;busy();
  try{
   const image=await rasterize(file);if(selected!==generation[key])return;
   checkImageBudget({...values(),[key]:image});media[key]=image;update();
   show(css?'Image added to the preview. It stays in this browser tab.':'Image processed, but the preview could not load. Reload this page to try again.',!css);
  }catch(error){if(selected===generation[key])show(error instanceof ImageInputError?error.message:'That image could not be read. Try a different JPG, PNG, or WebP.',true);}
  finally{loading--;busy();}
 });
 document.querySelector(`#clear-${key}`).addEventListener('click',()=>{editGeneration++;generation[key]++;media[key]='';fileInput.value='';if(key==='logo')logoSelect.value='';update();show(key==='logo'?'Logo removed.':'Using the selected library photo.');});
}
form.addEventListener('submit',async event=>{
 event.preventDefault();if(loading||exporting||!css||!form.reportValidity())return;
 const c=values();
 if(c.email&&!validEmail(c.email)){show('Enter a valid adult contact email.',true);selectSection('links');form.elements.email.focus();return;}
 for(const key of ['application','calendar','council','formEndpoint'])if(c[key]&&!httpsURL(c[key])){show('Use a complete https:// address without a username or password.',true);selectSection('links');form.elements[key].focus();return;}
 if(!httpsURL(c.formEndpoint)){show('Add your form service’s HTTPS form address before downloading the website.',true);selectSection('links');form.elements.formEndpoint.focus();return;}
 for(const slot of imageSlots(currentType))if(c.images[slot.id]?.data&&!c.images[slot.id].hidden&&!c.images[slot.id].alt.trim()){selectSection(slot.section);show('Describe the uploaded image before downloading.',true);document.querySelector(`#image-${slot.id}-alt`).focus();return;}
 if(media.photo&&!String(c.photoAlt||'').trim()){show('Describe the photo before downloading.',true);selectSection('media');form.elements.photoAlt.focus();return;}
 exporting=true;busy();show('Including your selected photos, graphics, and fonts…');
 try{
  const html=await embeddedImages(renderSite(c,{demo:false,css}));
  saveFile(html,'index.html','text/html;charset=utf-8');
  show('Downloaded index.html with its images and fonts. Open it to review, then have your website helper publish it.');
 }catch{show('A template image could not be included. Check your connection and try again.',true);}
 finally{exporting=false;busy();}
});
// No input or file selection can be lost while module/styles are initializing.
for(const fieldset of form.querySelectorAll('fieldset'))fieldset.disabled=false;
document.querySelector('#load-settings').disabled=false;
update();
