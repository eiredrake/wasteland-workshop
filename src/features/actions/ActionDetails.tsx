import InformationPanel from '../../components/InformationPanel/InformationPanel'
import { useState } from 'react'
import type { ActionConfiguration, ActionDefinition } from './Action'
import { resolveAction } from './ActionService'
import { duration } from '../builds/BuildFormatting'
import SearchablePicker from '../../components/SearchablePicker/SearchablePicker'
import { ingredientItems, isSelectorId } from '../blueprints/IngredientCatalog'
export default function ActionDetails({definition,onAdd,onClose,dismissible=false}:{definition:ActionDefinition;onAdd:(option:string,configuration:ActionConfiguration,target?:string,sessionId?:string)=>boolean;onClose:()=>void;dismissible?:boolean}) {
 const [optionId,setOptionId]=useState(definition.options[0]?.id??''),[configuration,setConfiguration]=useState<ActionConfiguration>({}),[target,setTarget]=useState(''),[sessionId,setSessionId]=useState(''),[error,setError]=useState('')
 const option=definition.options.find(option=>option.id===optionId)!
 let preview=option
 try{preview=resolveAction(definition,optionId,configuration,target,sessionId).option}catch{/* Show base values until required configuration is complete. */}
 const field=(id:string,value:string|number)=>setConfiguration({...configuration,[id]:value})
 const rules=<> <InformationPanel title="Rules and Limitations" tone="neutral"><p>Rules: {definition.rules.source} · {definition.rules.version} · {definition.rules.reference}</p>
 </InformationPanel><InformationPanel title="Requirements" tone="gold">{definition.prerequisites.length>0&&<p>Prerequisites: {definition.prerequisites.join('; ')}</p>}{definition.tools.length>0&&<p>Tools: {definition.tools.join('; ')}</p>}{definition.facilities.length>0&&<p>Facilities / access: {definition.facilities.join('; ')}</p>}
 </InformationPanel> </>
 const costs=<> <InformationPanel title="Costs and Duration"><h4>{option.name}</h4><p>Duration: {duration(preview.minutes*60000)} · Mind: {preview.mind} · Resolve: {preview.resolve}</p>
 {option.requirements.map((value,index)=><p key={index}>{value}</p>)}
 </InformationPanel><InformationPanel title="Outputs and Effects" tone="green">{(['inputs','equipmentUses','outputs'] as const).map(key=>option[key].length>0&&<div key={key}><h4>{key==='inputs'?'Consumable inputs':key==='equipmentUses'?'Equipment uses':'Outputs'}</h4>{preview[key].map((item,index)=><p key={index}>{item.quantity} {key==='equipmentUses'?'use(s) of':'×'} {item.name}</p>)}</div>)}
 {preview.effects.length>0&&<div><h4>Effects</h4>{preview.effects.map((value,index)=><p key={index}>{value}</p>)}</div>}
 </InformationPanel> </>
 return <section className="build-details action-details">
 {!dismissible&&<><h3>{definition.name}</h3><p>{definition.description}</p><p>{definition.category}{definition.skill&&' · '+definition.skill}</p></>}
 {!dismissible&&rules}
 <form onSubmit={event=>{event.preventDefault();try{resolveAction(definition,optionId,configuration,target,sessionId);if(onAdd(optionId,configuration,target,sessionId))onClose()}catch(error){setError(error instanceof Error?error.message:'Check your selections.')}}}>
 {definition.options.length>1&&<label>Option<select value={optionId} onChange={event=>{setOptionId(event.target.value);setConfiguration({});setTarget('');setSessionId('');setError('')}}>{definition.options.map(option=><option key={option.id} value={option.id}>{option.name}</option>)}</select></label>}
 {!dismissible&&costs}
 {(option.fields.length>0||(!dismissible&&definition.targetType)||option.sessionConstraints)&&<InformationPanel title="Configuration">{option.fields.map(input=><div className="action-field" key={input.id}>{input.type==='resource'?<SearchablePicker key={optionId+input.id} label={input.label} required={input.required} options={[...ingredientItems.values()].filter(item=>!isSelectorId(item.id)&&(!input.itemIds||input.itemIds.includes(item.id)))} getOptionKey={item=>item.id} getOptionLabel={item=>item.name} onChange={item=>field(input.id,item?.id??'')}/>:<label>{input.label}{input.type==='select'?<select aria-invalid={error.includes(input.label)||undefined} aria-describedby={error.includes(input.label)?'action-configuration-error':undefined} required={input.required} value={configuration[input.id]??''} onChange={event=>field(input.id,event.target.value)}><option value="">Select…</option>{input.choices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</select>:<input aria-invalid={error.includes(input.label)||undefined} aria-describedby={error.includes(input.label)?'action-configuration-error':undefined} required={input.required} type={input.type==='quantity'?'number':'text'} min={input.type==='quantity'?input.min:undefined} max={input.type==='quantity'?input.max:undefined} step={input.type==='quantity'?1:undefined} value={configuration[input.id]??''} onChange={event=>field(input.id,input.type==='quantity'&&event.target.value!==''?Number(event.target.value):event.target.value)}/>}</label>}</div>)}
 {!dismissible&&definition.targetType&&<label>Target ({definition.targetType})<input value={target} maxLength={2000} onChange={event=>setTarget(event.target.value)}/></label>}
 {option.sessionConstraints&&<><p>Session restrictions: {option.sessionConstraints.description}</p><label>Session ID<input required value={sessionId} onChange={event=>setSessionId(event.target.value)} /></label><p>Use an explicit shared ID to group activities in this session. Limits count planned activities and completed history retained in this session.</p></>}
 </InformationPanel>}
 {error&&<p role="alert" id="action-configuration-error">{error}</p>}
 {!dismissible&&<p>Recorded only. This does not change Warehouse inventory or character resources.</p>}
 <button className="primary-button" type="submit">Add to Queue</button>
 {dismissible&&<p>Recorded only. This does not change Warehouse inventory or character resources.</p>}
 {dismissible&&definition.targetType&&<details><summary>Optional target</summary><label>Target ({definition.targetType})<input value={target} maxLength={2000} onChange={event=>setTarget(event.target.value)}/></label></details>}
 </form>
 {dismissible&&<details className="action-queue-details"><summary>Requirements and details</summary><h3>{definition.name}</h3><p>{definition.description}</p><p>{definition.category}{definition.skill&&' · '+definition.skill}</p>{rules}{costs}</details>}
 </section>
}
