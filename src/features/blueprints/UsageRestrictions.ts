import type { Blueprint } from './Blueprint'
import type { CraftedProductVariant } from './CraftingFinalProduct'

export type UsageRestriction = {
  type: 'Lineage' | 'Strain'; value: string; source: string
  // Legacy structured requirements imply use eligibility. Mechanics can instead
  // describe recipients or victims; never treat those as user restrictions.
  applicability?: 'user' | 'target' | 'unspecified'
  sourceField?: 'mechanics'; sourcePath?: string; productId?: number
}
export type UsageDiagnostic = {
  kind: 'conflict' | 'ambiguous' | 'incidental'; source: string; sourcePath: string
  productId: number; productName: string; values: string[]; reason: string
}
const canonical: Record<string,string> = {gorger:'Gorger',devoted:'Devoted',townie:'Townie',nomad:'Nomad',evolved:'Evolved',elitariat:'Elitariat',mutant:'Mutant',landsman:'Landsman',landsmen:'Landsman',any:'Any'}
const namedPattern = '(?:Gorger|Devoted|Townie|Nomad|Evolved|Elitariat|Mutant|Landsman|Landsmen)'
const namePattern = `(?:${namedPattern}|Any)`
const valuesPattern = `${namePattern}(?:\\s+(?:or|and)\\s+${namePattern})*`
const separation = '(?:\\s+|\\s*[:,\\-]\\s*)'
function normalizedValue(text:string): string {
  return text.trim().split(/\s+(or|and)\s+/i).map(part=>canonical[part.toLowerCase()]??part.toLowerCase()).join(' ')
}
function names(value:string) { return value.split(/\s+(?:or|and)\s+/).map(value=>value.toLowerCase()) }
function structured(source:string): UsageRestriction[] {
  const result:UsageRestriction[]=[]
  for(const clause of source.split(/[;\n]+/).map(value=>value.trim().replace(/\.$/,''))) {
    const lineage=clause.match(new RegExp(`^(${valuesPattern})${separation}Lineage$`,'i'))??clause.match(new RegExp(`^Lineage${separation}(${valuesPattern})$`,'i'))
    if(lineage){result.push({type:'Lineage',value:normalizedValue(lineage[1]),source});continue}
    const strain=clause.match(/^Strain\s*:\s*([A-Za-z][A-Za-z '-]*)$/i)
    if(strain&&!/^(any|all|none)$/i.test(strain[1].trim())&&!/\b(not|except|without|cannot|must|requires?)\b/i.test(strain[1]))result.push({type:'Strain',value:strain[1].trim(),source})
  }
  return result
}
type Context={item:CraftedProductVariant;path:string;authoritative:UsageRestriction[]}
function contexts(blueprint:Blueprint): Context[] {
  const result:Context[]=[]
  function visit(item:CraftedProductVariant,path:string,inherited:UsageRestriction[],ancestors:Set<CraftedProductVariant>) {
    if(ancestors.has(item))return
    const own=structured(item.metadata?.requirementsToUse??'')
    const authoritative=[...inherited,...own]
    result.push({item,path,authoritative})
    const visited=new Set(ancestors);visited.add(item)
    for(const [index,association] of (item.childItemClassifications??[]).entries())visit(association.childItem,`${path}.childItemClassifications[${index}].childItem`,authoritative,visited)
  }
  visit(blueprint,'blueprint',[],new Set())
  const root=result[0].authoritative
  for(const [i,recipe] of (blueprint.itemCraftings??[]).entries())for(const [j,product] of recipe.craftingFinalProducts.entries())visit(product.finalProduct,`itemCraftings[${i}].craftingFinalProducts[${j}].finalProduct`,root,new Set())
  return result
}
type Candidate={value:string;applicability:NonNullable<UsageRestriction['applicability']>}
function mechanicsCandidates(source:string): Candidate[] {
  const candidates:Candidate[]=[]
  for(const sentence of source.replace(/[\u2013\u2014]/g,'-').replace(/\s+/g,' ').split(/[.!?;]+/).map(s=>s.trim()).filter(Boolean)) {
    // References to a corpse, a Lineage advantage, lore and negated conditions
    // are not sufficient evidence of who can use/receive the item's effects.
    const blocked=/\b(corpse|corpses|lineage\s+(?:core\s+)?(?:advantages?|ability|abilities)|lore|except|excluding|not|cannot|without)\b/i.test(sentence)
    if(blocked)continue
    const explicit=sentence.match(new RegExp(`^(?:Lineage${separation}(${valuesPattern})|(${valuesPattern})${separation}Lineage)(?:\\s+(?:only|required))?$`,'i'))
    if(explicit){candidates.push({value:normalizedValue(explicit[1]??explicit[2]),applicability:'unspecified'});continue}
    const members=new RegExp(`\\b(?:members?\\s+of\\s+(?:the\\s+)?|targets?(?:\\s*\\([^)]{1,40}\\))?\\s+of\\s+(?:the\\s+)?)(${valuesPattern})${separation}Lineage\\b`,'gi')
    for(const match of sentence.matchAll(members)) {
      const tail=sentence.slice(match.index!+match[0].length).trim()
      if(/^(?:may|can)\s+(?:use|activate|consume|equip)\b/i.test(tail))candidates.push({value:normalizedValue(match[1]),applicability:'user'})
      else if(!tail||/^(?:(?:regain|gain|take|recover|heal|restore|lose|suffer|receive)s?\b|becomes?\s+intoxicated\b|(?:are|is)\s+(?:intoxicated|affected|immune|healed|eligible)\b)/i.test(tail))candidates.push({value:normalizedValue(match[1]),applicability:'target'})
    }
    const only=sentence.match(new RegExp(`\\b(${valuesPattern})${separation}Lineage\\s+only\\b`,'i'))
    if(only)candidates.push({value:normalizedValue(only[1]),applicability:'unspecified'})
    const applicable=sentence.match(new RegExp(`\\b(affects?|applies\\s+to|usable\\s+by|used\\s+by)\\s+(?:the\\s+)?(${valuesPattern})${separation}Lineage\\b`,'i'))
    if(applicable)candidates.push({value:normalizedValue(applicable[2]),applicability:/by$/i.test(applicable[1])?'user':'target'})
    // Real applied poison variants encode target applicability in their call.
    if(/\bcall\b/i.test(sentence))for(const match of sentence.matchAll(new RegExp(`\\b\\d+\\s+Body\\s+to\\s+(${namedPattern})\\b`,'gi')))candidates.push({value:normalizedValue(match[1]),applicability:'target'})
  }
  return candidates
}
export function analyzeBlueprintUsage(blueprint:Blueprint): {restrictions:UsageRestriction[];diagnostics:UsageDiagnostic[]} {
  const restrictions:UsageRestriction[]=[],diagnostics:UsageDiagnostic[]=[]
  const associated=contexts(blueprint)
  function add(restriction:UsageRestriction){if(!restrictions.some(item=>item.type===restriction.type&&item.value.toLowerCase()===restriction.value.toLowerCase()))restrictions.push(restriction)}
  // Preserve every existing explicit restriction, including Strain. A child can
  // add a legitimate variant-specific requirement, without importing ingredients.
  for(const {item} of associated)for(const restriction of structured(item.metadata?.requirementsToUse??''))add(restriction)
  for(const context of associated) {
    const source=context.item.metadata?.mechanics
    if(!source?.trim())continue
    const sourcePath=context.path+'.metadata.mechanics'
    const diagnostic=(kind:UsageDiagnostic['kind'],values:string[],reason:string)=>diagnostics.push({kind,values,reason,source,sourcePath,productId:context.item.id,productName:context.item.name})
    const candidates=mechanicsCandidates(source)
    const authoritative=context.authoritative.filter(r=>r.type==='Lineage')
    const named=authoritative.filter(r=>r.value!=='Any').flatMap(r=>names(r.value))
    for(const candidate of candidates) {
      if(named.length&&names(candidate.value).some(name=>!named.includes(name))){diagnostic('conflict',[...authoritative.map(r=>r.value),candidate.value],'Structured named-Lineage requirements take precedence over mechanics.');continue}
      add({type:'Lineage',value:candidate.value,source,applicability:candidate.applicability,sourceField:'mechanics',sourcePath,productId:context.item.id})
    }
    if(!candidates.length&&/\b(lineage|gorger|devoted|townie|nomad|evolved|elitariat|mutant|landsman|landsmen)\b/i.test(source)) {
      const incidental=/\b(corpse|corpses|lineage\s+(?:core\s+)?(?:advantages?|ability|abilities)|lore)\b/i.test(source)
      diagnostic(incidental?'incidental':'ambiguous',[],incidental?'Corpse/advantage/lore reference is not an applicability restriction.':'No supported, unambiguous fixed-Lineage applicability phrase; manual review required.')
    }
  }
  // The existing bubble cannot distinguish alternative contexts. Do not display
  // Any beside named values; retain specific information and record suppression.
  if(restrictions.some(r=>r.type==='Lineage'&&r.value!=='Any')){
    for(let i=restrictions.length-1;i>=0;i--)if(restrictions[i].type==='Lineage'&&restrictions[i].value==='Any'){
      const any=restrictions[i];diagnostics.push({kind:'conflict',values:['Any',...restrictions.filter(r=>r.type==='Lineage'&&r.value!=='Any').map(r=>r.value)],source:any.source,sourcePath:any.sourcePath??'requirementsToUse',productId:any.productId??blueprint.id,productName:blueprint.name,reason:'Named and Any contexts cannot be distinguished by the current badge; named applicability retained.'});restrictions.splice(i,1)
    }
  }
  return {restrictions,diagnostics}
}
export function blueprintUsageRestrictions(blueprint:Blueprint):UsageRestriction[] {return analyzeBlueprintUsage(blueprint).restrictions}
