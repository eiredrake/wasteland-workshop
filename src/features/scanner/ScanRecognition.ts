import type { Blueprint } from '../blueprints/Blueprint'
import { extractScanNames, matchScanNames, normalizeScanName, type ScanMatch } from './ScanMatching'
import { createScanRecognizer as createTesseractRecognizer, type ScanRecognizer, type ScanPassDiagnostic } from './ScanOcr'
export type OcrLine={text:string;score:number;poly:number[][]}
function bounds(line:OcrLine){const x=line.poly.map(p=>p[0]),y=line.poly.map(p=>p[1]);return {left:Math.min(...x),right:Math.max(...x),top:Math.min(...y),bottom:Math.max(...y)}}
export function matchPaddleLines(lines:OcrLine[],catalog:Blueprint[]):ScanMatch {
 const usable=lines.filter(line=>line.score>=.55&&line.poly.length>=4)
 const label=usable.find(line=>/^(item|irem|itern|1tem|i1em)n(ame|ome)$/.test(normalizeScanName(line.text)))
 const fields=usable.filter(line=>/^(item|irem|itern|1tem|i1em)type|^requirements|^expiration|^production/.test(normalizeScanName(line.text)))
 let names:string[]
 if(label){
  const box=bounds(label),height=box.bottom-box.top
  const bottom=Math.min(Infinity,...fields.map(bounds).filter(b=>b.top>box.top+height*.5).map(b=>b.top))
  const values=usable.filter(line=>line!==label).filter(line=>{const b=bounds(line);return b.left>box.right&&b.top>=box.top-height*.5&&b.top<bottom}).sort((a,b)=>bounds(a).top-bounds(b).top)
  names=values.flatMap(line=>extractScanNames(line.text));names.push(values.map(line=>line.text).join(' '))
 }else{
  const cutoff=Math.min(Infinity,...fields.map(line=>bounds(line).top))
  names=usable.filter(line=>bounds(line).top<cutoff).flatMap(line=>extractScanNames(line.text))
 }
 const match=matchScanNames(names,catalog)
 // Context-free detections and fuzzy readings always remain explicit suggestions.
 return {...match,confidence:!label&&match.confidence!=='none'?'ambiguous':match.confidence,readText:[...new Set(names.filter(Boolean))].join(' ').slice(0,160)}
}
export function createScanRecognizer(options:{onLoading?:(loading:boolean)=>void;onText?:(boxes:OcrLine[],width:number,height:number)=>void}={}):ScanRecognizer {
 type Reader={predict:(image:HTMLCanvasElement)=>Promise<{items:OcrLine[]}[]>;dispose:()=>Promise<void>}
 let pending:Promise<Reader>|undefined,worker:Worker|undefined,closed=false,fallback:ScanRecognizer|undefined
 const reader=()=>pending??=(async()=>{
  options.onLoading?.(true)
  try{
  const {PaddleOCR}=await import('@paddleocr/paddleocr-js')
  if(closed)throw new Error('Scanner closed.')
  const base=new URL(import.meta.env.BASE_URL+'ocr-paddle/',location.origin).href
  const instance=await PaddleOCR.create({worker:{createWorker:()=>{worker=new Worker(base+'worker.js',{type:'module'});return worker}},textDetectionModelName:'PP-OCRv5_mobile_det',textDetectionModelAsset:{url:base+'PP-OCRv5_mobile_det.tar'},textRecognitionModelName:'PP-OCRv5_mobile_rec',textRecognitionModelAsset:{url:base+'PP-OCRv5_mobile_rec.tar'},ortOptions:{backend:'wasm',wasmPaths:base,numThreads:1}})
  if(closed){void instance.dispose().catch(()=>{});throw new Error('Scanner closed.')}
  return instance as Reader
  }finally{options.onLoading?.(false)}
 })()
 let prediction:Promise<unknown>=Promise.resolve()
 const predict=(image:HTMLCanvasElement)=>{
  const next=prediction.catch(()=>{}).then(async()=>{if(closed)throw new Error('Scanner closed.');return (await reader()).predict(image)})
  prediction=next;return next
 }
 return {
  async initialize(){if(closed)throw new Error('Scanner closed.');await reader()},
  async detect(image){
   if(closed)throw new Error('Scanner closed.')
   const [result]=await predict(image)
   if(closed)throw new Error('Scanner closed.')
   return result.items.filter(line=>line.score>=.55&&line.poly.length>=4)
  },
  async recognize(image,catalog,diagnostic){
   if(closed)throw new Error('Scanner closed.')
   const started=performance.now()
   try{
    const [result]=await predict(image)
    if(closed)throw new Error('Scanner closed.')
    const lines=result.items,match=matchPaddleLines(lines,catalog)
    options.onText?.(lines,image.width,image.height)
    diagnostic?.({engine:'PaddleOCR PP-OCRv5 mobile',mode:'detection+recognition',variant:'original',width:image.width,height:image.height,milliseconds:Math.round(performance.now()-started),text:lines.map(l=>l.text).join('\n'),confidence:lines.length?lines.reduce((sum,l)=>sum+l.score,0)*100/lines.length:0,names:match.candidates.map(c=>c.blueprint.name),words:lines.map(l=>({text:l.text,confidence:l.score*100})),boxes:lines.map(l=>({text:l.text,poly:l.poly,score:l.score})),image:image.toDataURL('image/png')})
    if(match.confidence!=='none')return match
    // High-resolution paper texture can overwhelm detection. Retry once at a
    // smaller scale; keep the original and all existing catalog thresholds.
    const retry=document.createElement('canvas')
    retry.width=Math.min(800,image.width);retry.height=Math.round(image.height*retry.width/image.width)
    try{
     const context=retry.getContext('2d')
     if(context){
      context.filter='grayscale(1) contrast(1.4)';context.drawImage(image,0,0,retry.width,retry.height)
      const retryStarted=performance.now(),[retried]=await predict(retry)
      if(closed)throw new Error('Scanner closed.')
      const retryMatch=matchPaddleLines(retried.items,catalog)
      options.onText?.(retried.items,retry.width,retry.height)
      diagnostic?.({engine:'PaddleOCR PP-OCRv5 mobile',mode:'detection+recognition',variant:'grayscale reduced-scale',width:retry.width,height:retry.height,milliseconds:Math.round(performance.now()-retryStarted),text:retried.items.map(l=>l.text).join('\n'),confidence:retried.items.length?retried.items.reduce((sum,l)=>sum+l.score,0)*100/retried.items.length:0,names:retryMatch.candidates.map(c=>c.blueprint.name),words:retried.items.map(l=>({text:l.text,confidence:l.score*100})),boxes:retried.items.map(l=>({text:l.text,poly:l.poly,score:l.score})),image:retry.toDataURL('image/png')})
      if(retryMatch.confidence!=='none')return {...retryMatch,confidence:'ambiguous'}
     }
    }finally{retry.width=retry.height=0}
   }catch(error){
    if(closed)throw new Error('Scanner closed.',{cause:error})
    diagnostic?.({engine:'PaddleOCR PP-OCRv5 mobile',mode:'error',variant:'fallback',width:image.width,height:image.height,milliseconds:Math.round(performance.now()-started),text:error instanceof Error?error.message:String(error),confidence:0,names:[],words:[],image:image.toDataURL('image/png')})
   }
   if(closed)throw new Error('Scanner closed.')
   fallback??=createTesseractRecognizer(options)
   return fallback.recognize(image,catalog,diagnostic?pass=>diagnostic({...pass,engine:'Tesseract 7 fallback'}):undefined)
  },
  async close(){closed=true;worker?.terminate();worker=undefined;void pending?.then(instance=>instance.dispose()).catch(()=>{});await fallback?.close()}
 }
}
export type {ScanRecognizer,ScanPassDiagnostic}
