import InformationPanel from '../../components/InformationPanel/InformationPanel'
import type { Build } from './Build'
export default function ActivitySnapshotView({build}:{build:Build}) {
 const action=build.actionSnapshot
 if(action)return <section className="activity-snapshot"><InformationPanel title="Action execution snapshot" tone="gold"><p>Option: {action.option.name}</p><p>{action.definition.description}</p><p>{action.definition.rules.source}: {action.definition.rules.reference} ({action.definition.rules.version})</p>
 {action.target&&<p>Target: {action.target}</p>}{action.sessionId&&<p>Session: {action.sessionId}</p>}
 {Object.entries(action.configuration).map(([key,value])=><p key={key}>{action.option.fields.find(field=>field.id===key)?.label??key}: {value}</p>)}
 </InformationPanel><InformationPanel title="Costs and Requirements"><p>Mind expenditure: {action.option.mind} · Resolve: {action.option.resolve} · Planned duration: {action.option.minutes} minutes</p>
 {[...action.definition.prerequisites,...action.definition.tools.map(value=>'Tool: '+value),...action.definition.facilities.map(value=>'Access: '+value),...action.option.requirements].map((value,index)=><p key={index}>{value}</p>)}
 </InformationPanel><InformationPanel title="Outputs and Effects" tone="green">{(['inputs','equipmentUses','outputs'] as const).map(key=>action.option[key].length>0&&<div key={key}><h5>{key==='inputs'?'Inputs':key==='equipmentUses'?'Equipment uses':'Outputs'}</h5>{action.option[key].map((item,index)=><p key={index}>{item.quantity} {key==='equipmentUses'?'use(s) of':'×'} {item.name}</p>)}</div>)}
 {action.option.effects.map((effect,index)=><p key={index}>Effect: {effect}</p>)}{action.option.sessionConstraints&&<p>Session limits: {action.option.sessionConstraints.description}</p>}</InformationPanel></section>
 return <section className="activity-snapshot"><InformationPanel title="Blueprint execution snapshot" tone="gold"><p>Source: Blueprint #{build.blueprintId}{build.sourceVersion&&' · Version '+build.sourceVersion}</p><p>{build.recipe.craftingSkills} · {build.recipe.craftingMindCost} Mind · {build.recipe.craftingResolveCost??0} Resolve</p>
 {build.recipe.craftingComponents.map((item,index)=><p key={index}>Input: {item.amount} × {item.component.name}</p>)}
 {build.recipe.craftingFinalProducts.map((item,index)=><div key={index}><p>Output: {item.stack} × {item.finalProduct.name}</p>{item.finalProduct.metadata?.mechanics&&<p>{item.finalProduct.metadata.mechanics}</p>}</div>)}</InformationPanel></section>
}
