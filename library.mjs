import {ASSETS} from './corpus.mjs?v=7';
import {escapeHTML as e} from './template.mjs?v=7';
const list=document.querySelector('#asset-list'),program=document.querySelector('#asset-program'),group=document.querySelector('#asset-group'),search=document.querySelector('#asset-search'),status=document.querySelector('#asset-count');
for(const label of new Set(ASSETS.map(a=>a.group)))group.add(new Option(label,label));
function render(){
 const query=search.value.trim().toLowerCase();
 const assets=ASSETS.filter(a=>(!program.value||a.unitTypes.includes(program.value))&&(!group.value||a.group===group.value)&&(!query||(a.label+' '+a.group).toLowerCase().includes(query)));
 list.innerHTML=assets.map(a=>{
  const type=program.value||a.unitTypes[0],field=a.group==='Photos'?'photoChoice':a.group==='Scouting emblems'?'logoChoice':'';
  return `<article class="asset-item"><a href="${e(a.original)}" target="_blank" rel="noopener"> <img src="${e(a.thumb)}" alt="${e(a.alt)}" loading="lazy"></a><h2>${e(a.label)}</h2><p>${e(a.group)} · ${a.unitTypes.length===2?'Pack and Troop':e(a.unitTypes[0]==='pack'?'Pack':'Troop')}</p><div><a class="button secondary small" href="${e(a.original)}" download>Download full-size</a>${field?`<a class="button small" href="customize.html?type=${type}&${field}=${encodeURIComponent(a.id)}">Use this ${field==='photoChoice'?'photo':'logo'}</a>`:''}</div></article>`;
 }).join('');
 status.textContent=`${assets.length} assets`;
}
for(const field of [program,group,search])field.addEventListener('input',render);
render();
