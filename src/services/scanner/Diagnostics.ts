import type {OcrLoadEvent,ScannerError,ScannerStage,TargetRegion} from '../ocr/OcrTypes'
export type ImageAttachment={id:string;scanId:string;role:'original'|'camera-capture'|'target'|'ocr-input';path:string;mimeType:string;width:number;height:number}
export type DiagnosticInput={type:string;stage:ScannerStage;scanId?:string;providerId?:string;providerVersion?:string;durationMs?:number;status?:string;error?:ScannerError;width?:number;height?:number;target?:TargetRegion;text?:string;blueprintId?:number}
export type DiagnosticRecord=DiagnosticInput&{schemaVersion:1;timestamp:string;sessionId:string;browser:string;platform:string}
export class DiagnosticRecorder {
 private records:DiagnosticRecord[]=[];private bytes=0;private dropped=0;private enabled=false
 readonly sessionId=crypto.randomUUID();includeImages=false
 private readonly limit:number;private readonly byteLimit:number
 constructor(limit=500,byteLimit=1024*1024){this.limit=limit;this.byteLimit=byteLimit}
 configure(enabled:boolean,includeImages=false){this.enabled=enabled;this.includeImages=enabled&&includeImages;if(!enabled)this.clear()}
 record(input:DiagnosticInput){if(!this.enabled)return
  // Explicit whitelist prevents image payloads/Files from entering event logs.
  const {type,stage,scanId,providerId,providerVersion,durationMs,status,error,width,height,target,text,blueprintId}=input
  const record:DiagnosticRecord={schemaVersion:1,timestamp:new Date().toISOString(),sessionId:this.sessionId,browser:typeof navigator==='undefined'?'unavailable':navigator.userAgent,platform:typeof navigator==='undefined'?'unavailable':navigator.platform,type,stage,scanId,providerId,providerVersion,durationMs,status,error,width,height,target,text,blueprintId}
  const frozen=JSON.parse(JSON.stringify(record)) as DiagnosticRecord,size=JSON.stringify(frozen).length
  if(size>this.byteLimit){this.dropped++;return}
  this.records.push(frozen);this.bytes+=size
  while(this.records.length>this.limit||this.bytes>this.byteLimit){this.bytes-=JSON.stringify(this.records.shift()).length;this.dropped++}
 }
 lifecycle=(event:OcrLoadEvent)=>this.record({type:event.type,stage:'initialization',providerId:event.providerId,providerVersion:event.providerVersion,status:event.state,durationMs:event.durationMs,error:event.error})
 clear(){this.records=[];this.bytes=0;this.dropped=0}
 exportJson(){return JSON.stringify({schemaVersion:1,sessionId:this.sessionId,exportedAt:new Date().toISOString(),droppedRecordCount:this.dropped,imageInclusionRequested:this.includeImages,imageExportImplemented:false,records:this.records},null,2)}
 get count(){return this.records.length}
}
