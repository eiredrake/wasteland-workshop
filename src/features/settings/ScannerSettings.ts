import {userStorage} from '../backup/UserStorage'
export const SCANNER_SETTINGS_KEY='wasteland-workshop-scanner-settings'
export function loadScannerDiagnostics(storage:Pick<Storage,'getItem'>=userStorage):boolean {
 try{const value=JSON.parse(storage.getItem(SCANNER_SETTINGS_KEY)??'null');return value?.version===1&&value.diagnostics===true}catch{return false}
}
export function saveScannerDiagnostics(diagnostics:boolean,storage:Pick<Storage,'setItem'>=userStorage){storage.setItem(SCANNER_SETTINGS_KEY,JSON.stringify({version:1,diagnostics}))}
