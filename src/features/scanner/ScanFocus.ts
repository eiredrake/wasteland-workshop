export type FocusReport={supportedModes:string[];focusDistance?:{min:number;max:number;step?:number};capabilityError?:string;requestedMode?:string;result:'unsupported'|'applied'|'failed';actualMode?:string;actualDistance?:number;error?:string}
type FocusCapabilities=MediaTrackCapabilities&{focusMode?:string[];focusDistance?:{min:number;max:number;step?:number}}
type FocusSettings=MediaTrackSettings&{focusMode?:string;focusDistance?:number}
export function inspectFocus(track:MediaStreamTrack):FocusReport {
 try{const c=track.getCapabilities?.() as FocusCapabilities|undefined;return {supportedModes:c?.focusMode??[],focusDistance:c?.focusDistance,result:'unsupported'}}
 catch(error){return {supportedModes:[],result:'unsupported',capabilityError:error instanceof Error?error.message:String(error)}}
}
export async function requestFocus(track:MediaStreamTrack,refocus=false):Promise<FocusReport>{
 const report=inspectFocus(track),mode=refocus&&report.supportedModes.includes('single-shot')?'single-shot':report.supportedModes.includes('continuous')?'continuous':report.supportedModes.includes('single-shot')?'single-shot':undefined
 if(mode){report.requestedMode=mode;try{await track.applyConstraints({...track.getConstraints(),focusMode:mode} as MediaTrackConstraints);report.result='applied'}catch(error){report.result='failed';report.error=error instanceof Error?error.message:String(error)}}
 try{const settings=track.getSettings() as FocusSettings;report.actualMode=settings.focusMode;report.actualDistance=settings.focusDistance}catch{/* A stopped track may no longer expose settings. */}
 return report
}

export async function requestFocusAt(track:MediaStreamTrack,point:{x:number;y:number}):Promise<FocusReport&{point:{x:number;y:number};pointResult:'applied'|'unconfirmed'|'unsupported'|'failed'}>{
 const report=inspectFocus(track),mode=report.supportedModes.includes('single-shot')?'single-shot':report.supportedModes.includes('continuous')?'continuous':undefined
 const supported=navigator.mediaDevices?.getSupportedConstraints?.() as (MediaTrackSupportedConstraints&{pointsOfInterest?:boolean})|undefined
 if(!supported?.pointsOfInterest||!mode)return {...await requestFocus(track,true),point,pointResult:'unsupported'}
 try{
  await track.applyConstraints({...track.getConstraints(),advanced:[...(track.getConstraints().advanced??[]),{focusMode:mode,pointsOfInterest:[point]}]} as unknown as MediaTrackConstraints)
  const settings=track.getSettings() as MediaTrackSettings&{pointsOfInterest?:{x:number;y:number}[]}
  const actual=settings.pointsOfInterest?.[0]
  return {...report,result:'applied',requestedMode:mode,point,pointResult:actual&&Math.abs(actual.x-point.x)<.02&&Math.abs(actual.y-point.y)<.02?'applied':'unconfirmed'}
 }catch{return {...await requestFocus(track,true),point,pointResult:'failed'}}
}
