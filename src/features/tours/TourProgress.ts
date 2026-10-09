export const TOUR_STORAGE_KEY = 'wasteland-workshop-guided-tours'
export type TourRecord = { viewed: boolean; completed: boolean; firstViewedAt?: string; completedAt?: string; lastOpenedAt?: string }
export type TourProgress = Record<string, TourRecord>
export function validateTourProgress(value: unknown): TourProgress {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid guided tour progress.')
 const entries=Object.entries(value)
 if(entries.length>1000)throw new Error('Too many guided tour records.')
 for(const [id,record] of entries){
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id)||!record||typeof record!=='object'||Array.isArray(record))throw new Error('Invalid guided tour record.')
  const row=record as Record<string,unknown>
  if(Object.keys(row).some(k=>!['viewed','completed','firstViewedAt','completedAt','lastOpenedAt'].includes(k))||typeof row.viewed!=='boolean'||typeof row.completed!=='boolean'||(row.completed&&!row.viewed))throw new Error('Invalid guided tour status.')
  for(const key of ['firstViewedAt','completedAt','lastOpenedAt'])if(key in row&&(typeof row[key]!=='string'||!Number.isFinite(Date.parse(row[key] as string))))throw new Error('Invalid guided tour timestamp.')
 }
 return structuredClone(Object.fromEntries(entries)) as TourProgress
}
export function openTour(progress:TourProgress,id:string,now=new Date().toISOString()):TourProgress {
 return {...progress,[id]:{...progress[id],viewed:true,completed:progress[id]?.completed??false,firstViewedAt:progress[id]?.firstViewedAt??now,lastOpenedAt:now}}
}
export function completeTour(progress:TourProgress,id:string,now=new Date().toISOString()):TourProgress {
 const next=openTour(progress,id,now)
 return {...next,[id]:{...next[id],completed:true,completedAt:next[id].completedAt??now}}
}
export const shouldOfferIntro=(progress:TourProgress)=>!progress['intro-blueprints']?.viewed
