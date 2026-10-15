export type OcrState='NOT_LOADED'|'LOADING'|'READY'|'FAILED'
export type ScannerStage='acquisition'|'initialization'|'image'|'target'|'recognition'|'matching'|'camera'|'capture'
export type ScannerErrorCode='OCR_INITIALIZATION_FAILED'|'OCR_NOT_READY'|'OCR_NOT_IMPLEMENTED'|'IMAGE_INVALID'|'IMAGE_READ_FAILED'|'IMAGE_DECODE_FAILED'|'IMAGE_PREVIEW_FAILED'|'IMAGE_REFERENCE_FAILED'|'VIDEO_UNSUPPORTED'|'TARGET_REGION_INVALID'|'OCR_RECOGNITION_FAILED'|'CATALOG_UNAVAILABLE'|'NO_MATCH'|'AMBIGUOUS_MATCH'|'UNEXPECTED_ERROR'|'CAMERA_UNSUPPORTED'|'CAMERA_PERMISSION_DENIED'|'CAMERA_UNAVAILABLE'|'CAMERA_IN_USE'|'CAMERA_INSECURE_CONTEXT'|'CAMERA_INITIALIZATION_FAILED'|'CAMERA_CAPTURE_FAILED'|'CAMERA_ABANDONED'
export type ScannerError={code:ScannerErrorCode;message:string;stage:ScannerStage;timestamp:string;details?:Record<string,string|number|boolean>}
export type Outcome<T>={ok:true;value:T}|{ok:false;error:ScannerError}
export type TargetRegion={x:number;y:number;width:number;height:number}
// Coordinates are original image pixels, never display/CSS pixels. No continuous streams.
export type ScanImageRequest={image:Blob|{pixels:Uint8ClampedArray;channels:4};sourceType:'FILE'|'CAMERA_CAPTURE';width:number;height:number;target:TargetRegion;correlationId?:string}
export type OcrResult={text:string;providerId:string;providerVersion?:string;correlationId?:string;durationMs:number;confidence?:number;metadata?:Record<string,string|number|boolean>}
export interface OcrProvider {readonly id:string;readonly version:string;readonly state:OcrState;initialize():Promise<void>;scanImage(request:ScanImageRequest):Promise<Outcome<OcrResult>>;dispose():Promise<void>}
export type OcrLoadEvent={type:'OCR_LOAD_STARTED'|'OCR_LOAD_SUCCEEDED'|'OCR_LOAD_FAILED';timestamp:string;providerId:string;providerVersion:string;state:OcrState;durationMs?:number;error?:ScannerError}
export function scannerError(code:ScannerErrorCode,stage:ScannerStage,message:string):ScannerError{return {code,stage,message,timestamp:new Date().toISOString()}}
export class ScannerFailure extends Error {readonly detail:ScannerError;constructor(detail:ScannerError){super(detail.message);this.detail=detail}}
export function validateScanRequest(request:ScanImageRequest):ScannerError|undefined {
 if(!Number.isSafeInteger(request.width)||!Number.isSafeInteger(request.height)||request.width<=0||request.height<=0||!['FILE','CAMERA_CAPTURE'].includes(request.sourceType))return scannerError('IMAGE_INVALID','image','The source image must have positive finite dimensions and a supported source type.')
 if(!request.target)return scannerError('TARGET_REGION_INVALID','target','A target region is required.')
 const {x,y,width,height}=request.target
 if(![x,y,width,height].every(Number.isSafeInteger)||x<0||y<0||width<=0||height<=0||x+width>request.width||y+height>request.height)return scannerError('TARGET_REGION_INVALID','target','The target must have positive dimensions and remain inside the original image.')
}
