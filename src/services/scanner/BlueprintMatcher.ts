import {masterBlueprints} from '../../features/blueprints/blueprints'
import {scannerError,type Outcome} from '../ocr/OcrTypes'
import type {DiagnosticRecorder} from './Diagnostics'
type CatalogEntry={id:number;name:string}
export function normalizeBlueprintName(name:string){return name.trim().toLowerCase()}
export class BlueprintMatcher {
 private readonly catalog:()=>Promise<readonly CatalogEntry[]>;private readonly diagnostics?:DiagnosticRecorder
 constructor(catalog:()=>Promise<readonly CatalogEntry[]>=async()=>masterBlueprints,diagnostics?:DiagnosticRecorder){this.catalog=catalog;this.diagnostics=diagnostics}
 async match(text:string,scanId?:string):Promise<Outcome<CatalogEntry>>{
  const started=performance.now();let result:Outcome<CatalogEntry>
  try{const name=normalizeBlueprintName(text),matches=(await this.catalog()).filter(item=>name.length>0&&normalizeBlueprintName(item.name)===name)
   result=matches.length===1?{ok:true,value:{id:matches[0].id,name:matches[0].name}}:{ok:false,error:matches.length?scannerError('AMBIGUOUS_MATCH','matching','Multiple blueprints have this name.'):scannerError('NO_MATCH','matching','No matching blueprint was found.')}
  }catch(error){result={ok:false,error:scannerError('CATALOG_UNAVAILABLE','matching',error instanceof Error?error.message:String(error))}}
  this.diagnostics?.record({type:'BLUEPRINT_MATCH_RESULT',stage:'matching',scanId,text,status:result.ok?'SUCCESS':'FAILED',blueprintId:result.ok?result.value.id:undefined,error:result.ok?undefined:result.error,durationMs:performance.now()-started});return result
 }
}
