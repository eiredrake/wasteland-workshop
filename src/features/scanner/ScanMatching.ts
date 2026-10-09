import type { Blueprint } from '../blueprints/Blueprint'
export function normalizeScanName(value:string):string {
 return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
}
function distance(a:string,b:string):number {
 let row=Array.from({length:b.length+1},(_,i)=>i)
 for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next}
 return row[b.length]
}
const confusion=(s:string)=>s.replace(/0/g,'o').replace(/[1il]/g,'l')
export function extractScanNames(text:string):string[] {
 const lines=text.slice(0,12000).split(/\r?\n/).map(s=>s.trim()).filter(s=>s.length>0&&s.length<=160).slice(0,40)
 const label=lines.findIndex(s=>/item\s*name/i.test(s))
 const tail=label>=0?lines.slice(label,label+4):lines
 // Sparse OCR can put the name value just before its label on tilted paper.
 const preceding=label>0&&/^item\s*name\s*[:—-]?$/i.test(lines[label])?lines[label-1]:undefined
 const end=label>=0?tail.findIndex((s,i)=>i>0&&/^(item type|requirements|expiration|number of uses|production|item mechanics)/i.test(s)):-1
 const selected=end>=0?tail.slice(0,end):tail
 const names=selected.map(s=>s.replace(/^.*?item\s*name\s*[:—-]?\s*/i,'')).filter(s=>s.length>1&&!/^(artisan|culinary|agricultural|medical) recipe$|^item type|^requirements|^expiration|^number of uses/i.test(s))
 if(preceding&&!/^(artisan|culinary|agricultural|medical) recipe$|^item type|^requirements|^expiration|^number of uses|^production/i.test(preceding))names.unshift(preceding)
 return [...new Set([...names,...names.slice(0,-1).map((s,i)=>s+' '+names[i+1])])]
}
export type ScanCandidate={blueprint:Blueprint;score:number}
export type ScanMatch={confidence:'high'|'ambiguous'|'none';candidates:ScanCandidate[];readText?:string}
export function matchScanNames(names:string[],catalog:Blueprint[]):ScanMatch {
 const keys=names.slice(0,80).map(normalizeScanName).filter(key=>key.length>0&&key.length<=160)
 const candidates=catalog.map(blueprint=>{
  const name=normalizeScanName(blueprint.name)
  const score=Math.max(0,...keys.map(key=>key===name?1:Math.min(key.length,name.length)<5||Math.min(key.length,name.length)/Math.max(key.length,name.length)<.86?0:Math.max(1-distance(key,name)/Math.max(key.length,name.length),confusion(key)===confusion(name)?.96:0)))
  return {blueprint,score}
 }).filter(c=>c.score>=.86).sort((a,b)=>b.score-a.score||a.blueprint.id-b.blueprint.id)
 if(!candidates.length)return {confidence:'none',candidates:[]}
 const exact=candidates.filter(c=>c.score===1)
 const strong=candidates[0].score>=.94&&(!candidates[1]||candidates[0].score-candidates[1].score>=.08)
 return {confidence:exact.length===1||strong?'high':'ambiguous',candidates:candidates.slice(0,5)}
}

// Extra OCR noise can surround an otherwise exact name. These fragments are suggestions only.
export function catalogNameFragments(names:string[],catalog:Blueprint[]):string[] {
 const known=new Map(catalog.map(blueprint=>[normalizeScanName(blueprint.name),blueprint.name]))
 const matches=new Set<string>()
 for(const line of names.slice(0,80)){
  const words=line.slice(0,160).split(/\s+/).map(normalizeScanName).filter(Boolean).slice(0,24)
  for(let start=0;start<words.length;start++){
   let key=''
   for(let end=start;end<Math.min(words.length,start+10);end++){
    key+=words[end]
    const name=key.length>=5?known.get(key):undefined
    if(name)matches.add(name)
   }
  }
 }
 return [...matches]
}
