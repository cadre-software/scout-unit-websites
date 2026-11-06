// Copyright 2026 Cadre Software. SPDX-License-Identifier: GPL-2.0-or-later
// Builder packages use the rendered page as their source of copy and visibility.
// Image bytes travel separately: WordPress sanitizes embedded data-URI images.
import {filesZIP,HOSTS} from './publishing.mjs?v=7';
import {escapeHTML as e} from './template.mjs?v=7';

const allowedLink=value=>{
 if(/^#[A-Za-z0-9_-]+$/.test(value||''))return value;
 try{const u=new URL(value);return ['https:','mailto:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}
};
const attributes=value=>JSON.stringify(value).replace(/--/g,'\\u002d\\u002d').replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
const block=(name,attrs,body)=>`<!-- wp:${name}${Object.keys(attrs).length?' '+attributes(attrs):''}${body===null?' /-->':` -->\n${body}\n<!-- /wp:${name} -->`}`;
function inline(node){
 if(node.nodeType===3)return e(node.textContent);
 if(node.nodeType!==1)return '';
 const text=[...node.childNodes].map(inline).join(''),tag=node.tagName.toLowerCase();
 if(['script','style','input','button'].includes(tag))return '';
 if(tag==='br')return '<br>';
 if(['strong','em','b','i'].includes(tag))return `<${tag}>${text}</${tag}>`;
 if(tag==='a'){const href=allowedLink(node.getAttribute('href'));return href?`<a href="${e(href)}">${text}</a>`:text;}
 return text;
}
const plain=markup=>{
 const body=new DOMParser().parseFromString(markup,'text/html').body;
 body.querySelectorAll('br').forEach(node=>node.replaceWith('\n'));
 return body.textContent;
};
function model(html,now,name){
 const doc=new DOMParser().parseFromString(html,'text/html'),images=[],byData=new Map();
 function image(node){
  const data=node.getAttribute('src')||'',match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if(!match)throw new Error('This website image could not be packaged. Try the download again.');
  let asset=byData.get(data);
  if(!asset){
   const binary=atob(match[2]),bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0));
   asset={file:`images/image-${String(images.length+1).padStart(3,'0')}.${match[1]==='jpeg'?'jpg':match[1]}`,bytes};
   images.push(asset);byData.set(data,asset);
  }
  return {kind:'image',file:asset.file,alt:node.getAttribute('alt')||'Unit activity photo'};
 }
 function walk(node){
  if(node.nodeType!==1)return [];
  const tag=node.tagName.toLowerCase();
  if(['script','style','noscript','button','i'].includes(tag))return [];
  if(tag==='form')return [{kind:'form',text:'Replace this setup reminder with your website’s contact form before publishing.',fields:['name','email','message'].map(key=>node.querySelector(`[name="${key}"]`).closest('label').textContent.trim()),button:node.querySelector('button[type="submit"]').textContent,privacy:node.querySelector('fieldset>p').textContent}];
  if(tag==='img')return [image(node)];
  if(/^h[1-6]$/.test(tag))return [{kind:'heading',level:Number(tag[1]),html:inline(node)}];
  if(tag==='a'){
   const url=allowedLink(node.getAttribute('href'));return url?[{kind:node.classList.contains('btn')?'button':'paragraph',html:node.classList.contains('btn')?[...node.childNodes].map(inline).join(''):inline(node),url}]:[];
  }
  if(tag==='p'&&node.querySelector('a.btn')&&node.children.length===1&&node.textContent.trim()===node.children[0].textContent.trim())return walk(node.children[0]);
  if(['p','summary','figcaption'].includes(tag)||node.classList.contains('eyebrow')||node.classList.contains('den-badge__name')){
   const text=inline(node),links=[...node.querySelectorAll('a[href]')].map(a=>({text:a.textContent,url:allowedLink(a.getAttribute('href'))})).filter(a=>a.url);
   return plain(text).trim()?[{kind:'paragraph',html:text,links}]:[];
  }
  return [...node.children].flatMap(walk);
 }
 const sections=[],logo=doc.querySelector('.site-branding img');
 sections.push({id:'main',title:'Unit identity',nodes:[{kind:'heading',level:2,html:e(name)},...(logo?[image(logo)]:[])]});
 let omittedAnnouncement=false;
 const today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
 for(const [i,node] of [...doc.querySelector('main').children].entries()){
  const expiry=node.getAttribute('data-announcement-expires');
  if(expiry&&expiry<today){omittedAnnouncement=true;continue;}
  const nodes=walk(node);if(!nodes.length)continue;
  const id=node.id||(node.classList.contains('hero')?'welcome':node.classList.contains('template-meeting')?'meeting':'photos-'+i);
  const title=plain(nodes.find(n=>n.kind==='heading')?.html||node.getAttribute('aria-label')||'Activity photos');
  sections.push({id,title,expiry,nodes});
 }
 const footer=doc.querySelector('footer');if(footer)sections.push({id:'resources',title:'Footer and resources',nodes:walk(footer)});
 return {doc,images,sections,omittedAnnouncement};
}
function wordpressNode(node){
 if(node.kind==='image')return block('image',{},`<figure class="wp-block-image"><img alt="${e(node.alt)}"/></figure>`);
 if(node.kind==='heading')return block('heading',node.level===2?{}:{level:node.level},`<h${node.level} class="wp-block-heading">${node.html}</h${node.level}>`);
 if(node.kind==='button')return block('buttons',{},`<div class="wp-block-buttons">${block('button',{},`<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${e(node.url)}">${node.html}</a></div>`)}</div>`);
 return block('paragraph',{},`<p>${node.kind==='form'?e(node.text):node.html}</p>`);
}
const linksFor=node=>node.links?.length?node.links:node.url?[{text:plain(node.html),url:node.url}]:[];
function contentText(sections){
 return sections.map(s=>`\n${s.title}\nSection anchor: ${s.id}\n`+s.nodes.map(n=>n.kind==='image'?`Image: ${n.file}\nDescription: ${n.alt}`:n.kind==='form'?`${n.text}\nFields: ${n.fields.join(' / ')}\nButton: ${n.button}\nPrivacy note: ${n.privacy}`:plain(n.html)+linksFor(n).map(a=>`\nLink: ${a.text} → ${a.url}`).join('')).join('\n\n')).join('\n');
}
function recipeSection(section,wordpress){
 return `<section><h2>${e(section.title)}</h2><p>Section anchor: <code>${e(section.id)}</code>${section.expiry?` · Remove or schedule to end after ${e(section.expiry)}.`:''}</p>`+section.nodes.map(n=>{
  if(n.kind==='image')return `<figure><img src="${n.file}" alt="${e(n.alt)}" loading="lazy"><figcaption><strong>Image block:</strong> ${n.file}<br>Description: ${e(n.alt)}</figcaption></figure>`;
  if(n.kind==='form')return `<div class="form-setup"><h3>Add a native contact form</h3><p>${wordpress?'Use your site’s supported Form block or a form plugin.':'Add a Form block; set its Email Notification / storage recipient to your adult membership inbox.'} Ask only for an adult name, reply email and message. Test delivery to every intended recipient and check Reply To. Remove the setup reminder before publishing.</p><p>Field labels: ${n.fields.map(e).join(' / ')}<br>Button: ${e(n.button)}<br>Privacy note: ${e(n.privacy)}</p></div>`;
  return `<div class="copy"><strong>${n.kind==='heading'?'Heading '+n.level:n.kind==='button'?'Button':'Text'}</strong><p class="copy-text">${e(plain(n.html))}</p>${linksFor(n).map(a=>`<p>Link (${e(a.text)}): <code>${e(a.url)}</code></p>`).join('')}</div>`;
 }).join('')+'</section>';
}
function guide(m,platform,name){
 const wp=platform==='wordpress',title=wp?'WordPress pattern':'Squarespace recipe';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(name)} · ${title}</title><style>body{font:16px/1.55 system-ui,sans-serif;color:#302b26;background:#faf7f2;margin:0}main{max-width:900px;padding:32px 24px;margin:auto}h1,h2,h3{color:#1b3a2d;line-height:1.2}h1{font-size:30px}h2{font-size:23px}h3{font-size:18px}a{color:#1b3a2d;text-underline-offset:3px}section{padding:20px 0;border-top:1px solid #d9d2c7}figure{margin:16px 0}img{max-width:100%;max-height:240px;object-fit:contain}figcaption{font-size:14px}code,.copy-text{overflow-wrap:anywhere;white-space:pre-wrap}.copy{margin:12px 0;padding:12px;background:white;border:1px solid #ded8cf}.copy-text{margin:5px 0}.form-setup{border-left:3px solid #1b3a2d;padding-left:16px}li{margin-bottom:8px}@media print{body{background:white}main{padding:0}section,figure,.copy{break-inside:avoid}}</style></head><body><main><h1>${e(name)}: ${title}</h1>
 <p>${wp?'Import the editable blocks, then select the included photos in the empty Image blocks and finish your contact form.':'Build this page in Squarespace 7.1 using native sections, Text, Image, Button and Form blocks. This package is a guided recipe; it cannot be imported as a Squarespace template.'}</p>
 <ol>${wp?'<li>Unzip this package. In WordPress with a block theme, open Appearance → Editor → Patterns → My Patterns → Add Pattern → Import from JSON. Choose <strong>pattern.json</strong>, not this ZIP. On other themes, open the Patterns management screen from the editor’s options; the available menus depend on your WordPress version and theme.</li><li>Create a page and insert the imported pattern from My Patterns. Choose an unsynced pattern or detach it if each page needs independent edits. Set this page as the homepage if appropriate.</li><li>Upload the <strong>images</strong> folder’s files to Media Library. In each empty Image block choose its matching file using the section guide below, and retain the supplied description. The pattern intentionally has no external image URLs or embedded data images.</li>':'<li>Create an unpublished page. Add blank sections in the order below. Recreate each heading and paragraph using Text blocks, then add Image and Button blocks as shown. Copy text as plain text.</li><li>Upload the included image files into your site. Set the image descriptions, button links and section anchors. Put the unit logo in the site header using your site’s branding controls.</li>'}
 <li>Use your platform’s styles for the final layout. Reference colors: forest <code>#1B3A2D</code>, gold <code>#C8963E</code>, warm white <code>#FAF7F2</code>. Use your theme’s fonts and spacing; these blocks do not copy the exact Azimuth layout, navigation or header. See <a href="reference.html">the static layout reference</a> for comparison.</li>
 <li>Configure and test a native contact form in your platform. The editor’s hosted form endpoint is not connected by this package. Confirm every intended adult inbox receives a test and Reply To reaches the sender.</li>
 <li>Announcements do not inherit the static page’s automatic expiry. Schedule removal with your platform if supported, or set a calendar reminder and remove the announcement manually.${m.omittedAnnouncement?' An announcement whose end date has already passed was omitted from this package.':''}</li>
 <li>Preview on a phone. Check all links, meeting details, costs, image permissions and your form before publishing. Your platform’s header/footer navigation must use the matching section anchors below. Avoid duplicate anchors if you insert this pattern twice.</li>
 <li>Make later updates in WordPress or Squarespace. Re-importing a fresh package can overwrite or duplicate your work; it does not synchronize with this editor. Keep the separate <strong>Save settings</strong> backup for future editor use.</li></ol>
 <p><a href="content.txt">Plain-text copy and link list</a> · <a href="ASSET-SOURCES.txt">Image usage and sources</a> · <a href="${HOSTS[platform].docs}">Official ${wp?'pattern import':'Form block'} instructions</a></p>
 ${m.sections.map(s=>recipeSection(s,wp)).join('')}<p>Prepared with the Cadre Software Scout website editor. This guide and reference do not send messages or publish your website.</p></main></body></html>`;
}
export async function builderDownload(html,platform,{name='Unit website',now=new Date()}={}){
 if(!HOSTS[platform]?.builder)throw new Error('Choose a supported builder download.');
 const m=model(html,now,name),reference=m.doc;
 reference.querySelectorAll('script').forEach(n=>n.remove());
 reference.querySelectorAll('form').forEach(form=>{form.removeAttribute('action');form.dataset.mode='preview';form.querySelectorAll('fieldset,input,button,textarea').forEach(n=>n.disabled=true);});
 const delivery=reference.querySelector('#contact-delivery');if(delivery)delivery.textContent='Layout reference only. Add and test your platform’s native contact form.';
 // A local reference shows retained announcements, but carries no expiry script.
 reference.querySelectorAll('[data-announcement-expires]').forEach(node=>{if(m.sections.some(s=>s.id===node.id))node.hidden=false;else node.remove();});
 const sourceResponse=await fetch(new URL('assets/ASSET-SOURCES.txt',import.meta.url));
 if(!sourceResponse.ok)throw new Error('This website asset-source guide could not be included. Try again.');
 const files=[{name:'START-HERE.html',data:guide(m,platform,name)},{name:'content.txt',data:contentText(m.sections)},{name:'reference.html',data:'<!doctype html>\n'+reference.documentElement.outerHTML},{name:'ASSET-SOURCES.txt',data:await sourceResponse.text()},...m.images.map(i=>({name:i.file,data:i.bytes}))];
 if(platform==='wordpress')files.push({name:'pattern.json',data:JSON.stringify({__file:'wp_block',title:name+' website',content:m.sections.map(s=>block('group',{anchor:s.id},`<div id="${e(s.id)}" class="wp-block-group">\n${s.nodes.map(wordpressNode).join('\n\n')}\n</div>`)).join('\n\n'),syncStatus:'unsynced'},null,2)+'\n'});
 return {file:HOSTS[platform].file,blob:filesZIP(files)};
}
