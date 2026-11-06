// Copyright 2026 Cadre Software. SPDX-License-Identifier: GPL-2.0-or-later
export const OPTIONAL_SECTIONS=['about','family','outdoors','ranks','visit','families','calendar'];
export const sectionVisible=(settings,id)=>!OPTIONAL_SECTIONS.includes(id)||settings.sections?.[id]!==false;
export function validDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00Z');return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;
}
export const HOSTS={
 html:{label:'Another host / HTML file',file:'index.html',instructions:'Publish index.html using your host’s file manager. Keep your settings backup separately. Update the same site next time.'},
 cloudflare:{label:'Cloudflare Pages / ZIP upload',file:'unit-website-cloudflare.zip',instructions:'Upload this ZIP to a Pages Direct Upload project. index.html is at the ZIP’s top level. For later updates, create a new production deployment in the same project.',docs:'https://developers.cloudflare.com/pages/get-started/direct-upload/'},
 netlify:{label:'Netlify Drop / unzip first',file:'unit-website-netlify.zip',instructions:'Unzip this download into a folder. Drag that folder, containing index.html, into Netlify Drop. For later updates, use the same site’s Deploys page.',docs:'https://docs.netlify.com/deploy/create-deploys/#drag-and-drop'},
 wordpress:{label:'WordPress / pattern and images',file:'unit-website-wordpress.zip',builder:true,instructions:'Unzip, open START-HERE.html, then import pattern.json into WordPress Patterns. Upload the included images to your Media Library and select them in the image placeholders. Add and test a native contact form. Your theme controls the final appearance.',docs:'https://wordpress.com/support/export-import-patterns/'},
 squarespace:{label:'Squarespace / guided recipe',file:'unit-website-squarespace.zip',builder:true,instructions:'Unzip and open START-HERE.html. Recreate the sections in Squarespace using the included copy, images and button links. Configure a native Form block. This is a guided recipe, not an automatic template import.',docs:'https://support.squarespace.com/hc/en-us/articles/206566737-Form-blocks'},
 github:{label:'GitHub Pages / HTML file',file:'index.html',instructions:'Upload or replace index.html in the root of your unit’s Pages repository. A helper enables Pages from main / root. GitHub’s upload screen does not unpack ZIP files.',docs:'https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site'}
};
// ZIP method 0 (stored), bounded ASCII package paths and no dependencies.
// Layout: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
export function filesZIP(entries){
 if(!entries.length||entries.length>1000)throw new Error('This website package has too many files.');
 const encoder=new TextEncoder(),parts=[],directories=[],seen=new Set();let offset=0;
 for(const entry of entries){
  if(!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(entry.name)||entry.name.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(entry.name))throw new Error('Unexpected package filename.');
  seen.add(entry.name);
  const data=typeof entry.data==='string'?encoder.encode(entry.data):entry.data,name=encoder.encode(entry.name);
  if(!(data instanceof Uint8Array)||offset+data.length>64*1024*1024)throw new Error('This website is too large to package. Use fewer or smaller photos.');
  let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  crc=(crc^0xffffffff)>>>0;
  const header=new Uint8Array(30+name.length),local=new DataView(header.buffer);
  local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);local.setUint16(12,33,true);
  local.setUint32(14,crc,true);local.setUint32(18,data.length,true);local.setUint32(22,data.length,true);local.setUint16(26,name.length,true);header.set(name,30);
  const directory=new Uint8Array(46+name.length),central=new DataView(directory.buffer);
  central.setUint32(0,0x02014b50,true);central.setUint16(4,20,true);central.setUint16(6,20,true);central.setUint16(14,33,true);
  central.setUint32(16,crc,true);central.setUint32(20,data.length,true);central.setUint32(24,data.length,true);central.setUint16(28,name.length,true);central.setUint32(42,offset,true);directory.set(name,46);
  parts.push(header,data);directories.push(directory);offset+=header.length+data.length;
 }
 const directorySize=directories.reduce((total,part)=>total+part.length,0),end=new Uint8Array(22),view=new DataView(end.buffer);
 view.setUint32(0,0x06054b50,true);view.setUint16(8,entries.length,true);view.setUint16(10,entries.length,true);view.setUint32(12,directorySize,true);view.setUint32(16,offset,true);
 return new Blob([...parts,...directories,end],{type:'application/zip'});
}
export function websiteZIP(html){return filesZIP([{name:'index.html',data:html}]);}
export function websiteDownload(html,host){
 if(!Object.hasOwn(HOSTS,host))throw new Error('Choose a supported download option.');
 if(HOSTS[host].builder)throw new Error('Choose the builder package exporter.');
 if(host==='cloudflare'&&new TextEncoder().encode(html).length>25*1024*1024)throw new Error('Cloudflare Pages limits each file to 25 MiB. Use fewer or smaller photos, then download again.');
 if(host==='github'&&new TextEncoder().encode(html).length>25*1024*1024)throw new Error('GitHub browser uploads limit each file to 25 MiB. Use fewer or smaller photos, then download again.');
 return {file:HOSTS[host].file,blob:['cloudflare','netlify'].includes(host)?websiteZIP(html):new Blob([html],{type:'text/html;charset=utf-8'})};
}
