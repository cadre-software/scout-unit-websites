// Fixed trusted behavior; user content never enters this JavaScript.
export const SITE_RUNTIME=`(()=>{
const header=document.querySelector('.site-header'),menu=document.querySelector('.main-navigation'),toggle=document.querySelector('.menu-toggle');
if(!header||!menu||!toggle)return;
const mobile=matchMedia('(max-width:640px)');
function close(restore=false){menu.classList.remove('toggled');toggle.setAttribute('aria-expanded','false');document.body.style.overflow='';if(restore)toggle.focus();}
toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';if(!open){close();return;}menu.classList.add('toggled');toggle.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';menu.querySelector('a')?.focus();});
menu.addEventListener('click',event=>{if(event.target.closest('a'))close();});
document.addEventListener('keydown',event=>{if(toggle.getAttribute('aria-expanded')!=='true')return;if(event.key==='Escape'){event.preventDefault();close(true);}if(event.key==='Tab'){const controls=[toggle,...menu.querySelectorAll('a')],first=controls[0],last=controls[controls.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
mobile.addEventListener('change',()=>{if(!mobile.matches)close();});
const scroll=()=>header.classList.toggle('scrolled',scrollY>30);addEventListener('scroll',scroll,{passive:true});scroll();
const form=document.querySelector('.template-contact-form[data-mode="ready"]');
if(form){
 const status=form.querySelector('[role="status"]');
 form.addEventListener('submit',event=>{
  if(location.protocol==='file:'||!navigator.onLine){event.preventDefault();status.textContent=location.protocol==='file:'?'Publish this website at its web address before sending a message.':'You appear to be offline. Reconnect and try again.';status.focus();return;}
  status.textContent='Opening the secure form service…';
 });
 document.addEventListener('securitypolicyviolation',event=>{
  if(event.effectiveDirective==='form-action'&&event.disposition==='enforce'){status.textContent='The website could not open the form service. Your message was not sent. Please use another unit contact or try again later.';status.focus();}
 });
 addEventListener('pageshow',()=>{status.textContent='';});
}
})();`;

// Editor-only behavior. Never included in a downloaded unit website.
export const PREVIEW_RUNTIME=`(()=>{
const token=document.body.dataset.previewEditor,origin=document.body.dataset.previewParent;
if(!token||!origin||parent===window)return;
const roots=[...document.querySelectorAll('[data-edit-section]')];
const names={unit:'Meeting information',media:'Logo and welcome photo',hero:'Welcome',about:'What we do',family:'Family adventure / youth leadership',outdoors:'Outdoor adventures',ranks:'Dens / advancement',visit:'Visiting and joining',families:'New families and uniforms',calendar:'Calendar',contact:'Contact and navigation'};
function mark(section,clicked=null){const group=section==='media'?'hero':section==='links'?'contact':section;for(const root of roots)root.classList.toggle('preview-selected',clicked?root===clicked:root.dataset.editSection===group);}
mark(document.body.dataset.previewSelected);
for(const root of roots){
 if(root.matches('header,footer'))continue;
 const button=document.createElement('button');button.type='button';button.className='preview-edit-button';button.dataset.editPanel=root.dataset.editSection;button.textContent='Edit '+names[root.dataset.editSection];root.prepend(button);
}
document.addEventListener('click',event=>{
 if(!(event.target instanceof Element)||event.target.closest('.menu-toggle'))return;
 const root=event.target.closest('[data-edit-section]');if(!root)return;
 const field=event.target.closest('[data-edit-panel]');
 let section=field?.dataset.editPanel||root.dataset.editSection,id=field?.dataset.editField||'';
 if(!field&&root.classList.contains('hero')&&!event.target.closest('.hero__content')){section='media';id='photoChoice';}
 if(!Object.hasOwn(names,section))return;
 if(event.target.closest('a,button'))event.preventDefault();
 mark(section,root);
 parent.postMessage({type:'cadre-preview-select',token,section,field:id},origin);
},true);
const selected=document.body.dataset.previewSection;
if(selected)addEventListener('load',()=>{document.getElementById(selected)?.scrollIntoView({behavior:'instant',block:'start'});},{once:true});
})();`;
