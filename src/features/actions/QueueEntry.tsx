import { useState } from 'react'
import SearchablePicker from '../../components/SearchablePicker/SearchablePicker'
import { masterBlueprints } from '../blueprints/blueprints'
import type { Blueprint } from '../blueprints/Blueprint'
import { actionCatalog } from './ActionCatalog'
import type { ActionDefinition, ActionConfiguration } from './Action'
import ActionDetails from './ActionDetails'
export default function QueueEntry({onBlueprint,onAction}:{onBlueprint:(blueprint:Blueprint)=>void;onAction:(definition:ActionDefinition,option:string,config:ActionConfiguration,target?:string,session?:string)=>boolean}) {
 const [source,setSource]=useState<'Blueprint'|'Action'>('Blueprint'),[blueprint,setBlueprint]=useState<Blueprint>(),[action,setAction]=useState<ActionDefinition>()
 return <details className="settings-card work-entry"><summary>Add to Queue</summary><div className="build-actions"><button type="button" className="secondary-button" aria-pressed={source==='Blueprint'} onClick={()=>{setSource('Blueprint');setAction(undefined)}}>Blueprint</button><button type="button" className="secondary-button" aria-pressed={source==='Action'} onClick={()=>{setSource('Action');setBlueprint(undefined)}}>Action</button></div>
 {source==='Blueprint'?<><SearchablePicker label="Find a Blueprint" options={masterBlueprints} getOptionKey={item=>item.id} getOptionLabel={item=>item.name} onChange={setBlueprint}/><button type="button" className="primary-button" disabled={!blueprint} onClick={()=>{if(blueprint)onBlueprint(blueprint)}}>Add to Queue</button></>:<><SearchablePicker label="Find an Action" options={actionCatalog.filter(action=>action.verified)} getOptionKey={item=>item.id} getOptionLabel={item=>item.name} onChange={setAction}/>{action&&<ActionDetails dismissible key={action.id} definition={action} onClose={()=>setAction(undefined)} onAdd={(option,config,target,session)=>onAction(action,option,config,target,session)}/>}</>}
 </details>
}
