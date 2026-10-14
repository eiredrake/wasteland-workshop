import {scannerError,validateScanRequest,type ScanImageRequest,type Outcome} from '../ocr/OcrTypes'
// Exact 1:1 pixel extraction only. No resizing, enhancement, thresholding or guessed targets.
export async function extractImageRegion(request:ScanImageRequest):Promise<Outcome<Blob>>{
 const invalid=validateScanRequest(request);if(invalid)return {ok:false,error:invalid}
 const {x,y,width,height}=request.target
 if(request.image instanceof Blob&&x===0&&y===0&&width===request.width&&height===request.height)return {ok:true,value:request.image}
 let url:string|undefined;let canvas:HTMLCanvasElement|undefined
 try{
  canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  const context=canvas.getContext('2d');if(!context)throw Error('Image canvas is unavailable.')
  if(request.image instanceof Blob){
   url=URL.createObjectURL(request.image);const image=new Image();image.src=url;await image.decode()
   if(image.naturalWidth!==request.width||image.naturalHeight!==request.height)throw Error('Decoded image dimensions do not match the scan request.')
   context.drawImage(image,x,y,width,height,0,0,width,height)
  }else{
   if(request.image.pixels.length!==request.width*request.height*4)throw Error('RGBA buffer dimensions do not match the image.')
   context.putImageData(new ImageData(new Uint8ClampedArray(request.image.pixels),request.width,request.height),-x,-y)
  }
  const blob=await new Promise<Blob>((resolve,reject)=>canvas!.toBlob(value=>value?resolve(value):reject(Error('Image region could not be encoded.')),'image/png'))
  return {ok:true,value:blob}
 }catch(error){return {ok:false,error:scannerError('IMAGE_INVALID','image',error instanceof Error?error.message:String(error))}}
 finally{if(url)URL.revokeObjectURL(url);if(canvas){canvas.width=0;canvas.height=0}}
}
