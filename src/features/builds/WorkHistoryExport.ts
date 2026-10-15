import {csvCell} from '../../services/files/Csv'
export {csvCell} from '../../services/files/Csv'
import type {BuildQueue} from './Build'
import {calculateBuildCost} from './BuildQueueService'
import type {ExportFile} from '../../services/files/SaveFile'
export type HistoryExportFormat='json'|'csv'
export function completedHistory(builds:BuildQueue){return builds.filter(item=>item.status==='Completed').sort((a,b)=>(b.completedAt??0)-(a.completedAt??0))}
function date(value:number|undefined){return value===undefined?'':new Date(value).toISOString()}
export function createWorkHistoryExport(builds:BuildQueue,format:HistoryExportFormat,now=new Date()):ExportFile{
 const activities=completedHistory(builds),name='workshop-work-history-'+now.toISOString().slice(0,10)+'.'+format
 if(format==='json')return {name,extension:format,mimeType:'application/json',content:JSON.stringify({format:'wasteland-workshop-work-history',schemaVersion:1,exportedAt:now.toISOString(),activityCount:activities.length,activities},null,2)+'\n'}
 const headers=['Activity ID','Name','Source Type','Source ID','Source Version','Blueprint ID','Status','Created At (UTC)','Started At (UTC)','Completed At (UTC)','Planned Duration (minutes)','Mind Cost','Resolve Cost','Recorded Production Cost (credits)','Notes','Recipe (JSON)','Economics Snapshot (JSON)','Overrides (JSON)','Action Snapshot (JSON)','Timer (JSON)']
 const rows=activities.map(item=>[item.id,item.blueprintName,item.sourceType??'Blueprint',item.sourceId??item.blueprintId,item.sourceVersion,item.blueprintId,item.status,date(item.createdAt),date(item.startedAt),date(item.completedAt),item.timer.originalDurationMs/60000,item.recipe.craftingMindCost,item.recipe.craftingResolveCost??0,calculateBuildCost(item).productionCost,item.notes,item.recipe,item.economicSnapshot,item.overrides,item.actionSnapshot,item.timer])
 return {name,extension:format,mimeType:'text/csv',content:'\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'}
}
