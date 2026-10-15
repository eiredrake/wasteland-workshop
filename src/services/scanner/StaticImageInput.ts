import type {DiagnosticInput} from './Diagnostics'
import {ScannerFailure,scannerError,type ScannerErrorCode,type Outcome,type ScanImageRequest,type TargetRegion} from '../ocr/OcrTypes'
export type PreparedImage={file:File;blob:Blob;width:number;height:number;sourceType:'FILE'|'CAMERA_CAPTURE';acquisitionId:string;initialTarget?:TargetRegion}
export async function prepareStaticImage(file:File,sourceType:PreparedImage['sourceType']='FILE',acquisitionId:string=crypto.randomUUID(),initialTarget?:TargetRegion,record?:(event:DiagnosticInput)=>void):Promise<Outcome<PreparedImage>>{
 const resourceId=acquisitionId+':source'
 const emit=(event:Partial<DiagnosticInput>&{type:string})=>record?.({stage:'image',scanId:acquisitionId,acquisitionId,sourceType,filename:file.name,fileSize:file.size,mimeType:file.type,lastModified:file.lastModified,resourceId,...event})
 async function step<T>(operation:string,api:string,event:string,code:ScannerErrorCode,action:()=>T|Promise<T>,extra:Partial<DiagnosticInput>={}):Promise<T>{
  const started=performance.now();emit({type:event+'_STARTED',operation,api,...extra})
  try{const value=await action();emit({type:event+'_SUCCEEDED',operation,api,status:'SUCCESS',durationMs:performance.now()-started,...extra,...(value instanceof ArrayBuffer?{byteLength:value.byteLength}:{})});return value}
  catch(cause){
   const exceptionName=cause instanceof Error?cause.name:typeof cause,exceptionMessage=cause instanceof Error?cause.message:String(cause)
   const error={...scannerError(code,'image',code==='IMAGE_READ_FAILED'?'The selected file could not be read. '+exceptionMessage:code==='IMAGE_PREVIEW_FAILED'?'The decoded image could not be prepared for preview. '+exceptionMessage:'The selected image could not be decoded. '+exceptionMessage),details:{operation,api,exceptionName,exceptionMessage}}
   emit({type:event+'_FAILED',operation,api,status:'FAILED',durationMs:performance.now()-started,exceptionName,exceptionMessage,error,...extra})
   throw new ScannerFailure(error)
  }
 }
 let url:string|undefined,canvas:HTMLCanvasElement|undefined,bitmap:ImageBitmap|undefined
 try{
  // Controlled Android provider test: obtain all bytes once, then decode only a memory-owned Blob.
  const bytes=await step('read-full-file','File.arrayBuffer()','IMAGE_READ','IMAGE_READ_FAILED',async()=>{const value=await file.arrayBuffer();if(value.byteLength!==file.size)throw new DOMException('The file read returned '+value.byteLength+' bytes; expected '+file.size+'.','NotReadableError');return value},{readScope:'entire file'})
  const header=new Uint8Array(bytes,0,Math.min(4,bytes.byteLength))
  if(file.type.startsWith('video/')||(header[0]===0x1a&&header[1]===0x45&&header[2]===0xdf&&header[3]===0xa3))return {ok:false,error:scannerError('VIDEO_UNSUPPORTED','image','Video input is unsupported for this static-image scanner.')}
  const snapshot=await step('create-memory-snapshot','new Blob(ArrayBuffer)','IMAGE_SNAPSHOT','IMAGE_READ_FAILED',()=>new Blob([bytes],{type:file.type}),{byteLength:bytes.byteLength})
  url=await step('create-source-url','URL.createObjectURL','IMAGE_REFERENCE','IMAGE_REFERENCE_FAILED',()=>URL.createObjectURL(snapshot));const image=await step('assign-source-url','HTMLImageElement.src','IMAGE_SOURCE','IMAGE_REFERENCE_FAILED',()=>{const element=new Image();element.src=url!;return element})
  let source:CanvasImageSource=image,width:number,height:number
  try{await step('decode-image-element','HTMLImageElement.decode','IMAGE_DECODE','IMAGE_DECODE_FAILED',()=>image.decode());width=image.naturalWidth;height=image.naturalHeight}
  catch(error){if(typeof createImageBitmap!=='function')throw error;bitmap=await step('decode-bitmap-fallback','createImageBitmap(imageOrientation=from-image)','IMAGE_DECODE','IMAGE_DECODE_FAILED',()=>createImageBitmap(snapshot,{imageOrientation:'from-image'}));source=bitmap;width=bitmap.width;height=bitmap.height}
  await step('validate-dimensions','naturalWidth/naturalHeight or ImageBitmap.width/height','IMAGE_DIMENSIONS','IMAGE_DECODE_FAILED',()=>{if(width<1||height<1)throw Error('The selected image has no pixels.')},{width,height})
  // Normalize native EXIF orientation once, at full decoded resolution. Review and OCR use these exact same pixels.
  await step('draw-normalized-preview','CanvasRenderingContext2D.drawImage','IMAGE_NORMALIZATION','IMAGE_PREVIEW_FAILED',()=>{
  canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  const context=canvas.getContext('2d');if(!context)throw Error('Image decoding canvas is unavailable.')
  context.drawImage(source,0,0,width,height)
  },{width,height})
  const blob=await step('encode-normalized-preview','HTMLCanvasElement.toBlob(image/png)','IMAGE_PREVIEW_ENCODING','IMAGE_PREVIEW_FAILED',()=>new Promise<Blob>((resolve,reject)=>canvas!.toBlob(value=>value?resolve(value):reject(Error('The decoded static image could not be encoded.')),'image/png')),{width,height})
  return {ok:true,value:{file,blob,width,height,sourceType,acquisitionId,initialTarget}}
 }catch(error){if(error instanceof ScannerFailure)return {ok:false,error:error.detail};const exceptionName=error instanceof Error?error.name:typeof error,exceptionMessage=error instanceof Error?error.message:String(error),detail={...scannerError('IMAGE_INVALID','image','The selected image could not be decoded. '+exceptionMessage),details:{operation:'prepare-static-image',api:'unclassified',exceptionName,exceptionMessage}};emit({type:'IMAGE_PREPARATION_FAILED',operation:'prepare-static-image',api:'unclassified',exceptionName,exceptionMessage,error:detail,status:'FAILED'});return {ok:false,error:detail}}
 finally{if(url){URL.revokeObjectURL(url);emit({type:'IMAGE_REFERENCE_REVOKED',operation:'revoke-source-url',api:'URL.revokeObjectURL',status:'SUCCESS'})}bitmap?.close();if(canvas){canvas.width=0;canvas.height=0}}
}
export function staticImageRequest(image:PreparedImage,target:TargetRegion,correlationId:string):ScanImageRequest{return {image:image.blob,sourceType:image.sourceType,width:image.width,height:image.height,target:{...target},correlationId}}
export function fullImageRequest(image:PreparedImage,correlationId:string):ScanImageRequest{return staticImageRequest(image,{x:0,y:0,width:image.width,height:image.height},correlationId)}
