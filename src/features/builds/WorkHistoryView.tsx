import './BuildQueueView.css'
import WorkHistoryExportDialog from './WorkHistoryExportDialog'
import {completedHistory} from './WorkHistoryExport'
import RemoveBadge from '../../components/RemoveBadge/RemoveBadge'
import ActivitySnapshotView from './ActivitySnapshotView'
import { useRef,useState } from 'react'
import type { BuildQueue } from './Build'
import { calculateBuildCost, deleteBuilds, editBuild } from './BuildQueueService'
import { credits, duration } from './BuildFormatting'
import BuildDetails from './BuildDetails'
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog'
export default function WorkHistoryView({builds,apply,error}:{builds:BuildQueue;apply:(operation:(queue:BuildQueue)=>BuildQueue)=>boolean;error:string}) {
 const [editing,setEditing]=useState<string>(),[deleting,setDeleting]=useState<string[]>(),[checked,setChecked]=useState<string[]>([])
 const history=completedHistory(builds)
 const selection=checked.filter(id=>history.some(activity=>activity.id===id))
 const [exporting,setExporting]=useState(false),[exportStatus,setExportStatus]=useState(''),exportButton=useRef<HTMLButtonElement>(null)
 const closeExport=()=>{setExporting(false);requestAnimationFrame(()=>exportButton.current?.focus())}
 const selected=history.find(activity=>activity.id===editing)
 if(selected)return <BuildDetails key={selected.id} build={selected} onSave={(notes)=>apply(queue=>editBuild(queue,selected.id,notes,selected.overrides))} onClose={()=>setEditing(undefined)} onTimer={()=>{}} onToggle={()=>{}} blocked showTimer={false}/>
 return <section data-tour-target="work-history" className="blueprint-collections-page"><h2>Work History</h2><button ref={exportButton} type="button" className="secondary-button" disabled={!history.length} onClick={()=>{setExportStatus('');setExporting(true)}}>Export Work History</button>{exportStatus&&<p role="status">{exportStatus}</p>}<p>Completed activities, most recent first. Records remain until you delete them.</p>{error&&<p role="alert">{error}</p>}{!history.length&&<p>No completed activities.</p>}
 <div className="build-actions build-selection-actions"><button type="button" className="secondary-button" disabled={!history.length} onClick={()=>setChecked(history.map(activity=>activity.id))}>Select All</button><button type="button" className="secondary-button" disabled={!selection.length} onClick={()=>setChecked([])}>Deselect All</button><button type="button" className="secondary-button" disabled={!selection.length} onClick={()=>setDeleting(selection)}>Delete Selected ({selection.length})</button></div>
 {history.map((activity,index)=><article className="blueprint-collection-card history-selection-card" key={activity.id}><label className="build-checkbox"><input type="checkbox" checked={selection.includes(activity.id)} aria-label={'Select History Record '+(index+1)+': '+activity.blueprintName} onChange={event=>setChecked(event.target.checked?[...selection,activity.id]:selection.filter(id=>id!==activity.id))}/></label><details><summary className="work-summary"><strong>{activity.blueprintName}</strong><span>{duration(activity.timer.originalDurationMs)}</span>{activity.recipe.craftingMindCost>0&&<span>{activity.recipe.craftingMindCost} Mind</span>}<time>{new Date(activity.completedAt!).toLocaleString()}</time></summary><p>{activity.sourceType??'Blueprint'} · Completed</p>{activity.notes&&<p>{activity.notes}</p>}<ActivitySnapshotView build={activity}/><p>Recorded economic estimate: {credits(calculateBuildCost(activity).productionCost)}</p><div className="build-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(activity.id)}>Details &amp; Notes</button><RemoveBadge label={`Delete history record ${activity.blueprintName}`} onClick={()=>setDeleting([activity.id])}/></div></details></article>)}
 {exporting&&<WorkHistoryExportDialog builds={history} onClose={closeExport} onExported={setExportStatus}/>}
 {deleting&&<ConfirmationDialog confirmLabel={deleting.length>1?'Delete Selected':'Delete History Record'} title={deleting.length>1?`Delete ${deleting.length} History Records?`:'Delete completed Activity?'} message={deleting.length>1?'This permanently removes the selected history records and their notes from this device.':'This permanently removes this history record and its notes from this device.'} onCancel={()=>setDeleting(undefined)} onConfirm={()=>{if(apply(queue=>deleteBuilds(queue,deleting))){setChecked(checked.filter(id=>!deleting.includes(id)));setDeleting(undefined)}}}/>}</section>
}
