import type {ScanMatch} from './ScanMatching'
export type AutoCaptureStability={id?:number;count:number}
export function advanceAutoCapture(previous:AutoCaptureStability,match:ScanMatch):AutoCaptureStability{
 const exact=match.candidates.filter(candidate=>candidate.score===1)
 const id=exact.length===1?exact[0].blueprint.id:undefined
 return id===undefined?{count:0}:{id,count:id===previous.id?Math.min(previous.count+1,2):1}
}
