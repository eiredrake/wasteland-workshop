import {expect,it} from 'vitest'
import {loadScannerSettings,saveScannerSettings,SCANNER_SETTINGS_KEY} from './ScannerSettings'
it('defaults disabled and reads earlier diagnostics-only preferences',()=>{
 for(const value of [null,'bad','{"version":2,"diagnostics":true}'])expect(loadScannerSettings({getItem:()=>value})).toEqual({diagnostics:false,includeImages:false})
 expect(loadScannerSettings({getItem:()=>'{"version":1,"diagnostics":true}'})).toEqual({diagnostics:true,includeImages:false})
})
it('persists both opt-ins using the original local-storage key',()=>{
 let value:string|null=null;saveScannerSettings({diagnostics:true,includeImages:true},{setItem:(key,next)=>{expect(key).toBe(SCANNER_SETTINGS_KEY);value=next}});expect(loadScannerSettings({getItem:()=>value})).toEqual({diagnostics:true,includeImages:true})
})
