import type {DiagnosticInput} from '../scanner/Diagnostics'
import {scannerError,ScannerFailure,validateScanRequest,type OcrProvider,type OcrState,type OcrLoadEvent,type ScanImageRequest,type OcrResult,type Outcome} from './OcrTypes'
export class OcrService {
 state:OcrState='NOT_LOADED';error?:import('./OcrTypes').ScannerError
 private pending?:Promise<void>;private replacing=false
 private listeners=new Set<(event:OcrLoadEvent)=>void>();private scans=new Set<Promise<Outcome<OcrResult>>>()
 private provider:OcrProvider;private record:(event:OcrLoadEvent)=>void;private recordScan:(event:DiagnosticInput)=>void
 constructor(provider:OcrProvider,record:(event:OcrLoadEvent)=>void=()=>{},recordScan:(event:DiagnosticInput)=>void=()=>{}){this.provider=provider;this.record=record;this.recordScan=recordScan}
 get identity(){return {id:this.provider.id,version:this.provider.version}}
 subscribe=(listener:(event:OcrLoadEvent)=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener)}}
 private emit(type:OcrLoadEvent['type'],durationMs?:number){const event:OcrLoadEvent={type,timestamp:new Date().toISOString(),providerId:this.provider.id,providerVersion:this.provider.version,state:this.state,...(durationMs===undefined?{}:{durationMs}),...(this.error?{error:this.error}:{})};this.record(event);for(const listener of this.listeners){try{listener(event)}catch(error){console.error('OCR lifecycle subscriber failed',error)}}}
 initialize=():Promise<void>=>{
  if(this.replacing)return Promise.reject(new ScannerFailure(scannerError('OCR_NOT_READY','initialization','The OCR provider is being replaced.')))
  if(this.pending)return this.pending
  this.state='LOADING';this.error=undefined
  const started=performance.now()
  // Assign the shared promise before publishing LOADING, including re-entrant subscribers.
  this.pending=Promise.resolve().then(()=>this.provider.initialize()).then(()=>{this.state='READY';this.emit('OCR_LOAD_SUCCEEDED',performance.now()-started)},error=>{this.state='FAILED';this.pending=undefined;const failure=scannerError('OCR_INITIALIZATION_FAILED','initialization',error instanceof Error?error.message:String(error));this.error=failure;this.emit('OCR_LOAD_FAILED',performance.now()-started);throw new ScannerFailure(failure)})
  this.emit('OCR_LOAD_STARTED');return this.pending
 }
 scanImage(request:ScanImageRequest):Promise<Outcome<OcrResult>>{
  const scanId=request.correlationId??crypto.randomUUID(),started=performance.now()
  this.recordScan({type:'OCR_SCAN_REQUEST',stage:'recognition',scanId,providerId:this.provider.id,providerVersion:this.provider.version,width:request.width,height:request.height,target:request.target})
  const operation=Promise.resolve().then(async():Promise<Outcome<OcrResult>>=>{
   if(this.state!=='READY'||this.replacing)return {ok:false,error:scannerError('OCR_NOT_READY','recognition','OCR must be initialized before recognition.')}
   const invalid=validateScanRequest(request);if(invalid)return {ok:false,error:invalid}
   try{return await this.provider.scanImage({...request,correlationId:scanId})}catch(error){return {ok:false,error:scannerError('OCR_RECOGNITION_FAILED','recognition',error instanceof Error?error.message:String(error))}}
  }).then(result=>{this.recordScan({type:'OCR_SCAN_RESULT',stage:result.ok?'recognition':result.error.stage,scanId,providerId:this.provider.id,providerVersion:this.provider.version,durationMs:performance.now()-started,status:result.ok?'SUCCESS':'FAILED',text:result.ok?result.value.text:undefined,error:result.ok?undefined:result.error});return result})
  this.scans.add(operation);void operation.finally(()=>this.scans.delete(operation));return operation
 }
 async replaceProvider(provider:OcrProvider){if(this.replacing)throw new ScannerFailure(scannerError('OCR_NOT_READY','initialization','Provider replacement is already in progress.'));this.replacing=true;try{await this.pending?.catch(()=>{});await Promise.allSettled(this.scans);await this.provider.dispose();this.provider=provider;this.pending=undefined;this.state='NOT_LOADED';this.error=undefined}finally{this.replacing=false}}
 async dispose(){this.replacing=true;try{await this.pending?.catch(()=>{});await Promise.allSettled(this.scans);await this.provider.dispose();this.pending=undefined;this.state='NOT_LOADED';this.error=undefined;this.listeners.clear()}finally{this.replacing=false}}
}
