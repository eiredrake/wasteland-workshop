import type { ScanRecognizer, ScanPassDiagnostic } from './ScanRecognition'
import type { Blueprint } from '../blueprints/Blueprint'
export type PhotoCrop = {x:number;y:number;width:number;height:number}
export const fullPhotoCrop: PhotoCrop = {x:0,y:0,width:1,height:1}
export const titlePhotoCrop: PhotoCrop = {x:.04,y:.10,width:.78,height:.18}
export const PHOTO_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'
export function supportedPhoto(file:Pick<File,'name'|'type'|'size'>):boolean {
 return file.size>0 && file.size<=30*1024*1024 && (/^image\/(jpe?g|png|webp|heic|heif)$/i.test(file.type)||/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name))
}
export function photoGeometry(width:number,height:number,rotation:number,crop:PhotoCrop) {
 if(![width,height].every(n=>Number.isFinite(n)&&n>0)||![0,90,180,270].includes(rotation)||![crop.x,crop.y,crop.width,crop.height].every(Number.isFinite)||crop.x<0||crop.y<0||crop.width<=0||crop.height<=0||crop.x+crop.width>1.00001||crop.y+crop.height>1.00001)throw new Error('Select a crop inside the photo.')
 const w=rotation%180?height:width,h=rotation%180?width:height
 return {width:w,height:h,x:crop.x*w,y:crop.y*h,cropWidth:crop.width*w,cropHeight:crop.height*h}
}
export async function decodePhoto(file:File):Promise<HTMLCanvasElement> {
 if(!supportedPhoto(file))throw new Error('Choose a JPEG, PNG or WebP image, or a HEIC/HEIF photo supported by this browser (up to 30 MB).')
 let bitmap:ImageBitmap|undefined
 try{
  // Some camera/file providers label JPEGs image/jpg or omit their MIME type.
  const jpeg=/\.jpe?g$/i.test(file.name)||/^image\/jpe?g$/i.test(file.type)
  const input=jpeg&&file.type!=='image/jpeg'?file.slice(0,file.size,'image/jpeg'):file
  bitmap=await createImageBitmap(input,{imageOrientation:'from-image'})
  if(bitmap.width*bitmap.height>60000000)throw new Error('This photo is too large. Choose a smaller copy.')
  const scale=Math.min(1,2560/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas')
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale))
  const context=canvas.getContext('2d');if(!context)throw new Error('Not enough memory to read this photo.')
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas
 }catch(error){throw new Error(error instanceof Error&&/too large|memory/.test(error.message)?error.message:'This browser could not decode the photo. Try a JPEG, PNG or WebP copy.',{cause:error})}
 finally{bitmap?.close()}
}
export function adjustPhoto(original:HTMLCanvasElement,rotation:number,crop:PhotoCrop=fullPhotoCrop):HTMLCanvasElement {
 const geometry=photoGeometry(original.width,original.height,rotation,crop)
 const rotated=document.createElement('canvas');rotated.width=geometry.width;rotated.height=geometry.height
 const context=rotated.getContext('2d');if(!context)throw new Error('Not enough memory to prepare this photo.')
 context.translate(rotated.width/2,rotated.height/2);context.rotate(rotation*Math.PI/180);context.drawImage(original,-original.width/2,-original.height/2)
 const result=document.createElement('canvas'),scale=Math.min(1,1800/Math.max(geometry.cropWidth,geometry.cropHeight))
 result.width=Math.max(1,Math.round(geometry.cropWidth*scale));result.height=Math.max(1,Math.round(geometry.cropHeight*scale))
 try{const target=result.getContext('2d');if(!target)throw new Error('Not enough memory to prepare this photo.');target.drawImage(rotated,geometry.x,geometry.y,geometry.cropWidth,geometry.cropHeight,0,0,result.width,result.height);return result}
 finally{rotated.width=rotated.height=0}
}
// Both inputs use the same recognizer/matcher. Photo framing needs a full-image
// fallback; the existing engine already retries grayscale/contrast variants.
export async function recognizePhoto(image:HTMLCanvasElement,recognizer:ScanRecognizer,catalog:Blueprint[],cropped:boolean,diagnostic?:(pass:ScanPassDiagnostic)=>void) {
 if(cropped)return recognizer.recognize(image,catalog,diagnostic)
 const title=adjustPhoto(image,0,titlePhotoCrop)
 let first
 try{first=await recognizer.recognize(title,catalog,diagnostic)}finally{title.width=title.height=0}
 if(first.confidence==='high')return first
 const full=await recognizer.recognize(image,catalog,diagnostic)
 return full.confidence==='none'&&first.confidence!=='none'?first:full
}
