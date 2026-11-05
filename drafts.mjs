// Copyright 2026 Cadre Software. SPDX-License-Identifier: GPL-2.0-or-later
// Device-local storage only. Revisions prevent stale tabs from replacing work.
const DATABASE='cadre-scout-website-drafts';
export class DraftConflictError extends Error{
 constructor(){super('Another editor tab changed the saved draft.');this.name='DraftConflictError';}
}
function open(){
 return new Promise((resolve,reject)=>{
  let blocked=false;const request=indexedDB.open(DATABASE,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
  request.onsuccess=()=>{if(blocked){request.result.close();return;}request.result.onversionchange=()=>request.result.close();resolve(request.result);};
  request.onerror=()=>reject(new Error('Device storage is unavailable.'));
  request.onblocked=()=>{blocked=true;reject(new Error('Close other editor tabs to use device storage.'));};
 });
}
async function transaction(mode,action){
 const db=await open();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('drafts',mode);let result,failure;
  const fail=error=>{failure=error;tx.abort();reject(error);};
  tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(failure||tx.error||new Error('Device storage is unavailable.'));
  try{action(tx.objectStore('drafts'),value=>{result=value;},fail);}catch(error){fail(error);}
 });}finally{db.close();}
}
function snapshot(value){
 if(!value||!Number.isSafeInteger(value.revision)||value.revision<0)return {revision:0,remember:true,text:undefined};
 return {revision:value.revision,remember:value.remember!==false,text:value.text};
}
export function readDraft(){
 return transaction('readonly',(store,done)=>{const request=store.get('state');request.onsuccess=()=>done(snapshot(request.result));});
}
function changeDraft(text,expectedRevision,erase){
 return transaction('readwrite',(store,done,fail)=>{
  const request=store.get('state');request.onsuccess=()=>{
   try{
    const current=snapshot(request.result);
    if(!erase&&current.revision!==expectedRevision){fail(new DraftConflictError());return;}
    if(current.revision===Number.MAX_SAFE_INTEGER)throw new Error('Save settings, then clear this site’s browser data to reset draft storage.');
    const next={revision:current.revision+1,remember:!erase,text:erase?undefined:text};
    // Erasure also removes any obsolete records, while retaining its revision.
    if(erase)store.clear();store.put(next,'state');done(next);
   }catch(error){fail(error);}
  };
 });
}
export const writeDraft=(text,expectedRevision)=>changeDraft(text,expectedRevision,false);
export const eraseDraft=()=>changeDraft(undefined,undefined,true);
