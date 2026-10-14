import type {OcrLoadEvent,ScannerError,ScannerStage,TargetRegion} from '../ocr/OcrTypes'
export type ImageAttachment={id:string;scanId:string;role:'original'|'camera-capture'|'target'|'ocr-input';path:string;mimeType:string;width:number;height:number}
export type DiagnosticInput={operation?:string;api?:string;exceptionName?:string;exceptionMessage?:string;resourceId?:string;lastModified?:number;byteLength?:number;readScope?:string;type:string;stage:ScannerStage;scanId?:string;providerId?:string;providerVersion?:string;durationMs?:number;status?:string;error?:ScannerError;width?:number;height?:number;target?:TargetRegion;text?:string;blueprintId?:number;filename?:string;fileSize?:number;mimeType?:string;initializationState?:string;initializationDurationMs?:number;confidence?:number;candidates?:string[];matchCount?:number;matchedIds?:number[];sourceType?:'FILE'|'CAMERA_CAPTURE';acquisitionId?:string;transformation?:{viewportWidth:number;viewportHeight:number;scale:number;offsetX:number;offsetY:number;targetX:number;targetY:number;targetWidth:number;targetHeight:number};extractedWidth?:number;extractedHeight?:number}
export type DiagnosticRecord=DiagnosticInput&{schemaVersion:1;timestamp:string;sessionId:string;browser:string;platform:string}
export class DiagnosticRecorder {
 private records:DiagnosticRecord[]=[];private bytes=0;private dropped=0;private enabled=false
 readonly sessionId=crypto.randomUUID();includeImages=false
 private readonly limit:number;private readonly byteLimit:number
 constructor(limit=500,byteLimit=1024*1024){this.limit=limit;this.byteLimit=byteLimit}
 configure(enabled:boolean,includeImages=false){this.enabled=enabled;this.includeImages=enabled&&includeImages;if(!enabled)this.clear()}
 record(input:DiagnosticInput){if(!this.enabled)return
  // Explicit whitelist prevents image payloads/Files from entering event logs.
  const {operation,api,exceptionName,exceptionMessage,resourceId,lastModified,byteLength,readScope,type,stage,scanId,providerId,providerVersion,durationMs,status,error,width,height,target,text,blueprintId,filename,fileSize,mimeType,initializationState,initializationDurationMs,confidence,candidates,matchCount,matchedIds,sourceType,acquisitionId,transformation,extractedWidth,extractedHeight}=input
  const record:DiagnosticRecord={schemaVersion:1,timestamp:new Date().toISOString(),sessionId:this.sessionId,browser:typeof navigator==='undefined'?'unavailable':navigator.userAgent,platform:typeof navigator==='undefined'?'unavailable':navigator.platform,operation,api,exceptionName,exceptionMessage,resourceId,lastModified,byteLength,readScope,type,stage,scanId,providerId,providerVersion,durationMs,status,error,width,height,target,text,blueprintId,filename,fileSize,mimeType,initializationState,initializationDurationMs,confidence,candidates,matchCount,matchedIds,sourceType,acquisitionId,transformation,extractedWidth,extractedHeight}
  const frozen=JSON.parse(JSON.stringify(record)) as DiagnosticRecord,size=JSON.stringify(frozen).length
  if(size>this.byteLimit){this.dropped++;return}
  this.records.push(frozen);this.bytes+=size
  while(this.records.length>this.limit||this.bytes>this.byteLimit){this.bytes-=JSON.stringify(this.records.shift()).length;this.dropped++}
 }
 lifecycle=(event:OcrLoadEvent)=>this.record({type:event.type,stage:'initialization',providerId:event.providerId,providerVersion:event.providerVersion,status:event.state,durationMs:event.durationMs,error:event.error})
 clear(){this.records=[];this.bytes=0;this.dropped=0}
 exportJson(){return JSON.stringify({schemaVersion:1,appVersion:typeof __APP_VERSION__==='undefined'?undefined:__APP_VERSION__,testVersion:typeof __TEST_VERSION__==='undefined'?undefined:__TEST_VERSION__,sessionId:this.sessionId,exportedAt:new Date().toISOString(),droppedRecordCount:this.dropped,imageInclusionRequested:this.includeImages,imageExportImplemented:false,records:this.records},null,2)}
 get count(){return this.records.length}
}
