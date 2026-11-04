(()=>{
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
})();