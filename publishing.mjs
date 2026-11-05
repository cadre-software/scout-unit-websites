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
 github:{label:'GitHub Pages / HTML file',file:'index.html',instructions:'Upload or replace index.html in the root of your unit’s Pages repository. A helper enables Pages from main / root. GitHub’s upload screen does not unpack ZIP files.',docs:'https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site'}
};
// ZIP method 0 (stored), a single fixed filename. No dependencies or user paths.
// Layout: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
export function websiteZIP(html){
 const data=new TextEncoder().encode(html),name=new TextEncoder().encode('index.html');
 if(data.length>64*1024*1024)throw new Error('This website is too large to package. Use fewer or smaller photos.');
 let crc=0xffffffff;
 for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 crc=(crc^0xffffffff)>>>0;
 const header=new Uint8Array(30+name.length),local=new DataView(header.buffer);
 local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);local.setUint16(12,33,true);
 local.setUint32(14,crc,true);local.setUint32(18,data.length,true);local.setUint32(22,data.length,true);local.setUint16(26,name.length,true);header.set(name,30);
 const directory=new Uint8Array(46+name.length),central=new DataView(directory.buffer);
 central.setUint32(0,0x02014b50,true);central.setUint16(4,20,true);central.setUint16(6,20,true);central.setUint16(14,33,true);
 central.setUint32(16,crc,true);central.setUint32(20,data.length,true);central.setUint32(24,data.length,true);central.setUint16(28,name.length,true);directory.set(name,46);
 const end=new Uint8Array(22),view=new DataView(end.buffer);
 view.setUint32(0,0x06054b50,true);view.setUint16(8,1,true);view.setUint16(10,1,true);view.setUint32(12,directory.length,true);view.setUint32(16,header.length+data.length,true);
 return new Blob([header,data,directory,end],{type:'application/zip'});
}
export function websiteDownload(html,host){
 if(!Object.hasOwn(HOSTS,host))throw new Error('Choose a supported download option.');
 if(host==='cloudflare'&&new TextEncoder().encode(html).length>25*1024*1024)throw new Error('Cloudflare Pages limits each file to 25 MiB. Use fewer or smaller photos, then download again.');
 if(host==='github'&&new TextEncoder().encode(html).length>25*1024*1024)throw new Error('GitHub browser uploads limit each file to 25 MiB. Use fewer or smaller photos, then download again.');
 return {file:HOSTS[host].file,blob:['cloudflare','netlify'].includes(host)?websiteZIP(html):new Blob([html],{type:'text/html;charset=utf-8'})};
}
