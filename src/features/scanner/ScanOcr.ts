import { scanFrameBounds } from '../../components/CameraPreview/CameraGeometry'
import type { Worker } from 'tesseract.js'
import { extractScanNames, matchScanNames, type ScanMatch } from './ScanMatching'
import type { Blueprint } from '../blueprints/Blueprint'
export type ScanRecognizer={recognize:(image:HTMLCanvasElement,catalog:Blueprint[])=>Promise<ScanMatch>;close:()=>Promise<void>}
export function createScanRecognizer():ScanRecognizer {
 let pending:Promise<Worker>|undefined,closed=false
 const worker=()=>pending??=(async()=>{
  const {createWorker}=await import('tesseract.js')
  const base=new URL(import.meta.env.BASE_URL+'ocr/',location.origin).href
  const instance=await createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base,workerBlobURL:false,cacheMethod:'none'})
  if(closed){await instance.terminate();throw new Error('Scanner closed.')}
  await instance.setParameters({tessedit_pageseg_mode:'11' as import('tesseract.js').PSM})
  return instance
 })()
 return {
  async recognize(image,catalog){
   const instance=await worker()
   if(closed)throw new Error('Scanner closed.')
   const title=document.createElement('canvas');title.width=image.width;title.height=Math.round(image.height*.36)
   title.getContext('2d')!.drawImage(image,0,0,image.width,title.height,0,0,title.width,title.height)
   try {
    const first=await instance.recognize(title)
    const match=matchScanNames(extractScanNames(first.data.text),catalog)
    if(match.confidence!=='none')return match
    // Bounded small-angle retry for curled/tilted paper; no perspective inference.
    for(const degrees of [-5,5]){
     if(closed)throw new Error('Scanner closed.')
     const rotated=document.createElement('canvas');rotated.width=title.width;rotated.height=title.height
     try{
      const context=rotated.getContext('2d')!;context.fillStyle='white';context.fillRect(0,0,rotated.width,rotated.height)
      context.translate(rotated.width/2,rotated.height/2);context.rotate(degrees*Math.PI/180);context.drawImage(title,-title.width/2,-title.height/2)
      const result=await instance.recognize(rotated),candidate=matchScanNames(extractScanNames(result.data.text),catalog)
      if(candidate.confidence!=='none')return candidate
     }finally{rotated.width=rotated.height=0}
    }
   }finally{title.width=title.height=0}
   if(closed)throw new Error('Scanner closed.')
   const full=await instance.recognize(image)
   // Full-page fallback must find the Item Name label; never match incidental mechanics.
   return matchScanNames(/item\s*name/i.test(full.data.text)?extractScanNames(full.data.text):[],catalog)
  },
  async close(){closed=true;if(pending){try{await(await pending).terminate()}catch{/* Initialization may already be cancelled. */}}}
 }
}
// Crop to the visible inset frame with object-fit:contain; resize and grayscale.
export function captureScanFrame(video:HTMLVideoElement):HTMLCanvasElement {
 if(!video.videoWidth||!video.videoHeight)throw new Error('Camera is not ready. Wait for the preview and try again.')
 const frame=scanFrameBounds(video.videoWidth,video.videoHeight)
 const canvas=document.createElement('canvas'),width=frame.width,height=frame.height
 const scale=Math.min(1,1600/Math.max(width,height));canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale)
 const ctx=canvas.getContext('2d')!;ctx.drawImage(video,frame.x,frame.y,width,height,0,0,canvas.width,canvas.height)
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height)
 for(let i=0;i<pixels.data.length;i+=4){const gray=.299*pixels.data[i]+.587*pixels.data[i+1]+.114*pixels.data[i+2];pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=gray}
 ctx.putImageData(pixels,0,0);return canvas
}
