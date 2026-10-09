import type { BlueprintAccessStatus, BlueprintCollection } from './BlueprintCollection'
// Shared membership mutation for badges and confirmed scanner acquisitions.
export function setCollectionBlueprintStatus(collection:BlueprintCollection,blueprintId:number,status:BlueprintAccessStatus|undefined):BlueprintCollection {
 const entry=collection.entries.find(e=>e.blueprintId===blueprintId)
 if(entry?.status===status)return collection
 if(status===undefined)return {...collection,entries:collection.entries.filter(e=>e.blueprintId!==blueprintId)}
 return {...collection,entries:entry?collection.entries.map(e=>e.blueprintId===blueprintId?{...e,status}:e):[...collection.entries,{blueprintId,status}]}
}
