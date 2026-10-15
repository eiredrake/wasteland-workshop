import {masterBlueprints} from '../../features/blueprints/blueprints'
import {scannerError,type Outcome} from '../ocr/OcrTypes'
import type {DiagnosticRecorder} from './Diagnostics'
export type CatalogEntry={id:number;name:string}
export function normalizeBlueprintName(name:string){return name.toLowerCase().replace(/\p{P}/gu,'').replace(/\s+/g,' ').trim()}
export function extractCandidateNames(text:string){
 const candidates:string[]=[]
 for(const line of text.split(/\r\n|\n|\r/)){
  const normalized=normalizeBlueprintName(line)
  if(normalized)candidates.push(normalized)
  // Printed forms include the label in the same OCR line as the value.
  // Expose the printed field value as well as the complete OCR line for diagnostics.
  const field=/\bitem\s+name\b\s*:?\s*(.+)$/i.exec(line.trim())
  if(field){const value=normalizeBlueprintName(field[1].replace(/\s*:\s*$/,''));if(value)candidates.push(value)}
 }
 return [...new Set(candidates)]
}
// Levenshtein distance counts substituted, inserted, or omitted characters.
function letterDistance(a:string,b:string){
 if(Math.abs(a.length-b.length)>2)return 3
 let previous=Array.from({length:b.length+1},(_,index)=>index)
 for(let i=1;i<=a.length;i++){
  const row=[i]
  for(let j=1;j<=b.length;j++)row[j]=Math.min(row[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1))
  previous=row
 }
 return previous[b.length]
}
export class BlueprintMatcher {
 private readonly catalog:()=>Promise<readonly CatalogEntry[]>;private readonly diagnostics?:DiagnosticRecorder
 constructor(catalog:()=>Promise<readonly CatalogEntry[]>=async()=>masterBlueprints,diagnostics?:DiagnosticRecorder){this.catalog=catalog;this.diagnostics=diagnostics}
 async match(text:string,scanId?:string):Promise<Outcome<CatalogEntry>&{candidates?:CatalogEntry[]}>{
  const started=performance.now(),candidates=extractCandidateNames(text);let matchMode='NONE',editDistance:number|undefined;let result:Outcome<CatalogEntry>&{candidates?:CatalogEntry[]};let matches:CatalogEntry[]=[]
  try{
   const normalized=normalizeBlueprintName(text).replace(/\s+/g,' ')
   const occurrences:{item:CatalogEntry;start:number;end:number}[]=[]
   const word=(character:string)=>/[\p{L}\p{N}_]/u.test(character)
   const catalog=await this.catalog()
   for(const item of catalog){
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
   if(matches.length){matchMode='NORMALIZED_EXACT';editDistance=0}
   else{
    // Compare word-bounded name-sized spans, so labels and other OCR lines do not count as edits.
    const words=normalized.split(' ').filter(Boolean)
    const near:{item:CatalogEntry;distance:number}[]=[]
    for(const item of catalog){
     const name=normalizeBlueprintName(item.name),count=name.split(' ').length
     if(!name)continue
     let best=3
     for(let start=0;start<words.length;start++){
      for(const length of [count-1,count,count+1]){
       if(length<1||start+length>words.length)continue
       const value=words.slice(start,start+length).join(' ')
       best=Math.min(best,letterDistance(value,name))
      }
     }
     if(best<=2)near.push({item,distance:best})
    }
    if(near.length){
     editDistance=Math.min(...near.map(hit=>hit.distance));matchMode='APPROXIMATE'
     matches=[...new Map(near.map(hit=>[hit.item.id,hit.item])).values()]
    }
   }
   result=matches.length===1?{ok:true,value:{id:matches[0].id,name:matches[0].name}}:{ok:false,error:matches.length?scannerError('AMBIGUOUS_MATCH','matching',matches.length>3?'More than three blueprint names matched. Narrow the target and try again.':'Multiple blueprint names matched the image.'):scannerError('NO_MATCH','matching','No matching blueprint was found.')}
   if(!result.ok&&matches.length>1&&matches.length<=3)result={...result,candidates:matches.map(item=>({id:item.id,name:item.name}))}
  }catch(error){result={ok:false,error:scannerError('CATALOG_UNAVAILABLE','matching',error instanceof Error?error.message:String(error))}}
  this.diagnostics?.record({type:'BLUEPRINT_MATCH_RESULT',stage:'matching',scanId,text,candidates,matchCount:matches.length,matchedIds:matches.map(item=>item.id),matchMode,editDistance,status:result.ok?'SUCCESS':'FAILED',blueprintId:result.ok?result.value.id:undefined,error:result.ok?undefined:result.error,durationMs:performance.now()-started});return result
 }
}
