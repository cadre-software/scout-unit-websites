// Copyright 2026 Cadre Software. SPDX-License-Identifier: GPL-2.0-or-later
// Remove metadata without decoding/re-encoding pixels. The importer validates
// orientation first. ICC profiles and all compressed scans remain unchanged.
export function stripJPEGMetadata(input){
 const data=Buffer.from(input);
 if(data.length<2||data[0]!==255||data[1]!==216)return data;
 const parts=[data.subarray(0,2)];let offset=2;
 while(offset<data.length){
  const start=offset;
  if(data[offset++]!==255)throw new Error('Invalid JPEG marker');
  while(offset<data.length&&data[offset]===255)offset++;
  if(offset>=data.length)throw new Error('Truncated JPEG marker');
  const marker=data[offset++];
  if(marker===217){parts.push(data.subarray(start,offset));return Buffer.concat(parts);}
  if(marker===1||(marker>=208&&marker<=215)){parts.push(data.subarray(start,offset));continue;}
  if(marker===0||marker===216||offset+2>data.length)throw new Error('Invalid JPEG segment');
  const length=data.readUInt16BE(offset),end=offset+length;
  if(length<2||end>data.length)throw new Error('Invalid JPEG segment length');
  // APP1: EXIF/XMP. APP13: IPTC. COM: arbitrary camera comments.
  if(![225,237,254].includes(marker))parts.push(data.subarray(start,end));
  offset=end;
  if(marker===218){
   const scan=offset;let next=-1;
   while(offset<data.length){
    if(data[offset++]!==255)continue;
    const candidate=offset-1;while(offset<data.length&&data[offset]===255)offset++;
    if(offset>=data.length)throw new Error('Truncated JPEG scan');
    const code=data[offset++];
    if(code===0||(code>=208&&code<=215))continue;
    next=candidate;break;
   }
   if(next<0)throw new Error('JPEG has no end marker');
   parts.push(data.subarray(scan,next));offset=next;
  }
 }
 throw new Error('JPEG has no end marker');
}
