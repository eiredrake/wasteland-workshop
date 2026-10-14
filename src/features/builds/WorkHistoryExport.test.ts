import {expect,it} from 'vitest'
import {addBuild} from './BuildQueueService'
import {allBlueprints} from '../blueprints/blueprints'
import {resolveEconomicsSettings} from '../../economics/EconomicsSettings'
import {completedHistory,createWorkHistoryExport,csvCell} from './WorkHistoryExport'
const now=new Date('2026-10-14T12:00:00Z')
function records(){
 const blueprint=allBlueprints.find(item=>item.itemCraftings?.[0]?.craftingTimeInMinute)!
 const queue=addBuild([],blueprint,resolveEconomicsSettings(),true,1000,'first')
 const first={...queue[0],status:'Completed' as const,completedAt:2000,notes:'Comma, "quotes"\nand Unicode: café',timer:{...queue[0].timer,status:'complete' as const,remainingMs:0}}
 return [first,{...first,id:'recent',completedAt:3000},{...queue[0],id:'pending'}]
}
it('exports completed records newest first without mutating the queue or snapshots',()=>{
 const queue=records(),before=structuredClone(queue),file=createWorkHistoryExport(queue,'json',now),parsed=JSON.parse(file.content)
 expect(parsed).toMatchObject({format:'wasteland-workshop-work-history',schemaVersion:1,activityCount:2,exportedAt:now.toISOString()})
 expect(parsed.activities).toEqual([queue[1],queue[0]])
 expect(file.name).toBe('workshop-work-history-2026-10-14.json');expect(queue).toEqual(before)
 expect(completedHistory(queue).map(item=>item.id)).toEqual(['recent','first'])
})
it('CSV keeps notes, UTC dates, costs and complete snapshots with quoted multiline fields',()=>{
 const queue=records(),file=createWorkHistoryExport(queue,'csv',now)
 expect(file.content.startsWith('\uFEFF"Activity ID"')).toBe(true)
 expect(file.content).toContain('"1970-01-01T00:00:03.000Z"')
 expect(file.content).toContain('"Comma, ""quotes""\nand Unicode: café"')
 expect(file.content).toContain(csvCell(queue[0].economicSnapshot));expect(file.content).not.toContain('"pending"')
 expect(file.name).toBe('workshop-work-history-2026-10-14.csv')
})
it('escapes spreadsheet formulas in text without changing numeric cells',()=>{
 for(const value of ['=1+1','+SUM(A1)','-2+3','@SUM(A1)','  =1'])expect(csvCell(value)).toBe(String.fromCharCode(34,39)+value+String.fromCharCode(34))
 expect(csvCell(-3)).toBe('"-3"')
 expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"')
})
it('empty history exports a valid empty JSON document and header-only CSV',()=>{
 expect(JSON.parse(createWorkHistoryExport([],'json',now).content).activities).toEqual([])
 expect(createWorkHistoryExport([],'csv',now).content.split('\r\n')).toHaveLength(2)
})
