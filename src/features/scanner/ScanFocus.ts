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
