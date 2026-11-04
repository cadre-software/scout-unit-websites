// Header inspection bounds decoded image memory before createImageBitmap.
// PNG IHDR: https://www.w3.org/TR/png-3/#11IHDR
// WebP: https://developers.google.com/speed/webp/docs/riff_container
export const SAVED_IMAGE_PIXELS=1600*1600; // Two saved images total at most 5.12 MP.
export class ImageInputError extends Error{}
const invalid=()=>{throw new ImageInputError('Choose a readable JPG, PNG, or still WebP image.');};
export function imageDimensions(bytes){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),n=bytes.length;
 const text=(offset,length)=>String.fromCharCode(...bytes.subarray(offset,offset+length));
 if(n>=33&&bytes[0]===137&&text(1,7)==='PNG\r\n\x1a\n'){
  if(view.getUint32(8)!==13||text(12,4)!=='IHDR')return invalid();
  return {width:view.getUint32(16),height:view.getUint32(20)};
 }
 if(n>=4&&bytes[0]===255&&bytes[1]===216){
  let offset=2;
  while(offset<n){
   if(bytes[offset++]!==255)return invalid();while(bytes[offset]===255)offset++;
   const marker=bytes[offset++];if(marker===217||marker===218)return invalid();
   if(marker===1||(marker>=208&&marker<=215))continue;
   if(offset+2>n)return invalid();const length=view.getUint16(offset);
   if(length<2||offset+length>n)return invalid();
   if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){
    if(length<8)return invalid();return {width:view.getUint16(offset+5),height:view.getUint16(offset+3)};
   }
   offset+=length;
  }
 }
 if(n>=20&&text(0,4)==='RIFF'&&text(8,4)==='WEBP'){
  if(view.getUint32(4,true)+8!==n)return invalid();
  let offset=12,canvas=null,pixels=null;
  const u24=at=>bytes[at]+bytes[at+1]*256+bytes[at+2]*65536;
  while(offset+8<=n){
   const tag=text(offset,4),length=view.getUint32(offset+4,true),data=offset+8;
   if(data+length>n)return invalid();
   if(tag==='ANIM'||tag==='ANMF')return invalid();
   if(tag==='VP8X'){
    if(length!==10||canvas||(bytes[data]&2))return invalid();
    canvas={width:u24(data+4)+1,height:u24(data+7)+1};
   }else if(tag==='VP8 '){
    if(length<10||pixels||text(data+3,3)!=='\x9d\x01\x2a')return invalid();
    pixels={width:view.getUint16(data+6,true)&16383,height:view.getUint16(data+8,true)&16383};
   }else if(tag==='VP8L'){
    if(length<5||pixels||bytes[data]!==47)return invalid();const bits=view.getUint32(data+1,true);
    pixels={width:(bits&16383)+1,height:((bits>>>14)&16383)+1};
   }
   offset=data+length+(length%2);
  }
  if(offset!==n||!pixels||(canvas&&(canvas.width!==pixels.width||canvas.height!==pixels.height)))return invalid();
  return pixels;
 }
 return invalid();
}
export async function checkImageSize(blob,maxPixels=24_000_000){
 if(blob.size>12*1024*1024)throw new ImageInputError('This image is too large. Resize it before using it here.');
 const {width,height}=imageDimensions(new Uint8Array(await blob.arrayBuffer()));
 if(!width||!height||width>16384||height>16384||width*height>maxPixels)throw new ImageInputError('This image is too large. Resize it before using it here.');
}
