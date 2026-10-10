import {expect,it,vi} from 'vitest'
import {loadScannerDiagnostics,saveScannerDiagnostics,SCANNER_SETTINGS_KEY} from './ScannerSettings'
it('keeps diagnostics off for new, invalid and future preferences',()=>{for(const value of [null,'bad','null','{"version":2,"diagnostics":true}','{"version":1,"diagnostics":"true"}'])expect(loadScannerDiagnostics({getItem:()=>value})).toBe(false)})
it('persists and reloads the explicit preference',()=>{let value:string|null=null;const storage={getItem:()=>value,setItem:vi.fn((_key:string,next:string)=>{value=next})};saveScannerDiagnostics(true,storage);expect(storage.setItem).toHaveBeenCalledWith(SCANNER_SETTINGS_KEY,JSON.stringify({version:1,diagnostics:true}));expect(loadScannerDiagnostics(storage)).toBe(true);saveScannerDiagnostics(false,storage);expect(loadScannerDiagnostics(storage)).toBe(false)})
it('does not hide storage write failures',()=>{expect(()=>saveScannerDiagnostics(true,{setItem:()=>{throw Error('full')}})).toThrow('full')})
