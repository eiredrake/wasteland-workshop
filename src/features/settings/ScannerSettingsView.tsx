import {useState} from 'react'
import {loadScannerDiagnostics,saveScannerDiagnostics} from './ScannerSettings'
export default function ScannerSettingsView(){
 const [enabled,setEnabled]=useState(loadScannerDiagnostics),[error,setError]=useState('')
 return <section className="settings-page"><h3>Blueprint Scanner</h3><div className="settings-card">
 <div className="settings-row"><label htmlFor="scanner-diagnostics">Scan Diagnostics</label><select id="scanner-diagnostics" value={String(enabled)} onChange={event=>{const next=event.target.value==='true';try{saveScannerDiagnostics(next);setEnabled(next);setError('')}catch{setError('Scanner settings could not be saved.')}}}><option value="false">Off</option><option value="true">On</option></select></div>
 <p>Show troubleshooting controls in the scanner. Off by default. Changes save automatically on this device.</p>{error&&<p role="alert">{error}</p>}
 </div></section>
}
