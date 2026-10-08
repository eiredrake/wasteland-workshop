import { withRestoreLock } from './UserStorage'
import { useState } from 'react'
import { createBackup, restoreBackup, serializeBackup } from './BackupRepository'
import { MAX_BACKUP_BYTES, parseBackup, prepareRestore, type Backup } from './Backup'
import './BackupSettingsView.css'
function backupFile(backup:Backup) {return new File([serializeBackup(backup)],`wasteland-workshop-backup-${backup.exportedAt.replace(/[:.]/g,'-')}.json`,{type:'application/json'})}
function download(backup:Backup) {
  const file=backupFile(backup),url=URL.createObjectURL(file),link=document.createElement('a')
  link.href=url;link.download=file.name;link.hidden=true;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)
}
export default function BackupSettingsView() {
  const [candidate,setCandidate]=useState<Backup>(),[error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(false)
  const prepared=candidate?prepareRestore(candidate):undefined
  const canShare=typeof navigator.canShare==='function'&&typeof navigator.share==='function'&&navigator.canShare({files:[new File(['{}'],'backup.json',{type:'application/json'})]})
  function exportData() {setError('');try{download(createBackup());setMessage('Backup download started. Keep the file somewhere safe.')}catch(error){setError(error instanceof Error?error.message:'Backup could not be created.')}}
  async function shareData() {
    setError('')
    try {const file=backupFile(createBackup());if(!navigator.canShare({files:[file]}))throw new Error('This device cannot share this file. Use Export All Data instead.');await navigator.share({files:[file],title:'Wasteland Workshop Backup'});setMessage('Backup shared.')}
    catch(error){if(error instanceof DOMException&&error.name==='AbortError')return;setError(error instanceof Error?error.message:'Unable to share backup. Use Export All Data.')}
  }
  async function chooseFile(file:File|undefined) {
    setCandidate(undefined);setError('');setMessage('');if(!file)return
    setLoading(true)
    try{if(file.size>MAX_BACKUP_BYTES)throw new Error('Backup is too large (maximum 20 MB).');setCandidate(parseBackup(await file.text()))}
    catch(error){setError(error instanceof Error?error.message:'Invalid backup. Your current data has not changed.')}
    finally{setLoading(false)}
  }
  async function restore() {
    if(!candidate)return
    setLoading(true)
    try{await withRestoreLock(()=>restoreBackup(candidate));window.location.reload()}
    catch(error){setError(error instanceof Error?error.message:'Restore failed. Your previous data was kept.');setLoading(false)}
  }
  return <section className="settings-page backup-settings"><div className="settings-card"><h2>Data Backup &amp; Restore</h2>
    <p>Move your Wasteland Workshop data between devices or keep a complete backup. Files stay on your device unless you choose to share them.</p>
    <p>Includes collections, shopping lists, inventory, settings, and Build Queue/history. Active work is paused in the backup copy; work on this device continues. Master catalogs stay separate.</p>
    <div className="backup-actions"><button className="primary-button" type="button" onClick={exportData}>Export All Data</button>
      {canShare&&<button className="secondary-button" type="button" onClick={()=>void shareData()}>Share Backup</button>}
    </div>
    <label className="backup-file-label" htmlFor="backup-file">Import / Restore Data</label>
    <input id="backup-file" type="file" accept=".json,application/json" disabled={loading} onChange={event=>{void chooseFile(event.target.files?.[0]);event.target.value=''}} />
    {loading&&<p role="status">Checking backup…</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
    {candidate&&prepared&&<section className="backup-confirmation" aria-label="Restore confirmation"><h3>Restore Wasteland Workshop Backup?</h3>
      <p>Backup from {new Date(candidate.exportedAt).toLocaleString()} · App {candidate.appVersion}</p>
      <p>{prepared.data.blueprintCollections.collections.length} collections · {prepared.data.shoppingLists.lists.length} shopping lists · {prepared.data.warehouse.entries.length} inventory lots · {prepared.data.buildQueue.builds.length} Builds</p>
      <p className="backup-replace-warning">Restoring will replace all Wasteland Workshop data in this browser with this backup.</p>
      <p>Save your current data first if you want to keep it. Close other Wasteland Workshop tabs before restoring. Active Builds restore paused. Unavailable catalog references are preserved.</p>
      {prepared.warnings.length>0&&<details><summary>{prepared.warnings.length} catalog or selection notices</summary><ul>{prepared.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul></details>}
      <div className="backup-actions"><button className="secondary-button" type="button" onClick={exportData}>Export Current Data First</button>
        <button className="secondary-button" type="button" onClick={()=>setCandidate(undefined)}>Cancel</button>
        <button className="primary-button" type="button" disabled={loading} onClick={()=>void restore()}>Replace &amp; Restore</button></div>
    </section>}
  </div></section>
}
