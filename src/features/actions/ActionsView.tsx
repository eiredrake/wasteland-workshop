import SearchInput from '../../components/SearchInput/SearchInput'
import { useState } from 'react'
import Datalist from '../../components/Datalist/Datalist'
import { actionCatalog, pendingActionVerification } from './ActionCatalog'
import ActionDetails from './ActionDetails'
import type { ActionConfiguration, ActionDefinition } from './Action'
import './Actions.css'
export default function ActionsView({onAdd}:{onAdd:(definition:ActionDefinition,optionId:string,configuration:ActionConfiguration,target?:string,sessionId?:string)=>boolean}) {
 const [reset,setReset]=useState(0),[query,setQuery]=useState(''),[category,setCategory]=useState('All')
 const definitions=actionCatalog.filter(action=>action.verified&&(category==='All'||category===action.category)&&[action.name,action.description,action.skill??'',action.category].some(value=>value.toLowerCase().includes(query.trim().toLowerCase())))
 return <section data-tour-target="actions" className="blueprint-collections-page actions-page"><h2>Actions</h2><p>Activities you can perform without a Blueprint. Check the listed tools and rules before starting.</p>
 <SearchInput label="Search Actions" showLabel placeholder="Search Actions..." value={query} onValueChange={setQuery}/><label>Category<select value={category} onChange={event=>setCategory(event.target.value)}><option>All</option>{[...new Set(actionCatalog.map(action=>action.category))].map(value=><option key={value}>{value}</option>)}</select></label>
 <Datalist items={definitions} getRowKey={action=>action.id} detailsResetKey={query+category+reset} backLabel="Back to Actions" columns={[{key:'name',label:'Action',protected:true,minWidth:180},{key:'category',label:'Category',minWidth:110},{key:'skill',label:'Skill',minWidth:150},{key:'options',label:'Time / costs',minWidth:180,render:action=><span>{action.options.map(option=>`${option.minutes} min · ${option.mind} Mind · ${option.resolve} Resolve`).join('; ')}</span>}]} renderDetails={definition=><ActionDetails key={definition.id} definition={definition} onClose={()=>{setReset(value=>value+1);}} onAdd={(option,config,target,session)=>onAdd(definition,option,config,target,session)}/>} />
 <details className="settings-card"><summary>Pending rules verification</summary><ul>{pendingActionVerification.map(value=><li key={value}>{value}</li>)}</ul></details></section>
}
