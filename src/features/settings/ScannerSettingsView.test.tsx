import {expect,it,vi,afterEach} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import ScannerSettingsView from './ScannerSettingsView'
import {SCANNER_SETTINGS_KEY,saveScannerDiagnostics} from './ScannerSettings'
afterEach(()=>vi.unstubAllGlobals())
it('retains Scan Diagnostics and its saved value while honestly describing unavailability',()=>{
 const values=new Map<string,string>()
 const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,next:string)=>{values.set(key,next)}}
 saveScannerDiagnostics(true,storage);vi.stubGlobal('localStorage',storage)
 const html=renderToStaticMarkup(<ScannerSettingsView/>)
 expect(html).toContain('Scan Diagnostics');expect(html).toContain('diagnostics are currently unavailable');expect(html).toContain('value="true" selected=""');expect(SCANNER_SETTINGS_KEY).toBe('wasteland-workshop-scanner-settings')
})
