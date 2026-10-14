import {useState} from 'react'
import {loadScannerSettings,saveScannerSettings,type ScannerSettings} from './ScannerSettings'
import {configureScannerDiagnostics} from '../../services/scanner/ScannerRuntime'
export default function ScannerSettingsView(){
 const [settings,setSettings]=useState(loadScannerSettings),[error,setError]=useState('')
 function save(next:ScannerSettings){try{saveScannerSettings(next);configureScannerDiagnostics();setSettings(next);setError('')}catch(error){setError(error instanceof Error?error.message:String(error))}}
 return <section className="settings-page"><h3>Scan Diagnostics</h3><div className="settings-card"><div className="settings-row"><label htmlFor="scanner-diagnostics">Scan Diagnostics</label><select id="scanner-diagnostics" value={String(settings.diagnostics)} onChange={event=>save({...settings,diagnostics:event.target.value==='true'})}><option value="false">Off</option><option value="true">On</option></select></div>
 {settings.diagnostics&&<><div className="settings-row"><label htmlFor="scanner-image-diagnostics">Include image data in diagnostic exports</label><select id="scanner-image-diagnostics" value={String(settings.includeImages)} onChange={event=>save({...settings,includeImages:event.target.value==='true'})}><option value="false">Off</option><option value="true">On</option></select></div><p>Image attachments are planned; this phase exports event JSON only. No images are retained or exported.</p></>}
 <p>Off by default. Detailed logs stay in memory for this session and can be exported from Scan Prints. Turning diagnostics off clears these logs. Static image OCR is available in Scan Prints. Image attachments are not yet included in exports.</p>{error&&<p role="alert">{error}</p>}</div></section>
}
