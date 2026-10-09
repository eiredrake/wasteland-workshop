import { userStorage, type UserStorage } from '../backup/UserStorage'
import { TOUR_STORAGE_KEY, validateTourProgress, type TourProgress } from './TourProgress'
export function loadTourProgress(storage:UserStorage=userStorage):TourProgress {
 const raw=storage.getItem(TOUR_STORAGE_KEY)
 if(raw===null)return {}
 const data=JSON.parse(raw) as {version?:number;progress?:unknown}
 if(data.version!==1)throw new Error('Unsupported guided tour storage version. Saved progress has been preserved.')
 return validateTourProgress(data.progress)
}
export function saveTourProgress(progress:TourProgress,storage:UserStorage=userStorage){storage.setItem(TOUR_STORAGE_KEY,JSON.stringify({version:1,progress:validateTourProgress(progress)}))}
