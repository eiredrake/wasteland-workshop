import ExportDialog from '../../components/ExportDialog/ExportDialog'
import type {BuildQueue} from './Build'
import {createWorkHistoryExport} from './WorkHistoryExport'
export default function WorkHistoryExportDialog({builds,onClose,onExported}:{builds:BuildQueue;onClose:()=>void;onExported:(message:string)=>void}){
 return <ExportDialog title="Export Work History" subject="Work history" description={'Export all '+builds.length+' completed '+(builds.length===1?'activity':'activities')+', including notes and recorded snapshots.'} createFile={format=>createWorkHistoryExport(builds,format)} onClose={onClose} onExported={onExported}/>
}
