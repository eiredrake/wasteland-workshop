import {masterBlueprints} from '../../features/blueprints/blueprints'
import {scannerError,type Outcome} from '../ocr/OcrTypes'
import type {DiagnosticRecorder} from './Diagnostics'
type CatalogEntry={id:number;name:string}
export function normalizeBlueprintName(name:string){return name.trim().toLowerCase()}
export function extractCandidateNames(text:string){
 const candidates:string[]=[]
 for(const line of text.split(/\r\n|\n|\r/)){
  const normalized=normalizeBlueprintName(line)
  if(normalized)candidates.push(normalized)
  // Printed forms include the label in the same OCR line as the value.
  // Strip only this explicit field label and colon delimiters; keep names exact.
  const field=/^item\s+name\b\s*:?\s*(.+)$/i.exec(line.trim())
  if(field){const value=normalizeBlueprintName(field[1].replace(/\s*:\s*$/,''));if(value)candidates.push(value)}
 }
 return [...new Set(candidates)]
}
export class BlueprintMatcher {
 private readonly catalog:()=>Promise<readonly CatalogEntry[]>;private readonly diagnostics?:DiagnosticRecorder
 constructor(catalog:()=>Promise<readonly CatalogEntry[]>=async()=>masterBlueprints,diagnostics?:DiagnosticRecorder){this.catalog=catalog;this.diagnostics=diagnostics}
 async match(text:string,scanId?:string):Promise<Outcome<CatalogEntry>>{
  const started=performance.now(),candidates=extractCandidateNames(text);let result:Outcome<CatalogEntry>;let matches:CatalogEntry[]=[]
  try{
   const normalized=normalizeBlueprintName(text).replace(/\s+/g,' ')
   const occurrences:{item:CatalogEntry;start:number;end:number}[]=[]
   const word=(character:string)=>/[\p{L}\p{N}_]/u.test(character)
   for(const item of await this.catalog()){
    const name=normalizeBlueprintName(item.name).replace(/\s+/g,' ')
    if(!name)continue
    let start=normalized.indexOf(name)
    while(start!==-1){
     const end=start+name.length
     if((start===0||!word(normalized[start-1]))&&(end===normalized.length||!word(normalized[end])))occurrences.push({item,start,end})
     start=normalized.indexOf(name,start+1)
    }
   }
   // A complete longer name takes precedence over a shorter name inside it.
   const complete=occurrences.filter(hit=>!occurrences.some(other=>other.start<=hit.start&&other.end>=hit.end&&(other.start<hit.start||other.end>hit.end)))
   matches=[...new Map(complete.map(hit=>[hit.item.id,hit.item])).values()]
   result=matches.length===1?{ok:true,value:{id:matches[0].id,name:matches[0].name}}:{ok:false,error:matches.length?scannerError('AMBIGUOUS_MATCH','matching','Multiple blueprint names matched the image.'):scannerError('NO_MATCH','matching','No matching blueprint was found.')}
  }catch(error){result={ok:false,error:scannerError('CATALOG_UNAVAILABLE','matching',error instanceof Error?error.message:String(error))}}
  this.diagnostics?.record({type:'BLUEPRINT_MATCH_RESULT',stage:'matching',scanId,text,candidates,matchCount:matches.length,matchedIds:matches.map(item=>item.id),status:result.ok?'SUCCESS':'FAILED',blueprintId:result.ok?result.value.id:undefined,error:result.ok?undefined:result.error,durationMs:performance.now()-started});return result
 }
}
