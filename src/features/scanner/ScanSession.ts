import { setCollectionBlueprintStatus } from '../blueprints/BlueprintCollectionService'
import type { Blueprint } from '../blueprints/Blueprint'
import type { BlueprintCollection } from '../blueprints/BlueprintCollection'
export type ScanOutcome='unmatched'|'acquired'|'owned'
export function scanCounters(documents:ScanOutcome[]) {
 return {scanned:documents.length,acquired:documents.filter(o=>o==='acquired').length,owned:documents.filter(o=>o==='owned').length,unmatched:documents.filter(o=>o==='unmatched').length}
}
export function acquireScannedBlueprint(collections:BlueprintCollection[],activeId:string|undefined,expectedId:string,blueprint:Blueprint) {
 if(activeId!==expectedId)throw new Error('The active collection changed. Exit and reopen the scanner for the correct destination.')
 const collection=collections.find(c=>c.id===expectedId)
 if(!collection)throw new Error('The destination collection was deleted. Exit and select a collection.')
 if(collection.entries.some(e=>e.blueprintId===blueprint.id&&e.status==='acquired'))return {collections,alreadyOwned:true}
 return {collections:collections.map(c=>c.id===expectedId?setCollectionBlueprintStatus(c,blueprint.id,'acquired'):c),alreadyOwned:false}
}
