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
const previewSection=document.body.dataset.previewSection;
if(previewSection)addEventListener('load',()=>{document.getElementById(previewSection)?.scrollIntoView({behavior:'instant',block:'start'});},{once:true});
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
