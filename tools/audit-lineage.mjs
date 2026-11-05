import {createServer} from 'vite'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const mode=process.argv[2]??'after'
const root=new URL('../',import.meta.url)
const folder=new URL('docs/audits/',root);mkdirSync(folder,{recursive:true})
const data=readFileSync(new URL('src/data/wasteland-blueprints.json',root),'utf8')
const catalog=JSON.parse(data).blueprints
const server=await createServer({root:fileURLToPath(root),configFile:false,server:{middlewareMode:true},appType:'custom'})
try{
 const parser=await server.ssrLoadModule('/src/features/blueprints/UsageRestrictions.ts')
 const mention=/\b(lineage|gorger|devoted|townie|nomad|evolved|elitariat|mutant|landsman|landsmen)\b/i
 function fields(blueprint){
  const result=[]
  function visit(item,path){
   for(const field of ['requirementsToUse','mechanics']){
    const text=item.metadata?.[field]
    if(typeof text==='string'&&mention.test(text))result.push({productId:item.id,productName:item.name,field,path:path+'.metadata.'+field,text,structuredRequirement:item.metadata?.requirementsToUse??null})
   }
   for(const [index,child] of (item.childItemClassifications??[]).entries())visit(child.childItem,path+`.childItemClassifications[${index}].childItem`)
  }
  visit(blueprint,'blueprint')
  for(const [i,recipe] of (blueprint.itemCraftings??[]).entries())for(const [j,product] of recipe.craftingFinalProducts.entries())visit(product.finalProduct,`itemCraftings[${i}].craftingFinalProducts[${j}].finalProduct`)
  return result
 }
 const records=catalog.map(blueprint=>({id:blueprint.id,name:blueprint.name,badges:parser.blueprintUsageRestrictions(blueprint),fields:fields(blueprint),...(parser.analyzeBlueprintUsage?{diagnostics:parser.analyzeBlueprintUsage(blueprint).diagnostics}:{} )}))
 const report={catalogSha256:createHash('sha256').update(data).digest('hex'),catalogCount:catalog.length,summary:{lineagePrints:records.filter(r=>r.badges.some(b=>b.type==='Lineage')).length,strainPrints:records.filter(r=>r.badges.some(b=>b.type==='Strain')).length,anyMechanicsOccurrences:records.flatMap(r=>r.fields).filter(f=>f.field==='mechanics').reduce((n,f)=>n+[...f.text.matchAll(/\bAny\s+Lineage\b/gi)].length,0)},records}
 if(mode==='baseline'){
  if(existsSync(new URL('issue-38-lineage-baseline.json',folder)))throw Error('The pre-change baseline is already recorded; do not overwrite it with the updated parser.')
  writeFileSync(new URL('issue-38-lineage-baseline.json',folder),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report.summary,null,2));console.log('Recorded actual pre-change parser output for '+catalog.length+' blueprints.')
 }else{
  const before=JSON.parse(readFileSync(new URL('issue-38-lineage-baseline.json',folder),'utf8'))
  if(before.catalogSha256!==report.catalogSha256)throw Error('Catalog changed since baseline; review before comparing.')
  const keys=badges=>badges.map(b=>b.type+': '+b.value).sort()
  const changed=records.filter(r=>JSON.stringify(keys(r.badges))!==JSON.stringify(keys(before.records.find(b=>b.id===r.id).badges)))
  report.comparison=changed.map(r=>({id:r.id,name:r.name,before:keys(before.records.find(b=>b.id===r.id).badges),after:keys(r.badges)}))
  report.summary.newNamedLineagePrints=changed.filter(r=>r.badges.some(b=>b.type==='Lineage'&&b.value!=='Any')).length
  report.summary.newAnyLineagePrints=changed.filter(r=>r.badges.some(b=>b.type==='Lineage'&&b.value==='Any')).length
  report.summary.removedBadges=records.flatMap(r=>keys(before.records.find(b=>b.id===r.id).badges).filter(k=>!keys(r.badges).includes(k)).map(badge=>({id:r.id,name:r.name,badge})))
  for(const kind of ['conflict','ambiguous','incidental'])report.summary[kind+'Records']=records.filter(r=>r.diagnostics?.some(d=>d.kind===kind)).length
  report.summary.changedStrainPrints=records.filter(r=>JSON.stringify(keys(r.badges.filter(b=>b.type==='Strain')))!==JSON.stringify(keys(before.records.find(b=>b.id===r.id).badges.filter(b=>b.type==='Strain')))).length
  writeFileSync(new URL('issue-38-lineage-after.json',folder),JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify(report.summary,null,2));console.log(JSON.stringify(report.comparison,null,2))
 }
}finally{await server.close()}
