import {STYLE_FILES,ASSETS} from './corpus.mjs?v=6';
const cache=new Map();
export async function dataURL(url){
 if(!cache.has(url))cache.set(url,(async()=>{
  const response=await fetch(url);if(!response.ok)throw new Error('An included asset could not be loaded.');
  const blob=await response.blob();
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
 })().catch(error=>{cache.delete(url);throw error;}));
 return cache.get(url);
}
export async function templateStyles(){
 return (await Promise.all(STYLE_FILES.map(async file=>{
  const response=await fetch(file);if(!response.ok)throw new Error('Website styles could not be loaded.');
  let css=await response.text();
  // The templates use Barlow, Barlow Condensed, Source Serif 4, and solid icons.
  // Retain all their language subsets, but avoid shipping unused font families
  // and TTF fallbacks alongside the WOFF2 faces supported by modern browsers.
  css=css.replace(/@font-face\s*\{[^}]*\}/g,rule=>{
   const used=/font-family:\s*['"]?(?:Barlow(?: Condensed)?['";]|Source Serif 4['";])/.test(rule)||(/font-family:\s*['"]Font Awesome 6 Free['"]/.test(rule)&&/font-weight:\s*900/.test(rule));
   return used?rule.replace(/,\s*url\([^)]*\.ttf\)\s*format\(['"]truetype['"]\)/g,''):'';
  });
  const matches=[...css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^'"\s)]+))\s*\)/g)];
  for(const match of matches){
   const source=match[1]??match[2]??match[3];
   // Preserve data-URI artwork and its internal SVG fragment references.
   if(source.startsWith('data:')||source.startsWith('#'))continue;
   const url=new URL(source,new URL(file,location.href)).href;
   css=css.replace(match[0],`url("${await dataURL(url)}")`);
  }
  return css;
 }))).join('\n');
}
export async function embeddedImages(html){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const allowed=new Set(ASSETS.flatMap(a=>[a.src,a.thumb]));
 await Promise.all([...doc.querySelectorAll('img,link[rel="icon"]')].map(async image=>{
  const attribute=image.tagName==='LINK'?'href':'src',src=image.getAttribute(attribute);if(!src||src.startsWith('data:'))return;
  if(!allowed.has(src))throw new Error('Unexpected template image.');
  image.setAttribute(attribute,await dataURL(src));
 }));
 return '<!doctype html>\n'+doc.documentElement.outerHTML;
}
