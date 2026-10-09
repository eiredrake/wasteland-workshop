import { scanFrameBounds } from '../../components/CameraPreview/CameraGeometry'
import type { Worker } from 'tesseract.js'
import { catalogNameFragments, extractScanNames, matchScanNames, type ScanMatch } from './ScanMatching'
import { isolateNameRows, prepareNameRow } from './ScanNameRows'
import { normalizeScanContrast } from './ScanQuality'
import type { Blueprint } from '../blueprints/Blueprint'
export type ScanPassDiagnostic={engine?:string;boxes?:{text:string;poly:number[][];score:number}[];mode:string;variant:string;width:number;height:number;milliseconds:number;text:string;confidence:number;names:string[];words:{text:string;confidence:number}[];image:string}
export type ScanRecognizer={recognize:(image:HTMLCanvasElement,catalog:Blueprint[],diagnostic?:(pass:ScanPassDiagnostic)=>void)=>Promise<ScanMatch>;close:()=>Promise<void>}
export function createScanRecognizer():ScanRecognizer {
 let pending:Promise<Worker>|undefined,closed=false
 const worker=()=>pending??=(async()=>{
  const {createWorker}=await import('tesseract.js')
  const base=new URL(import.meta.env.BASE_URL+'ocr/',location.origin).href
  const instance=await createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base,workerBlobURL:false,cacheMethod:'none'})
  if(closed){await instance.terminate();throw new Error('Scanner closed.')}
  return instance
 })()
 return {
  async recognize(image,catalog,diagnostic){
   const instance=await worker()
   const names:string[]=[],supportedNames:string[]=[],texts:string[]=[]
   const read=async(canvas:HTMLCanvasElement,mode:'11'|'6'|'7',variant='original')=>{
    const started=performance.now()
    if(closed)throw new Error('Scanner closed.')
    await instance.setParameters({tessedit_pageseg_mode:mode as import('tesseract.js').PSM,preserve_interword_spaces:'1'})
    const result=await instance.recognize(canvas,{}, {blocks:true})
    const metadataRow=variant.startsWith('name-row')&&/item\s*type|requirements|expiration|production|number\s*of\s*uses/i.test(result.data.text)
    // Word-supported suggestions remain uncertain: never silently drop a qualifier from a name.
    if(!metadataRow)for(const block of result.data.blocks??[])for(const paragraph of block.paragraphs)for(const line of paragraph.lines){
     const words=line.words.filter(word=>word.confidence>=40).map(word=>word.text).join(' ')
     supportedNames.push(...extractScanNames(words))
    }
    diagnostic?.({mode,variant,width:canvas.width,height:canvas.height,milliseconds:Math.round(performance.now()-started),text:result.data.text,confidence:result.data.confidence,names:extractScanNames(result.data.text),words:(result.data.blocks??[]).flatMap(b=>b.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.words.map(w=>({text:w.text,confidence:w.confidence}))))),image:canvas.toDataURL('image/png')})
    if(!metadataRow)names.push(...extractScanNames(result.data.text))
    texts.push(result.data.text.trim())
    return {...matchScanNames(names,catalog),readText:texts.find(text=>text.length>0)?.replace(/\s+/g,' ').slice(0,160)}
   }
   // Read only the visible name strip, never mechanics or production sections.
   let match=await read(image,'11')
   if(match.confidence==='high')return match
   match=await read(image,'7')
   if(match.confidence==='high')return match
   // Only after the normal fast path fails: identify a few text-height bands, not a fixed page coordinate.
   const isolated=isolateNameRows(image)
   try{
    for(const row of isolated.rows)for(const variant of ['grayscale','local-background'] as const){
     const strip=prepareNameRow(image,row,variant)
     try{
      const suggestion=await read(strip,'11',`name-row ${row.y}:${row.height} ${variant}`)
      // Exclude other labeled fields; heuristic row crops always require explicit confirmation.
      if(suggestion.confidence!=='none')return {...suggestion,confidence:'ambiguous',readText:texts.at(-1)?.replace(/\s+/g,' ').slice(0,160)}
     }finally{strip.width=strip.height=0}
    }
   }finally{isolated.binary.width=isolated.binary.height=0}
   const enhanced=document.createElement('canvas');enhanced.width=image.width;enhanced.height=image.height
   const context=enhanced.getContext('2d')!;context.drawImage(image,0,0)
   const pixels=context.getImageData(0,0,enhanced.width,enhanced.height);normalizeScanContrast(pixels.data);context.putImageData(pixels,0,0)
   try {
    match=await read(enhanced,'6','contrast')
    if(match.confidence==='high')return match
    // Single-line segmentation helps tightly framed names. Block mode retains wrapped names.
    match=await read(enhanced,'7','contrast')
    if(match.confidence==='high')return match
    for(const degrees of [-5,5]){
     if(closed)throw new Error('Scanner closed.')
     const rotated=document.createElement('canvas');rotated.width=enhanced.width;rotated.height=enhanced.height
     try {
      const ctx=rotated.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,rotated.width,rotated.height)
      ctx.translate(rotated.width/2,rotated.height/2);ctx.rotate(degrees*Math.PI/180);ctx.drawImage(enhanced,-enhanced.width/2,-enhanced.height/2)
      match=await read(rotated,'11','contrast rotated '+degrees)
      if(match.confidence==='high')return match
     }finally{rotated.width=rotated.height=0}
    }
    const supported=matchScanNames([...catalogNameFragments(names,catalog),...new Set(supportedNames),...new Set(names)],catalog)
    return supported.confidence==='none'?match:{...supported,confidence:'ambiguous',readText:match.readText}
   }finally{enhanced.width=enhanced.height=0}
  },
  async close(){closed=true;if(pending){try{await(await pending).terminate()}catch{/* Initialization may already be cancelled. */}}}
 }
}
// Capture the same name strip shown in the viewfinder at native resolution, with bounded upscaling.
export function captureScanFrame(video:HTMLVideoElement):HTMLCanvasElement {
 if(!video.videoWidth||!video.videoHeight)throw new Error('Camera is not ready. Wait for the preview and try again.')
 const frame=scanFrameBounds(video.videoWidth,video.videoHeight)
 const canvas=document.createElement('canvas')
 const scale=Math.min(2,Math.max(1,1600/frame.width),2200/frame.width)
 canvas.width=Math.round(frame.width*scale);canvas.height=Math.round(frame.height*scale)
 const ctx=canvas.getContext('2d')!;ctx.drawImage(video,frame.x,frame.y,frame.width,frame.height,0,0,canvas.width,canvas.height)
 return canvas
}
