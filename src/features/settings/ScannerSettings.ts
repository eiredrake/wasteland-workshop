import {userStorage} from '../backup/UserStorage'
export const SCANNER_SETTINGS_KEY='wasteland-workshop-scanner-settings'
export type ScannerSettings={diagnostics:boolean;includeImages:boolean}
export const defaultScannerSettings:ScannerSettings={diagnostics:false,includeImages:false}
export function loadScannerSettings(storage:Pick<Storage,'getItem'>=userStorage):ScannerSettings{try{const value=JSON.parse(storage.getItem(SCANNER_SETTINGS_KEY)??'null');return value?.version===1?{diagnostics:value.diagnostics===true,includeImages:value.includeImages===true}:{...defaultScannerSettings}}catch{return {...defaultScannerSettings}}}
export function saveScannerSettings(value:ScannerSettings,storage:Pick<Storage,'setItem'>=userStorage){storage.setItem(SCANNER_SETTINGS_KEY,JSON.stringify({version:1,...value}))}
