import type { ActionConfiguration, ActionDefinition, ActionExecution, ActionOption } from './Action'
import type { Build, BuildQueue } from '../builds/Build'
import type { EconomicsSettings } from '../../economics/EconomicsSettings'
import { loadCraftTimer } from '../timer/CraftTimerEngine'
import { ingredientItems, isSelectorId } from '../blueprints/IngredientCatalog'
import { hasActiveQueueEntries, toggleBuildStatus } from '../builds/BuildQueueService'
export function resolveAction(definition:ActionDefinition,optionId:string,configuration:ActionConfiguration={},target?:string,sessionId?:string,allowUnavailable=false):ActionExecution {
 if (!definition.verified) throw new Error('This Action is awaiting rules verification.')
 const option=definition.options.find(option=>option.id===optionId)
 if(!option)throw new Error('Select an available Action option.')
 if(Object.keys(configuration).some(key=>!option.fields.some(field=>field.id===key)))throw new Error('Configuration does not belong to this option.')
 for(const field of option.fields){
  const value=configuration[field.id],empty=value===undefined||value===''
  if(empty){if(field.required)throw new Error('Enter '+field.label+'.');continue}
  if(field.type==='quantity'&&(!Number.isSafeInteger(value)||Number(value)<field.min||Number(value)>field.max))throw new Error('Invalid '+field.label+'.')
  if(field.type==='select'&&!field.choices.some(choice=>choice.value===value))throw new Error('Invalid '+field.label+'.')
  if(field.type==='resource'&&(!Number.isSafeInteger(value)||Number(value)<=0||(!allowUnavailable&&(!ingredientItems.has(Number(value))||isSelectorId(Number(value))))||(field.itemIds&&!field.itemIds.includes(Number(value)))))throw new Error('Select a valid '+field.label+'.')
  if(field.type==='text'&&(typeof value!=='string'||value.length>2000))throw new Error('Invalid '+field.label+'.')
 }
 if(option.sessionConstraints&&!sessionId?.trim())throw new Error('An explicit session ID is required for this Action.')
 const resolved=structuredClone(option)
 for(const adjustment of option.adjustments??[]){const amount=Number(configuration[adjustment.field]??adjustment.baseline);const delta=amount-adjustment.baseline;resolved.mind+=delta*(adjustment.mind??0);resolved.minutes+=delta*(adjustment.minutes??0);if(adjustment.outputQuantity)resolved.outputs=resolved.outputs.map(item=>({...item,quantity:item.quantity+delta*adjustment.outputQuantity!}));if(adjustment.effectTemplate)resolved.effects.push(adjustment.effectTemplate.replaceAll("{value}",String(amount*(adjustment.effectMultiplier??1)+(adjustment.effectOffset??0))))}
 if(![resolved.mind,resolved.minutes,...resolved.outputs.map(item=>item.quantity)].every(value=>Number.isFinite(value)&&value>=0&&value<=Number.MAX_SAFE_INTEGER))throw new Error('Configured amount is too large.')
 if(option.outputField){const value=configuration[option.outputField];const name=typeof value==='number'?ingredientItems.get(value)?.name:value;if(name)resolved.outputs=resolved.outputs.map(item=>({...item,name:String(name)}))}
 return structuredClone({definition,option:resolved,configuration,...(target?.trim()?{target:target.trim()}:{}),...(sessionId?.trim()?{sessionId:sessionId.trim()}:{})})
}
export function enforceActionSession(queue:BuildQueue,execution:ActionExecution) {
 const constraint=execution.option.sessionConstraints
 if(!constraint)return
 const members=queue.filter(activity=>activity.actionSnapshot?.sessionId===execution.sessionId)
 if(members.some(member=>member.sourceId!==execution.definition.id))throw new Error('This session belongs to a different Action.')
 const snapshots=members.map(member=>member.actionSnapshot!)
 if(constraint.maxMinutes!==undefined&&snapshots.reduce((total,s)=>total+s.option.minutes,execution.option.minutes)>constraint.maxMinutes)throw new Error('Session duration limit reached.')
 if(constraint.maxMind!==undefined&&snapshots.reduce((total,s)=>total+s.option.mind,execution.option.mind)>constraint.maxMind)throw new Error('Session Mind limit reached.')
 if(constraint.maxRepetitions!==undefined&&snapshots.reduce((total,s)=>total+Number(s.configuration[constraint.unitsField??'']??1),Number(execution.configuration[constraint.unitsField??'']??1))>constraint.maxRepetitions)throw new Error('Session repetition limit reached.')
 if(constraint.sameField&&snapshots.some(s=>s.configuration[constraint.sameField!]!==execution.configuration[constraint.sameField!]))throw new Error('Use the same selection throughout this session.')
}
export function addActionActivity(queue:BuildQueue,definition:ActionDefinition,optionId:string,configuration:ActionConfiguration,economics:EconomicsSettings,
 target?:string,sessionId?:string,now=Date.now(),id:string=crypto.randomUUID()):BuildQueue {
 if(queue.some(activity=>activity.id===id))throw new Error('Activity IDs must be unique.')
 const execution=resolveAction(definition,optionId,configuration,target,sessionId);enforceActionSession(queue,execution)
 const option=execution.option
 const inputs=option.inputs.map((item,index)=>{const resource=item.itemId?ingredientItems.get(item.itemId):undefined;if(!resource)throw new Error('An input has no resolved catalog item.');return {id:index+1,component:structuredClone(resource),amount:item.quantity,acceptsExpiredItemWithinDays:0}})
 const build:Build={id,sourceType:'Action',sourceId:definition.id,sourceVersion:definition.version,blueprintName:definition.name,actionSnapshot:execution,
 recipe:{id:1,craftingTimeInMinute:option.minutes,craftingMindCost:option.mind,craftingResolveCost:option.resolve,craftingSkills:definition.skill??null,craftingZone:null,craftingComponents:inputs,craftingFinalProducts:[]},
 economicSnapshot:structuredClone(economics),overrides:{},notes:'',status:'Enqueued',timer:loadCraftTimer(option.minutes,definition.name),createdAt:now}
 const next=[...queue,build]
 return hasActiveQueueEntries(queue)?next:toggleBuildStatus(next,id,now)
}
export function isActionExecution(value:unknown):value is ActionExecution {
 try {
  const execution=value as ActionExecution,definition=execution.definition,option=execution.option
  if(!definition||typeof definition.id!=='string'||!definition.id||!Number.isSafeInteger(definition.version)||definition.version<1||typeof definition.name!=='string'||!definition.name||typeof definition.description!=='string'||typeof definition.category!=='string'||definition.verified!==true)return false
  if(!definition.rules||!['source','version','reference'].every(key=>typeof definition.rules[key as keyof typeof definition.rules]==='string'))return false
  if(![definition.prerequisites,definition.tools,definition.facilities].every(list=>Array.isArray(list)&&list.every(value=>typeof value==='string')))return false
  if(!Array.isArray(definition.options)||!option||typeof option.id!=='string'||!definition.options.some(item=>item.id===option.id))return false
  const validOption=(item:ActionOption)=>typeof item.name==='string'&&['mind','resolve','minutes'].every(key=>Number.isFinite(item[key as 'mind'])&&item[key as 'mind']>=0&&item[key as 'mind']<=Number.MAX_SAFE_INTEGER)&&[item.requirements,item.effects].every(list=>Array.isArray(list)&&list.every(value=>typeof value==='string'))&&[item.inputs,item.equipmentUses,item.outputs].every(list=>Array.isArray(list)&&list.every(value=>typeof value.name==='string'&&Number.isFinite(value.quantity)&&value.quantity>=0&&(value.itemId===undefined||(Number.isSafeInteger(value.itemId)&&value.itemId>0))))&&Array.isArray(item.fields)&&item.fields.every(field=>typeof field.id==='string'&&field.id.length>0&&typeof field.label==='string'&&(field.required===undefined||typeof field.required==='boolean')&&(field.type==='text'||(field.type==='resource'&&(field.itemIds===undefined||(Array.isArray(field.itemIds)&&field.itemIds.every(id=>Number.isSafeInteger(id)&&id>0))))||(field.type==='quantity'&&Number.isSafeInteger(field.min)&&Number.isSafeInteger(field.max)&&field.min>=0&&field.max>=field.min)||(field.type==='select'&&Array.isArray(field.choices)&&field.choices.every(choice=>typeof choice.value==='string'&&typeof choice.label==='string'))))
  for(const item of [...definition.options,option]){
   if(item.adjustments&&!item.adjustments.every(a=>item.fields.some(f=>f.id===a.field&&f.type==='quantity')&&Number.isFinite(a.baseline)&&['mind','minutes','outputQuantity','effectMultiplier','effectOffset'].every(key=>a[key as 'mind']===undefined||(Number.isFinite(a[key as 'mind'])&&a[key as 'mind']!>=0))&&(a.effectTemplate===undefined||typeof a.effectTemplate==='string')))return false
   if(item.outputField!==undefined&&!item.fields.some(f=>f.id===item.outputField))return false
   if(item.interruptionRestarts!==undefined&&typeof item.interruptionRestarts!=='boolean')return false
  }
  if(option.sessionConstraints){ const limits=option.sessionConstraints; if(typeof limits.description!=='string'||['maxMinutes','maxMind','maxRepetitions'].some(key=>limits[key as 'maxMind']!==undefined&&(!Number.isFinite(limits[key as 'maxMind'])||limits[key as 'maxMind']!<0))||(limits.sameField!==undefined&&typeof limits.sameField!=='string'))return false }
  if(!definition.options.every(validOption)||!validOption(option)||!execution.configuration||typeof execution.configuration!=='object'||Array.isArray(execution.configuration)||!Object.values(execution.configuration).every(value=>typeof value==='string'||(typeof value==='number'&&Number.isFinite(value))))return false
  if(execution.target!==undefined&&typeof execution.target!=='string')return false
  if(execution.sessionId!==undefined&&typeof execution.sessionId!=='string')return false
  resolveAction({...definition,options:[option]},option.id,execution.configuration,execution.target,execution.sessionId,true)
  return true
 }catch{return false}
}
