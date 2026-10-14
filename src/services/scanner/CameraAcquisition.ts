import {scannerError,type Outcome,type ScannerError} from '../ocr/OcrTypes'
export function cameraError(cause:unknown):ScannerError{
 const name=cause instanceof Error?cause.name:'',detail=cause instanceof Error?cause.message:String(cause)
 const reasons:Record<string,[ScannerError['code'],string]>={NotAllowedError:['CAMERA_PERMISSION_DENIED','Camera permission was denied. Allow camera access in this browser to use Scan Image.'],SecurityError:['CAMERA_PERMISSION_DENIED','Camera access is blocked by browser security settings.'],NotFoundError:['CAMERA_UNAVAILABLE','No available camera was found.'],OverconstrainedError:['CAMERA_UNAVAILABLE','The selected camera is unavailable. Choose another camera.'],NotReadableError:['CAMERA_IN_USE','The camera could not be opened. It may already be in use by another application.'],AbortError:['CAMERA_INITIALIZATION_FAILED','The camera stopped during initialization.']}
 const [code,message]=reasons[name]??['CAMERA_INITIALIZATION_FAILED','The camera could not be initialized.']
 return scannerError(code,'camera',message+(detail?' '+detail:''))
}
export class CameraSession{
 private stream?:MediaStream;private generation=0;private pending?:Promise<Outcome<MediaStream>>
 private readonly devices?:Pick<MediaDevices,'getUserMedia'|'enumerateDevices'>;private readonly secure:boolean
 constructor(devices:Pick<MediaDevices,'getUserMedia'|'enumerateDevices'>|undefined=typeof navigator==='undefined'?undefined:navigator.mediaDevices,secure=typeof window!=='undefined'&&window.isSecureContext){this.devices=devices;this.secure=secure}
 start(deviceId?:string):Promise<Outcome<MediaStream>>{
  this.stop();const generation=this.generation,previous=this.pending
  const operation=Promise.resolve(previous).then(async():Promise<Outcome<MediaStream>>=>{
   if(generation!==this.generation)return {ok:false,error:scannerError('CAMERA_ABANDONED','camera','Camera initialization was cancelled.')}
   if(!this.secure)return {ok:false,error:scannerError('CAMERA_INSECURE_CONTEXT','camera','Camera access requires a secure HTTPS connection or localhost.')}
   if(!this.devices?.getUserMedia)return {ok:false,error:scannerError('CAMERA_UNSUPPORTED','camera','This browser does not provide camera access.')}
   try{
    const stream=await this.devices.getUserMedia({audio:false,video:deviceId?{deviceId:{exact:deviceId}}:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}})
    if(generation!==this.generation){stream.getTracks().forEach(track=>track.stop());return {ok:false,error:scannerError('CAMERA_ABANDONED','camera','Camera initialization was cancelled.')}}
    if(!stream.getVideoTracks().length){stream.getTracks().forEach(track=>track.stop());return {ok:false,error:scannerError('CAMERA_UNAVAILABLE','camera','The camera returned no video track.')}}
    this.stream=stream;return {ok:true,value:stream}
   }catch(error){return {ok:false,error:cameraError(error)}}
  })
  this.pending=operation;void operation.then(()=>{if(this.pending===operation)this.pending=undefined});return operation
 }
 async cameras(){try{return (await this.devices?.enumerateDevices()??[]).filter(device=>device.kind==='videoinput'&&device.deviceId)}catch{return []}}
 stop(){this.generation++;this.stream?.getTracks().forEach(track=>track.stop());this.stream=undefined}
}
export async function captureStill(video:HTMLVideoElement):Promise<Outcome<File>>{
 if(video.readyState<2||video.videoWidth<1||video.videoHeight<1)return {ok:false,error:scannerError('CAMERA_CAPTURE_FAILED','capture','Wait until the camera has supplied a video frame.')}
 const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight
 try{const context=canvas.getContext('2d');if(!context)throw Error('Image capture is unavailable.');context.drawImage(video,0,0,canvas.width,canvas.height)
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('The camera still could not be encoded.')),'image/png'))
 return {ok:true,value:new File([blob],'camera-capture.png',{type:'image/png'})}
 }catch(error){return {ok:false,error:scannerError('CAMERA_CAPTURE_FAILED','capture',error instanceof Error?error.message:String(error))}}
 finally{canvas.width=0;canvas.height=0}
}
