import {extractImageRegion} from '../scanner/ImageRegion'
import type {Worker} from 'tesseract.js'
import {scannerError,validateScanRequest,type OcrProvider,type OcrState,type ScanImageRequest,type OcrResult,type Outcome} from './OcrTypes'
export const TESSERACT_VERSION='7.0.0'
export type RecognitionWorker=Pick<Worker,'recognize'|'terminate'>
export type WorkerFactory=()=>Promise<RecognitionWorker>
async function createLocalWorker():Promise<RecognitionWorker>{
 const {createWorker}=await import('tesseract.js')
 const base=new URL(import.meta.env.BASE_URL+'ocr/tesseract-7.0.0/',location.origin).href
 // v7 rejects jobs through errorHandler but may leave createWorker pending on language errors.
 // The hosted worker closes itself on fatal initialization rejects; propagate the same error here.
 let rejectFailure:(reason:Error)=>void=()=>{}
 const failure=new Promise<never>((_,reject)=>{rejectFailure=reject})
 return Promise.race([createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:base,langPath:base,workerBlobURL:false,cacheMethod:'none',errorHandler:error=>rejectFailure(new Error(String(error)))}),failure])
}
export class TesseractOcrProvider implements OcrProvider {
 readonly id='tesseract';readonly version=TESSERACT_VERSION;state:OcrState='NOT_LOADED'
 private worker?:RecognitionWorker;private pending?:Promise<void>;private queue:Promise<void>=Promise.resolve();private disposing=false
 private readonly onInput?:(blob:Blob,request:ScanImageRequest)=>void
 private readonly factory:WorkerFactory
 constructor(factory:WorkerFactory=createLocalWorker,onInput?:(blob:Blob,request:ScanImageRequest)=>void){this.factory=factory;this.onInput=onInput}
 initialize():Promise<void>{
  if(this.disposing)return Promise.reject(new Error('OCR resources are being released.'))
  if(this.pending)return this.pending
  this.state='LOADING'
  this.pending=this.factory().then(worker=>{this.worker=worker;this.state='READY'},error=>{this.pending=undefined;this.state='FAILED';throw error})
  return this.pending
 }
 scanImage(request:ScanImageRequest):Promise<Outcome<OcrResult>>{
  const operation=this.queue.then(async():Promise<Outcome<OcrResult>>=>{
   if(this.state!=='READY'||!this.worker||this.disposing)return {ok:false,error:scannerError('OCR_NOT_READY','recognition','Tesseract is not ready.')}
   const invalid=validateScanRequest(request);if(invalid)return {ok:false,error:invalid}
   const started=performance.now()
   try{
    const region=await extractImageRegion(request);if(!region.ok)return region
    // Observe the exact same Blob passed below; diagnostics must never change recognition.
    try{this.onInput?.(region.value,request)}catch{/* Diagnostic capture must not fail OCR. */}
    const {width,height}=request.target
    const output=await this.worker.recognize(region.value,{rectangle:{left:0,top:0,width,height}},{text:true})
    return {ok:true,value:{text:output.data.text,providerId:this.id,providerVersion:this.version,correlationId:request.correlationId,durationMs:performance.now()-started,metadata:{inputWidth:width,inputHeight:height},...(Number.isFinite(output.data.confidence)?{confidence:output.data.confidence}:{})}}
   }catch(error){return {ok:false,error:scannerError('OCR_RECOGNITION_FAILED','recognition',error instanceof Error?error.message:String(error))}}
  })
  this.queue=operation.then(()=>{},()=>{});return operation
 }
 async dispose(){this.disposing=true;try{await this.pending?.catch(()=>{});await this.queue;await this.worker?.terminate()}finally{this.worker=undefined;this.pending=undefined;this.state='NOT_LOADED';this.disposing=false}}
}
