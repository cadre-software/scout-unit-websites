// Copyright 2026 Cadre Software. SPDX-License-Identifier: GPL-2.0-or-later
import {ASSETS} from './corpus.mjs?v=5';
import {CONTENT_SECTIONS,CONTENT_LIMIT,imageSlots} from './page-content.mjs?v=5';

// Public website settings only. Delivery recipients and credentials belong
// in the form provider's dashboard and are never part of this file format.
const limits={name:200,town:200,meeting:200,place:200,email:254,intro:600,costs:600,application:2048,calendar:2048,council:2048,formEndpoint:2048,photoAlt:200};
export const SETTINGS_MAX_BYTES=32*1024*1024;
export function readSettings(value){
 if(!value||value.format!=='cadre-scout-website'||![1,2].includes(value.version)||!value.settings||!['pack','troop'].includes(value.settings.type))throw new Error('Choose a settings file saved by this website editor.');
 const source=value.settings,result={type:source.type};
 for(const [key,max] of Object.entries(limits)){
  const text=source[key]??'';
  if(typeof text!=='string'||text.length>max)throw new Error('A saved setting is too long or has an invalid format.');
  result[key]=text;
 }
 for(const [key,group] of [['logoChoice','Scouting emblems'],['photoChoice','Photos']]){
  const id=source[key]??'';
  if(typeof id!=='string'||(id&&!ASSETS.some(a=>a.id===id&&a.group===group&&a.unitTypes.includes(result.type))))throw new Error('A saved library image is unavailable for this program.');
  result[key]=id;
 }
 for(const key of ['logo','photo']){
  const data=source[key]??'';
  if(typeof data!=='string'||(data&&!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data)))throw new Error('A saved image is not a supported image.');
  result[key]=data;
 }
 result.content={};result.images={};
 if(source.content!==undefined&&(!source.content||typeof source.content!=='object'||Array.isArray(source.content)))throw new Error('Invalid saved page text.');
 for(const [key] of CONTENT_SECTIONS.flatMap(section=>section.fields)){
  if(source.content?.[key]===undefined)continue;
  if(typeof source.content[key]!=='string'||source.content[key].length>CONTENT_LIMIT)throw new Error('A saved page text is too long or invalid.');
  result.content[key]=source.content[key];
 }
 if(source.images!==undefined&&(!source.images||typeof source.images!=='object'||Array.isArray(source.images)))throw new Error('Invalid saved page images.');
 for(const slot of imageSlots(result.type)){
  const image=source.images?.[slot.id];if(image===undefined)continue;
  if(!image||typeof image!=='object'||Array.isArray(image))throw new Error('Invalid saved page image.');
  const {choice='',data='',alt='',hidden=false}=image;
  if(typeof choice!=='string'||(choice&&!ASSETS.some(a=>a.id===choice&&a.group===slot.group&&a.unitTypes.includes(result.type))))throw new Error('A saved library image is unavailable for this program.');
  if(typeof data!=='string'||(data&&!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data))||typeof alt!=='string'||alt.length>200||typeof hidden!=='boolean')throw new Error('A saved image is not a supported image.');
  result.images[slot.id]={choice,data,alt,hidden};
 }
 return result;
}
export function writeSettings(settings){
 const value={format:'cadre-scout-website',version:2,settings};
 const text=JSON.stringify({...value,settings:readSettings(value)},null,2)+'\n';
 if(new TextEncoder().encode(text).byteLength>SETTINGS_MAX_BYTES)throw new Error('These settings exceed 32 MB. Use smaller uploaded images before saving.');
 return text;
}
