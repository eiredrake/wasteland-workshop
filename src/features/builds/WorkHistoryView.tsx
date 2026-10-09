import RemoveBadge from '../../components/RemoveBadge/RemoveBadge'
import ActivitySnapshotView from './ActivitySnapshotView'
import { useState } from 'react'
import type { BuildQueue } from './Build'
import { calculateBuildCost, deleteBuilds, editBuild } from './BuildQueueService'
import { credits, duration } from './BuildFormatting'
import BuildDetails from './BuildDetails'
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog'
export default function WorkHistoryView({builds,apply,error}:{builds:BuildQueue;apply:(operation:(queue:BuildQueue)=>BuildQueue)=>boolean;error:string}) {
 const [editing,setEditing]=useState<string>(),[deleting,setDeleting]=useState<string>()
 const history=builds.filter(activity=>activity.status==='Completed').sort((a,b)=>(b.completedAt??0)-(a.completedAt??0))
 const selected=history.find(activity=>activity.id===editing)
 if(selected)return <BuildDetails key={selected.id} build={selected} onSave={(notes)=>apply(queue=>editBuild(queue,selected.id,notes,selected.overrides))} onClose={()=>setEditing(undefined)} onTimer={()=>{}} onToggle={()=>{}} blocked showTimer={false}/>
 return <section data-tour-target="work-history" className="blueprint-collections-page"><h2>Work History</h2><p>Completed activities, most recent first. Records remain until you delete them.</p>{error&&<p role="alert">{error}</p>}{!history.length&&<p>No completed activities.</p>}
 {history.map(activity=><details className="blueprint-collection-card" key={activity.id}><summary className="work-summary"><strong>{activity.blueprintName}</strong><span>{duration(activity.timer.originalDurationMs)}</span>{activity.recipe.craftingMindCost>0&&<span>{activity.recipe.craftingMindCost} Mind</span>}<time>{new Date(activity.completedAt!).toLocaleString()}</time></summary><p>{activity.sourceType??'Blueprint'} · Completed</p>{activity.notes&&<p>{activity.notes}</p>}<ActivitySnapshotView build={activity}/><p>Recorded economic estimate: {credits(calculateBuildCost(activity).productionCost)}</p><div className="build-actions"><button type="button" className="secondary-button" onClick={()=>setEditing(activity.id)}>Details &amp; Notes</button><RemoveBadge label={`Delete history record ${activity.blueprintName}`} onClick={()=>setDeleting(activity.id)}/></div></details>)}
 {deleting&&<ConfirmationDialog confirmLabel="Delete History Record" title="Delete completed Activity?" message="This permanently removes this history record and its notes from this device." onCancel={()=>setDeleting(undefined)} onConfirm={()=>{apply(queue=>deleteBuilds(queue,[deleting]));setDeleting(undefined)}}/>}</section>
}
