import RemoveBadge from '../../components/RemoveBadge/RemoveBadge'
import ActivitySnapshotView from './ActivitySnapshotView'
import { useState, type ReactNode } from 'react'
import BuildCraftTimer from '../../components/BuildCraftTimer/BuildCraftTimer'
import BuildStatusBadge from '../../components/BuildStatusBadge/BuildStatusBadge'
import ConfirmationDialog from '../../components/ConfirmationDialog/ConfirmationDialog'
import BuildDetails from './BuildDetails'
import type { BuildQueue } from './Build'
import { calculateBuildCost, deleteBuilds, editBuild, moveBuild, toggleBuildStatus, startBuildAtTop, workingBuild, restartInterruptedActivity } from './BuildQueueService'
import { credits, duration } from './BuildFormatting'
import '../blueprints/BlueprintCollectionsView.css'
import './BuildQueueView.css'
import '../actions/Actions.css'
export default function BuildQueueView({builds,apply,onTimer,error,children}:{builds:BuildQueue;apply:(operation:(queue:BuildQueue)=>BuildQueue)=>boolean;onTimer:(id:string)=>void;error:string;children?:ReactNode}) {
 const [selected,setSelected]=useState<string[]>([]),[detailsId,setDetailsId]=useState<string>(),[deleting,setDeleting]=useState<string[]>()
 const pending=builds.filter(activity=>activity.status!=='Completed'),active=workingBuild(builds),details=pending.find(activity=>activity.id===detailsId)
 const movable=pending.filter(activity=>activity.status!=='Working').map(activity=>activity.id),selection=selected.filter(id=>movable.includes(id))
 if(details)return <BuildDetails key={details.id} build={details} onClose={()=>setDetailsId(undefined)} onTimer={()=>onTimer(details.id)} showTimer={details.status==='Working'||details.status==='Paused'} blocked={!!active&&active.id!==details.id} onToggle={()=>apply(queue=>toggleBuildStatus(queue,details.id))} onSave={(notes,overrides)=>apply(queue=>editBuild(queue,details.id,notes,overrides))}/>
 return <section data-tour-target="work-queue" className="blueprint-collections-page build-queue-page"><h2>Work Queue</h2><p>Pending and active work. Completed activities are in Work History.</p>{children}{error&&<p role="alert">{error}</p>}
 <div className="build-actions build-selection-actions"><button type="button" className="secondary-button" disabled={!movable.length} onClick={()=>setSelected(movable)}>Select All</button><button type="button" className="secondary-button" disabled={!selection.length} onClick={()=>setSelected([])}>Deselect All</button><button type="button" className="secondary-button" disabled={!selection.length} onClick={()=>setDeleting(selection)}>Delete Selected ({selection.length})</button></div>
 {!pending.length&&<p>No pending activities. Add a Blueprint or Action to the queue.</p>}
 <ol className="build-queue-list">{pending.map((build,index)=>{
  const working=build.status==='Working',blocked=!!active&&!working,position=movable.indexOf(build.id)
  const timerVisible=working||(!active&&index===0)
  return <li className={'blueprint-collection-card build-card build-card-'+build.status.toLowerCase()} key={build.id}>
   <div className="build-row-heading"><label className="build-checkbox"><input type="checkbox" checked={selection.includes(build.id)} disabled={working} aria-label={'Select Activity '+(index+1)+': '+build.blueprintName} onChange={event=>setSelected(event.target.checked?[...selection,build.id]:selection.filter(id=>id!==build.id))}/></label><strong>{build.blueprintName}</strong>
   <BuildStatusBadge readOnly={timerVisible} actionOverride="move to top and start" build={build} blocked={blocked} onToggle={()=>apply(queue=>startBuildAtTop(queue,build.id))}/></div>
   {timerVisible&&<BuildCraftTimer build={build} blocked={blocked} onToggle={()=>apply(queue=>toggleBuildStatus(queue,build.id))} onSettings={()=>onTimer(build.id)}/>}
   <details open={working}><summary className="work-summary"><span>{duration(build.timer.originalDurationMs)}</span>{build.recipe.craftingMindCost>0&&<span>{build.recipe.craftingMindCost} Mind</span>}{(build.recipe.craftingResolveCost??0)>0&&<span>{build.recipe.craftingResolveCost} Resolve</span>}<span>Details</span></summary>
    <p>{build.sourceType??'Blueprint'} · Remaining: {duration(build.timer.remainingMs)}</p>{build.notes&&<p>{build.notes}</p>}
    <ActivitySnapshotView build={build}/>{build.actionSnapshot?.option.interruptionRestarts&&<button type="button" className="secondary-button" onClick={()=>apply(queue=>restartInterruptedActivity(queue,build.id))}>Interrupted - restart full timer</button>}<p>Execution cost estimate: {credits(calculateBuildCost(build).productionCost)}</p>
    <div className="build-actions"><button type="button" className="secondary-button" onClick={()=>setDetailsId(build.id)}>Notes &amp; Overrides</button>
    {!working&&<><button type="button" className="secondary-button" disabled={blocked} onClick={()=>apply(queue=>startBuildAtTop(queue,build.id))}>Start / Resume</button><button type="button" className="secondary-button" disabled={position===0} aria-label={'Move Activity '+(index+1)+' up'} onClick={()=>apply(queue=>moveBuild(queue,build.id,-1))}>↑ Move Up</button><button type="button" className="secondary-button" disabled={position===movable.length-1} aria-label={'Move Activity '+(index+1)+' down'} onClick={()=>apply(queue=>moveBuild(queue,build.id,1))}>↓ Move Down</button><RemoveBadge label={`Delete Activity ${build.blueprintName}`} onClick={()=>setDeleting([build.id])}/></>}{working&&<span className="build-locked">Active · position locked</span>}</div>
    {blocked&&<p>Pause the current Activity first.</p>}
   </details>
  </li>
 })}</ol>
 {deleting&&<ConfirmationDialog confirmLabel={deleting.length>1?'Delete Selected':'Delete Activity'} title={'Delete '+deleting.length+' Activities?'} message="This removes the selected activities and their notes. Catalog definitions remain." onCancel={()=>setDeleting(undefined)} onConfirm={()=>{if(apply(queue=>deleteBuilds(queue,deleting)))setSelected(selected.filter(id=>!deleting.includes(id)));setDeleting(undefined)}}/>}</section>
}
